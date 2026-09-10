"use client";

import { useMemo, useState } from "react";

export default function ProductEditor({ product }: { product: any }) {
  const [name, setName] = useState(product.name || "");
  const [shortDescription, setShortDescription] = useState(product.short_description || "");
  const [description, setDescription] = useState(product.description || "");
  const [retailPrice, setRetailPrice] = useState(product.retail_price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(product.compare_at_price ?? "");
  const [status, setStatus] = useState(product.status || "draft");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const base = product.base_cost == null ? null : Number(product.base_cost);
  const retail = retailPrice === "" ? null : Number(retailPrice);
  const compareAt = compareAtPrice === "" ? null : Number(compareAtPrice);
  const canPublish = Boolean(name.trim()) && retail != null && Number.isFinite(retail) && retail > 0;

  const margin = useMemo(() => {
    if (base == null || retail == null || !Number.isFinite(retail)) return null;
    return { amount: retail - base, percent: retail > 0 ? ((retail - base) / retail) * 100 : 0 };
  }, [base, retail]);

  async function save(nextStatus = status) {
    if (nextStatus === "published" && !canPublish) {
      setMessage("Add a valid product name and retail price before publishing.");
      return;
    }
    if (compareAt != null && retail != null && compareAt < retail) {
      setMessage("Compare-at price should be equal to or higher than the retail price.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          shortDescription,
          description,
          retailPrice: retailPrice === "" ? null : Number(retailPrice),
          compareAtPrice: compareAtPrice === "" ? null : Number(compareAtPrice),
          status: nextStatus,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Save failed.");
      setStatus(nextStatus);
      setMessage(nextStatus === "published" ? "Published successfully." : "Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Merchandising</div>
          <h2>Edit product</h2>
        </div>
        <a className="button" href={`/admin/products/${product.id}/preview`} target="_blank" rel="noreferrer">Private preview</a>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Short description<textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} /></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          <label>Base cost<input value={base ?? "Not available"} disabled /></label>
          <label>Retail price<input type="number" min="0" step="0.01" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} /></label>
          <label>Compare-at price<input type="number" min="0" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} /></label>
          <label>Status<input value={status} disabled /></label>
        </div>

        <div className="metric">
          <span className="muted">Estimated gross margin</span>
          <strong>{margin ? `${margin.amount.toFixed(2)} CAD · ${margin.percent.toFixed(1)}%` : "Add cost + retail price"}</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="button" type="button" onClick={() => save("draft")} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button className="button" type="button" onClick={() => save("preview")} disabled={saving}>
            Save for preview
          </button>
          <button className="button" type="button" onClick={() => save("published")} disabled={saving || !canPublish}>
            Publish
          </button>
          {status === "published" ? (
            <button className="button" type="button" onClick={() => save("draft")} disabled={saving}>Unpublish</button>
          ) : null}
        </div>

        <p className="muted" style={{ margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
