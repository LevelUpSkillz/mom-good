export type ProductStatus = "draft" | "preview" | "published" | "archived";
export type SyncStatus = "never_synced" | "synced" | "stale" | "error";

export type PodVariant = {
  id: string;
  providerVariantId: string;
  sku?: string;
  size?: string;
  color?: string;
  baseCost?: number;
  retailPrice?: number;
  available: boolean;
};

export type PodProduct = {
  id: string;
  provider: "printful" | "printify" | "gelato";
  externalProductId?: string;
  externalTemplateId?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  galleryImages: string[];
  baseCost?: number;
  retailPrice?: number;
  compareAtPrice?: number;
  currency: "CAD";
  status: ProductStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  variants: PodVariant[];
};

export const products: PodProduct[] = [
  {
    id: "sample-1",
    provider: "printful",
    name: "Sunday Reset Crewneck",
    slug: "sunday-reset-crewneck",
    shortDescription: "A soft everyday crewneck built for slow mornings and school-run weather.",
    description: "A placeholder merchandising example for Mom Good. Replace with imported supplier data before launch.",
    category: "Apparel",
    tags: ["crewneck", "mom-life"],
    galleryImages: [],
    retailPrice: 54,
    compareAtPrice: 62,
    currency: "CAD",
    status: "preview",
    syncStatus: "never_synced",
    variants: []
  }
];

export const publishedProducts = products.filter((product) => product.status === "published");
