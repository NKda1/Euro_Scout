begin;

-- Keep the application email directory aligned after a confirmed Auth email change.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_provisioned_or_updated on auth.users;
create trigger on_auth_user_provisioned_or_updated
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Durable, idempotent receipt log for every signed Daily webhook event. This is
-- intentionally service-role-only: RLS is enabled and no browser policy exists.
create table if not exists public.daily_webhook_events (
  event_id text primary key,
  event_type text not null,
  room_name text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.daily_webhook_events enable row level security;

create index if not exists daily_webhook_events_room_received_idx
  on public.daily_webhook_events (room_name, received_at desc)
  where room_name is not null;

create index if not exists daily_webhook_events_received_idx
  on public.daily_webhook_events (received_at desc);

commit;
