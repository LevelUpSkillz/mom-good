import { z } from "zod";

const PrintfulReferenceSchema = z.string().trim().min(1);

export type PrintfulReference = {
  kind: "template" | "store_product";
  id: string;
};

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

function sanitizeId(value: string) {
  return value.replace(/^@/, "");
}

export function parsePrintfulReference(input: string): PrintfulReference {
  const value = PrintfulReferenceSchema.parse(input);

  const templateUrl = value.match(/(?:product-)?templates?\/(?:@)?([A-Za-z0-9_-]+)/i);
  if (templateUrl) return { kind: "template", id: sanitizeId(templateUrl[1]) };

  const storeProductUrl = value.match(/(?:store\/products?|products?)\/(?:@)?([A-Za-z0-9_-]+)/i);
  if (storeProductUrl) return { kind: "store_product", id: sanitizeId(storeProductUrl[1]) };

  if (/^template:@?[A-Za-z0-9_-]+$/i.test(value)) {
    return { kind: "template", id: sanitizeId(value.split(":")[1]) };
  }

  if (/^(?:product|store_product):@?[A-Za-z0-9_-]+$/i.test(value)) {
    return { kind: "store_product", id: sanitizeId(value.split(":")[1]) };
  }

  if (/^@?[A-Za-z0-9_-]+$/.test(value)) {
    return { kind: "template", id: sanitizeId(value) };
  }

  throw new Error("Unsupported Printful reference. Paste a Printful product/template URL or use template:ID / product:ID.");
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
    sampleCount: Array.isArray(payload?.result?.items)
      ? payload.result.items.length
      : Array.isArray(payload?.result)
        ? payload.result.length
        : undefined,
  };
}

export async function fetchPrintfulReference(reference: string) {
  const parsed = parsePrintfulReference(reference);
  if (parsed.kind === "store_product") {
    return {
      kind: parsed.kind,
      payload: await printfulRequest(`/store/products/${encodeURIComponent(parsed.id)}`),
    } as const;
  }

  return {
    kind: parsed.kind,
    payload: await printfulRequest(`/product-templates/${encodeURIComponent(parsed.id)}`),
  } as const;
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

export function normalizePrintfulStoreProduct(payload: any): NormalizedPrintfulProduct {
  const result = payload?.result ?? payload;
  const syncProduct = result?.sync_product ?? result?.product ?? result;
  const syncVariants: any[] = Array.isArray(result?.sync_variants) ? result.sync_variants : [];
  const image = syncProduct?.thumbnail_url || syncProduct?.thumbnail || undefined;

  return {
    externalProductId: syncProduct?.id != null
      ? String(syncProduct.id)
      : syncProduct?.external_id
        ? String(syncProduct.external_id)
        : undefined,
    name: String(syncProduct?.name || "Untitled Printful product"),
    featuredImage: image,
    galleryImages: image ? [image] : [],
    variants: syncVariants
      .map((variant) => ({
        providerVariantId: String(variant?.id ?? variant?.variant_id ?? variant?.external_id),
        sku: variant?.sku ? String(variant.sku) : undefined,
        size: variant?.name ? String(variant.name) : undefined,
        available: variant?.availability_status ? variant.availability_status === "active" : !variant?.is_ignored,
      }))
      .filter((variant) => variant.providerVariantId !== "undefined"),
    raw: payload,
  };
}

export function normalizePrintfulReference(kind: PrintfulReference["kind"], payload: any) {
  return kind === "store_product"
    ? normalizePrintfulStoreProduct(payload)
    : normalizePrintfulTemplate(payload);
}
