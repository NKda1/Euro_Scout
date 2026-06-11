"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// ─── Input constraints ────────────────────────────────────────────────────────
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 5_000;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type ServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>;

async function getConnectedClub(serviceClient: ServiceClient, profileId: string) {
  const { data: membership } = await serviceClient
    .from("club_members")
    .select("team_id, club_role")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ team_id: string; club_role: string }>();

  return membership ?? null;
}

async function requireConnectedClubForClubUser(serviceClient: ServiceClient, profileId: string, role: string) {
  if (role !== "club") return null;

  const membership = await getConnectedClub(serviceClient, profileId);

  if (!membership?.team_id) {
    redirect("/account?error=Claim or create a club before messaging players.");
  }

  return membership;
}

async function getClubParticipantIds(serviceClient: ServiceClient, teamId: string) {
  const { data: members } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .returns<Array<{ profile_id: string }>>();

  return (members ?? []).map((member) => member.profile_id);
}

async function findExistingClubPlayerConversation(serviceClient: ServiceClient, teamId: string, playerProfileId: string) {
  const { data: playerParticipantRows } = await serviceClient
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", playerProfileId)
    .returns<Array<{ conversation_id: string }>>();

  const conversationIds = playerParticipantRows?.map((row) => row.conversation_id) ?? [];
  if (!conversationIds.length) return null;

  const { data: existingConversation } = await serviceClient
    .from("conversations")
    .select("id")
    .eq("team_id", teamId)
    .in("id", conversationIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return existingConversation?.id ?? null;
}

async function ensureConversationParticipants(params: {
  serviceClient: ServiceClient;
  conversationId: string;
  participantIds: string[];
  createdBy: string;
}) {
  const { serviceClient, conversationId, participantIds, createdBy } = params;
  const uniqueParticipantIds = Array.from(new Set(participantIds.filter(Boolean)));
  if (!uniqueParticipantIds.length) return;

  const { data: existingParticipants } = await serviceClient
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", conversationId)
    .returns<Array<{ profile_id: string }>>();

  const existingIds = new Set((existingParticipants ?? []).map((participant) => participant.profile_id));
  const missingIds = uniqueParticipantIds.filter((profileId) => !existingIds.has(profileId));
  if (!missingIds.length) return;

  const now = new Date().toISOString();
  await serviceClient.from("conversation_participants").insert(
    missingIds.map((profileId) => ({
      conversation_id: conversationId,
      profile_id: profileId,
      last_seen_at: profileId === createdBy ? now : null
    }))
  );
}

async function appendMessageToExistingThread(params: {
  serviceClient: ServiceClient;
  conversationId: string;
  senderProfileId: string;
  body?: string;
}) {
  const { serviceClient, conversationId, senderProfileId, body } = params;
  if (!body) return null;

  const now = new Date().toISOString();

  const { error: messageError } = await serviceClient.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: senderProfileId,
    body
  });

  if (messageError) {
    return messageError.message;
  }

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

async function createThread(params: {
  serviceClient: ServiceClient;
  createdBy: string;
  subject: string;
  teamId: string | null;
  participantIds: string[];
  initialMessage?: string;
  errorPath: string;
}) {
  const { serviceClient, createdBy, subject, teamId, participantIds, initialMessage, errorPath } = params;
  const uniqueParticipantIds = Array.from(new Set([createdBy, ...participantIds].filter(Boolean)));
  const now = new Date().toISOString();

  if (uniqueParticipantIds.length < 2) {
    redirect(`${errorPath}?error=That conversation needs both a player and a club contact.`);
  }

  const { data: conversation, error: conversationError } = await serviceClient
    .from("conversations")
    .insert({
      created_by: createdBy,
      subject,
      ...(teamId ? { team_id: teamId } : {})
    })
    .select("id")
    .single<{ id: string }>();

  if (conversationError || !conversation) {
    redirect(`${errorPath}?error=${encodeURIComponent(conversationError?.message ?? "Could not start conversation.")}`);
  }

  const { error: participantsError } = await serviceClient
    .from("conversation_participants")
    .upsert(
      uniqueParticipantIds.map((profileId) => ({
        conversation_id: conversation.id,
        profile_id: profileId,
        last_seen_at: profileId === createdBy ? now : null
      })),
      { onConflict: "conversation_id,profile_id" }
    );

  if (participantsError) {
    redirect(`${errorPath}?error=${encodeURIComponent(participantsError.message)}`);
  }

  if (initialMessage) {
    const { error: messageError } = await serviceClient.from("messages").insert({
      conversation_id: conversation.id,
      sender_profile_id: createdBy,
      body: initialMessage
    });

    if (messageError) {
      redirect(`${errorPath}?error=${encodeURIComponent(messageError.message)}`);
    }
  }

  return conversation.id;
}

export async function startConversationAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const targetProfileId = text(formData, "target_profile_id");
  const teamId = text(formData, "team_id") || null;
  const rawSubject = text(formData, "subject") || "EuroScout conversation";
  const subject = rawSubject.slice(0, MAX_SUBJECT_LENGTH);
  const initialMessage = text(formData, "body").slice(0, MAX_BODY_LENGTH);

  if (!targetProfileId && !teamId) {
    redirect("/messages?error=No connected profile is available for that conversation yet.");
  }

  if (targetProfileId && teamId) {
    redirect("/messages?error=Choose either a player or a club, not both.");
  }

  if (targetProfileId && targetProfileId === profile.id) {
    redirect("/messages?error=You cannot start a conversation with yourself.");
  }

  let conversationId: string;

  if (targetProfileId) {
    if (profile.role !== "club") {
      redirect("/messages?error=Only club accounts can message player accounts.");
    }

    const membership = await requireConnectedClubForClubUser(serviceClient, profile.id, profile.role);
    const { data: targetProfile } = await serviceClient
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", targetProfileId)
      .maybeSingle<{ id: string; role: string; display_name: string }>();

    if (!targetProfile || targetProfile.role !== "player") {
      redirect("/messages?error=Club accounts can only message player accounts.");
    }

    const clubParticipantIds = membership?.team_id ? await getClubParticipantIds(serviceClient, membership.team_id) : [];
    const connectedTeamId = membership?.team_id ?? null;
    const participantIds = [targetProfile.id, ...clubParticipantIds];
    const existingConversationId = connectedTeamId
      ? await findExistingClubPlayerConversation(serviceClient, connectedTeamId, targetProfile.id)
      : null;

    if (existingConversationId) {
      await ensureConversationParticipants({
        serviceClient,
        conversationId: existingConversationId,
        participantIds: [profile.id, ...participantIds],
        createdBy: profile.id
      });
      const messageError = await appendMessageToExistingThread({
        serviceClient,
        conversationId: existingConversationId,
        senderProfileId: profile.id,
        body: initialMessage
      });
      if (messageError) {
        redirect(`/messages?error=${encodeURIComponent(messageError)}`);
      }
      conversationId = existingConversationId;
    } else {
      conversationId = await createThread({
        serviceClient,
        createdBy: profile.id,
        subject,
        teamId: connectedTeamId,
        participantIds,
        initialMessage,
        errorPath: "/messages"
      });
    }
  } else {
    if (profile.role !== "player") {
      redirect("/messages?error=Only player accounts can contact club accounts.");
    }

    const { data: team } = await serviceClient
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .maybeSingle<{ id: string; name: string }>();

    if (!team) {
      redirect("/messages?error=Club not found.");
    }

    const participantIds = await getClubParticipantIds(serviceClient, team.id);
    const existingConversationId = await findExistingClubPlayerConversation(serviceClient, team.id, profile.id);

    if (existingConversationId) {
      await ensureConversationParticipants({
        serviceClient,
        conversationId: existingConversationId,
        participantIds: [profile.id, ...participantIds],
        createdBy: profile.id
      });
      const messageError = await appendMessageToExistingThread({
        serviceClient,
        conversationId: existingConversationId,
        senderProfileId: profile.id,
        body: initialMessage
      });
      if (messageError) {
        redirect(`/messages?error=${encodeURIComponent(messageError)}`);
      }
      conversationId = existingConversationId;
    } else {
      conversationId = await createThread({
        serviceClient,
        createdBy: profile.id,
        subject: subject || `Message to ${team.name}`,
        teamId: team.id,
        participantIds,
        initialMessage,
        errorPath: "/messages"
      });
    }
  }

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

interface SentMessage {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export async function sendMessageAction(
  formData: FormData
): Promise<{ ok: true; message: SentMessage } | { ok: false; error?: string }> {
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  if (profile.role !== "player" && profile.role !== "club") {
    return { ok: false, error: "Only player and club accounts can send messages." };
  }

  const serviceClient = createSupabaseServiceRoleClient();
  await requireConnectedClubForClubUser(serviceClient, profile.id, profile.role);

  const conversationId = text(formData, "conversation_id");
  const body = text(formData, "body").slice(0, MAX_BODY_LENGTH);

  if (!conversationId || !body) {
    return { ok: false, error: "Write a message before sending." };
  }

  const { data: participantRows } = await serviceClient
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", conversationId)
    .returns<Array<{ profile_id: string }>>();

  const participantIds = participantRows?.map((participant) => participant.profile_id) ?? [];
  if (!participantIds.includes(profile.id)) {
    return { ok: false, error: "You are not a participant in this conversation." };
  }

  const { data: participantProfiles } = await serviceClient
    .from("profiles")
    .select("id, role")
    .in("id", participantIds)
    .returns<Array<{ id: string; role: string }>>();

  const participantRoles = new Set((participantProfiles ?? []).map((participant) => participant.role));
  if (!participantRoles.has("player") || !participantRoles.has("club")) {
    return { ok: false, error: "Messages are only available between player and club accounts." };
  }

  const { data: message, error } = await serviceClient
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_profile_id: profile.id,
      body
    })
    .select("id, sender_profile_id, body, created_at")
    .single<SentMessage>();

  if (error || !message) {
    return { ok: false, error: error?.message ?? "Could not send message." };
  }

  const now = new Date().toISOString();
  await Promise.all([
    serviceClient.from("conversations").update({ updated_at: now }).eq("id", conversationId),
    serviceClient
      .from("conversation_participants")
      .update({ last_seen_at: now })
      .eq("conversation_id", conversationId)
      .eq("profile_id", profile.id)
  ]);
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true, message };
}

export async function markConversationReadAction(conversationId: string) {
  const { profile } = await getAuthenticatedProfile();
  if (!profile) return;

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: participant } = await serviceClient
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string }>();

  if (!participant) return;

  await serviceClient
    .from("conversation_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profile.id);

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
}

export async function flagContactAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile?.onboarding_complete) redirect("/onboarding");
  if (profile.role !== "player") {
    redirect("/messages?error=Only players can flag contacts.");
  }

  const conversationId = text(formData, "conversation_id");
  const reason = text(formData, "reason").slice(0, 2000);

  if (!conversationId || !reason) {
    redirect(`/messages/${conversationId}?error=A reason is required to flag this contact.`);
  }

  // Find other participants to determine the club sender's team
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", conversationId);

  const otherIds = (participants ?? [])
    .map((p: { profile_id: string }) => p.profile_id)
    .filter((id) => id !== profile.id);

  const { data: membership } = otherIds.length
    ? await supabase
        .from("club_members")
        .select("team_id")
        .in("profile_id", otherIds)
        .limit(1)
        .maybeSingle<{ team_id: string }>()
    : { data: null };

  const { error } = await supabase.from("club_disputes").insert({
    team_id: membership?.team_id ?? "unresolved",
    raised_by: profile.id,
    reason: `Flagged contact via messages: ${reason}`,
    status: "open"
  });

  if (error) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/messages/${conversationId}`);
  redirect(`/messages/${conversationId}?flagged=1`);
}

// ─── Contact a club directly from its profile page ────────────────────────────

export async function contactClubAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  if (profile.role !== "player") {
    redirect("/messages?error=Only player accounts can contact club accounts.");
  }

  const teamId = text(formData, "team_id");
  const scoutId = text(formData, "scout_id");
  const message = text(formData, "message").slice(0, MAX_BODY_LENGTH);

  if (!teamId) {
    redirect("/scouts?error=Invalid team.");
  }
  if (!message) {
    redirect(`/scouts/${scoutId}?error=Please write a message before sending.`);
  }

  const serviceClient = createSupabaseServiceRoleClient();
  // Prevent club members from messaging their own club
  const { data: selfMembership } = await serviceClient
    .from("club_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string }>();

  if (selfMembership) {
    redirect(`/scouts/${scoutId}?error=You are already a member of this club.`);
  }

  const participantIds = await getClubParticipantIds(serviceClient, teamId);
  const existingConversationId = await findExistingClubPlayerConversation(serviceClient, teamId, profile.id);
  let conversationId: string;

  if (existingConversationId) {
    await ensureConversationParticipants({
      serviceClient,
      conversationId: existingConversationId,
      participantIds: [profile.id, ...participantIds],
      createdBy: profile.id
    });
    const messageError = await appendMessageToExistingThread({
      serviceClient,
      conversationId: existingConversationId,
      senderProfileId: profile.id,
      body: message
    });
    if (messageError) {
      redirect(`/scouts/${scoutId}?error=${encodeURIComponent(messageError)}`);
    }
    conversationId = existingConversationId;
  } else {
    conversationId = await createThread({
      serviceClient,
      createdBy: profile.id,
      subject: `Message from ${profile.display_name}`,
      teamId,
      participantIds,
      initialMessage: message,
      errorPath: `/scouts/${scoutId}`
    });
  }

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

export async function expressInterestInClubAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  if (profile.role !== "player") {
    redirect("/messages?error=Only player accounts can express interest in clubs.");
  }

  const teamId = text(formData, "team_id");
  const scoutId = text(formData, "scout_id") || teamId;
  const redirectPath = `/scouts/${scoutId}`;

  if (!teamId) {
    redirect("/scouts?error=Invalid team.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: selfMembership } = await serviceClient
    .from("club_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string }>();

  if (selfMembership) {
    redirect(`${redirectPath}?error=You are already a member of this club.`);
  }

  const { data: team } = await serviceClient
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle<{ id: string; name: string }>();

  if (!team) {
    redirect("/scouts?error=Club not found.");
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentInterest, error: recentInterestError } = await serviceClient
    .from("club_interest_notifications")
    .select("id, created_at")
    .eq("team_id", team.id)
    .eq("player_profile_id", profile.id)
    .gte("created_at", oneWeekAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; created_at: string }>();

  if (recentInterestError) {
    redirect(`${redirectPath}?error=${encodeURIComponent(recentInterestError.message)}`);
  }

  if (recentInterest) {
    redirect(`${redirectPath}?notice=${encodeURIComponent("Interest already sent. You can express interest in this club once every 7 days.")}`);
  }

  const { error } = await serviceClient.from("club_interest_notifications").insert({
    team_id: team.id,
    player_profile_id: profile.id
  });

  if (error) {
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(redirectPath);
  revalidatePath("/messages");
  redirect(`${redirectPath}?notice=${encodeURIComponent(`Interest sent to ${team.name}.`)}`);
}
