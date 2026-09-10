import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRuntimeReadiness } from "@/lib/runtime";

export default async function AdminSystemPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const readiness = getRuntimeReadiness();

  return (
    <div className="wrap">
      <div className="eyebrow">Compatibility & diagnostics</div>
      <h1>System status</h1>
      <p className="muted">Mom Good checks its optional integrations without changing or replacing working site settings.</p>

      <section className="panel" style={{ marginTop: 28 }}>
        <h2>Current capabilities</h2>
        <table className="table">
          <thead><tr><th>Capability</th><th>Status</th><th>Used for</th></tr></thead>
          <tbody>
            {readiness.capabilities.map((item) => (
              <tr key={item.key}>
                <td><strong>{item.label}</strong></td>
                <td><span className="status">{item.ready ? "Ready" : "Not configured"}</span></td>
                <td>{item.requiredFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Safe behavior</h2>
        <p className="muted">Missing integrations stay disabled instead of taking down the storefront. Supplier imports never publish automatically. Existing working integrations are not overwritten by this project.</p>
      </section>

      <p style={{ marginTop: 24 }}><a href="/admin">Back to admin</a></p>
    </div>
  );
}
