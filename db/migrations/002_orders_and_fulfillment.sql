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
  status text not null default 'paid' check (status in ('paid','submitted_to_provider','in_production','shipped','delivered','cancelled','error')),
  shipping_name text,
  shipping_address jsonb,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pod_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references pod_orders(id) on delete cascade,
  product_id uuid references pod_products(id) on delete set null,
  variant_id uuid references pod_variants(id) on delete set null,
  product_name text not null,
  provider_variant_id text,
  quantity integer not null default 1 check (quantity > 0),
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

create index if not exists pod_orders_status_idx on pod_orders(status, created_at desc);
create index if not exists pod_order_items_order_idx on pod_order_items(order_id);
create index if not exists pod_fulfillment_events_order_idx on pod_fulfillment_events(order_id, created_at desc);
