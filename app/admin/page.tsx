import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { getRuntimeReadiness } from "@/lib/runtime";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const readiness = getRuntimeReadiness();
  let rows: any[] = [];
  let databaseError: string | null = null;

  if (readiness.capabilities.find((item) => item.key === "database")?.ready) {
    try {
      await ensureSchema();
      const db = getDb();
      const result = await db.query(`
        select p.*,
          (select count(*)::int from pod_variants v where v.product_id = p.id) as variant_count
        from pod_products p
        order by p.updated_at desc
      `);
      rows = result.rows;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Database connection failed.";
    }
  }

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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="button" href="/admin/orders">Orders</a>
          <a className="button" href="/admin/settings">Settings</a>
          <a className="button" href="/admin/system">System status</a>
          <form action="/api/admin/logout" method="post"><button className="button" type="submit">Sign out</button></form>
        </div>
      </div>

      {!readiness.readyForAdmin && (
        <section className="panel" style={{ marginTop: 28 }}>
          <div className="eyebrow">Setup required</div>
          <h2>Admin data features are safely paused</h2>
          <p className="muted">One or more required server settings are not configured. The storefront remains available, and Mom Good will not overwrite or replace any existing site integration. Open System status to see what is missing.</p>
        </section>
      )}

      {databaseError && (
        <section className="panel" style={{ marginTop: 28 }}>
          <div className="eyebrow">Database unavailable</div>
          <h2>Catalog editing is temporarily disabled</h2>
          <p className="muted">{databaseError}</p>
        </section>
      )}

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
          {readiness.readyForPrintfulImport ? (
            <a className="button" href="/admin/import">Open importer</a>
          ) : (
            <a className="button" href="/admin/system">Check setup</a>
          )}
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Catalog</h2>
        {rows.length === 0 ? (
          <div className="panel"><p className="muted">No products are loaded yet. Once the database and Printful are ready, import your first supplier product here.</p></div>
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
