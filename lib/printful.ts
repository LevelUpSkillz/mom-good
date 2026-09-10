import { z } from "zod";

const PrintfulReferenceSchema = z.string().trim().min(1);

export type NormalizedPrintfulProduct = {
  externalProductId?: string;
  externalTemplateId?: string;
  name: string;
  featuredImage?: string;
  galleryImages: string[];
  variants: Array<{
    providerVariantId: string;
    sku?: string;
    size?: string;
    color?: string;
    baseCost?: number;
    available: boolean;
  }>;
  raw: unknown;
};

export function parsePrintfulReference(input: string) {
  const value = PrintfulReferenceSchema.parse(input);
  const urlMatch = value.match(/(?:templates?|products?)\/(?:@)?([A-Za-z0-9_-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^@?[A-Za-z0-9_-]+$/.test(value)) return value.replace(/^@/, "");
  throw new Error("Unsupported Printful product or template reference.");
}

export function getPrintfulConfig() {
  const token = process.env.PRINTFUL_API_TOKEN;
  const storeId = process.env.PRINTFUL_STORE_ID;
  return { connected: Boolean(token), token, storeId };
}

async function printfulRequest(path: string) {
  const { token, storeId } = getPrintfulConfig();
  if (!token) throw new Error("Printful is not connected. Add PRINTFUL_API_TOKEN as a server secret.");
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  const response = await fetch(`https://api.printful.com${path}`, { headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body ? ` ${body.slice(0, 240)}` : "";
    throw new Error(`Printful request failed (${response.status}).${detail}`);
  }
  return response.json();
}

export async function testPrintfulConnection() {
  const startedAt = Date.now();
  const payload = await printfulRequest("/product-templates?limit=1");
  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
    storeScoped: Boolean(getPrintfulConfig().storeId),
    sampleCount: Array.isArray(payload?.result) ? payload.result.length : undefined,
  };
}

export async function fetchPrintfulTemplate(reference: string) {
  const id = parsePrintfulReference(reference);
  return printfulRequest(`/product-templates/${encodeURIComponent(id)}`);
}

export function normalizePrintfulTemplate(payload: any): NormalizedPrintfulProduct {
  const source = payload?.result ?? payload;
  const title = String(source?.title || source?.name || "Untitled Printful product");
  const mockup = source?.mockup_file_url || source?.thumbnail_url || undefined;
  const variantIds: unknown[] = Array.isArray(source?.available_variant_ids) ? source.available_variant_ids : [];
  return {
    externalProductId: source?.external_product_id ? String(source.external_product_id) : undefined,
    externalTemplateId: source?.id != null ? String(source.id) : undefined,
    name: title,
    featuredImage: mockup,
    galleryImages: mockup ? [mockup] : [],
    variants: variantIds.map((id) => ({ providerVariantId: String(id), available: true })),
    raw: payload,
  };
}
