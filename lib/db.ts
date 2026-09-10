import { Pool } from "pg";

let pool: Pool | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function ensureSchema() {
  const db = getDb();
  await db.query(`
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
      status text not null default 'draft',
      sync_status text not null default 'never_synced',
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
    create table if not exists pod_orders (
      id uuid primary key default gen_random_uuid(),
      external_payment_id text,
      provider_order_id text,
      customer_email text,
      currency text not null default 'CAD',
      subtotal numeric(10,2),
      shipping_amount numeric(10,2),
      tax_amount numeric(10,2),
      total_amount numeric(10,2),
      status text not null default 'paid',
      shipping_name text,
      shipping_address jsonb,
      provider_payload jsonb,
      stripe_checkout_session_id text,
      stripe_payment_intent_id text,
      payment_status text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    alter table pod_orders add column if not exists stripe_checkout_session_id text;
    alter table pod_orders add column if not exists stripe_payment_intent_id text;
    alter table pod_orders add column if not exists payment_status text;
    create unique index if not exists pod_orders_stripe_checkout_session_uidx on pod_orders(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
    create unique index if not exists pod_orders_stripe_payment_intent_uidx on pod_orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
    create table if not exists pod_order_items (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references pod_orders(id) on delete cascade,
      product_id uuid references pod_products(id) on delete set null,
      variant_id uuid references pod_variants(id) on delete set null,
      product_name text not null,
      provider_variant_id text,
      quantity integer not null default 1,
      unit_price numeric(10,2) not null,
      line_total numeric(10,2) not null,
      created_at timestamptz not null default now()
    );
    create table if not exists pod_fulfillment_events (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references pod_orders(id) on delete cascade,
      status text not null,
      note text,
      provider_event_id text,
      payload jsonb,
      created_at timestamptz not null default now()
    );
    create table if not exists pod_webhook_events (
      id uuid primary key default gen_random_uuid(),
      provider text not null,
      provider_event_id text not null,
      event_type text not null,
      processed boolean not null default false,
      error_message text,
      payload jsonb,
      created_at timestamptz not null default now(),
      processed_at timestamptz,
      unique(provider, provider_event_id)
    );
  `);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}
