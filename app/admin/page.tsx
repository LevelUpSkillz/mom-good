import { products } from "@/lib/catalog";

export default function AdminPage() {
  const published = products.filter((p) => p.status === "published").length;
  const drafts = products.filter((p) => p.status !== "published").length;
  const syncErrors = products.filter((p) => p.syncStatus === "error").length;

  return (
    <div className="wrap">
      <div className="eyebrow">Private workspace</div>
      <h1>Mom Good Admin</h1>
      <p className="muted">Catalog, Printful imports, pricing, publication and fulfillment live here.</p>

      <div className="adminGrid" style={{ marginTop: 28 }}>
        <div className="metric"><span className="muted">Products</span><strong>{products.length}</strong></div>
        <div className="metric"><span className="muted">Published</span><strong>{published}</strong></div>
        <div className="metric"><span className="muted">Draft / preview</span><strong>{drafts}</strong></div>
        <div className="metric"><span className="muted">Sync errors</span><strong>{syncErrors}</strong></div>
      </div>

      <section className="panel" style={{ marginTop: 28 }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <div className="eyebrow">Printful</div>
            <h2>Import product</h2>
            <p className="muted">Paste a Printful product or template reference. Import creates a private draft. Publication is always a separate action.</p>
          </div>
          <a className="button" href="/admin/import">Open importer</a>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Catalog</h2>
        <table className="table">
          <thead><tr><th>Product</th><th>Provider</th><th>Store status</th><th>Sync</th><th>Price</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><strong>{product.name}</strong><div className="muted">{product.category}</div></td>
                <td>{product.provider}</td>
                <td><span className="status">{product.status}</span></td>
                <td>{product.syncStatus}</td>
                <td>{product.retailPrice ? `${product.retailPrice.toFixed(2)} ${product.currency}` : "Not set"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
