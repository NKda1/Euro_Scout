"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";
const MAX_MEDIA_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
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

function formText(formData: FormData, key: string, maxLength = 500) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureOwnerMembership(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  teamId: string,
  profileId: string,
  joinedAt: string
) {
  const { data: existingMembership } = await serviceClient
    .from("club_members")
    .select("id, club_role")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ id: string; club_role: string }>();

  if (existingMembership) {
    const { error } = await serviceClient
      .from("club_members")
      .update({ club_role: "owner", joined_at: joinedAt })
      .eq("id", existingMembership.id);

    return error;
  }

  const { error } = await serviceClient.from("club_members").insert({
    team_id: teamId,
    profile_id: profileId,
    club_role: "owner",
    joined_at: joinedAt
  });

  return error;
}

async function ensureDefaultClubWatchlist(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  teamId: string,
  profileId: string
) {
  const { data: existing } = await serviceClient
    .from("watchlists")
    .select("id")
    .eq("team_id", teamId)
    .eq("name", "Club shortlist")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing) return;

  await serviceClient.from("watchlists").insert({
    user_id: profileId,
    team_id: teamId,
    name: "Club shortlist",
    is_shared: true,
    updated_at: new Date().toISOString()
  });
}

async function ensurePublicUserRow(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  user: Awaited<ReturnType<typeof getAuthenticatedProfile>>["user"],
  profile: NonNullable<Awaited<ReturnType<typeof getAuthenticatedProfile>>["profile"]>
) {
  const email = user.email;
  if (!email) return;

  await serviceClient.from("users").upsert(
    {
      id: profile.id,
      email,
      role: profile.role,
      display_name: profile.display_name
    },
    { onConflict: "id" }
  );
}

// ─── Claim a team ─────────────────────────────────────────────────────────────

export async function claimTeamAction(teamId: string) {
  const { profile, user } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  if (profile.role !== "club") {
    redirect("/dashboard?error=Only club accounts can claim a team.");
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: teamClaim, error: teamError } = await serviceClient
    .from("teams")
    .update({
      claim_status: "pending",
      claimed_at: now,
      claim_expires_at: expiresAt,
      claimed_by: profile.id
    })
    .eq("id", teamId)
    .or("claim_status.is.null,claim_status.eq.unclaimed")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (teamError) {
    redirect(`/dashboard?error=${encodeURIComponent(teamError.message)}`);
  }

  if (!teamClaim) {
    redirect("/account?error=That club is already claimed or unavailable for claiming.");
  }

  const memberError = await ensureOwnerMembership(serviceClient, teamId, profile.id, now);

  if (memberError) {
    redirect(`/dashboard?error=${encodeURIComponent(memberError.message)}`);
  }

  await ensurePublicUserRow(serviceClient, user, profile);
  await Promise.all([
    serviceClient.from("profiles").update({ role: "club", is_public: true, onboarding_complete: true, updated_at: now }).eq("id", profile.id),
    ensureDefaultClubWatchlist(serviceClient, teamId, profile.id)
  ]);

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/scouts");
  revalidatePath("/watchlists");
  revalidatePath(`/scouts/${profile.id}`);
  redirect("/account?notice=Club claimed. Your public club profile and club shortlist are ready.");
}

export async function claimTeamFromAccountAction(formData: FormData) {
  const teamId = String(formData.get("team_id") ?? "").trim();

  if (!teamId) {
    redirect("/account?error=Choose a club to claim.");
  }

  await claimTeamAction(teamId);
}

export async function requestNewTeamFromAccountAction(formData: FormData) {
  const { profile, user } = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  if (profile.role !== "club") {
    redirect("/account?error=Only club accounts can request a team.");
  }

  const teamName = formText(formData, "team_name", 160);
  const country = formText(formData, "country", 80);
  const city = formText(formData, "city", 80);
  const leagueId = formText(formData, "league_id", 120);
  const regionId = formText(formData, "region_id", 120);
  const stadium = formText(formData, "stadium", 160);

  if (!teamName || !country || !city || !leagueId || !regionId) {
    redirect("/account?error=Team name, city, country, league and region are required.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const baseSlug = slugify(teamName);
  const id = `${baseSlug}-${randomUUID().slice(0, 8)}`;

  const { data: team, error: teamError } = await serviceClient
    .from("teams")
    .insert({
      id,
      name: teamName,
      slug: id,
      league_id: leagueId,
      region_id: regionId,
      city,
      country,
      stadium,
      claim_status: "pending",
      claimed_at: now,
      claim_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      claimed_by: profile.id,
      recruiting_active: false,
      open_roster_spots: 0,
      pipeline_names_public: false,
      verified: false
    })
    .select("id")
    .single<{ id: string }>();

  if (teamError || !team) {
    redirect(`/account?error=${encodeURIComponent(teamError?.message ?? "Could not create team.")}`);
  }

  const memberError = await ensureOwnerMembership(serviceClient, team.id, profile.id, now);

  if (memberError) {
    redirect(`/account?error=${encodeURIComponent(memberError.message)}`);
  }

  await ensurePublicUserRow(serviceClient, user, profile);
  await Promise.all([
    serviceClient.from("profiles").update({ role: "club", is_public: true, onboarding_complete: true, updated_at: now }).eq("id", profile.id),
    ensureDefaultClubWatchlist(serviceClient, team.id, profile.id)
  ]);

  revalidatePath("/account");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePath("/watchlists");
  revalidatePath(`/scouts/${profile.id}`);
  redirect("/account?notice=Club created. Your public club profile and club shortlist are ready.");
}

export async function updateClubProfileFromAccountAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) redirect("/auth/sign-in");
  if (profile.role !== "club" && profile.role !== "admin") {
    redirect("/account?error=Only club accounts can update club profile details.");
  }

  const teamId = formText(formData, "team_id", 120);
  if (!teamId) redirect("/account?error=Missing club team.");

  await requireClubOwner(supabase, profile.id, teamId);

  const openRosterSpotsRaw = formText(formData, "open_roster_spots", 10);
  const openRosterSpots = openRosterSpotsRaw ? Math.max(0, Number(openRosterSpotsRaw)) : 0;
  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient
    .from("teams")
    .update({
      name: formText(formData, "name", 160),
      city: formText(formData, "city", 80),
      country: formText(formData, "country", 80),
      stadium: formText(formData, "stadium", 160),
      website: formText(formData, "website", 240),
      contact_email: formText(formData, "contact_email", 240),
      open_roster_spots: Number.isFinite(openRosterSpots) ? openRosterSpots : 0,
      recruiting_active: formData.get("recruiting_active") === "on",
      pipeline_names_public: formData.get("pipeline_names_public") === "on",
      updated_at: new Date().toISOString()
    })
    .eq("id", teamId);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/scouts");
  revalidatePath(`/scouts/${profile.id}`);
  revalidatePath(`/teams/${teamId}`);
  redirect("/account?notice=Club profile saved.");
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

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "club-photo";
}

function validateImage(file: File, redirectPath: string) {
  if (!IMAGE_TYPES.has(file.type)) {
    redirect(`${redirectPath}?error=Upload a JPG, PNG, WebP or GIF image.`);
  }

  if (file.size > MAX_MEDIA_IMAGE_BYTES) {
    redirect(`${redirectPath}?error=Club images must be 7MB or smaller.`);
  }
}

// ─── Club Media ───────────────────────────────────────────────────────────────

export async function saveClubVideoAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const teamId = String(formData.get("team_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;
  const returnTo = String(formData.get("return_to") ?? "").trim() || `/scouts/${scoutId}`;
  const redirectPath = returnTo.startsWith("/") ? returnTo : `/scouts/${scoutId}`;

  if (!teamId || !url) {
    redirect(`${redirectPath}?error=Team and video URL are required.`);
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
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/scouts/${scoutId}`);
  redirect(`${redirectPath}?notice=Club video saved.`);
}

export async function saveClubPhotoAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const teamId = String(formData.get("team_id") ?? "").trim();
  let url = String(formData.get("url") ?? "").trim();
  const displayOrder = parseInt(String(formData.get("display_order") ?? "0"), 10);
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;
  const returnTo = String(formData.get("return_to") ?? "").trim() || `/scouts/${scoutId}`;
  const redirectPath = returnTo.startsWith("/") ? returnTo : `/scouts/${scoutId}`;
  const photo = fileValue(formData, "photo");

  if (!teamId || (!url && !photo)) {
    redirect(`${redirectPath}?error=Team and photo are required.`);
  }

  await requireClubMember(supabase, profile.id, teamId);

  if (!url && photo) {
    validateImage(photo, redirectPath);
    const extension = safeFileName(photo.name).split(".").pop() || "jpg";
    const path = `${profile.id}/club-${teamId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, photo, {
      cacheControl: "31536000",
      contentType: photo.type,
      upsert: false
    });

    if (uploadError) {
      redirect(`${redirectPath}?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
    url = data.publicUrl;
  }

  // Enforce max 3 photos per team
  const { count } = await supabase
    .from("club_media")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("media_type", "photo");

  if ((count ?? 0) >= 3) {
    redirect(`${redirectPath}?error=Maximum 3 photos allowed per team.`);
  }

  const { error } = await supabase.from("club_media").insert({
    team_id: teamId,
    media_type: "photo",
    url,
    display_order: isNaN(displayOrder) ? 0 : displayOrder
  });

  if (error) {
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/scouts/${scoutId}`);
  redirect(`${redirectPath}?notice=Club photo added.`);
}

export async function deleteClubMediaAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");

  const mediaId = String(formData.get("media_id") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const scoutId = String(formData.get("scout_id") ?? "").trim() || profile.id;
  const returnTo = String(formData.get("return_to") ?? "").trim() || `/scouts/${scoutId}`;
  const redirectPath = returnTo.startsWith("/") ? returnTo : `/scouts/${scoutId}`;

  if (!mediaId || !teamId) {
    redirect(`${redirectPath}?error=Invalid media or team.`);
  }

  await requireClubMember(supabase, profile.id, teamId);

  const { error } = await supabase
    .from("club_media")
    .delete()
    .eq("id", mediaId)
    .eq("team_id", teamId);

  if (error) {
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/scouts/${scoutId}`);
  redirect(`${redirectPath}?notice=Club media removed.`);
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
