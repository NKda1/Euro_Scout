"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createPlayerProfileNoteAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const playerProfileId = text(formData, "player_profile_id");
  const returnPath = text(formData, "return_path") || "/players";
  const note = text(formData, "note").slice(0, 2000);

  if (!profile?.onboarding_complete) redirect("/onboarding");
  if (!playerProfileId || !note) redirect(`${returnPath}?error=Note text is required.`);
  if (profile.role !== "club" && profile.role !== "admin") {
    redirect(`${returnPath}?error=Only club accounts can leave player notes.`);
  }

  let teamId = text(formData, "team_id");
  if (profile.role !== "admin") {
    const { data: membership } = await serviceClient
      .from("club_members")
      .select("team_id")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle<{ team_id: string }>();

    if (!membership?.team_id) redirect(`${returnPath}?error=Connect a club before leaving notes.`);
    teamId = membership.team_id;
  }

  const { error } = await serviceClient.from("player_profile_notes").insert({
    player_profile_id: playerProfileId,
    team_id: teamId || null,
    author_profile_id: profile.id,
    note,
    status: "pending"
  });

  if (error) redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(returnPath);
  redirect(`${returnPath}?notice=Note sent to the player for review.`);
}

export async function reviewPlayerProfileNoteAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const noteId = text(formData, "note_id");
  const action = text(formData, "note_action");

  if (!profile?.onboarding_complete) redirect("/onboarding");
  if (!noteId) redirect("/account?error=Note not found.");

  const { data: note } = await serviceClient
    .from("player_profile_notes")
    .select("id, player_profile_id, player_profiles!player_profile_id ( profile_id )")
    .eq("id", noteId)
    .maybeSingle<{
      id: string;
      player_profile_id: string;
      player_profiles: { profile_id: string } | null;
    }>();

  if (!note || (profile.role !== "admin" && note.player_profiles?.profile_id !== profile.id)) {
    redirect("/account?error=You cannot review that note.");
  }

  const now = new Date().toISOString();
  const status = action === "publish" ? "published" : action === "remove" ? "removed" : "rejected";

  const { error } = await serviceClient
    .from("player_profile_notes")
    .update({
      status,
      reviewed_at: now,
      published_at: status === "published" ? now : null,
      updated_at: now
    })
    .eq("id", noteId);

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/account");
  revalidatePath(`/players/${note.player_profiles?.profile_id ?? ""}`);
  redirect("/account?notice=Player note updated.");
}
