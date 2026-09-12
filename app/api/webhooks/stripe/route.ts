import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { getRuntimeReadiness } from "@/lib/runtime";
import { submitPrintfulOrder } from "@/lib/printful";
import { verifyStripeSignature } from "@/lib/stripe";

function moneyFromCents(value: unknown) {
  return typeof value === "number" ? value / 100 : null;
}

function shippingDetails(session: any) {
  return session?.collected_information?.shipping_details || session?.shipping_details || session?.customer_details || null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    verifyStripeSignature(raw, request.headers.get("stripe-signature"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid Stripe signature." }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!event?.id || !event?.type) return NextResponse.json({ ok: false, error: "Malformed Stripe event." }, { status: 400 });

  await ensureSchema();
  const db = getDb();

  const accepted = await db.query(
    `insert into pod_webhook_events (provider, provider_event_id, event_type, payload)
     values ('stripe', $1, $2, $3::jsonb)
     on conflict (provider, provider_event_id) do nothing
     returning id`,
    [event.id, event.type, JSON.stringify(event)]
  );

  if (!accepted.rowCount) return NextResponse.json({ ok: true, duplicate: true });

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    await db.query(`update pod_webhook_events set processed = true, processed_at = now() where provider = 'stripe' and provider_event_id = $1`, [event.id]);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const session = event.data?.object;
  if (!session || session.payment_status !== "paid") {
    await db.query(
      `update pod_webhook_events set processed = true, processed_at = now(), error_message = $2 where provider = 'stripe' and provider_event_id = $1`,
      [event.id, "Checkout session was not marked paid."]
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  const productId = session.metadata?.product_id;
  const variantId = session.metadata?.variant_id;
  const quantity = Math.max(1, Math.min(10, Number(session.metadata?.quantity || 1)));
  if (!productId || !variantId) {
    await db.query(`update pod_webhook_events set error_message = $2 where provider = 'stripe' and provider_event_id = $1`, [event.id, "Missing checkout metadata."]);
    return NextResponse.json({ ok: false, error: "Missing checkout metadata." }, { status: 500 });
  }

  const productResult = await db.query(
    `select p.id as product_id, p.name, p.currency, p.external_template_id,
            v.id as variant_id, v.provider_variant_id,
            coalesce(v.retail_price, p.retail_price) as unit_price
       from pod_products p
       join pod_variants v on v.product_id = p.id
      where p.id = $1 and v.id = $2
      limit 1`,
    [productId, variantId]
  );
  const item = productResult.rows[0];
  if (!item) {
    await db.query(`update pod_webhook_events set error_message = $2 where provider = 'stripe' and provider_event_id = $1`, [event.id, "Paid item no longer exists in catalog."]);
    return NextResponse.json({ ok: false, error: "Paid item no longer exists in catalog." }, { status: 500 });
  }

  const ship = shippingDetails(session);
  const address = ship?.address || {};
  const client = await db.connect();
  let order: any;
  try {
    await client.query("begin");
    const orderResult = await client.query(
      `insert into pod_orders
        (external_payment_id, stripe_checkout_session_id, stripe_payment_intent_id, payment_status,
         customer_email, currency, subtotal, shipping_amount, tax_amount, total_amount, status,
         shipping_name, shipping_address)
       values ($1,$2,$3,'paid',$4,$5,$6,$7,$8,$9,'paid',$10,$11::jsonb)
       on conflict (stripe_checkout_session_id) do update set
         payment_status = excluded.payment_status,
         stripe_payment_intent_id = coalesce(pod_orders.stripe_payment_intent_id, excluded.stripe_payment_intent_id),
         updated_at = now()
       returning *`,
      [
        session.payment_intent || session.id,
        session.id,
        session.payment_intent || null,
        session.customer_details?.email || ship?.email || null,
        String(session.currency || item.currency || "cad").toUpperCase(),
        moneyFromCents(session.amount_subtotal),
        moneyFromCents(session.shipping_cost?.amount_total),
        moneyFromCents(session.total_details?.amount_tax),
        moneyFromCents(session.amount_total),
        ship?.name || session.customer_details?.name || null,
        JSON.stringify(address || {}),
      ]
    );
    order = orderResult.rows[0];

    const existingItem = await client.query(`select id from pod_order_items where order_id = $1 limit 1`, [order.id]);
    if (!existingItem.rowCount) {
      const unitPrice = Number(item.unit_price || 0);
      await client.query(
        `insert into pod_order_items
          (order_id, product_id, variant_id, product_name, provider_variant_id, quantity, unit_price, line_total)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, item.product_id, item.variant_id, item.name, item.provider_variant_id, quantity, unitPrice, unitPrice * quantity]
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    await db.query(`update pod_webhook_events set error_message = $2 where provider = 'stripe' and provider_event_id = $1`, [event.id, error instanceof Error ? error.message : "Order persistence failed."]);
    return NextResponse.json({ ok: false, error: "Order persistence failed." }, { status: 500 });
  } finally {
    client.release();
  }

  const readiness = getRuntimeReadiness();
  if (readiness.readyForAutoFulfillment && !item.external_template_id) {
    try {
      const printful = await submitPrintfulOrder({
        externalId: order.id,
        recipient: {
          name: ship?.name || session.customer_details?.name || "Customer",
          address1: address.line1 || "",
          address2: address.line2 || undefined,
          city: address.city || "",
          stateCode: address.state || undefined,
          countryCode: address.country || "",
          zip: address.postal_code || "",
          phone: session.customer_details?.phone || undefined,
          email: session.customer_details?.email || undefined,
        },
        items: [{ syncVariantId: item.provider_variant_id, quantity }],
      });
      const providerOrderId = printful?.result?.id != null ? String(printful.result.id) : null;
      await db.query(`update pod_orders set provider_order_id = $2, provider_payload = $3::jsonb, status = 'submitted_to_provider', updated_at = now() where id = $1`, [order.id, providerOrderId, JSON.stringify(printful)]);
      await db.query(`insert into pod_fulfillment_events (order_id, status, note, payload) values ($1,'submitted_to_provider','Automatically submitted after verified Stripe payment.',$2::jsonb)`, [order.id, JSON.stringify(printful)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printful submission failed.";
      await db.query(`update pod_orders set status = 'error', updated_at = now() where id = $1`, [order.id]);
      await db.query(`insert into pod_fulfillment_events (order_id, status, note) values ($1,'error',$2)`, [order.id, message]);
    }
  }

  await db.query(`update pod_webhook_events set processed = true, processed_at = now() where provider = 'stripe' and provider_event_id = $1`, [event.id]);
  return NextResponse.json({ ok: true });
}
