import { publishedProducts } from "@/lib/catalog";

export default function ShopPage() {
  return (
    <div className="wrap">
      <div className="eyebrow">Mom Good Shop</div>
      <h1>Shop</h1>
      <p className="muted">Only reviewed and deliberately published products appear here.</p>
      {publishedProducts.length === 0 ? (
        <div className="panel" style={{ marginTop: 28 }}>
          <h2>No published products yet.</h2>
          <p className="muted">Import a Printful product in Admin, review the copy and pricing, then publish it when ready.</p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 28 }}>
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
    </div>
  );
}
