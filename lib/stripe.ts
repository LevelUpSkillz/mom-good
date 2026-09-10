import { createHmac, timingSafeEqual } from "crypto";

export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    shippingRateId: process.env.STRIPE_SHIPPING_RATE_ID?.trim(),
    checkoutEnabled: process.env.CHECKOUT_ENABLED?.trim().toLowerCase() === "true",
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX?.trim().toLowerCase() === "true",
  };
}

export async function createStripeCheckoutSession(input: {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  unitAmountCents: number;
  currency: string;
  quantity: number;
  providerVariantId: string;
}) {
  const config = getStripeConfig();
  if (!config.checkoutEnabled) throw new Error("Checkout is disabled.");
  if (!config.secretKey) throw new Error("Stripe is not configured.");
  if (!config.shippingRateId) throw new Error("Stripe shipping rate is not configured.");

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${siteUrl}/shop/${encodeURIComponent(input.productSlug)}`);
  body.set("customer_creation", "always");
  body.set("shipping_address_collection[allowed_countries][0]", "CA");
  body.set("shipping_address_collection[allowed_countries][1]", "US");
  body.set("shipping_options[0][shipping_rate]", config.shippingRateId);
  body.set("line_items[0][quantity]", String(input.quantity));
  body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(input.unitAmountCents));
  body.set("line_items[0][price_data][product_data][name]", input.productName);
  body.set("metadata[product_id]", input.productId);
  body.set("metadata[variant_id]", input.variantId);
  body.set("metadata[provider_variant_id]", input.providerVariantId);
  body.set("metadata[quantity]", String(input.quantity));
  if (config.automaticTax) body.set("automatic_tax[enabled]", "true");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload?.url || !payload?.id) {
    const message = payload?.error?.message || `Stripe checkout failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as { id: string; url: string };
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = getStripeConfig().webhookSecret;
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  if (!signatureHeader) throw new Error("Missing Stripe signature.");

  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) throw new Error("Invalid Stripe signature header.");

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error("Stripe signature timestamp is outside the allowed window.");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((candidate) => {
    try {
      const candidateBuffer = Buffer.from(candidate, "hex");
      return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });

  if (!valid) throw new Error("Invalid Stripe signature.");
}
