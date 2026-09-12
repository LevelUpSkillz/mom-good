import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRuntimeReadiness } from "@/lib/runtime";
import { getPrintfulConfig } from "@/lib/printful";

export default async function SettingsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const readiness = getRuntimeReadiness();
  const printful = getPrintfulConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "Not configured";

  return (
    <main className="wrap">
      <div className="eyebrow">Configuration</div>
      <h1>Settings</h1>
      <p className="muted">Read-only configuration summary. Secrets stay server-side and are never displayed here.</p>

      <section className="panel" style={{ marginTop: 28 }}>
        <h2>Storefront</h2>
        <table className="table">
          <tbody>
            <tr><th>Default currency</th><td>CAD</td></tr>
            <tr><th>Public site URL</th><td>{siteUrl}</td></tr>
            <tr><th>Checkout</th><td><span className="status">Not enabled</span></td></tr>
            <tr><th>Automatic fulfillment</th><td><span className="status">Not enabled</span></td></tr>
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Printful</h2>
        <table className="table">
          <tbody>
            <tr><th>Connection</th><td><span className="status">{printful.connected ? "Configured" : "Not configured"}</span></td></tr>
            <tr><th>Store scope</th><td>{printful.storeId ? "Store ID configured" : "No explicit store ID"}</td></tr>
          </tbody>
        </table>
        <p className="muted">The token itself is intentionally never shown in the admin UI.</p>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Runtime readiness</h2>
        <table className="table">
          <thead><tr><th>Capability</th><th>Status</th><th>Purpose</th></tr></thead>
          <tbody>
            {readiness.capabilities.map((item) => (
              <tr key={item.key}><td>{item.label}</td><td><span className="status">{item.ready ? "Ready" : "Not configured"}</span></td><td>{item.requiredFor}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ marginTop: 24 }}><a href="/admin">Back to admin</a></p>
    </main>
  );
}
