import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div className="wrap">
      <div className="eyebrow">Printful importer</div>
      <h1>Import a POD product</h1>
      <p className="muted">
        Paste a Printful product or template link. Mom Good inspects it first, then you can import it as a private draft.
      </p>
      <ImportClient />
      <p style={{ marginTop: 24 }}><a href="/admin">Back to admin</a></p>
    </div>
  );
}
