import { NextResponse, type NextRequest } from "next/server";
import { sendCallReminderEmail } from "@/lib/email";
import { sendPushToProfiles } from "@/lib/push";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://euroscout.pro";
// Remind when call is 10–25 minutes away (cron runs every 15 min)
const REMIND_AFTER_MINUTES = 10;
const REMIND_BEFORE_MINUTES = 25;

interface ReminderMeetingRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  conversation_id: string | null;
  scheduled_at: string;
  scheduled_duration_minutes: number;
  daily_room_url: string | null;
  teams: { name: string | null } | null;
  profiles: { display_name: string | null } | null;
}

interface ProfileContact {
  id: string;
  display_name: string;
  email: string | null;
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getClubMemberIds(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  teamId: string
): Promise<string[]> {
  const { data } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .returns<Array<{ profile_id: string }>>();
  return (data ?? []).map((r) => r.profile_id);
}

async function getContactsForProfiles(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  profileIds: string[]
): Promise<ProfileContact[]> {
  const unique = Array.from(new Set(profileIds));
  const results: ProfileContact[] = [];
  await Promise.allSettled(
    unique.map(async (id) => {
      const [{ data: profile }, { data: userData }] = await Promise.all([
        serviceClient
          .from("profiles")
          .select("id, display_name")
          .eq("id", id)
          .maybeSingle<{ id: string; display_name: string }>(),
        serviceClient.auth.admin.getUserById(id),
      ]);
      results.push({
        id,
        display_name: profile?.display_name ?? "Member",
        email: userData.user?.email ?? null,
      });
    })
  );
  return results;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const now = new Date();
  const remindAfter = new Date(now.getTime() + REMIND_AFTER_MINUTES * 60_000).toISOString();
  const remindBefore = new Date(now.getTime() + REMIND_BEFORE_MINUTES * 60_000).toISOString();

  const { data: meetings, error } = await serviceClient
    .from("meeting_requests")
    .select(
      `id, team_id, player_profile_id, conversation_id,
       scheduled_at, scheduled_duration_minutes, daily_room_url,
       teams:meeting_requests_team_id_fkey(name),
       profiles:meeting_requests_player_profile_id_fkey(display_name)`
    )
    .eq("status", "accepted")
    .gte("scheduled_at", remindAfter)
    .lte("scheduled_at", remindBefore)
    .is("reminder_sent_at", null)   // prevent double-sending (requires column — see note)
    .returns<ReminderMeetingRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sent: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const meeting of meetings ?? []) {
    try {
      const teamName = meeting.teams?.name ?? "Club";
      const playerName = meeting.profiles?.display_name ?? "Player";
      const scheduledTime = formatTime(meeting.scheduled_at);
      const roomUrl =
        meeting.daily_room_url ??
        (meeting.conversation_id
          ? `${APP_URL}/messages/${meeting.conversation_id}`
          : `${APP_URL}/account`);

      const clubMemberIds = await getClubMemberIds(serviceClient, meeting.team_id);
      const allIds = [meeting.player_profile_id, ...clubMemberIds];

      // Push to all participants
      await sendPushToProfiles(allIds, {
        title: "Your call starts in 15 minutes",
        body: `${teamName} × ${playerName} — ${scheduledTime}`,
        url: meeting.conversation_id ? `/messages/${meeting.conversation_id}` : "/account",
        tag: `call-reminder-${meeting.id}`,
      });

      // Email each contact
      const contacts = await getContactsForProfiles(serviceClient, allIds);
      await Promise.allSettled(
        contacts.map((contact) => {
          if (!contact.email) return Promise.resolve();
          const isPlayer = contact.id === meeting.player_profile_id;
          return sendCallReminderEmail({
            to: contact.email,
            recipientName: contact.display_name,
            counterpartName: isPlayer ? teamName : playerName,
            scheduledTime,
            roomUrl,
          });
        })
      );

      // Mark reminder sent — gracefully ignore if column doesn't exist yet
      await serviceClient
        .from("meeting_requests")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", meeting.id);

      sent.push(meeting.id);
    } catch (err: unknown) {
      failed.push({
        id: meeting.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ sent_count: sent.length, failed_count: failed.length, sent, failed });
}
