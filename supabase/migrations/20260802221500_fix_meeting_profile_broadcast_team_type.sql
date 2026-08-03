-- meeting_requests.team_id and club_members.team_id are text identifiers.
-- The original profile-inbox trigger declared the intermediate value as uuid,
-- causing every meeting request insert/update to abort before the call flow ran.

begin;

create or replace function public.broadcast_profile_inbox_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_key public.conversations.id%type;
  team_key public.meeting_requests.team_id%type;
  player_key public.profiles.id%type;
  requester_key public.profiles.id%type;
  recipient_key public.profiles.id%type;
begin
  if tg_table_name = 'conversation_participants' then
    recipient_key := coalesce(new.profile_id, old.profile_id);
    if recipient_key is not null then
      perform realtime.broadcast_changes(
        'profile:' || recipient_key::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end if;
    return null;
  end if;

  if tg_table_name = 'messages' then
    conversation_key := coalesce(new.conversation_id, old.conversation_id);
    for recipient_key in
      select participant.profile_id
      from public.conversation_participants as participant
      where participant.conversation_id = conversation_key
    loop
      perform realtime.broadcast_changes(
        'profile:' || recipient_key::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end loop;
    return null;
  end if;

  if tg_table_name = 'meeting_requests' then
    team_key := coalesce(new.team_id, old.team_id);
    player_key := coalesce(new.player_profile_id, old.player_profile_id);
    requester_key := coalesce(new.requested_by, old.requested_by);

    for recipient_key in
      select candidate.profile_id
      from (
        select player_key as profile_id
        union
        select requester_key as profile_id
        union
        select member.profile_id
        from public.club_members as member
        where member.team_id = team_key
      ) as candidate
      where candidate.profile_id is not null
    loop
      perform realtime.broadcast_changes(
        'profile:' || recipient_key::text || ':inbox',
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
      );
    end loop;
  end if;

  return null;
end;
$$;

revoke all on function public.broadcast_profile_inbox_changes() from public;

commit;
