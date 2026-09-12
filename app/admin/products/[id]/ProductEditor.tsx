"use client";

import { useMemo, useState } from "react";

type VariantDraft = { id: string; provider_variant_id: string; sku?: string; size?: string; color?: string; base_cost?: number | string | null; retail_price?: number | string | null; available: boolean };

export default function ProductEditor({ product, variants }: { product: any; variants: VariantDraft[] }) {
  const [name, setName] = useState(product.name || "");
  const [shortDescription, setShortDescription] = useState(product.short_description || "");
  const [description, setDescription] = useState(product.description || "");
  const [retailPrice, setRetailPrice] = useState(product.retail_price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(product.compare_at_price ?? "");
  const [status, setStatus] = useState(product.status || "draft");
  const [slug, setSlug] = useState(product.slug || "");
  const [category, setCategory] = useState(product.category || "Apparel");
  const [collectionName, setCollectionName] = useState(product.collection_name || "");
  const [badge, setBadge] = useState(product.badge || "");
  const [materials, setMaterials] = useState(product.materials || "");
  const [careInstructions, setCareInstructions] = useState(product.care_instructions || "");
  const [shippingNote, setShippingNote] = useState(product.shipping_note || "");
  const [seoTitle, setSeoTitle] = useState(product.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(product.seo_description || "");
  const [featured, setFeatured] = useState(Boolean(product.featured));
  const [sortOrder, setSortOrder] = useState(product.sort_order ?? 100);
  const [tags, setTags] = useState(Array.isArray(product.tags) ? product.tags.join(", ") : "");
  const [variantDrafts, setVariantDrafts] = useState(variants);
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
          slug, category, collectionName, badge, materials, careInstructions, shippingNote,
          seoTitle, seoDescription, featured, sortOrder: Number(sortOrder),
          tags: tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
          variants: variantDrafts.map((variant) => ({
            id: variant.id,
            available: variant.available,
            retailPrice: variant.retail_price === "" || variant.retail_price == null ? null : Number(variant.retail_price),
          })),
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
    <div className="editorShell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Merchandising</div>
          <h2>Edit product</h2>
        </div>
        <a className="button" href={`/admin/products/${product.id}/preview`} target="_blank" rel="noreferrer">Private preview</a>
      </div>

      <div className="editorGrid">
       <div className="editorMain">
        <section className="panel formSection">
        <div><span className="sectionNumber">01</span><h3>Product story</h3><p className="muted">The customer-facing name and narrative.</p></div>
        <label>Product name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Short selling line <span className="fieldHint">Shown on collection cards</span><textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} /></label>
        <label>Full description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} /></label>
        </section>

        <section className="panel formSection">
        <div><span className="sectionNumber">02</span><h3>Merchandising</h3><p className="muted">Control where and how this item is presented.</p></div>
        <div className="formColumns">
          <label>Category<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
          <label>Collection<input value={collectionName} onChange={(e) => setCollectionName(e.target.value)} placeholder="The Off-Duty Edit" /></label>
          <label>Badge<input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="New · Limited · Bestseller" maxLength={40} /></label>
          <label>Display order<input type="number" min="0" max="9999" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
        </div>
        <label>Search & filter tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="mom life, gift, hoodie, funny" /></label>
        <label className="toggleRow"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /><span><strong>Feature this product</strong><small>Give it priority in the storefront collection.</small></span></label>
        </section>

        <section className="panel formSection">
        <div><span className="sectionNumber">03</span><h3>Product details</h3><p className="muted">Useful purchase information that reduces hesitation.</p></div>
        <label>Materials<textarea value={materials} onChange={(e) => setMaterials(e.target.value)} rows={3} /></label>
        <label>Care instructions<textarea value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} rows={3} /></label>
        <label>Production & shipping note<textarea value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} rows={3} /></label>
        </section>

        <section className="panel formSection">
        <div><span className="sectionNumber">04</span><h3>Variants</h3><p className="muted">Hide unavailable options or override pricing without changing Printful data.</p></div>
        <div className="variantList">
          {variantDrafts.length === 0 ? <p className="muted">No supplier variants imported.</p> : variantDrafts.map((variant, index) => (
            <div className="variantRow" key={variant.id}>
              <label className="variantToggle"><input type="checkbox" checked={variant.available} onChange={(e) => setVariantDrafts((current) => current.map((item, i) => i === index ? {...item, available: e.target.checked} : item))} /><span /></label>
              <div><strong>{[variant.color, variant.size].filter(Boolean).join(" · ") || variant.sku || "Standard"}</strong><small>{variant.sku || `Printful ${variant.provider_variant_id}`}</small></div>
              <label>Cost<input value={variant.base_cost ?? "—"} disabled /></label>
              <label>Retail<input type="number" min="0" step="0.01" value={variant.retail_price ?? ""} placeholder={String(retailPrice || "Default")} onChange={(e) => setVariantDrafts((current) => current.map((item, i) => i === index ? {...item, retail_price: e.target.value} : item))} /></label>
            </div>
          ))}
        </div>
        </section>

        <section className="panel formSection">
        <div><span className="sectionNumber">05</span><h3>Search preview</h3><p className="muted">Fine-tune how the product can appear in search.</p></div>
        <label>URL slug<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></label>
        <label>SEO title <span className="fieldHint">{seoTitle.length}/70</span><input value={seoTitle} maxLength={70} onChange={(e) => setSeoTitle(e.target.value)} /></label>
        <label>SEO description <span className="fieldHint">{seoDescription.length}/170</span><textarea value={seoDescription} maxLength={170} onChange={(e) => setSeoDescription(e.target.value)} rows={3} /></label>
        <div className="searchPreview"><span>getlevelupskillz.com › mom-good › {slug}</span><strong>{seoTitle || name}</strong><p>{seoDescription || shortDescription}</p></div>
        </section>
       </div>

       <aside className="editorAside">
        <section className="panel formSection stickyPanel">
        <div><h3>Pricing & publication</h3><p className="muted">Changes stay private until you publish.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          <label>Base cost<input value={base ?? "Not available"} disabled /></label>
          <label>Retail price<input type="number" min="0" step="0.01" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} /></label>
          <label>Compare-at price<input type="number" min="0" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} /></label>
          <label>Status<span className={`status status-${status}`}>{status}</span></label>
        </div>

        <div className="metric">
          <span className="muted">Estimated gross margin</span>
          <strong>{margin ? `${margin.amount.toFixed(2)} CAD · ${margin.percent.toFixed(1)}%` : "Add cost + retail price"}</strong>
        </div>

        <div className="actionStack">
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

        <p className="saveMessage" aria-live="polite">{message}</p>
        </section>
       </aside>
      </div>
    </div>
  );
}
