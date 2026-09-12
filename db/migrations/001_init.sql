create extension if not exists pgcrypto;

create table if not exists pod_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'printful',
  external_product_id text,
  external_template_id text,
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  category text not null default 'Uncategorized',
  tags jsonb not null default '[]'::jsonb,
  featured_image text,
  gallery_images jsonb not null default '[]'::jsonb,
  base_cost numeric(10,2),
  retail_price numeric(10,2),
  compare_at_price numeric(10,2),
  currency text not null default 'CAD',
  status text not null default 'draft' check (status in ('draft','preview','published','archived')),
  sync_status text not null default 'never_synced' check (sync_status in ('never_synced','synced','stale','error')),
  raw_supplier_payload jsonb,
  imported_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_template_id)
);

create table if not exists pod_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references pod_products(id) on delete cascade,
  provider_variant_id text not null,
  sku text,
  size text,
  color text,
  base_cost numeric(10,2),
  retail_price numeric(10,2),
  available boolean not null default true,
  image text,
  raw_variant_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, provider_variant_id)
);

create index if not exists pod_products_public_idx on pod_products(status, updated_at desc);
create index if not exists pod_variants_product_idx on pod_variants(product_id);
