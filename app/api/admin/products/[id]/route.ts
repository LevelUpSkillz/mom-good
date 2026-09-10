import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";

const UpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
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
    retailPrice: parsed.data.retailPrice !== undefined ? parsed.data.retailPrice : existing.retail_price,
    compareAtPrice: parsed.data.compareAtPrice !== undefined ? parsed.data.compareAtPrice : existing.compare_at_price,
    status: parsed.data.status ?? existing.status,
  };

  if (next.status === "published" && (next.retailPrice == null || Number(next.retailPrice) <= 0)) {
    return NextResponse.json({ ok: false, error: "Set a valid retail price before publishing." }, { status: 400 });
  }

  const updated = await db.query(
    `update pod_products set name=$2, short_description=$3, description=$4, retail_price=$5, compare_at_price=$6, status=$7, updated_at=now() where id=$1 returning *`,
    [id, next.name, next.shortDescription, next.description, next.retailPrice, next.compareAtPrice, next.status]
  );

  const row = updated.rows[0];
  const base = row.base_cost == null ? null : Number(row.base_cost);
  const retail = row.retail_price == null ? null : Number(row.retail_price);
  const margin = base != null && retail != null ? { amount: retail - base, percent: retail > 0 ? ((retail - base) / retail) * 100 : 0 } : null;

  return NextResponse.json({ ok: true, product: row, margin });
}
