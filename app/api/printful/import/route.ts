import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb, slugify } from "@/lib/db";
import { fetchPrintfulTemplate, getPrintfulConfig, normalizePrintfulTemplate } from "@/lib/printful";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
    const product = normalizePrintfulTemplate(supplierPayload);
    if (!product.externalTemplateId) throw new Error("Printful returned no template ID.");

    await ensureSchema();
    const db = getDb();
    const slugBase = slugify(product.name);
    const slug = `${slugBase}-${product.externalTemplateId}`;

    const saved = await db.query(
      `insert into pod_products
        (provider, external_product_id, external_template_id, name, slug, featured_image, gallery_images, status, sync_status, raw_supplier_payload, last_synced_at)
       values ('printful', $1, $2, $3, $4, $5, $6::jsonb, 'draft', 'synced', $7::jsonb, now())
       on conflict (provider, external_template_id) do update set
         external_product_id = excluded.external_product_id,
         name = excluded.name,
         featured_image = excluded.featured_image,
         gallery_images = excluded.gallery_images,
         sync_status = 'synced',
         raw_supplier_payload = excluded.raw_supplier_payload,
         last_synced_at = now(),
         updated_at = now()
       returning id, name, slug, status`,
      [
        product.externalProductId ?? null,
        product.externalTemplateId,
        product.name,
        slug,
        product.featuredImage ?? null,
        JSON.stringify(product.galleryImages),
        JSON.stringify(product.raw),
      ]
    );

    const productId = saved.rows[0].id;
    for (const variant of product.variants) {
      await db.query(
        `insert into pod_variants (product_id, provider_variant_id, sku, size, color, base_cost, available)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (product_id, provider_variant_id) do update set
           sku = excluded.sku,
           size = excluded.size,
           color = excluded.color,
           base_cost = excluded.base_cost,
           available = excluded.available,
           updated_at = now()`,
        [productId, variant.providerVariantId, variant.sku ?? null, variant.size ?? null, variant.color ?? null, variant.baseCost ?? null, variant.available]
      );
    }

    return NextResponse.json({ ok: true, product: saved.rows[0], message: "Imported as a private draft. Review pricing and content before publishing." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printful import failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
