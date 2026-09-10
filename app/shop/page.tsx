import { getRuntimeReadiness } from "@/lib/runtime";
import { getDb } from "@/lib/db";
import { publishedProducts as fallbackProducts } from "@/lib/catalog";

async function loadPublishedProducts() {
  const readiness = getRuntimeReadiness();
  if (!readiness.capabilities.find((item) => item.key === "database")?.ready) {
    return fallbackProducts;
  }

  try {
    const db = getDb();
    const { rows } = await db.query(`
      select id, name, slug, short_description, description, featured_image,
             retail_price, compare_at_price, currency, category
      from pod_products
      where status = 'published'
      order by updated_at desc
    `);
    return rows;
  } catch {
    return fallbackProducts;
  }
}

export default async function ShopPage() {
  const products = await loadPublishedProducts();

  return (
    <div className="wrap">
      <div className="eyebrow">Mom Good Shop</div>
      <h1>Shop</h1>
      <p className="muted">Only reviewed and deliberately published products appear here.</p>
      {products.length === 0 ? (
        <div className="panel" style={{ marginTop: 28 }}>
          <h2>No published products yet.</h2>
          <p className="muted">Import a Printful product in Admin, review the copy and pricing, then publish it when ready.</p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 28 }}>
          {products.map((product: any) => {
            const price = product.retail_price ?? product.retailPrice;
            const compareAt = product.compare_at_price ?? product.compareAtPrice;
            const description = product.short_description ?? product.shortDescription;
            const image = product.featured_image ?? product.featuredImage;
            return (
              <a href={`/shop/${product.slug}`} className="productCard" key={product.id} style={{ color: "inherit", textDecoration: "none" }}>
                <div className="productVisual">
                  {image ? <img src={image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
                <div className="productBody">
                  <h3>{product.name}</h3>
                  <p className="muted">{description}</p>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <strong>{price != null ? `${Number(price).toFixed(2)} ${product.currency}` : "Price coming soon"}</strong>
                    {compareAt != null ? <span className="muted" style={{ textDecoration: "line-through" }}>{Number(compareAt).toFixed(2)} {product.currency}</span> : null}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
