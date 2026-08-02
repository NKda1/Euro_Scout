-- Give every authenticated member a stable private inbox topic. Conversation
-- topics remain the fast path once a thread is known; the profile topic lets a
-- client discover a brand-new conversation or incoming call without polling.
-- This migration changes public functions/triggers only and deliberately does
-- not alter Supabase's provider-owned realtime schema.

begin;

create or replace function public.can_access_realtime_conversation(topic_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      topic_name like 'profile:%'
      and (select auth.uid())::text = split_part(topic_name, ':', 2)
    )
    or
    (
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
      )
    );
$$;

revoke all on function public.can_access_realtime_conversation(text) from public;
grant execute on function public.can_access_realtime_conversation(text) to authenticated;

create or replace function public.broadcast_profile_inbox_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_uuid uuid;
  team_uuid uuid;
  player_uuid uuid;
  requester_uuid uuid;
  recipient_uuid uuid;
begin
  if tg_table_name = 'conversation_participants' then
    recipient_uuid := coalesce(new.profile_id, old.profile_id);
    if recipient_uuid is not null then
      perform realtime.broadcast_changes(
        'profile:' || recipient_uuid::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;
    return null;
  end if;

  if tg_table_name = 'messages' then
    conversation_uuid := coalesce(new.conversation_id, old.conversation_id);
    for recipient_uuid in
      select participant.profile_id
      from public.conversation_participants as participant
      where participant.conversation_id = conversation_uuid
    loop
      perform realtime.broadcast_changes(
        'profile:' || recipient_uuid::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end loop;
    return null;
  end if;

  if tg_table_name = 'meeting_requests' then
    team_uuid := coalesce(new.team_id, old.team_id);
    player_uuid := coalesce(new.player_profile_id, old.player_profile_id);
    requester_uuid := coalesce(new.requested_by, old.requested_by);

    for recipient_uuid in
      select candidate.profile_id
      from (
        select player_uuid as profile_id
        union
        select requester_uuid as profile_id
        union
        select member.profile_id
        from public.club_members as member
        where member.team_id = team_uuid
      ) as candidate
      where candidate.profile_id is not null
    loop
      perform realtime.broadcast_changes(
        'profile:' || recipient_uuid::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end loop;
  end if;

  return null;
end;
$$;

revoke all on function public.broadcast_profile_inbox_changes() from public;

drop trigger if exists broadcast_message_profile_inbox on public.messages;
create trigger broadcast_message_profile_inbox
after insert or update or delete on public.messages
for each row execute function public.broadcast_profile_inbox_changes();

drop trigger if exists broadcast_participant_profile_inbox on public.conversation_participants;
create trigger broadcast_participant_profile_inbox
after insert or update or delete on public.conversation_participants
for each row execute function public.broadcast_profile_inbox_changes();

drop trigger if exists broadcast_meeting_profile_inbox on public.meeting_requests;
create trigger broadcast_meeting_profile_inbox
after insert or update or delete on public.meeting_requests
for each row execute function public.broadcast_profile_inbox_changes();

commit;
