import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb, slugify } from "@/lib/db";
import {
  fetchPrintfulReference,
  getPrintfulConfig,
  normalizePrintfulReference,
} from "@/lib/printful";

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
    const supplier = await fetchPrintfulReference(reference);
    const product = normalizePrintfulReference(supplier.kind, supplier.payload);
    const supplierId = supplier.kind === "template"
      ? product.externalTemplateId
      : product.externalProductId;

    if (!supplierId) {
      throw new Error(`Printful returned no ${supplier.kind === "template" ? "template" : "product"} ID.`);
    }

    await ensureSchema();
    const db = getDb();
    const slug = `${slugify(product.name)}-${supplier.kind === "template" ? "t" : "p"}-${supplierId}`;

    const existing = await db.query(
      supplier.kind === "template"
        ? `select id, status from pod_products where provider = 'printful' and external_template_id = $1 limit 1`
        : `select id, status from pod_products where provider = 'printful' and external_product_id = $1 and external_template_id is null limit 1`,
      [supplierId]
    );

    let saved;
    if (existing.rows[0]) {
      saved = await db.query(
        `update pod_products set
          external_product_id = $2,
          external_template_id = $3,
          name = $4,
          featured_image = $5,
          gallery_images = $6::jsonb,
          sync_status = 'synced',
          raw_supplier_payload = $7::jsonb,
          last_synced_at = now(),
          updated_at = now()
        where id = $1
        returning id, name, slug, status`,
        [
          existing.rows[0].id,
          product.externalProductId ?? null,
          product.externalTemplateId ?? null,
          product.name,
          product.featuredImage ?? null,
          JSON.stringify(product.galleryImages),
          JSON.stringify(product.raw),
        ]
      );
    } else {
      saved = await db.query(
        `insert into pod_products
          (provider, external_product_id, external_template_id, name, slug, featured_image, gallery_images, status, sync_status, raw_supplier_payload, last_synced_at)
         values ('printful', $1, $2, $3, $4, $5, $6::jsonb, 'draft', 'synced', $7::jsonb, now())
         returning id, name, slug, status`,
        [
          product.externalProductId ?? null,
          product.externalTemplateId ?? null,
          product.name,
          slug,
          product.featuredImage ?? null,
          JSON.stringify(product.galleryImages),
          JSON.stringify(product.raw),
        ]
      );
    }

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
        [
          productId,
          variant.providerVariantId,
          variant.sku ?? null,
          variant.size ?? null,
          variant.color ?? null,
          variant.baseCost ?? null,
          variant.available,
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      sourceKind: supplier.kind,
      product: saved.rows[0],
      message: existing.rows[0]
        ? "Printful data synchronized. Your Mom Good merchandising and publication state were preserved."
        : "Imported as a private draft. Review pricing and content before publishing.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printful import failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
