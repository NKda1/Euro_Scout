begin;

create or replace function public.can_access_realtime_conversation(topic_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    topic_name like 'conversation:%'
    and (
      exists (
        select 1
        from public.conversation_participants as participant
        where participant.profile_id = (select auth.uid())
          and participant.conversation_id::text = split_part(topic_name, ':', 2)
      )
      or exists (
        select 1
        from public.profiles as profile
        where profile.id = (select auth.uid())
          and profile.role = 'admin'
      )
    );
$$;

revoke all on function public.can_access_realtime_conversation(text) from public;
grant execute on function public.can_access_realtime_conversation(text) to authenticated;

commit;
