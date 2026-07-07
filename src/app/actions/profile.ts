"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser, isReservedAdminEmail, isUserRole, splitName, type UserRole } from "@/lib/auth";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-tags";
import { getCampusConference, getCampusTeam, isCampusPipeline, type CampusPipeline } from "@/lib/campus-to-pro";
import { getClubCreationRegion } from "@/lib/club-regions";
import { regionForEuropeanCountry } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key)?.replace(",", ".");
  return value ? Number(value) : null;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseCareerStats(formData: FormData) {
  const raw = String(formData.get("career_stats_json") ?? "").trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, Number(value)])
        .filter(([key, value]) => /^[a-z0-9_]+$/i.test(String(key)) && Number.isFinite(value as number) && Number(value) >= 0)
        .slice(0, 16)
    );
  } catch {
    return {};
  }
}

function parseCareerTimeline(formData: FormData) {
  const raw = String(formData.get("career_timeline_json") ?? "").trim();
  if (!raw) return [];

  try {
    const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
    return entries
      .map((entry) => ({
        team_name: String(entry.team_name ?? "").trim(),
        team_id: String(entry.team_id ?? "").trim() || null,
        league_name: String(entry.league_name ?? "").trim() || null,
        country: String(entry.country ?? "").trim() || null,
        position: String(entry.position ?? "").trim() || null,
        start_year: Number(entry.start_year) || null,
        end_year: Number(entry.end_year) || null,
        is_current: entry.is_current === true
      }))
      .filter((entry) => entry.team_name)
      .slice(0, 12);
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [teamName, leagueName, country, position, startYear, endYear, current] = line.split("|").map((part) => part.trim());
        return {
          team_name: teamName,
          team_id: null,
          league_name: leagueName || null,
          country: country || null,
          position: position || null,
          start_year: Number(startYear) || null,
          end_year: Number(endYear) || null,
          is_current: /^(current|present|yes|true)$/i.test(current ?? "")
        };
      })
      .filter((entry) => entry.team_name)
      .slice(0, 12);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function requireAllowedRole(role: UserRole, email?: string | null, redirectPath = "/onboarding") {
  if (role === "admin" && !isReservedAdminEmail(email)) {
    redirect(`${redirectPath}?error=The admin role is reserved for the EuroScout owner account.`);
  }
}

function revalidatePublicDirectoryCaches() {
  revalidateTag(PUBLIC_CACHE_TAGS.clubs);
  revalidateTag(PUBLIC_CACHE_TAGS.teams);
  revalidateTag(PUBLIC_CACHE_TAGS.leagues);
  revalidateTag(PUBLIC_CACHE_TAGS.directory);
}

async function resolvePlayerPipeline(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  currentTeamId: string | null,
  submittedPipeline: string | null
) {
  if (currentTeamId) {
    const campusTeam = getCampusTeam(currentTeamId);
    if (campusTeam) return campusTeam.leagueId;

    const { data: team } = await serviceClient
      .from("teams")
      .select("league_id, pipeline_type")
      .eq("id", currentTeamId)
      .maybeSingle<{ league_id: string | null; pipeline_type: string | null }>();

    if (isCampusPipeline(team?.pipeline_type)) return team.pipeline_type;
    if (isCampusPipeline(team?.league_id)) return team.league_id;
  }

  return isCampusPipeline(submittedPipeline) ? submittedPipeline : submittedPipeline;
}

async function upsertCampusBackground(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  playerProfileId: string | null,
  currentTeamId: string | null,
  pipelineType: string | null,
  startYear?: number | null,
  endYear?: number | null
) {
  if (!playerProfileId || !currentTeamId || !isCampusPipeline(pipelineType)) return;

  const localTeam = getCampusTeam(currentTeamId);
  const { data: dbTeam } = localTeam
    ? { data: null }
    : await serviceClient
        .from("teams")
        .select("id, name, league_id, country")
        .eq("id", currentTeamId)
        .maybeSingle<{ id: string; name: string; league_id: CampusPipeline | string | null; country: string | null }>();

  const team = localTeam
    ? {
        name: localTeam.name,
        leagueId: localTeam.leagueId,
        country: localTeam.country,
        conference: localTeam.conference ?? null
      }
    : dbTeam && isCampusPipeline(dbTeam.league_id)
      ? {
          name: dbTeam.name,
          leagueId: dbTeam.league_id,
          country: dbTeam.country ?? (dbTeam.league_id === "bucs" ? "United Kingdom" : "Canada"),
          conference: getCampusConference(currentTeamId)
        }
      : null;

  if (!team) return;

  await serviceClient.from("na_background").delete().eq("player_id", playerProfileId).eq("team_id", currentTeamId);
  await serviceClient.from("na_background").insert({
    player_id: playerProfileId,
    team_id: currentTeamId,
    league_id: team.leagueId,
    level: team.leagueId === "usports" ? "USPORTS" : team.leagueId.toUpperCase(),
    institution: team.name,
    conference: team.conference,
    country: team.country,
    year_start: startYear ?? null,
    year_end: endYear ?? null
  });
}

async function upsertPlayerProfile(
  supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"],
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  userId: string,
  formData: FormData
) {
  const displayName = requiredText(formData, "display_name");
  const name = splitName(displayName);
  const currentTeamId = text(formData, "current_team_id");
  const pipelineType = await resolvePlayerPipeline(serviceClient, currentTeamId, text(formData, "pipeline_type"));
  const payload: Record<string, unknown> = {
    profile_id: userId,
    first_name: text(formData, "first_name") ?? name.firstName,
    last_name: text(formData, "last_name") ?? name.lastName,
    dob: text(formData, "dob") || null,
    nationality: text(formData, "nationality"),
    languages: text(formData, "languages")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
    passport_ready: text(formData, "passport_ready") === "on" ? true : text(formData, "passport_ready") === "" && formData.has("passport_ready") ? false : null,
    position: text(formData, "position"),
    height_cm: numberOrNull(formData, "height_cm"),
    weight_kg: numberOrNull(formData, "weight_kg"),
    forty_yard_dash: numberOrNull(formData, "forty_yard_dash"),
    shuttle_seconds: numberOrNull(formData, "shuttle_seconds"),
    vertical_jump_cm: numberOrNull(formData, "vertical_jump_cm"),
    broad_jump_cm: numberOrNull(formData, "broad_jump_cm"),
    bench_reps: numberOrNull(formData, "bench_reps"),
    career_stats: parseCareerStats(formData),
    current_team_id: currentTeamId,
    pipeline_type: pipelineType,
    available_for_transfer: boolValue(formData, "available_for_transfer"),
    updated_at: new Date().toISOString()
  };

  if (formData.has("photo_urls")) {
    payload.photo_urls = text(formData, "photo_urls")?.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 4) ?? [];
  }

  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .upsert(payload, { onConflict: "profile_id" })
    .select("id")
    .single<{ id: string }>();

  const playerProfileId = playerProfile?.id ?? null;
  await upsertCampusBackground(
    serviceClient,
    playerProfileId,
    currentTeamId,
    pipelineType,
    numberOrNull(formData, "campus_year_start"),
    numberOrNull(formData, "campus_year_end")
  );

  return playerProfileId;
}

async function replaceCareerTimeline(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  playerProfileId: string | null,
  formData: FormData
) {
  if (!playerProfileId || !formData.has("career_timeline_json")) return;

  const entries = parseCareerTimeline(formData);
  await serviceClient.from("player_career_entries").delete().eq("player_profile_id", playerProfileId);

  if (!entries.length) return;

  await serviceClient.from("player_career_entries").insert(
    entries.map((entry) => ({
      ...entry,
      player_profile_id: playerProfileId,
      updated_at: new Date().toISOString()
    }))
  );
}

async function ensurePublicUserRow(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  user: Awaited<ReturnType<typeof getAuthenticatedUser>>["user"],
  role: UserRole,
  displayName: string
) {
  const email = user.email;
  if (!email) return;

  await serviceClient.from("users").upsert(
    {
      id: user.id,
      email,
      role,
      display_name: displayName
    },
    { onConflict: "id" }
  );
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

async function requireNoExistingClubMembership(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>,
  profileId: string,
  redirectPath: string
) {
  const { data: existingMembership } = await serviceClient
    .from("club_members")
    .select("team_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ team_id: string }>();

  if (existingMembership?.team_id) {
    redirect(`${redirectPath}?error=This account is already connected to a club.`);
  }
}

export async function completeOnboardingAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Never strip admin role — admins may preview any role in the wizard
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, onboarding_complete")
    .eq("id", user.id)
    .single();

  const isCurrentlyAdmin = currentProfile?.role === "admin";
  const roleValue = isCurrentlyAdmin ? "admin" : requiredText(formData, "role");

  if (!isCurrentlyAdmin && currentProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  if (!isCurrentlyAdmin && !isUserRole(roleValue)) {
    redirect("/onboarding?error=Choose a valid role.");
  }

  if (!isCurrentlyAdmin) {
    requireAllowedRole(roleValue as UserRole, user.email, "/onboarding");
  }

  const displayName = requiredText(formData, "display_name");
  const serviceClient = createSupabaseServiceRoleClient();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: roleValue,
      display_name: displayName,
      headline: roleValue === "player" || roleValue === "club" ? null : text(formData, "headline"),
      bio: text(formData, "bio"),
      location: text(formData, "location"),
      is_public: boolValue(formData, "is_public"),
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  await serviceClient.from("profiles").update({ welcome_tour_seen: true }).eq("id", user.id);

  if (roleValue === "player") {
    const playerProfileId = await upsertPlayerProfile(supabase, serviceClient, user.id, formData);
    await replaceCareerTimeline(serviceClient, playerProfileId, formData);
  }

  if (roleValue === "club") {
    const teamId = text(formData, "team_id");
    const clubAction = text(formData, "club_action");
    const teamNameRequest = text(formData, "team_name_request");

    await ensurePublicUserRow(serviceClient, user, roleValue as UserRole, displayName);

    if (teamId && clubAction === "claim") {
      await requireNoExistingClubMembership(serviceClient, user.id, "/onboarding");
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: teamClaim, error: claimError } = await serviceClient
        .from("teams")
        .update({
          claim_status: "pending",
          claimed_at: now,
          claim_expires_at: expiresAt,
          claimed_by: user.id
        })
        .eq("id", teamId)
        .or("claim_status.is.null,claim_status.eq.unclaimed")
        .select("id")
        .maybeSingle<{ id: string }>();

      if (claimError) {
        redirect(`/onboarding?error=${encodeURIComponent(claimError.message)}`);
      }

      if (!teamClaim) {
        redirect("/onboarding?error=That club is already claimed or unavailable for claiming.");
      }

      const { error: memberError } = await serviceClient.from("club_members").insert({
        team_id: teamId,
        profile_id: user.id,
        club_role: "owner",
        joined_at: now
      });

      if (memberError) {
        redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
      }

      await ensureDefaultClubWatchlist(serviceClient, teamId, user.id);
    } else if (teamId && clubAction === "join") {
      await requireNoExistingClubMembership(serviceClient, user.id, "/onboarding");
      await supabase.from("club_members").insert({
        team_id: teamId,
        profile_id: user.id,
        club_role: "recruiter",
        joined_at: new Date().toISOString()
      });
    } else if (teamNameRequest) {
      await requireNoExistingClubMembership(serviceClient, user.id, "/onboarding");
      const submittedRegionId = text(formData, "new_team_region_id");
      const selectedRegion = getClubCreationRegion(submittedRegionId);
      const country = text(formData, "new_team_country") ?? selectedRegion?.country ?? null;
      const city = text(formData, "new_team_city");
      const leagueId = text(formData, "new_team_league_id");
      const regionId = selectedRegion?.id ?? submittedRegionId ?? regionForEuropeanCountry(country)?.id;
      const division = text(formData, "new_team_division");
      const stadium = text(formData, "new_team_stadium");

      if (!country || !city || !leagueId || !regionId || !division) {
        redirect("/onboarding?error=Club name, city, country or region, league and division are required.");
      }

      const [{ data: league }, { data: region }] = await Promise.all([
        serviceClient.from("leagues").select("id").eq("id", leagueId).maybeSingle<{ id: string }>(),
        serviceClient.from("regions").select("id").eq("id", regionId).maybeSingle<{ id: string }>()
      ]);

      if (!league) {
        redirect("/onboarding?error=That league is not available yet. Run the lower-division league seed first.");
      }

      if (!region) {
        redirect("/onboarding?error=That club region is not available yet. Run the lower-division region seed first.");
      }

      const now = new Date().toISOString();
      const baseSlug = slugify(teamNameRequest);
      const id = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      const { data: team, error: teamError } = await serviceClient
        .from("teams")
        .insert({
          id,
          name: teamNameRequest,
          slug: id,
          league_id: leagueId,
          region_id: regionId,
          city,
          country,
          division,
          stadium,
          claim_status: "pending",
          claimed_at: now,
          claim_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          claimed_by: user.id,
          recruiting_active: false,
          open_roster_spots: 0,
          pipeline_names_public: false,
          pipeline_type: leagueId === "bucs" ? "bucs" : null,
          verified: false
        })
        .select("id")
        .single<{ id: string }>();

      if (teamError || !team) {
        redirect(`/onboarding?error=${encodeURIComponent(teamError?.message ?? "Could not create club.")}`);
      }

      const { error: memberError } = await serviceClient.from("club_members").insert({
        team_id: team.id,
        profile_id: user.id,
        club_role: "owner",
        joined_at: now
      });

      if (memberError) {
        redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
      }

      await ensureDefaultClubWatchlist(serviceClient, team.id, user.id);
    }
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/scouts");
  revalidatePath(`/scouts/${user.id}`);
  revalidatePath("/teams");
  revalidatePath("/leagues");
  revalidatePath("/campus-to-pro");
  if (roleValue === "club") {
    revalidatePublicDirectoryCaches();
  }
  redirect("/dashboard?onboarded=1");
}

export async function updateAccountAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Never strip admin role via the account edit form
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isCurrentlyAdmin = currentProfile?.role === "admin";
  const roleValue = isCurrentlyAdmin ? "admin" : requiredText(formData, "role");

  if (!isCurrentlyAdmin && !isUserRole(roleValue)) {
    redirect("/account?error=Choose a valid role.");
  }

  if (!isCurrentlyAdmin) {
    requireAllowedRole(roleValue as UserRole, user.email, "/account");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: roleValue,
      display_name: requiredText(formData, "display_name"),
      headline: roleValue === "player" || roleValue === "club" ? null : text(formData, "headline"),
      bio: text(formData, "bio"),
      location: text(formData, "location"),
      is_public: boolValue(formData, "is_public"),
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  if (roleValue === "player") {
    const serviceClient = createSupabaseServiceRoleClient();
    const playerProfileId = await upsertPlayerProfile(supabase, serviceClient, user.id, formData);
    await replaceCareerTimeline(serviceClient, playerProfileId, formData);
  }

  revalidatePath("/account");
  revalidatePath("/players");
  redirect("/account");
}

export async function restoreAdminRoleAction() {
  const { user } = await getAuthenticatedUser();

  if (!isReservedAdminEmail(user.email)) {
    redirect("/dashboard?error=Only the designated super admin account can restore the admin role.");
  }

  // Use service role client to guarantee the update bypasses any RLS restrictions
  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient
    .from("profiles")
    .update({ role: "admin", onboarding_complete: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
}
