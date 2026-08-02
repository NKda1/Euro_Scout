-- Broadcast is Supabase's recommended production path for secure database
-- changes. This deliberately changes only public trigger functions/tables;
-- the provider-owned realtime schema remains untouched.

begin;

create or replace function public.broadcast_conversation_table_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_uuid uuid;
  topic_suffix text;
begin
  conversation_uuid := coalesce(new.conversation_id, old.conversation_id);
  if conversation_uuid is null then
    return null;
  end if;

  foreach topic_suffix in array (
    case
      when tg_table_name = 'meeting_requests' then array['call-cards', 'inbox-calls', 'incoming']
      else array['thread', 'inbox']
    end
  ) loop
    perform realtime.broadcast_changes(
      'conversation:' || conversation_uuid::text || ':' || topic_suffix,
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  end loop;
  return null;
end;
$$;

revoke all on function public.broadcast_conversation_table_changes() from public;

drop trigger if exists broadcast_message_changes on public.messages;
create trigger broadcast_message_changes
after insert or update or delete on public.messages
for each row execute function public.broadcast_conversation_table_changes();

drop trigger if exists broadcast_participant_read_changes on public.conversation_participants;
create trigger broadcast_participant_read_changes
after update on public.conversation_participants
for each row execute function public.broadcast_conversation_table_changes();

drop trigger if exists broadcast_meeting_request_changes on public.meeting_requests;
create trigger broadcast_meeting_request_changes
after insert or update or delete on public.meeting_requests
for each row execute function public.broadcast_conversation_table_changes();

commit;
