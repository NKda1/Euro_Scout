alter table public.teams
  add column if not exists stats_season text,
  add column if not exists facilities text[] not null default '{}';

alter table public.teams
  drop constraint if exists teams_stats_season_format_check;

alter table public.teams
  add constraint teams_stats_season_format_check
  check (stats_season is null or stats_season ~ '^[0-9]{2}/[0-9]{2}$');

alter table public.teams
  drop constraint if exists teams_facilities_limit_check;

alter table public.teams
  add constraint teams_facilities_limit_check
  check (cardinality(facilities) <= 12);

update public.film_links
set thumbnail_url = '/images/PlaceHolder.PNG'
where provider = 'hudl'
  and (thumbnail_url is null or thumbnail_url = '/images/film-placeholder.svg');
