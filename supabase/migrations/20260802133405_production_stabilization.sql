-- Production stabilization: deterministic auth provisioning, Realtime delivery,
-- and compact club-media metadata. Safe to apply to the existing hosted schema.

begin;

alter table public.club_media
  add column if not exists original_filename text;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
begin
  safe_display_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'EuroScout member'
    ),
    100
  );

  insert into public.profiles (
    id,
    role,
    display_name,
    is_public,
    onboarding_complete,
    welcome_tour_seen,
    updated_at
  )
  values (
    new.id,
    'fan',
    safe_display_name,
    false,
    false,
    false,
    now()
  )
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.users (id, email, role, display_name)
    values (new.id, lower(new.email), 'fan', safe_display_name)
    on conflict (id) do update
      set email = excluded.email,
          display_name = coalesce(public.users.display_name, excluded.display_name);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Repair any already-confirmed accounts that were left without application rows.
insert into public.profiles (
  id,
  role,
  display_name,
  is_public,
  onboarding_complete,
  welcome_tour_seen,
  updated_at
)
select
  auth_user.id,
  'fan',
  left(
    coalesce(
      nullif(trim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
      'EuroScout member'
    ),
    100
  ),
  false,
  false,
  false,
  now()
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where profile.id is null
on conflict (id) do nothing;

insert into public.users (id, email, role, display_name)
select
  auth_user.id,
  lower(auth_user.email),
  coalesce(profile.role, 'fan'),
  coalesce(profile.display_name, split_part(auth_user.email, '@', 1), 'EuroScout member')
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
left join public.users as app_user on app_user.id = auth_user.id
where auth_user.email is not null
  and app_user.id is null
on conflict (id) do nothing;

-- Postgres Changes only emits rows for tables in the Supabase Realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
    ) then
      alter publication supabase_realtime add table public.conversation_participants;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_requests'
    ) then
      alter publication supabase_realtime add table public.meeting_requests;
    end if;
  end if;
end;
$$;

commit;
