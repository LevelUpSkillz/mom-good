alter table pod_orders add column if not exists stripe_checkout_session_id text;
alter table pod_orders add column if not exists stripe_payment_intent_id text;
alter table pod_orders add column if not exists payment_status text;

create unique index if not exists pod_orders_stripe_checkout_session_uidx
  on pod_orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists pod_orders_stripe_payment_intent_uidx
  on pod_orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

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

create index if not exists pod_webhook_events_provider_idx
  on pod_webhook_events(provider, created_at desc);
