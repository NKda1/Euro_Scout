"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function startConversationAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  let targetProfileId = text(formData, "target_profile_id");
  const teamId = text(formData, "team_id");
  const subject = text(formData, "subject") || "EuroScout conversation";

  if (!targetProfileId && teamId) {
    const { data: teamAdmin } = await supabase
      .from("team_admin_profiles")
      .select("profile_id")
      .eq("team_id", teamId)
      .limit(1)
      .maybeSingle<{ profile_id: string }>();

    targetProfileId = teamAdmin?.profile_id ?? "";
  }

  if (!targetProfileId) {
    redirect("/messages?error=No connected profile is available for that conversation yet.");
  }

  if (targetProfileId === profile.id) {
    redirect("/messages?error=You cannot start a conversation with yourself.");
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      created_by: profile.id,
      subject
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !conversation) {
    redirect(`/messages?error=${encodeURIComponent(error?.message ?? "Could not start conversation.")}`);
  }

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

  const initialMessage = text(formData, "body");

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

  const conversationId = text(formData, "conversation_id");
  const body = text(formData, "body");

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
