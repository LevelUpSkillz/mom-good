import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  await ensureSchema();
  const db = getDb();
  const { rows } = await db.query(`
    select p.*,
      (select count(*)::int from pod_variants v where v.product_id = p.id) as variant_count
    from pod_products p
    order by p.updated_at desc
  `);

  const published = rows.filter((p) => p.status === "published").length;
  const drafts = rows.filter((p) => p.status !== "published" && p.status !== "archived").length;
  const syncErrors = rows.filter((p) => p.sync_status === "error").length;

  return (
    <div className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Private workspace</div>
          <h1>Mom Good Admin</h1>
          <p className="muted">Catalog, Printful imports, pricing, publication and fulfillment live here.</p>
        </div>
        <form action="/api/admin/logout" method="post"><button className="button" type="submit">Sign out</button></form>
      </div>

      <div className="adminGrid" style={{ marginTop: 28 }}>
        <div className="metric"><span className="muted">Products</span><strong>{rows.length}</strong></div>
        <div className="metric"><span className="muted">Published</span><strong>{published}</strong></div>
        <div className="metric"><span className="muted">Draft / preview</span><strong>{drafts}</strong></div>
        <div className="metric"><span className="muted">Sync errors</span><strong>{syncErrors}</strong></div>
      </div>

      <section className="panel" style={{ marginTop: 28 }}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <div className="eyebrow">Printful</div>
            <h2>Import product</h2>
            <p className="muted">Paste a Printful product or template reference. Import always creates or refreshes a private draft.</p>
          </div>
          <a className="button" href="/admin/import">Open importer</a>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Catalog</h2>
        {rows.length === 0 ? (
          <div className="panel"><p className="muted">No products yet. Import your first Printful product to begin.</p></div>
        ) : (
          <table className="table">
            <thead><tr><th>Product</th><th>Provider</th><th>Status</th><th>Sync</th><th>Variants</th><th>Price</th><th>Margin</th><th></th></tr></thead>
            <tbody>
              {rows.map((product) => {
                const retail = product.retail_price == null ? null : Number(product.retail_price);
                const base = product.base_cost == null ? null : Number(product.base_cost);
                const marginPct = retail && base != null ? ((retail - base) / retail) * 100 : null;
                return (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><div className="muted">{product.category}</div></td>
                    <td>{product.provider}</td>
                    <td><span className="status">{product.status}</span></td>
                    <td>{product.sync_status}</td>
                    <td>{product.variant_count}</td>
                    <td>{retail != null ? `${retail.toFixed(2)} ${product.currency}` : "Not set"}</td>
                    <td>{marginPct == null ? "—" : `${marginPct.toFixed(1)}%`}</td>
                    <td><a href={`/admin/products/${product.id}`}>Edit</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
