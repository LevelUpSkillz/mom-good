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
  const margin = useMemo(() => {
    if (base == null || retail == null || !Number.isFinite(retail)) return null;
    return { amount: retail - base, percent: retail > 0 ? ((retail - base) / retail) * 100 : 0 };
  }, [base, retail]);

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        shortDescription,
        description,
        retailPrice: retailPrice === "" ? null : Number(retailPrice),
        compareAtPrice: compareAtPrice === "" ? null : Number(compareAtPrice),
        status,
      }),
    });
    const result = await response.json();
    setSaving(false);
    setMessage(result.ok ? "Saved." : result.error || "Save failed.");
  }

  return (
    <div className="panel">
      <div className="eyebrow">Merchandising</div>
      <h2>Edit product</h2>
      <div style={{ display: "grid", gap: 16 }}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Short description<textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} /></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          <label>Base cost<input value={base ?? "Not available"} disabled /></label>
          <label>Retail price<input type="number" min="0" step="0.01" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} /></label>
          <label>Compare-at price<input type="number" min="0" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} /></label>
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="preview">Preview</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        </div>
        <div className="metric">
          <span className="muted">Estimated gross margin</span>
          <strong>{margin ? `${margin.amount.toFixed(2)} CAD · ${margin.percent.toFixed(1)}%` : "Add cost + retail price"}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button className="button" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          <span className="muted">{message}</span>
        </div>
      </div>
    </div>
  );
}
