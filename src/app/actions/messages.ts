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

async function requireConnectedClubForClubUser(profileId: string, role: string) {
  if (role !== "club") return;

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: membership } = await serviceClient
    .from("club_members")
    .select("team_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ team_id: string }>();

  if (!membership?.team_id) {
    redirect("/account?error=Claim or create a club before messaging players.");
  }
}

export async function startConversationAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  await requireConnectedClubForClubUser(profile.id, profile.role);

  const targetProfileId = text(formData, "target_profile_id");
  const teamId = text(formData, "team_id") || null;
  const rawSubject = text(formData, "subject") || "EuroScout conversation";
  const subject = rawSubject.slice(0, MAX_SUBJECT_LENGTH);

  // Club inbox threads: team_id on the conversation is sufficient for access via RLS.
  // For direct messages, a target_profile_id is required.
  if (!targetProfileId && !teamId) {
    redirect("/messages?error=No connected profile is available for that conversation yet.");
  }

  if (targetProfileId && targetProfileId === profile.id) {
    redirect("/messages?error=You cannot start a conversation with yourself.");
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      created_by: profile.id,
      subject,
      ...(teamId ? { team_id: teamId } : {})
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !conversation) {
    redirect(`/messages?error=${encodeURIComponent(error?.message ?? "Could not start conversation.")}`);
  }

  // For direct (non-club-inbox) conversations, add both participants.
  if (!teamId && targetProfileId) {
    await supabase.from("conversation_participants").insert([
      {
        conversation_id: conversation.id,
        profile_id: profile.id
      },
      {
        conversation_id: conversation.id,
        profile_id: targetProfileId
      }
    ]);
  } else if (!teamId) {
    // Fallback: at minimum add the creator
    await supabase.from("conversation_participants").insert({
      conversation_id: conversation.id,
      profile_id: profile.id
    });
  }

  const initialMessage = text(formData, "body").slice(0, MAX_BODY_LENGTH);

  if (initialMessage) {
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_profile_id: profile.id,
      body: initialMessage
    });
  }

  revalidatePath("/messages");
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessageAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  await requireConnectedClubForClubUser(profile.id, profile.role);

  const conversationId = text(formData, "conversation_id");
  const body = text(formData, "body").slice(0, MAX_BODY_LENGTH);

  if (!conversationId || !body) {
    redirect(`/messages/${conversationId}?error=Write a message before sending.`);
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: profile.id,
    body
  });

  if (error) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  revalidatePath(`/messages/${conversationId}`);
  redirect(`/messages/${conversationId}`);
}

export async function markConversationReadAction(conversationId: string) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) return;
  // last_seen_at column added via: ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
  await supabase
    .from("conversation_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profile.id);
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
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
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

  // Prevent club members from messaging their own club
  const { data: selfMembership } = await supabase
    .from("club_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string }>();

  if (selfMembership) {
    redirect(`/scouts/${scoutId}?error=You are already a member of this club.`);
  }

  // Find the club owner to add as a participant
  const { data: ownerMember } = await supabase
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .eq("club_role", "owner")
    .limit(1)
    .maybeSingle<{ profile_id: string }>();

  // Create the conversation — team_id routes it to the club inbox
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      created_by: profile.id,
      subject: `Message from ${profile.display_name}`,
      team_id: teamId
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !conversation) {
    redirect(`/scouts/${scoutId}?error=${encodeURIComponent(error?.message ?? "Could not start conversation.")}`);
  }

  // Add sender + owner as participants
  const participants: Array<{ conversation_id: string; profile_id: string }> = [
    { conversation_id: conversation.id, profile_id: profile.id }
  ];
  if (ownerMember) {
    participants.push({ conversation_id: conversation.id, profile_id: ownerMember.profile_id });
  }
  await supabase.from("conversation_participants").insert(participants);

  // Send initial message
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_profile_id: profile.id,
    body: message
  });

  revalidatePath("/messages");
  redirect(`/messages/${conversation.id}`);
}
