import { NextResponse } from "next/server";
import { fetchPrintfulTemplate, getPrintfulConfig } from "@/lib/printful";

export async function POST(request: Request) {
  const formData = await request.formData();
  const reference = String(formData.get("reference") || "").trim();
  const config = getPrintfulConfig();

  if (!config.connected) {
    return NextResponse.json(
      { ok: false, error: "Printful is not connected. Add the server-side PRINTFUL_API_TOKEN secret before importing." },
      { status: 503 }
    );
  }

  try {
    const supplierPayload = await fetchPrintfulTemplate(reference);
    return NextResponse.json({
      ok: true,
      status: "draft",
      message: "Supplier data fetched. It must be normalized, saved as a private draft, reviewed, priced and explicitly published before appearing in the store.",
      supplierPayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printful import failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
