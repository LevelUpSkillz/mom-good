import { notFound } from "next/navigation";
import { getRuntimeReadiness } from "@/lib/runtime";
import { getDb } from "@/lib/db";
import { publishedProducts as fallbackProducts } from "@/lib/catalog";
import BuyBox from "./BuyBox";
import type { Metadata } from "next";

async function loadProduct(slug: string) {
  const readiness = getRuntimeReadiness();
  const databaseReady = readiness.capabilities.find((item) => item.key === "database")?.ready;

  if (databaseReady) {
    try {
      const db = getDb();
      const { rows } = await db.query(
        `select p.*,
          coalesce(
            json_agg(
              json_build_object(
                'id', v.id,
                'providerVariantId', v.provider_variant_id,
                'sku', v.sku,
                'size', v.size,
                'color', v.color,
                'retailPrice', v.retail_price,
                'available', v.available,
                'image', v.image
              ) order by v.created_at
            ) filter (where v.id is not null),
            '[]'::json
          ) as variants
         from pod_products p
         left join pod_variants v on v.product_id = p.id
         where p.slug = $1 and p.status = 'published'
         group by p.id
         limit 1`,
        [slug]
      );
      if (rows[0]) return rows[0];
    } catch {
      // Fall through to the safe local catalog.
    }
  }

  return fallbackProducts.find((product) => product.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product: any = await loadProduct(slug);
  if (!product) return {};
  return {
    title: product.seo_title || `${product.name} | Mom Good`,
    description: product.seo_description || product.short_description || product.shortDescription,
    openGraph: { images: product.featured_image ? [product.featured_image] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product: any = await loadProduct(slug);
  if (!product) notFound();

  const readiness = getRuntimeReadiness();
  const name = product.name;
  const description = product.description || product.short_description || product.shortDescription || "";
  const shortDescription = product.short_description ?? product.shortDescription ?? "";
  const image = product.featured_image ?? product.featuredImage;
  const gallery = product.gallery_images ?? product.galleryImages ?? [];
  const retailPrice = product.retail_price ?? product.retailPrice;
  const compareAtPrice = product.compare_at_price ?? product.compareAtPrice;
  const currency = product.currency || "CAD";
  const variants = product.variants || [];
  const persistentProduct = typeof product.id === "string" && product.id.includes("-");

  return (
    <div className="wrap productPage">
      <a href="/shop" className="muted">← Back to shop</a>
      <div className="productDetailGrid">
        <section className="productGallery">
          <div className="productVisual productHeroImage">
            {image ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          {Array.isArray(gallery) && gallery.length > 1 ? (
            <div className="grid" style={{ marginTop: 12 }}>
              {gallery.slice(1, 4).map((src: string) => (
                <div className="productVisual" key={src}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="productInfo">
          <div className="eyebrow">{product.collection_name || "Mom Good"}</div>
          {product.badge ? <span className="productBadge staticBadge">{product.badge}</span> : null}
          <h1>{name}</h1>
          {shortDescription ? <p className="muted">{shortDescription}</p> : null}
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", margin: "18px 0" }}>
            <strong style={{ fontSize: 28 }}>{retailPrice != null ? `${Number(retailPrice).toFixed(2)} ${currency}` : "Price unavailable"}</strong>
            {compareAtPrice != null ? <span className="muted" style={{ textDecoration: "line-through" }}>{Number(compareAtPrice).toFixed(2)} {currency}</span> : null}
          </div>
          {description ? <p className="productDescription">{description}</p> : null}

          {variants.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <h2>Available options</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {variants.filter((variant: any) => variant.available !== false).map((variant: any) => (
                  <span className="status" key={variant.id || variant.providerVariantId}>
                    {[variant.color, variant.size].filter(Boolean).join(" · ") || "Option"}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {persistentProduct ? (
            <BuyBox productId={product.id} variants={variants} checkoutReady={readiness.readyForCheckout} />
          ) : (
            <div className="panel" style={{ marginTop: 24 }}>
              <strong>Preview product.</strong>
              <p className="muted" style={{ marginBottom: 0 }}>Checkout is only available for real published products stored in Mom Good.</p>
            </div>
          )}
          {(product.materials || product.care_instructions || product.shipping_note) ? (
            <div className="detailAccordions">
              {product.materials ? <details open><summary>Materials & feel</summary><p>{product.materials}</p></details> : null}
              {product.care_instructions ? <details><summary>Care</summary><p>{product.care_instructions}</p></details> : null}
              {product.shipping_note ? <details><summary>Made & shipped</summary><p>{product.shipping_note}</p></details> : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
