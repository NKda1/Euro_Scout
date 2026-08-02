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
    and exists (
      select 1
      from public.conversation_participants as participant
      where participant.profile_id = (select auth.uid())
        and participant.conversation_id::text = split_part(topic_name, ':', 2)
    );
$$;

revoke all on function public.can_access_realtime_conversation(text) from public;
grant execute on function public.can_access_realtime_conversation(text) to authenticated;

drop policy if exists "Conversation members can receive realtime events" on realtime.messages;
drop policy if exists "Conversation members can send realtime events" on realtime.messages;

create policy "Conversation members can receive realtime events"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.can_access_realtime_conversation((select realtime.topic()))
);

create policy "Conversation members can send realtime events"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.can_access_realtime_conversation((select realtime.topic()))
);

commit;
