"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { requireOnboardedProfile, type Profile } from "@/lib/auth";
import { buildDailyJoinUrl, createDailyMeetingToken, createDailyRoom } from "@/lib/daily";
import { sendCallConfirmedEmail, sendCallRequestEmail } from "@/lib/email";
import { hasPremiumFeature } from "@/lib/premium";
import { sendPushToProfile, sendPushToProfiles } from "@/lib/push";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>;

interface MeetingRequest {
  id: string;
  team_id: string;
  player_profile_id: string;
  requested_by: string | null;
  responded_by: string | null;
  conversation_id: string | null;
  status: string;
  request_reason: string | null;
  request_note: string | null;
  club_response_note: string | null;
  proposed_start_at: string | null;
  proposed_alternative_at: string | null;
  scheduled_at: string | null;
  scheduled_duration_minutes: number;
  timezone: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  daily_room_expires_at: string | null;
}

const OPEN_MEETING_STATUSES = ["pending", "club_proposed", "accepted"];
const ROOM_OPEN_BUFFER_MINUTES = 5;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://euroscout.pro";

/** Get the email + profile_id for a given auth uid. */
async function getProfileContact(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>, profileId: string) {
  const { data } = await serviceClient
    .from("profiles")
    .select("id, display_name")
    .eq("id", profileId)
    .maybeSingle<{ id: string; display_name: string }>();
  const { data: userData } = await serviceClient.auth.admin.getUserById(profileId);
  return {
    profileId: data?.id ?? profileId,
    displayName: data?.display_name ?? "Member",
    email: userData.user?.email ?? null,
  };
}

/** Notify club staff that a player has requested a call. Fire-and-forget. */
async function notifyClubCallRequest(params: {
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>;
  clubMemberIds: string[];
  playerName: string;
  teamName: string;
  reason: string;
  preferredTime: string;
  backupTime?: string | null;
  note?: string | null;
  conversationId: string | null;
}) {
  const { serviceClient, clubMemberIds, playerName, teamName, reason, preferredTime, backupTime, note, conversationId } = params;
  const url = conversationId ? `${APP_URL}/messages/${conversationId}` : `${APP_URL}/account`;

  await Promise.allSettled([
    sendPushToProfiles(clubMemberIds, {
      title: `Call request — ${teamName}`,
      body: `${playerName} wants a video call. Reason: ${reason}`,
      url: conversationId ? `/messages/${conversationId}` : "/account",
      tag: "call-request",
    }),
    ...clubMemberIds.map(async (id) => {
      const contact = await getProfileContact(serviceClient, id);
      if (!contact.email) return;
      return sendCallRequestEmail({
        to: contact.email,
        recipientName: contact.displayName,
        senderName: playerName,
        teamName,
        reason,
        preferredTime,
        backupTime: backupTime ?? undefined,
        note: note ?? undefined,
        conversationUrl: url,
      });
    }),
  ]);
}

/** Notify a player that a club has proposed a final call time. */
async function notifyPlayerCallProposed(params: {
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>;
  playerProfileId: string;
  teamName: string;
  scheduledTime: string;
  conversationId: string | null;
}) {
  const { serviceClient, playerProfileId, teamName, scheduledTime, conversationId } = params;
  const url = conversationId ? `${APP_URL}/messages/${conversationId}` : `${APP_URL}/account`;
  const contact = await getProfileContact(serviceClient, playerProfileId);

  await Promise.allSettled([
    sendPushToProfile(playerProfileId, {
      title: `${teamName} confirmed a call time`,
      body: `Your call with ${teamName} is set for ${scheduledTime}. Confirm it now.`,
      url: conversationId ? `/messages/${conversationId}` : "/account",
      tag: "call-proposed",
    }),
    contact.email
      ? sendCallRequestEmail({
          to: contact.email,
          recipientName: contact.displayName,
          senderName: teamName,
          teamName,
          reason: "Club proposed a final call time",
          preferredTime: scheduledTime,
          conversationUrl: url,
        })
      : Promise.resolve(),
  ]);
}

/** Notify both parties that a call has been confirmed. */
async function notifyCallConfirmed(params: {
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>;
  playerProfileId: string;
  clubMemberIds: string[];
  playerName: string;
  teamName: string;
  scheduledTime: string;
  conversationId: string | null;
}) {
  const { serviceClient, playerProfileId, clubMemberIds, playerName, teamName, scheduledTime, conversationId } = params;
  const url = conversationId ? `${APP_URL}/messages/${conversationId}` : `${APP_URL}/account`;
  const allIds = [playerProfileId, ...clubMemberIds];

  const pushBody = `${teamName} × ${playerName} — ${scheduledTime}`;

  await Promise.allSettled([
    sendPushToProfiles(allIds, {
      title: "Video call confirmed",
      body: pushBody,
      url: conversationId ? `/messages/${conversationId}` : "/account",
      tag: "call-confirmed",
    }),
    (async () => {
      const playerContact = await getProfileContact(serviceClient, playerProfileId);
      if (playerContact.email) {
        await sendCallConfirmedEmail({
          to: playerContact.email,
          recipientName: playerContact.displayName,
          counterpartName: teamName,
          scheduledTime,
          conversationUrl: url,
        });
      }
    })(),
    ...clubMemberIds.map(async (id) => {
      const contact = await getProfileContact(serviceClient, id);
      if (!contact.email) return;
      return sendCallConfirmedEmail({
        to: contact.email,
        recipientName: contact.displayName,
        counterpartName: playerName,
        scheduledTime,
        conversationUrl: url,
      });
    }),
  ]);
}

function text(formData: FormData, key: string, maxLength = 500) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, maxLength) : "";
}

function safeReturnPath(value: string, fallback = "/account") {
  return value.startsWith("/") ? value : fallback;
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 280))}`);
}

function parseDateTime(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDuration(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(120, Math.max(15, Math.trunc(parsed)));
}

function ensureFutureTime(value: string, returnPath: string) {
  const scheduled = new Date(value);
  if (Number.isNaN(scheduled.getTime())) {
    redirectWithError(returnPath, "Choose a valid call time.");
  }

  if (scheduled.getTime() < Date.now() + 30 * 60 * 1000) {
    redirectWithError(returnPath, "Choose a call time at least 30 minutes from now.");
  }
}

function formatMeetingTime(value: string | null) {
  if (!value) return "time not set";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function meetingStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

async function getClubParticipantIds(serviceClient: ServiceClient, teamId: string) {
  const { data } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .returns<Array<{ profile_id: string }>>();

  return (data ?? []).map((member) => member.profile_id);
}

async function isClubMember(serviceClient: ServiceClient, teamId: string, profileId: string) {
  const { data } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ profile_id: string }>();

  return Boolean(data);
}

async function requireMeetingManager(serviceClient: ServiceClient, profile: Profile, teamId: string, returnPath: string) {
  if (profile.role === "admin") return true;
  if (profile.role !== "club") {
    redirectWithError(returnPath, "Only club staff can manage call requests.");
  }

  const member = await isClubMember(serviceClient, teamId, profile.id);
  if (!member) {
    redirectWithError(returnPath, "Only staff from this club can manage that call request.");
  }

  return true;
}

async function findExistingConversation(serviceClient: ServiceClient, teamId: string, playerProfileId: string) {
  const { data: playerParticipantRows } = await serviceClient
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", playerProfileId)
    .returns<Array<{ conversation_id: string }>>();

  const conversationIds = playerParticipantRows?.map((row) => row.conversation_id) ?? [];
  if (!conversationIds.length) return null;

  const { data: conversation } = await serviceClient
    .from("conversations")
    .select("id")
    .eq("team_id", teamId)
    .in("id", conversationIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return conversation?.id ?? null;
}

async function ensureConversationParticipants(params: {
  serviceClient: ServiceClient;
  conversationId: string;
  participantIds: string[];
  actorProfileId: string;
}) {
  const { serviceClient, conversationId, participantIds, actorProfileId } = params;
  const uniqueParticipantIds = Array.from(new Set(participantIds.filter(Boolean)));
  if (!uniqueParticipantIds.length) return null;

  const { data: existingParticipants, error: readError } = await serviceClient
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", conversationId)
    .returns<Array<{ profile_id: string }>>();

  if (readError) return readError.message;

  const existingIds = new Set((existingParticipants ?? []).map((participant) => participant.profile_id));
  const missingIds = uniqueParticipantIds.filter((profileId) => !existingIds.has(profileId));
  if (!missingIds.length) return null;

  const { error } = await serviceClient.from("conversation_participants").insert(
    missingIds.map((profileId) => ({
      conversation_id: conversationId,
      profile_id: profileId,
      last_seen_at: profileId === actorProfileId ? new Date().toISOString() : null
    }))
  );

  return error?.message ?? null;
}

async function getMeetingContext(serviceClient: ServiceClient, teamId: string, playerProfileId: string) {
  const [{ data: team }, { data: player }] = await Promise.all([
    serviceClient.from("teams").select("id, name").eq("id", teamId).maybeSingle<{ id: string; name: string }>(),
    serviceClient.from("profiles").select("id, display_name").eq("id", playerProfileId).maybeSingle<{ id: string; display_name: string }>()
  ]);

  return {
    teamName: team?.name ?? "Club",
    playerName: player?.display_name ?? "Player"
  };
}

async function getOrCreateMeetingConversation(params: {
  serviceClient: ServiceClient;
  teamId: string;
  playerProfileId: string;
  actorProfileId: string;
  teamName: string;
  playerName: string;
}) {
  const { serviceClient, teamId, playerProfileId, actorProfileId, teamName, playerName } = params;
  const clubParticipantIds = await getClubParticipantIds(serviceClient, teamId);
  if (!clubParticipantIds.length) {
    return { conversationId: null as string | null, error: "This club does not have staff to receive call requests yet." };
  }

  const participantIds = [playerProfileId, actorProfileId, ...clubParticipantIds];
  const existingConversationId = await findExistingConversation(serviceClient, teamId, playerProfileId);

  if (existingConversationId) {
    const participantError = await ensureConversationParticipants({
      serviceClient,
      conversationId: existingConversationId,
      participantIds,
      actorProfileId
    });

    return { conversationId: existingConversationId, error: participantError };
  }

  const { data: conversation, error } = await serviceClient
    .from("conversations")
    .insert({
      created_by: actorProfileId,
      subject: `${teamName} call with ${playerName}`,
      team_id: teamId
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !conversation) {
    return { conversationId: null, error: error?.message ?? "Could not create the call conversation." };
  }

  const participantError = await ensureConversationParticipants({
    serviceClient,
    conversationId: conversation.id,
    participantIds,
    actorProfileId
  });

  return { conversationId: conversation.id, error: participantError };
}

async function appendWorkflowMessage(params: {
  serviceClient: ServiceClient;
  conversationId: string | null;
  senderProfileId: string;
  body: string;
}) {
  const { serviceClient, conversationId, senderProfileId, body } = params;
  if (!conversationId) return null;

  const now = new Date().toISOString();
  const { error } = await serviceClient.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: senderProfileId,
    body
  });

  if (error) return error.message;

  await Promise.all([
    serviceClient.from("conversations").update({ updated_at: now }).eq("id", conversationId),
    serviceClient
      .from("conversation_participants")
      .update({ last_seen_at: now })
      .eq("conversation_id", conversationId)
      .eq("profile_id", senderProfileId)
  ]);

  return null;
}

function revalidateMeetingPaths(meeting: Pick<MeetingRequest, "id" | "team_id" | "player_profile_id" | "conversation_id">) {
  revalidatePath("/account");
  revalidatePath("/messages");
  revalidatePath(`/meetings/${meeting.id}/room`);
  revalidatePath(`/scouts/${meeting.team_id}`);
  revalidatePath(`/players/${meeting.player_profile_id}`);
  if (meeting.conversation_id) {
    revalidatePath(`/messages/${meeting.conversation_id}`);
  }
}

async function getMeeting(serviceClient: ServiceClient, meetingId: string) {
  const { data, error } = await serviceClient
    .from("meeting_requests")
    .select(
      `
        id,
        team_id,
        player_profile_id,
        requested_by,
        responded_by,
        conversation_id,
        status,
        request_reason,
        request_note,
        club_response_note,
        proposed_start_at,
        proposed_alternative_at,
        scheduled_at,
        scheduled_duration_minutes,
        timezone,
        daily_room_name,
        daily_room_url,
        daily_room_expires_at
      `
    )
    .eq("id", meetingId)
    .maybeSingle<MeetingRequest>();

  if (error || !data) return null;
  return data;
}

export async function requestClubCallAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const teamId = text(formData, "team_id", 120);
  const scoutId = text(formData, "scout_id", 120) || teamId;
  const returnPath = safeReturnPath(text(formData, "return_to", 240), scoutId ? `/scouts/${scoutId}` : "/account");
  const proposedStartAt = parseDateTime(text(formData, "proposed_start_at", 80));
  const proposedAlternativeAt = parseDateTime(text(formData, "proposed_alternative_at", 80));
  const timezone = text(formData, "timezone", 80);
  const requestReason = text(formData, "request_reason", 120);
  const requestNote = text(formData, "request_note", 500);

  if (profile.role !== "player") {
    redirectWithError(returnPath, "Only player accounts can request club video calls.");
  }

  if (!teamId) {
    redirectWithError(returnPath, "Choose a club before requesting a call.");
  }

  await enforceActionRateLimit(`call-request:${profile.id}`, 8, 60 * 60_000, returnPath);

  if (!proposedStartAt) {
    redirectWithError(returnPath, "Choose a preferred call time.");
  }
  ensureFutureTime(proposedStartAt, returnPath);
  if (proposedAlternativeAt) {
    ensureFutureTime(proposedAlternativeAt, returnPath);
  }

  const { data: team } = await serviceClient.from("teams").select("id, name").eq("id", teamId).maybeSingle<{ id: string; name: string }>();
  if (!team) {
    redirectWithError(returnPath, "That club could not be found.");
  }

  const clubParticipantIds = await getClubParticipantIds(serviceClient, teamId);
  if (clubParticipantIds.includes(profile.id)) {
    redirectWithError(returnPath, "Club staff cannot request a call with their own club.");
  }

  const { data: existingRequest } = await serviceClient
    .from("meeting_requests")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("player_profile_id", profile.id)
    .in("status", OPEN_MEETING_STATUSES)
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (existingRequest) {
    redirect(`${returnPath}?notice=${encodeURIComponent(`You already have an ${meetingStatusLabel(existingRequest.status)} call request with this club.`)}`);
  }

  const { conversationId, error: conversationError } = await getOrCreateMeetingConversation({
    serviceClient,
    teamId,
    playerProfileId: profile.id,
    actorProfileId: profile.id,
    teamName: team.name,
    playerName: profile.display_name
  });

  if (conversationError) {
    redirectWithError(returnPath, conversationError);
  }

  const { data: meeting, error } = await serviceClient
    .from("meeting_requests")
    .insert({
      team_id: teamId,
      player_profile_id: profile.id,
      requested_by: profile.id,
      conversation_id: conversationId,
      request_reason: requestReason || null,
      request_note: requestNote || null,
      requested_time_options: [
        { label: "preferred", starts_at: proposedStartAt },
        ...(proposedAlternativeAt ? [{ label: "backup", starts_at: proposedAlternativeAt }] : [])
      ],
      proposed_start_at: proposedStartAt,
      proposed_alternative_at: proposedAlternativeAt,
      timezone: timezone || null,
      updated_at: new Date().toISOString()
    })
    .select("id, team_id, player_profile_id, conversation_id")
    .single<Pick<MeetingRequest, "id" | "team_id" | "player_profile_id" | "conversation_id">>();

  if (error || !meeting) {
    redirectWithError(returnPath, error?.message ?? "Could not send the call request.");
  }

  const messageError = await appendWorkflowMessage({
    serviceClient,
    conversationId,
    senderProfileId: profile.id,
    body: [
      `Video call request for ${team.name}`,
      requestReason ? `Reason: ${requestReason}` : null,
      `Preferred: ${formatMeetingTime(proposedStartAt)}`,
      proposedAlternativeAt ? `Backup: ${formatMeetingTime(proposedAlternativeAt)}` : null,
      requestNote ? `Context: ${requestNote}` : null,
      "Club staff can accept, decline, or propose a final time from this inbox."
    ]
      .filter(Boolean)
      .join("\n")
  });

  if (messageError) {
    redirectWithError(returnPath, messageError);
  }

  revalidateMeetingPaths(meeting);

  // Notify club staff about the new call request (fire-and-forget)
  void notifyClubCallRequest({
    serviceClient,
    clubMemberIds: await getClubParticipantIds(serviceClient, teamId),
    playerName: profile.display_name,
    teamName: team.name,
    reason: requestReason || "Video call",
    preferredTime: formatMeetingTime(proposedStartAt),
    backupTime: proposedAlternativeAt ? formatMeetingTime(proposedAlternativeAt) : null,
    note: requestNote || null,
    conversationId: meeting.conversation_id,
  });

  redirect(`${returnPath}?notice=${encodeURIComponent("Call request sent. The club will confirm a final time in your inbox.")}`);
}

export async function requestPlayerCallAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const teamId = text(formData, "team_id", 120);
  const targetProfileId = text(formData, "target_profile_id", 120);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), targetProfileId ? `/players/${targetProfileId}` : "/players");
  const proposedStartAt = parseDateTime(text(formData, "proposed_start_at", 80));
  const proposedAlternativeAt = parseDateTime(text(formData, "proposed_alternative_at", 80));
  const timezone = text(formData, "timezone", 80);
  const requestReason = text(formData, "request_reason", 120) || "Club invite";
  const requestNote = text(formData, "request_note", 500);

  if (profile.role !== "club" && profile.role !== "admin") {
    redirectWithError(returnPath, "Only club accounts can invite players to video calls.");
  }

  if (!hasPremiumFeature(profile, "club_call_negotiation_tools")) {
    redirectWithError(returnPath, "Inviting players to video calls is a premium club feature. Players can still request calls with your club.");
  }

  if (!teamId || !targetProfileId) {
    redirectWithError(returnPath, "Choose a club and player before requesting a call.");
  }

  await enforceActionRateLimit(`call-invite:${profile.id}`, 12, 60 * 60_000, returnPath);

  if (targetProfileId === profile.id) {
    redirectWithError(returnPath, "You cannot request a call with yourself.");
  }

  if (!proposedStartAt) {
    redirectWithError(returnPath, "Choose a preferred call time.");
  }
  ensureFutureTime(proposedStartAt, returnPath);
  if (proposedAlternativeAt) {
    ensureFutureTime(proposedAlternativeAt, returnPath);
  }

  if (profile.role !== "admin") {
    const member = await isClubMember(serviceClient, teamId, profile.id);
    if (!member) {
      redirectWithError(returnPath, "Only staff from this club can invite players to calls.");
    }
  }

  const { data: targetProfile } = await serviceClient
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", targetProfileId)
    .maybeSingle<{ id: string; role: string; display_name: string }>();

  if (!targetProfile || targetProfile.role !== "player") {
    redirectWithError(returnPath, "That player profile could not be found.");
  }

  const { data: team } = await serviceClient.from("teams").select("id, name").eq("id", teamId).maybeSingle<{ id: string; name: string }>();
  if (!team) {
    redirectWithError(returnPath, "That club could not be found.");
  }

  const { data: existingRequest } = await serviceClient
    .from("meeting_requests")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("player_profile_id", targetProfileId)
    .in("status", OPEN_MEETING_STATUSES)
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (existingRequest) {
    redirect(`${returnPath}?notice=${encodeURIComponent(`There is already an ${meetingStatusLabel(existingRequest.status)} call request with this player.`)}`);
  }

  const { conversationId, error: conversationError } = await getOrCreateMeetingConversation({
    serviceClient,
    teamId,
    playerProfileId: targetProfileId,
    actorProfileId: profile.id,
    teamName: team.name,
    playerName: targetProfile.display_name
  });

  if (conversationError) {
    redirectWithError(returnPath, conversationError);
  }

  const now = new Date().toISOString();
  const { data: meeting, error } = await serviceClient
    .from("meeting_requests")
    .insert({
      team_id: teamId,
      player_profile_id: targetProfileId,
      requested_by: profile.id,
      responded_by: profile.id,
      conversation_id: conversationId,
      status: "club_proposed",
      request_reason: requestReason,
      request_note: requestNote || null,
      requested_time_options: [
        { label: "club_proposed", starts_at: proposedStartAt },
        ...(proposedAlternativeAt ? [{ label: "backup", starts_at: proposedAlternativeAt }] : [])
      ],
      proposed_start_at: proposedStartAt,
      proposed_alternative_at: proposedAlternativeAt,
      scheduled_at: proposedStartAt,
      club_proposed_at: now,
      timezone: timezone || null,
      updated_at: now
    })
    .select("id, team_id, player_profile_id, conversation_id")
    .single<Pick<MeetingRequest, "id" | "team_id" | "player_profile_id" | "conversation_id">>();

  if (error || !meeting) {
    redirectWithError(returnPath, error?.message ?? "Could not send the call invite.");
  }

  const messageError = await appendWorkflowMessage({
    serviceClient,
    conversationId,
    senderProfileId: profile.id,
    body: [
      `${team.name} proposed a video call with ${targetProfile.display_name}.`,
      `Reason: ${requestReason}`,
      `Final time: ${formatMeetingTime(proposedStartAt)}`,
      proposedAlternativeAt ? `Backup: ${formatMeetingTime(proposedAlternativeAt)}` : null,
      requestNote ? `Context: ${requestNote}` : null,
      "The player can accept the final time from this inbox."
    ]
      .filter(Boolean)
      .join("\n")
  });

  if (messageError) {
    redirectWithError(returnPath, messageError);
  }

  revalidateMeetingPaths(meeting);

  // Notify the player about the club's call invite (fire-and-forget)
  void notifyPlayerCallProposed({
    serviceClient,
    playerProfileId: targetProfileId,
    teamName: team.name,
    scheduledTime: formatMeetingTime(proposedStartAt),
    conversationId: meeting.conversation_id,
  });

  redirect(`${returnPath}?notice=${encodeURIComponent("Call invite sent. The player can confirm the final time from their inbox.")}`);
}

export async function acceptMeetingRequestAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const meetingId = text(formData, "meeting_request_id", 80);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), "/account");
  const scheduledAt = parseDateTime(text(formData, "scheduled_at", 80));
  const durationMinutes = parseDuration(text(formData, "duration_minutes", 10));
  const responseNote = text(formData, "club_response_note", 500);

  if (!meetingId) {
    redirectWithError(returnPath, "Choose a call request first.");
  }

  const meeting = await getMeeting(serviceClient, meetingId);
  if (!meeting) {
    redirectWithError(returnPath, "That call request could not be found.");
  }

  await requireMeetingManager(serviceClient, profile, meeting.team_id, returnPath);

  if (meeting.status !== "pending") {
    redirectWithError(returnPath, "Only pending player call requests can be accepted or adjusted.");
  }

  const finalScheduledAt = scheduledAt ?? meeting.proposed_start_at;
  if (!finalScheduledAt) {
    redirectWithError(returnPath, "Choose a confirmed call time.");
  }
  ensureFutureTime(finalScheduledAt, returnPath);

  const now = new Date().toISOString();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({
      status: "club_proposed",
      responded_by: profile.id,
      club_response_note: responseNote || null,
      scheduled_at: finalScheduledAt,
      scheduled_duration_minutes: durationMinutes,
      club_proposed_at: now,
      updated_at: now
    })
    .eq("id", meeting.id)
    .eq("status", "pending");

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  const context = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
  const messageError = await appendWorkflowMessage({
    serviceClient,
    conversationId: meeting.conversation_id,
    senderProfileId: profile.id,
    body: [
      `${context.teamName} sent a final video call time for ${context.playerName}.`,
      `Final time: ${formatMeetingTime(finalScheduledAt)}`,
      `Duration: ${durationMinutes} minutes`,
      responseNote ? `Club note: ${responseNote}` : null,
      "Player confirmation is needed before the call is locked."
    ]
      .filter(Boolean)
      .join("\n")
  });

  if (messageError) {
    redirectWithError(returnPath, messageError);
  }

  revalidateMeetingPaths(meeting);

  // Notify player that club proposed a final time (fire-and-forget)
  const acceptContext = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
  void notifyPlayerCallProposed({
    serviceClient,
    playerProfileId: meeting.player_profile_id,
    teamName: acceptContext.teamName,
    scheduledTime: formatMeetingTime(finalScheduledAt),
    conversationId: meeting.conversation_id,
  });

  redirect(`${returnPath}?notice=${encodeURIComponent("Final call time sent. The player can confirm it from their inbox.")}`);
}

export async function confirmMeetingTimeAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const meetingId = text(formData, "meeting_request_id", 80);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), "/account");
  const durationMinutes = parseDuration(text(formData, "duration_minutes", 10));

  if (!meetingId) {
    redirectWithError(returnPath, "Choose a call request first.");
  }

  const meeting = await getMeeting(serviceClient, meetingId);
  if (!meeting) {
    redirectWithError(returnPath, "That call request could not be found.");
  }

  if (meeting.player_profile_id !== profile.id) {
    redirectWithError(returnPath, "Only the player can confirm the final call time.");
  }

  const isLegacyClubInvite = meeting.status === "pending" && meeting.requested_by !== meeting.player_profile_id;
  if (meeting.status !== "club_proposed" && !isLegacyClubInvite) {
    redirectWithError(returnPath, "This call is not waiting for player confirmation.");
  }

  const finalScheduledAt = meeting.scheduled_at ?? meeting.proposed_start_at;
  if (!finalScheduledAt) {
    redirectWithError(returnPath, "The club has not set a final call time yet.");
  }
  ensureFutureTime(finalScheduledAt, returnPath);

  const now = new Date().toISOString();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({
      status: "accepted",
      scheduled_at: finalScheduledAt,
      scheduled_duration_minutes: durationMinutes || meeting.scheduled_duration_minutes,
      player_confirmed_at: now,
      accepted_at: now,
      updated_at: now
    })
    .eq("id", meeting.id)
    .in("status", ["pending", "club_proposed"]);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  const context = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
  const messageError = await appendWorkflowMessage({
    serviceClient,
    conversationId: meeting.conversation_id,
    senderProfileId: profile.id,
    body: [
      `${context.playerName} confirmed the video call with ${context.teamName}.`,
      `Confirmed time: ${formatMeetingTime(finalScheduledAt)}`,
      `Duration: ${durationMinutes || meeting.scheduled_duration_minutes} minutes`,
      `The secure Daily room opens ${ROOM_OPEN_BUFFER_MINUTES} minutes before the appointment.`
    ].join("\n")
  });

  if (messageError) {
    redirectWithError(returnPath, messageError);
  }

  revalidateMeetingPaths(meeting);

  // Notify both parties that the call is confirmed (fire-and-forget)
  void notifyCallConfirmed({
    serviceClient,
    playerProfileId: meeting.player_profile_id,
    clubMemberIds: await getClubParticipantIds(serviceClient, meeting.team_id),
    playerName: context.playerName,
    teamName: context.teamName,
    scheduledTime: formatMeetingTime(finalScheduledAt),
    conversationId: meeting.conversation_id,
  });

  redirect(`${returnPath}?notice=${encodeURIComponent("Call confirmed. The Daily room opens 5 minutes before the scheduled time.")}`);
}

export async function declineMeetingRequestAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const meetingId = text(formData, "meeting_request_id", 80);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), "/account");
  const responseNote = text(formData, "club_response_note", 500);

  const meeting = await getMeeting(serviceClient, meetingId);
  if (!meeting) {
    redirectWithError(returnPath, "That call request could not be found.");
  }

  const canPlayerDecline = meeting.player_profile_id === profile.id && (meeting.status === "club_proposed" || meeting.requested_by !== profile.id);
  if (!canPlayerDecline) {
    await requireMeetingManager(serviceClient, profile, meeting.team_id, returnPath);
  }

  if (!["pending", "club_proposed"].includes(meeting.status)) {
    redirectWithError(returnPath, "Only pending call requests can be declined.");
  }

  const now = new Date().toISOString();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({
      status: "declined",
      responded_by: profile.id,
      club_response_note: responseNote || null,
      declined_at: now,
      updated_at: now
    })
    .eq("id", meeting.id)
    .in("status", ["pending", "club_proposed"]);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  const context = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
  const messageError = await appendWorkflowMessage({
    serviceClient,
    conversationId: meeting.conversation_id,
    senderProfileId: profile.id,
    body: [
      `${profile.display_name} declined the video call between ${context.playerName} and ${context.teamName}.`,
      responseNote ? `Reason: ${responseNote}` : null
    ]
      .filter(Boolean)
      .join("\n")
  });

  if (messageError) {
    redirectWithError(returnPath, messageError);
  }

  revalidateMeetingPaths(meeting);
  redirect(`${returnPath}?notice=${encodeURIComponent("Call request declined.")}`);
}

export async function cancelMeetingRequestAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const meetingId = text(formData, "meeting_request_id", 80);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), "/account");

  const meeting = await getMeeting(serviceClient, meetingId);
  if (!meeting) {
    redirectWithError(returnPath, "That call request could not be found.");
  }

  const canCancelAsPlayer = meeting.player_profile_id === profile.id;
  const canCancelAsClub = profile.role === "admin" || (profile.role === "club" && (await isClubMember(serviceClient, meeting.team_id, profile.id)));

  if (!canCancelAsPlayer && !canCancelAsClub) {
    redirectWithError(returnPath, "You cannot cancel that call request.");
  }

  if (!OPEN_MEETING_STATUSES.includes(meeting.status)) {
    redirectWithError(returnPath, "Only open calls can be cancelled.");
  }

  const now = new Date().toISOString();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now
    })
    .eq("id", meeting.id);

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  const context = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
  await appendWorkflowMessage({
    serviceClient,
    conversationId: meeting.conversation_id,
    senderProfileId: profile.id,
    body: `${profile.display_name} cancelled the video call between ${context.playerName} and ${context.teamName}.`
  });

  revalidateMeetingPaths(meeting);
  redirect(`${returnPath}?notice=${encodeURIComponent("Call request cancelled.")}`);
}

export async function createMeetingJoinLinkAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const meetingId = text(formData, "meeting_request_id", 80);
  const returnPath = safeReturnPath(text(formData, "return_to", 240), "/account");

  const meeting = await getMeeting(serviceClient, meetingId);
  if (!meeting) {
    redirectWithError(returnPath, "That call request could not be found.");
  }

  const isPlayer = meeting.player_profile_id === profile.id;
  const isClub = profile.role === "admin" || (profile.role === "club" && (await isClubMember(serviceClient, meeting.team_id, profile.id)));

  if (!isPlayer && !isClub) {
    redirectWithError(returnPath, "You are not a participant in that call.");
  }

  if (meeting.status !== "accepted") {
    redirectWithError(returnPath, "This call is not confirmed yet.");
  }

  if (!meeting.scheduled_at) {
    redirectWithError(returnPath, "This call does not have a confirmed time.");
  }

  const scheduledTime = new Date(meeting.scheduled_at).getTime();
  if (Number.isNaN(scheduledTime)) {
    redirectWithError(returnPath, "This call has an invalid confirmed time.");
  }

  const opensAt = scheduledTime - ROOM_OPEN_BUFFER_MINUTES * 60 * 1000;
  const expiresAt = scheduledTime + (meeting.scheduled_duration_minutes + 30) * 60 * 1000;
  if (Date.now() < opensAt) {
    redirectWithError(returnPath, `This room opens ${ROOM_OPEN_BUFFER_MINUTES} minutes before the scheduled call.`);
  }
  if (Date.now() > expiresAt) {
    redirectWithError(returnPath, "This call window has passed. Please schedule a new call.");
  }

  let roomName = meeting.daily_room_name;
  let roomUrl = meeting.daily_room_url;
  let roomExpiresAt = meeting.daily_room_expires_at;

  if (!roomName || !roomUrl) {
    let createdRoom: Awaited<ReturnType<typeof createDailyRoom>>;

    try {
      createdRoom = await createDailyRoom({
        meetingId: meeting.id,
        scheduledAt: meeting.scheduled_at,
        durationMinutes: meeting.scheduled_duration_minutes
      });
    } catch (error) {
      redirectWithError(returnPath, error instanceof Error ? error.message : "Could not create the Daily room.");
    }

    const now = new Date().toISOString();
    const { error } = await serviceClient
      .from("meeting_requests")
      .update({
        daily_provider: "daily",
        daily_room_id: createdRoom.room.id,
        daily_room_name: createdRoom.room.name,
        daily_room_url: createdRoom.room.url,
        daily_room_expires_at: createdRoom.roomExpiresAt,
        daily_sfu_enabled: true,
        daily_room_config: createdRoom.room.config ?? {},
        room_opened_at: now,
        updated_at: now
      })
      .eq("id", meeting.id);

    if (error) {
      redirectWithError(returnPath, error.message);
    }

    roomName = createdRoom.room.name;
    roomUrl = createdRoom.room.url;
    roomExpiresAt = createdRoom.roomExpiresAt;

    const context = await getMeetingContext(serviceClient, meeting.team_id, meeting.player_profile_id);
    await appendWorkflowMessage({
      serviceClient,
      conversationId: meeting.conversation_id,
      senderProfileId: profile.id,
      body: [
        `The secure Daily room is open for ${context.teamName} and ${context.playerName}.`,
        `Join from EuroScout: /meetings/${meeting.id}/room`,
        "Only authorised participants can generate a private join token."
      ].join("\n")
    });
  }

  if (!roomName || !roomUrl) {
    redirectWithError(returnPath, "This call room could not be opened.");
  }

  let joinToken: Awaited<ReturnType<typeof createDailyMeetingToken>>;

  try {
    joinToken = await createDailyMeetingToken({
      roomName,
      user: profile,
      isOwner: isClub,
      expiresAt: roomExpiresAt
    });
  } catch (error) {
    redirectWithError(returnPath, error instanceof Error ? error.message : "Could not create a Daily meeting token.");
  }

  const { error } = await serviceClient.from("meeting_join_tokens").insert({
    meeting_request_id: meeting.id,
    profile_id: profile.id,
    daily_room_name: roomName,
    token_fingerprint: createHash("sha256").update(joinToken.token).digest("hex").slice(0, 48),
    expires_at: joinToken.expiresAt,
    is_owner: isClub
  });

  if (error) {
    redirectWithError(returnPath, error.message);
  }

  revalidateMeetingPaths(meeting);
  const joinUrl = buildDailyJoinUrl(`/meetings/${meeting.id}/room`, joinToken.token);
  redirect(joinUrl);
}
