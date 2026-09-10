import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema, getDb } from "@/lib/db";
import { getRuntimeReadiness } from "@/lib/runtime";
import { createStripeCheckoutSession } from "@/lib/stripe";

const CheckoutSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export async function POST(request: Request) {
  const readiness = getRuntimeReadiness();
  if (!readiness.readyForCheckout) {
    return NextResponse.json({ ok: false, error: "Checkout is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid checkout request." }, { status: 400 });

  await ensureSchema();
  const db = getDb();
  const { rows } = await db.query(
    `select p.id as product_id, p.name, p.slug, p.currency, p.retail_price as product_price,
            p.status, p.external_template_id,
            v.id as variant_id, v.provider_variant_id, v.retail_price as variant_price, v.available
       from pod_products p
       join pod_variants v on v.product_id = p.id
      where p.id = $1 and v.id = $2
      limit 1`,
    [parsed.data.productId, parsed.data.variantId]
  );

  const row = rows[0];
  if (!row || row.status !== "published" || row.available === false) {
    return NextResponse.json({ ok: false, error: "This product option is not available for checkout." }, { status: 409 });
  }
  if (row.external_template_id) {
    return NextResponse.json({ ok: false, error: "This Printful template must be synchronized as a store product before it can be sold." }, { status: 409 });
  }

  const price = row.variant_price ?? row.product_price;
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "A valid retail price is required before checkout." }, { status: 409 });
  }

  try {
    const session = await createStripeCheckoutSession({
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.name,
      productSlug: row.slug,
      unitAmountCents: Math.round(amount * 100),
      currency: row.currency || "CAD",
      quantity: parsed.data.quantity,
      providerVariantId: row.provider_variant_id,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Checkout failed." }, { status: 400 });
  }
}
