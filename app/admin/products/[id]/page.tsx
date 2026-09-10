import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import ProductEditor from "./ProductEditor";

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  await ensureSchema();
  const db = getDb();
  const productResult = await db.query(`select * from pod_products where id = $1`, [id]);
  if (!productResult.rowCount) notFound();
  const variants = await db.query(`select * from pod_variants where product_id = $1 order by size nulls last, color nulls last`, [id]);
  const product = productResult.rows[0];

  return (
    <main className="wrap">
      <a href="/admin" className="muted">← Back to admin</a>
      <div style={{ marginTop: 20 }}>
        <div className="eyebrow">{product.provider} · {product.sync_status}</div>
        <h1>{product.name}</h1>
        <p className="muted">Supplier ID: {product.external_template_id || product.external_product_id || "Not available"}</p>
      </div>
      <div style={{ marginTop: 28 }}><ProductEditor product={product} /></div>
      <section style={{ marginTop: 32 }}>
        <h2>Variants</h2>
        {variants.rows.length === 0 ? <div className="panel"><p className="muted">No variants imported yet.</p></div> : (
          <table className="table">
            <thead><tr><th>Provider variant</th><th>Size</th><th>Color</th><th>SKU</th><th>Available</th></tr></thead>
            <tbody>{variants.rows.map((variant) => <tr key={variant.id}><td>{variant.provider_variant_id}</td><td>{variant.size || "—"}</td><td>{variant.color || "—"}</td><td>{variant.sku || "—"}</td><td>{variant.available ? "Yes" : "No"}</td></tr>)}</tbody>
          </table>
        )}
      </section>
    </main>
  );
}
