"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import type { ClubRole } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireClubOwner(supabase: Awaited<ReturnType<typeof getAuthenticatedProfile>>["supabase"], profileId: string, teamId: string) {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_role")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle<{ club_role: ClubRole }>();

  if (error || data?.club_role !== "owner") {
    redirect("/dashboard?error=Only the club owner can perform this action.");
  }
}

// ─── Claim a team ─────────────────────────────────────────────────────────────

export async function claimTeamAction(teamId: string) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  if (profile.role !== "club") {
    redirect("/dashboard?error=Only club accounts can claim a team.");
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error: teamError } = await supabase
    .from("teams")
    .update({
      claim_status: "pending",
      claimed_at: now,
      claim_expires_at: expiresAt,
      claimed_by: profile.id
    })
    .eq("id", teamId)
    .in("claim_status", ["unclaimed", null]);

  if (teamError) {
    redirect(`/dashboard?error=${encodeURIComponent(teamError.message)}`);
  }

  const { error: memberError } = await supabase.from("club_members").insert({
    team_id: teamId,
    profile_id: profile.id,
    club_role: "owner",
    joined_at: now
  });

  if (memberError) {
    redirect(`/dashboard?error=${encodeURIComponent(memberError.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/scouts/${profile.id}`);
}

// ─── Invite a member ─────────────────────────────────────────────────────────

export async function inviteMemberAction(teamId: string, inviteeProfileId: string, clubRole: ClubRole) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  await requireClubOwner(supabase, profile.id, teamId);

  const { error } = await supabase.from("club_members").insert({
    team_id: teamId,
    profile_id: inviteeProfileId,
    club_role: clubRole,
    invited_by: profile.id,
    joined_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${profile.id}`);
}

// ─── Remove a member ──────────────────────────────────────────────────────────

export async function removeMemberAction(teamId: string, memberProfileId: string) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  await requireClubOwner(supabase, profile.id, teamId);

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", memberProfileId);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${profile.id}`);
}

// ─── Raise a dispute ──────────────────────────────────────────────────────────

export async function raiseDisputeAction(teamId: string, reason: string) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  const trimmedReason = reason.trim().slice(0, 2000);
  if (!trimmedReason) {
    redirect("/dashboard?error=A reason is required to raise a dispute.");
  }

  const { error } = await supabase.from("club_disputes").insert({
    team_id: teamId,
    raised_by: profile.id,
    reason: trimmedReason,
    status: "open"
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

// ─── Update club profile ──────────────────────────────────────────────────────

export async function updateClubProfileAction(
  teamId: string,
  data: {
    website?: string | null;
    contact_email?: string | null;
    open_roster_spots?: number | null;
    recruiting_active?: boolean;
  }
) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  await requireClubOwner(supabase, profile.id, teamId);

  const { error } = await supabase.from("teams").update(data).eq("id", teamId);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${profile.id}`);
  revalidatePath(`/teams/${teamId}`);
}

// ─── Require club member (any role) ──────────────────────────────────────────

async function requireClubMember(
  supabase: Awaited<ReturnType<typeof getAuthenticatedProfile>>["supabase"],
  profileId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_role")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle<{ club_role: ClubRole }>();

  if (error || !data) {
    redirect("/dashboard?error=You must be a club member to perform this action.");
  }
}

// ─── Video provider detection ─────────────────────────────────────────────────

function detectVideoProvider(url: string): "youtube" | "vimeo" | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return null;
}

// ─── Club Media ───────────────────────────────────────────────────────────────

export async function saveClubVideoAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const teamId = String(formData.get("team_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;

  if (!teamId || !url) {
    redirect(`/scouts/${scoutId}?error=Team and video URL are required.`);
  }

  await requireClubMember(supabase, profile.id, teamId);
  const provider = detectVideoProvider(url);

  // Upsert: one video per team — delete existing, then insert
  await supabase.from("club_media").delete().eq("team_id", teamId).eq("media_type", "video");

  const { error } = await supabase.from("club_media").insert({
    team_id: teamId,
    media_type: "video",
    url,
    provider,
    label,
    display_order: 0
  });

  if (error) {
    redirect(`/scouts/${scoutId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${scoutId}`);
}

export async function saveClubPhotoAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const teamId = String(formData.get("team_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const displayOrder = parseInt(String(formData.get("display_order") ?? "0"), 10);
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;

  if (!teamId || !url) {
    redirect(`/scouts/${scoutId}?error=Team and photo URL are required.`);
  }

  await requireClubMember(supabase, profile.id, teamId);

  // Enforce max 3 photos per team
  const { count } = await supabase
    .from("club_media")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("media_type", "photo");

  if ((count ?? 0) >= 3) {
    redirect(`/scouts/${scoutId}?error=Maximum 3 photos allowed per team.`);
  }

  const { error } = await supabase.from("club_media").insert({
    team_id: teamId,
    media_type: "photo",
    url,
    display_order: isNaN(displayOrder) ? 0 : displayOrder
  });

  if (error) {
    redirect(`/scouts/${scoutId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${scoutId}`);
}

export async function deleteClubMediaAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const mediaId = String(formData.get("media_id") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;

  if (!mediaId || !teamId) {
    redirect("/dashboard?error=Invalid media or team.");
  }

  await requireClubMember(supabase, profile.id, teamId);

  const { error } = await supabase
    .from("club_media")
    .delete()
    .eq("id", mediaId)
    .eq("team_id", teamId);

  if (error) {
    redirect(`/scouts/${scoutId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${scoutId}`);
}

// ─── Pipeline privacy toggle ─────────────────────────────────────────────────

export async function togglePipelinePrivacyAction(teamId: string, isPublic: boolean) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  await requireClubOwner(supabase, profile.id, teamId);

  const { error } = await supabase
    .from("teams")
    .update({ pipeline_names_public: isPublic })
    .eq("id", teamId);

  if (error) {
    redirect(`/scouts/${profile.id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/scouts/${profile.id}`);
}
