"use client";

import { useMemo, useState } from "react";

type Variant = {
  id: string;
  providerVariantId?: string;
  size?: string;
  color?: string;
  retailPrice?: number | string | null;
  available?: boolean;
};

export default function BuyBox({
  productId,
  variants,
  checkoutReady,
}: {
  productId: string;
  variants: Variant[];
  checkoutReady: boolean;
}) {
  const available = useMemo(() => variants.filter((variant) => variant.available !== false && variant.id), [variants]);
  const [variantId, setVariantId] = useState(available[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function checkout() {
    if (!variantId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.url) throw new Error(result.error || "Checkout could not start.");
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not start.");
      setBusy(false);
    }
  }

  if (!checkoutReady) {
    return (
      <div className="panel" style={{ marginTop: 24 }}>
        <strong>Checkout is being connected.</strong>
        <p className="muted" style={{ marginBottom: 0 }}>This product is visible, but payment stays disabled until Stripe, shipping and the verified payment webhook are all ready.</p>
      </div>
    );
  }

  if (available.length === 0) {
    return <div className="panel" style={{ marginTop: 24 }}><strong>Currently unavailable.</strong></div>;
  }

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <label><strong>Option</strong>
        <select value={variantId} onChange={(event) => setVariantId(event.target.value)} style={{ width: "100%", marginTop: 8 }}>
          {available.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {[variant.color, variant.size].filter(Boolean).join(" · ") || "Standard option"}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginTop: 14 }}><strong>Quantity</strong>
        <input type="number" min={1} max={10} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} style={{ width: 110, display: "block", marginTop: 8 }} />
      </label>
      <button className="button" type="button" onClick={checkout} disabled={busy || !variantId} style={{ marginTop: 18 }}>
        {busy ? "Opening secure checkout…" : "Buy now"}
      </button>
      {message ? <p className="muted" style={{ marginBottom: 0 }}>{message}</p> : null}
    </div>
  );
}
