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
             retail_price, compare_at_price, currency, category, collection_name,
             badge, featured, sort_order
      from pod_products
      where status = 'published'
      order by featured desc, sort_order asc, updated_at desc
    `);
    return rows;
  } catch {
    return fallbackProducts;
  }
}

export default async function ShopPage() {
  const products = await loadPublishedProducts();

  return (
    <div className="wrap shopWrap">
      <section className="shopHero">
        <div>
          <div className="eyebrow">The Mom Good collection</div>
          <h1>Wear the truth.<br/><em>Keep the good.</em></h1>
          <p>Thoughtful pieces for the women doing a lot—and done pretending it’s effortless.</p>
        </div>
        <div className="shopNote"><span>Small-batch energy</span><strong>Made when you order</strong><p>No warehouse piles. Each piece begins with you.</p></div>
      </section>
      {products.length === 0 ? (
        <div className="panel" style={{ marginTop: 28 }}>
          <h2>No published products yet.</h2>
          <p className="muted">Import a Printful product in Admin, review the copy and pricing, then publish it when ready.</p>
        </div>
      ) : (
        <>
        <div className="collectionHeader"><span>{products.length} piece{products.length === 1 ? "" : "s"}</span><span>Designed for real life</span></div>
        <div className="productGrid">
          {products.map((product: any) => {
            const price = product.retail_price ?? product.retailPrice;
            const compareAt = product.compare_at_price ?? product.compareAtPrice;
            const description = product.short_description ?? product.shortDescription;
            const image = product.featured_image ?? product.featuredImage;
            return (
              <a href={`/shop/${product.slug}`} className="productCard premiumCard" key={product.id}>
                <div className="productVisual">
                  {image ? <img src={image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  {product.badge ? <span className="productBadge">{product.badge}</span> : null}
                  <span className="quickView">View piece →</span>
                </div>
                <div className="productBody">
                  <span className="cardMeta">{product.collection_name || product.category}</span>
                  <h3>{product.name}</h3>
                  <p className="muted">{description}</p>
                  <div className="priceLine">
                    <strong>{price != null ? `${Number(price).toFixed(2)} ${product.currency}` : "Price coming soon"}</strong>
                    {compareAt != null ? <span className="muted" style={{ textDecoration: "line-through" }}>{Number(compareAt).toFixed(2)} {product.currency}</span> : null}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
