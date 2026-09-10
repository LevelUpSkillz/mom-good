"use client";

import { useState } from "react";

type PreviewResponse = {
  ok: boolean;
  sourceKind?: "template" | "store_product";
  error?: string;
  preview?: {
    name: string;
    featuredImage: string | null;
    galleryImages: string[];
    variantCount: number;
    variants: Array<{
      providerVariantId: string;
      sku?: string;
      size?: string;
      color?: string;
      baseCost?: number;
      available: boolean;
    }>;
    externalProductId: string | null;
    externalTemplateId: string | null;
  };
};

type ImportResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
};

export default function ImportClient() {
  const [reference, setReference] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function inspect() {
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("reference", reference);
      const response = await fetch("/api/printful/preview", { method: "POST", body });
      const data = (await response.json()) as PreviewResponse;
      setPreview(data);
    } catch {
      setPreview({ ok: false, error: "Unable to inspect this Printful reference." });
    } finally {
      setBusy(false);
    }
  }

  async function importDraft() {
    setImporting(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("reference", reference);
      const response = await fetch("/api/printful/import", { method: "POST", body });
      const data = (await response.json()) as ImportResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Import failed.");
      if (!data.product?.id) throw new Error("Import completed but no Mom Good product ID was returned.");

      setMessage(data.message || "Imported as a private draft. Opening product editor…");
      window.location.assign(`/admin/products/${encodeURIComponent(data.product.id)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
      setImporting(false);
    }
  }

  return (
    <section className="panel" style={{ maxWidth: 860, marginTop: 28 }}>
      <label htmlFor="reference"><strong>Printful product or template link</strong></label>
      <input
        id="reference"
        name="reference"
        value={reference}
        onChange={(event) => {
          setReference(event.target.value);
          setPreview(null);
          setMessage("");
        }}
        placeholder="Paste a Printful URL, template:123456 or product:123456"
        style={{ width: "100%", margin: "12px 0 18px", padding: 14, borderRadius: 12, border: "1px solid var(--line)", fontSize: "1rem" }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="button" type="button" onClick={inspect} disabled={busy || !reference.trim()}>
          {busy ? "Checking…" : "Check product"}
        </button>
        {preview?.ok ? (
          <button className="button" type="button" onClick={importDraft} disabled={importing}>
            {importing ? "Importing…" : "Import as draft"}
          </button>
        ) : null}
      </div>

      {preview ? (
        <div className="panel" style={{ marginTop: 22 }}>
          {preview.ok && preview.preview ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr", gap: 24, alignItems: "start" }}>
              <div>
                {preview.preview.featuredImage ? (
                  <img src={preview.preview.featuredImage} alt={preview.preview.name} style={{ width: "100%", borderRadius: 14, display: "block" }} />
                ) : (
                  <div className="productVisual" />
                )}
              </div>
              <div>
                <div className="eyebrow">Detected: {preview.sourceKind === "store_product" ? "Printful store product" : "Printful template"}</div>
                <h2 style={{ marginTop: 8 }}>{preview.preview.name}</h2>
                <p className="muted">{preview.preview.variantCount} supplier variant{preview.preview.variantCount === 1 ? "" : "s"} detected.</p>
                {preview.preview.variants.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    {preview.preview.variants.map((variant) => (
                      <span className="status" key={variant.providerVariantId}>
                        {[variant.size, variant.color].filter(Boolean).join(" · ") || variant.sku || `Variant ${variant.providerVariantId}`}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="muted" style={{ marginTop: 18 }}>
                  This check is read-only. Nothing has been added to Mom Good yet.
                </p>
              </div>
            </div>
          ) : (
            <p>{preview.error}</p>
          )}
        </div>
      ) : null}

      {message ? <p style={{ marginTop: 18 }}>{message}</p> : null}
      <p className="muted" style={{ marginTop: 18 }}>
        Import never publishes automatically. Supplier data stays private until title, copy, variants and retail pricing are reviewed.
      </p>
    </section>
  );
}
