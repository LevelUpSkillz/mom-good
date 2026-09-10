import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  fetchPrintfulReference,
  getPrintfulConfig,
  normalizePrintfulReference,
  parsePrintfulReference,
} from "@/lib/printful";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const reference = String(formData.get("reference") || "").trim();

  try {
    const parsed = parsePrintfulReference(reference);
    const config = getPrintfulConfig();

    if (!config.connected) {
      return NextResponse.json(
        {
          ok: false,
          parsed,
          error: "Printful is not connected yet. Add PRINTFUL_API_TOKEN before previewing supplier data.",
        },
        { status: 503 }
      );
    }

    const supplier = await fetchPrintfulReference(reference);
    const normalized = normalizePrintfulReference(supplier.kind, supplier.payload);

    return NextResponse.json({
      ok: true,
      sourceKind: supplier.kind,
      parsed,
      preview: {
        name: normalized.name,
        featuredImage: normalized.featuredImage ?? null,
        galleryImages: normalized.galleryImages,
        variantCount: normalized.variants.length,
        variants: normalized.variants.slice(0, 12),
        externalProductId: normalized.externalProductId ?? null,
        externalTemplateId: normalized.externalTemplateId ?? null,
      },
      writesPerformed: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect Printful reference.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
