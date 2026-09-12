import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";

const UpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  category: z.string().trim().min(1).optional(),
  collectionName: z.string().optional(),
  badge: z.string().max(40).optional(),
  materials: z.string().optional(),
  careInstructions: z.string().optional(),
  shippingNote: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(170).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  variants: z.array(z.object({
    id: z.string().uuid(),
    available: z.boolean(),
    retailPrice: z.coerce.number().nonnegative().nullable(),
  })).max(500).optional(),
  retailPrice: z.coerce.number().nonnegative().nullable().optional(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  status: z.enum(["draft", "preview", "published", "archived"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = UpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid product update." }, { status: 400 });

  await ensureSchema();
  const db = getDb();
  const current = await db.query(`select * from pod_products where id = $1`, [id]);
  if (!current.rowCount) return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });

  const existing = current.rows[0];
  const next = {
    name: parsed.data.name ?? existing.name,
    shortDescription: parsed.data.shortDescription ?? existing.short_description,
    description: parsed.data.description ?? existing.description,
    slug: parsed.data.slug ?? existing.slug,
    category: parsed.data.category ?? existing.category,
    collectionName: parsed.data.collectionName ?? existing.collection_name,
    badge: parsed.data.badge ?? existing.badge,
    materials: parsed.data.materials ?? existing.materials,
    careInstructions: parsed.data.careInstructions ?? existing.care_instructions,
    shippingNote: parsed.data.shippingNote ?? existing.shipping_note,
    seoTitle: parsed.data.seoTitle ?? existing.seo_title,
    seoDescription: parsed.data.seoDescription ?? existing.seo_description,
    featured: parsed.data.featured ?? existing.featured,
    sortOrder: parsed.data.sortOrder ?? existing.sort_order,
    tags: parsed.data.tags ?? existing.tags,
    retailPrice: parsed.data.retailPrice !== undefined ? parsed.data.retailPrice : existing.retail_price,
    compareAtPrice: parsed.data.compareAtPrice !== undefined ? parsed.data.compareAtPrice : existing.compare_at_price,
    status: parsed.data.status ?? existing.status,
  };

  if (next.status === "published" && (next.retailPrice == null || Number(next.retailPrice) <= 0)) {
    return NextResponse.json({ ok: false, error: "Set a valid retail price before publishing." }, { status: 400 });
  }

  const updated = await db.query(
    `update pod_products set name=$2, short_description=$3, description=$4, retail_price=$5,
      compare_at_price=$6, status=$7, slug=$8, category=$9, collection_name=$10, badge=$11,
      materials=$12, care_instructions=$13, shipping_note=$14, seo_title=$15,
      seo_description=$16, featured=$17, sort_order=$18, tags=$19::jsonb, updated_at=now()
     where id=$1 returning *`,
    [id, next.name, next.shortDescription, next.description, next.retailPrice, next.compareAtPrice,
      next.status, next.slug, next.category, next.collectionName, next.badge, next.materials,
      next.careInstructions, next.shippingNote, next.seoTitle, next.seoDescription,
      next.featured, next.sortOrder, JSON.stringify(next.tags)]
  );

  if (parsed.data.variants) {
    for (const variant of parsed.data.variants) {
      await db.query(
        `update pod_variants set available=$3, retail_price=$4, updated_at=now()
         where id=$1 and product_id=$2`,
        [variant.id, id, variant.available, variant.retailPrice]
      );
    }
  }

  const row = updated.rows[0];
  const base = row.base_cost == null ? null : Number(row.base_cost);
  const retail = row.retail_price == null ? null : Number(row.retail_price);
  const margin = base != null && retail != null ? { amount: retail - base, percent: retail > 0 ? ((retail - base) / retail) * 100 : 0 } : null;

  return NextResponse.json({ ok: true, product: row, margin });
}
