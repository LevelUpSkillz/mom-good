export default function AdminLoginPage() {
  return (
    <main className="wrap" style={{ maxWidth: 520 }}>
      <div className="eyebrow">Mom Good</div>
      <h1>Admin sign in</h1>
      <p className="muted">Private access for catalog, Printful imports, pricing and publishing.</p>
      <form action="/api/admin/login" method="post" className="panel" style={{ marginTop: 24 }}>
        <label htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" style={{ width: "100%", margin: "12px 0 18px" }} />
        <button className="button" type="submit">Sign in</button>
      </form>
    </main>
  );
}
