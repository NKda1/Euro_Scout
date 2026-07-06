import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createDailyRoom } from "@/lib/daily";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface ReadyMeetingRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  requested_by: string | null;
  conversation_id: string | null;
  scheduled_at: string;
  scheduled_duration_minutes: number;
  teams: {
    name: string | null;
  } | null;
  profiles: {
    display_name: string | null;
  } | null;
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function appendWorkflowMessage(params: {
  conversationId: string | null;
  senderProfileId: string;
  body: string;
}) {
  const { conversationId, senderProfileId, body } = params;
  if (!conversationId) return;

  const serviceClient = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  await serviceClient.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: senderProfileId,
    body
  });
  await Promise.all([
    serviceClient.from("conversations").update({ updated_at: now }).eq("id", conversationId),
    serviceClient
      .from("conversation_participants")
      .update({ last_seen_at: now })
      .eq("conversation_id", conversationId)
      .eq("profile_id", senderProfileId)
  ]);
}

async function openMeetingRooms(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const now = new Date();
  const opensBefore = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const staleAfter = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const { data: meetings, error } = await serviceClient
    .from("meeting_requests")
    .select(
      `
        id,
        team_id,
        player_profile_id,
        requested_by,
        conversation_id,
        scheduled_at,
        scheduled_duration_minutes,
        teams!meeting_requests_team_id_fkey (
          name
        ),
        profiles!meeting_requests_player_profile_id_fkey (
          display_name
        )
      `
    )
    .eq("status", "accepted")
    .is("daily_room_url", null)
    .lte("scheduled_at", opensBefore)
    .gte("scheduled_at", staleAfter)
    .order("scheduled_at", { ascending: true })
    .limit(20)
    .returns<ReadyMeetingRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const opened: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const meeting of meetings ?? []) {
    try {
      const createdRoom = await createDailyRoom({
        meetingId: meeting.id,
        scheduledAt: meeting.scheduled_at,
        durationMinutes: meeting.scheduled_duration_minutes
      });

      const openedAt = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("meeting_requests")
        .update({
          daily_provider: "daily",
          daily_room_id: createdRoom.room.id,
          daily_room_name: createdRoom.room.name,
          daily_room_url: createdRoom.room.url,
          daily_room_expires_at: createdRoom.roomExpiresAt,
          daily_sfu_enabled: true,
          daily_room_config: createdRoom.room.config ?? {},
          room_opened_at: openedAt,
          updated_at: openedAt
        })
        .eq("id", meeting.id)
        .eq("status", "accepted")
        .is("daily_room_url", null);

      if (updateError) {
        failed.push({ id: meeting.id, error: updateError.message });
        continue;
      }

      const teamName = meeting.teams?.name ?? "Club";
      const playerName = meeting.profiles?.display_name ?? "Player";
      await appendWorkflowMessage({
        conversationId: meeting.conversation_id,
        senderProfileId: meeting.requested_by ?? meeting.player_profile_id,
        body: [
          `The secure Daily room is open for ${teamName} and ${playerName}.`,
          `Join from EuroScout: /meetings/${meeting.id}/room`,
          "Only authorised participants can generate a private join token."
        ].join("\n")
      });

      revalidatePath(`/meetings/${meeting.id}/room`);
      if (meeting.conversation_id) {
        revalidatePath(`/messages/${meeting.conversation_id}`);
      }
      revalidatePath("/account");
      opened.push(meeting.id);
    } catch (roomError) {
      failed.push({
        id: meeting.id,
        error: roomError instanceof Error ? roomError.message : "Could not create Daily room."
      });
    }
  }

  return NextResponse.json({
    opened_count: opened.length,
    failed_count: failed.length,
    opened,
    failed
  });
}

export async function GET(request: NextRequest) {
  return openMeetingRooms(request);
}

export async function POST(request: NextRequest) {
  return openMeetingRooms(request);
}
