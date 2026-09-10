import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";

export default async function AdminProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { id } = await params;

  await ensureSchema();
  const db = getDb();
  const productResult = await db.query(`select * from pod_products where id = $1 limit 1`, [id]);
  if (!productResult.rowCount) notFound();

  const variantsResult = await db.query(
    `select * from pod_variants where product_id = $1 order by color nulls last, size nulls last`,
    [id]
  );

  const product = productResult.rows[0];
  const image = product.featured_image;
  const gallery = Array.isArray(product.gallery_images) ? product.gallery_images : [];
  const variants = variantsResult.rows;

  return (
    <main className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Private storefront preview</div>
          <h1 style={{ marginBottom: 8 }}>{product.name}</h1>
          <p className="muted" style={{ margin: 0 }}>Only you can see this preview. Product status: {product.status}.</p>
        </div>
        <a className="button" href={`/admin/products/${product.id}`}>Back to editor</a>
      </div>

      <div className="grid" style={{ marginTop: 28, alignItems: "start" }}>
        <section>
          <div className="productVisual" style={{ minHeight: 420 }}>
            {image ? <img src={image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          {gallery.length > 1 ? (
            <div className="grid" style={{ marginTop: 12 }}>
              {gallery.slice(1, 4).map((src: string) => (
                <div className="productVisual" key={src}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="eyebrow">Mom Good</div>
          <h1>{product.name}</h1>
          {product.short_description ? <p className="muted">{product.short_description}</p> : null}
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", margin: "18px 0" }}>
            <strong style={{ fontSize: 28 }}>
              {product.retail_price != null ? `${Number(product.retail_price).toFixed(2)} ${product.currency || "CAD"}` : "Price unavailable"}
            </strong>
            {product.compare_at_price != null ? (
              <span className="muted" style={{ textDecoration: "line-through" }}>
                {Number(product.compare_at_price).toFixed(2)} {product.currency || "CAD"}
              </span>
            ) : null}
          </div>
          {product.description ? <p>{product.description}</p> : null}

          {variants.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <h2>Available options</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {variants.filter((variant) => variant.available !== false).map((variant) => (
                  <span className="status" key={variant.id}>
                    {[variant.color, variant.size].filter(Boolean).join(" · ") || variant.sku || "Option"}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel" style={{ marginTop: 24 }}>
            <strong>Private preview only</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              Publishing remains a separate admin action. Checkout remains disabled until the real payment and Printful fulfillment path are connected.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
