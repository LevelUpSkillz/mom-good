export default function ImportPage() {
  return (
    <div className="wrap">
      <div className="eyebrow">Printful importer</div>
      <h1>Import a POD product</h1>
      <p className="muted">Paste a Printful product/template URL or reference. Mom Good will import it as a private draft for review.</p>

      <section className="panel" style={{maxWidth:760,marginTop:28}}>
        <form action="/api/printful/import" method="post">
          <label htmlFor="reference"><strong>Printful reference</strong></label>
          <input id="reference" name="reference" placeholder="https://www.printful.com/.../123456 or 123456" style={{width:"100%",margin:"12px 0 18px",padding:14,borderRadius:12,border:"1px solid var(--line)",fontSize:"1rem"}} required />
          <button className="button" type="submit">Import from Printful</button>
        </form>
        <p className="muted" style={{marginTop:18}}>Import never publishes automatically. Supplier data stays private until title, copy, variants and retail pricing are reviewed.</p>
      </section>
    </div>
  );
}
