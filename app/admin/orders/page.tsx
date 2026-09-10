import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { getRuntimeReadiness } from "@/lib/runtime";

export default async function OrdersPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const readiness = getRuntimeReadiness();
  const databaseReady = readiness.capabilities.find((item) => item.key === "database")?.ready;
  let orders: any[] = [];
  let error: string | null = null;

  if (databaseReady) {
    try {
      await ensureSchema();
      const db = getDb();
      const result = await db.query(`
        select o.*,
          (select count(*)::int from pod_order_items i where i.order_id = o.id) as item_count
        from pod_orders o
        order by o.created_at desc
        limit 100
      `);
      orders = result.rows;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Unable to load orders.";
    }
  }

  return (
    <main className="wrap">
      <div className="eyebrow">Operations</div>
      <h1>Orders & fulfillment</h1>
      <p className="muted">This area is backed by real order tables. No fake checkout and no automatic Printful submission are enabled yet.</p>

      {!databaseReady ? (
        <section className="panel" style={{ marginTop: 28 }}>
          <h2>Database not connected</h2>
          <p className="muted">Order storage will activate automatically once the configured database is available.</p>
        </section>
      ) : error ? (
        <section className="panel" style={{ marginTop: 28 }}><p>{error}</p></section>
      ) : orders.length === 0 ? (
        <section className="panel" style={{ marginTop: 28 }}>
          <h2>No orders yet</h2>
          <p className="muted">That is expected until a real payment flow is connected. Mom Good will never invent order data.</p>
        </section>
      ) : (
        <table className="table" style={{ marginTop: 28 }}>
          <thead><tr><th>Order</th><th>Status</th><th>Customer</th><th>Items</th><th>Total</th><th>Created</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>{String(order.id).slice(0, 8)}</strong></td>
                <td><span className="status">{order.status}</span></td>
                <td>{order.customer_email || "—"}</td>
                <td>{order.item_count}</td>
                <td>{order.total_amount == null ? "—" : `${Number(order.total_amount).toFixed(2)} ${order.currency}`}</td>
                <td>{new Date(order.created_at).toLocaleString("en-CA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 24 }}><a href="/admin">Back to admin</a></p>
    </main>
  );
}
