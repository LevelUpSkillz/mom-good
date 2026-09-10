import { publishedProducts } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="wrap">
      <section className="hero">
        <div className="panel">
          <div className="eyebrow">Mom Good</div>
          <h1>Good things for real family life.</h1>
          <p>Warm, useful print-on-demand pieces with a little personality and zero fake perfection.</p>
          <a className="button" href="/shop">Shop Mom Good</a>
        </div>
        <div className="panel">
          <div className="eyebrow">Built differently</div>
          <h2>Curated, not dumped.</h2>
          <p className="muted">Products imported from POD suppliers stay private until they are reviewed, priced and deliberately published.</p>
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <div className="eyebrow">Published collection</div>
        <h2>Shop</h2>
        {publishedProducts.length === 0 ? (
          <div className="panel">
            <strong>First drop coming soon.</strong>
            <p className="muted">Nothing is public until it has passed the Mom Good review flow.</p>
          </div>
        ) : (
          <div className="grid">
            {publishedProducts.map((product) => (
              <article className="productCard" key={product.id}>
                <div className="productVisual" />
                <div className="productBody">
                  <h3>{product.name}</h3>
                  <p className="muted">{product.shortDescription}</p>
                  <strong>{product.retailPrice?.toFixed(2)} {product.currency}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
