"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { isReservedAdminEmail, requireAdminProfile } from "@/lib/auth";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-tags";
import { isCampusPipeline } from "@/lib/campus-to-pro";
import { regionForEuropeanCountry } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";

function revalidatePublicDirectoryCaches() {
  revalidateTag(PUBLIC_CACHE_TAGS.clubs);
  revalidateTag(PUBLIC_CACHE_TAGS.teams);
  revalidateTag(PUBLIC_CACHE_TAGS.leagues);
  revalidateTag(PUBLIC_CACHE_TAGS.directory);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0] ?? "");
}

async function failOnError<T extends { error: { message: string } | null | undefined }>(result: T, message: string) {
  if (result.error) {
    redirect(`/admin/users?error=${encodeURIComponent(`${message}: ${result.error.message}`)}`);
  }
}

async function failOnAdminClubError<T extends { error: { message: string } | null | undefined }>(result: T, message: string) {
  if (result.error) {
    redirect(`/admin/club-verification?error=${encodeURIComponent(`${message}: ${result.error.message}`)}`);
  }
}

async function failOnAdminClubsError<T extends { error: { message: string } | null | undefined }>(result: T, message: string) {
  if (result.error) {
    redirect(`/admin/clubs?error=${encodeURIComponent(`${message}: ${result.error.message}`)}`);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function intValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function adminClubPayload(formData: FormData) {
  const name = text(formData, "name");
  const city = text(formData, "city");
  const country = text(formData, "country");
  const leagueId = text(formData, "league_id");
  const region = regionForEuropeanCountry(country);

  if (!name || !city || !country || !leagueId) {
    redirect("/admin/clubs?error=Club name, city, country and league are required.");
  }

  if (!region) {
    redirect("/admin/clubs?error=Choose a European country supported by the SVG map.");
  }

  const claimStatus = text(formData, "claim_status") || "unclaimed";
  const allowedStatuses = new Set(["unclaimed", "pending", "verified", "disputed", "rejected"]);
  if (!allowedStatuses.has(claimStatus)) {
    redirect("/admin/clubs?error=Choose a valid club status.");
  }

  return {
    name: name.slice(0, 160),
    city: city.slice(0, 80),
    country,
    league_id: leagueId,
    region_id: region.id,
    division: nullableText(formData, "division"),
    stadium: nullableText(formData, "stadium"),
    logo_url: nullableText(formData, "logo_url"),
    website: nullableText(formData, "website"),
    contact_email: nullableText(formData, "contact_email"),
    tier: intValue(formData, "tier"),
    claim_status: claimStatus,
    verified: claimStatus === "verified",
    recruiting_active: formData.get("recruiting_active") === "on",
    open_roster_spots: intValue(formData, "open_roster_spots") ?? 0,
    updated_at: new Date().toISOString()
  };
}

async function deleteClubRecord(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>, teamId: string, redirectBase = "/admin/clubs") {
  const { data: team } = await serviceClient.from("teams").select("id, name, logo_url").eq("id", teamId).maybeSingle<{ id: string; name: string; logo_url: string | null }>();

  if (!team) {
    redirect(`${redirectBase}?error=Club not found.`);
  }

  const storagePaths = new Set<string>();
  const logoPath = storagePathFromPublicUrl(team.logo_url);
  if (logoPath) storagePaths.add(logoPath);

  const { data: clubMedia } = await serviceClient.from("club_media").select("url").eq("team_id", team.id).returns<Array<{ url: string }>>();
  (clubMedia ?? []).forEach((media) => {
    const path = storagePathFromPublicUrl(media.url);
    if (path) storagePaths.add(path);
  });

  const { data: watchlists } = await serviceClient.from("watchlists").select("id").eq("team_id", team.id).returns<Array<{ id: string }>>();
  const watchlistIds = (watchlists ?? []).map((watchlist) => watchlist.id);

  await failOnAdminClubsError(await serviceClient.from("conversations").delete().eq("team_id", team.id), "Could not delete club conversations");
  await failOnAdminClubsError(await serviceClient.from("club_interest_notifications").delete().eq("team_id", team.id), "Could not delete club interest notifications");
  await failOnAdminClubsError(await serviceClient.from("club_profile_views").delete().eq("team_id", team.id), "Could not delete club profile views");
  if (watchlistIds.length) {
    await failOnAdminClubsError(await serviceClient.from("watchlist_items").delete().in("watchlist_id", watchlistIds), "Could not delete club watchlist items");
  }
  await failOnAdminClubsError(await serviceClient.from("watchlists").delete().eq("team_id", team.id), "Could not delete club watchlists");
  await failOnAdminClubsError(await serviceClient.from("club_disputes").delete().eq("team_id", team.id), "Could not delete club disputes");
  await failOnAdminClubsError(await serviceClient.from("club_media").delete().eq("team_id", team.id), "Could not delete club media");
  await failOnAdminClubsError(await serviceClient.from("club_members").delete().eq("team_id", team.id), "Could not delete club memberships");
  await failOnAdminClubsError(await serviceClient.from("teams").delete().eq("id", team.id), "Could not delete club");

  if (storagePaths.size) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  }

  return team;
}

async function releaseClubToSeedRecord(serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>, teamId: string) {
  const { data: team } = await serviceClient.from("teams").select("id, name, logo_url").eq("id", teamId).maybeSingle<{ id: string; name: string; logo_url: string | null }>();

  if (!team) {
    redirect("/admin/clubs?error=Club not found.");
  }

  const storagePaths = new Set<string>();
  const logoPath = storagePathFromPublicUrl(team.logo_url);
  if (logoPath) storagePaths.add(logoPath);

  const { data: clubMedia } = await serviceClient.from("club_media").select("url").eq("team_id", team.id).returns<Array<{ url: string }>>();
  (clubMedia ?? []).forEach((media) => {
    const path = storagePathFromPublicUrl(media.url);
    if (path) storagePaths.add(path);
  });

  const { data: watchlists } = await serviceClient.from("watchlists").select("id").eq("team_id", team.id).returns<Array<{ id: string }>>();
  const watchlistIds = (watchlists ?? []).map((watchlist) => watchlist.id);

  await failOnAdminClubsError(await serviceClient.from("meeting_requests").delete().eq("team_id", team.id), "Could not clear club call requests");
  await failOnAdminClubsError(await serviceClient.from("club_staff_invites").delete().eq("team_id", team.id), "Could not clear club staff invites");
  await failOnAdminClubsError(await serviceClient.from("club_join_requests").delete().eq("team_id", team.id), "Could not clear club join requests");
  await failOnAdminClubsError(await serviceClient.from("conversations").delete().eq("team_id", team.id), "Could not clear club conversations");
  await failOnAdminClubsError(await serviceClient.from("club_interest_notifications").delete().eq("team_id", team.id), "Could not clear club interest notifications");
  await failOnAdminClubsError(await serviceClient.from("club_profile_views").delete().eq("team_id", team.id), "Could not clear club profile views");
  if (watchlistIds.length) {
    await failOnAdminClubsError(await serviceClient.from("watchlist_items").delete().in("watchlist_id", watchlistIds), "Could not clear club watchlist items");
  }
  await failOnAdminClubsError(await serviceClient.from("watchlists").delete().eq("team_id", team.id), "Could not clear club watchlists");
  await failOnAdminClubsError(await serviceClient.from("club_disputes").delete().eq("team_id", team.id), "Could not clear club disputes");
  await failOnAdminClubsError(await serviceClient.from("club_media").delete().eq("team_id", team.id), "Could not clear club media");
  await failOnAdminClubsError(await serviceClient.from("club_members").delete().eq("team_id", team.id), "Could not clear club memberships");

  await failOnAdminClubsError(
    await serviceClient
      .from("teams")
      .update({
        claim_status: "unclaimed",
        claimed_at: null,
        claim_expires_at: null,
        claimed_by: null,
        verified: false,
        logo_url: null,
        website: null,
        contact_email: null,
        open_roster_spots: 0,
        recruiting_active: false,
        direct_messaging_enabled: true,
        pipeline_names_public: false,
        roster_needs: [],
        pass_run_percentage: null,
        passing_yards: null,
        rushing_yards: null,
        touchdowns_scored: null,
        league_position: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", team.id),
    "Could not release club to seed state"
  );

  if (storagePaths.size) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  }

  return team;
}

export async function adminCreateClubAction(formData: FormData) {
  await requireAdminProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const payload = adminClubPayload(formData);
  const baseSlug = slugify(payload.name);
  const id = `${baseSlug}-${randomUUID().slice(0, 8)}`;

  const { error } = await serviceClient.from("teams").insert({
    ...payload,
    id,
    slug: id,
    claimed_at: payload.claim_status === "pending" || payload.claim_status === "verified" ? new Date().toISOString() : null,
    claim_expires_at: null,
    claimed_by: null,
    pipeline_names_public: false
  });

  if (error) {
    redirect(`/admin/clubs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/clubs");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePublicDirectoryCaches();
  redirect(`/admin/clubs?notice=${encodeURIComponent(`${payload.name} created.`)}`);
}

export async function adminUpdateClubAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  if (!teamId) redirect("/admin/clubs?error=Choose a club to update.");

  const serviceClient = createSupabaseServiceRoleClient();
  const payload = adminClubPayload(formData);
  const { error } = await serviceClient.from("teams").update(payload).eq("id", teamId);

  if (error) {
    redirect(`/admin/clubs?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/clubs");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePath(`/scouts/${teamId}`);
  revalidatePublicDirectoryCaches();
  redirect(`/admin/clubs?notice=${encodeURIComponent(`${payload.name} updated.`)}`);
}

export async function adminDeleteClubAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  const confirmation = text(formData, "confirmation");

  if (!teamId) redirect("/admin/clubs?error=Choose a club to delete.");
  if (confirmation !== "DELETE CLUB") {
    redirect("/admin/clubs?error=Type DELETE CLUB before deleting a club.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const team = await deleteClubRecord(serviceClient, teamId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/clubs");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePublicDirectoryCaches();
  redirect(`/admin/clubs?notice=${encodeURIComponent(`${team.name} deleted.`)}`);
}

export async function adminReleaseClubToSeedAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  const confirmation = text(formData, "confirmation");

  if (!teamId) redirect("/admin/clubs?error=Choose a club to release.");
  if (confirmation !== "RELEASE CLUB") {
    redirect("/admin/clubs?error=Type RELEASE CLUB before releasing a club back to seed state.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const team = await releaseClubToSeedRecord(serviceClient, teamId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/clubs");
  revalidatePath("/admin/club-verification");
  revalidatePath("/campus-to-pro");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePath(`/scouts/${team.id}`);
  revalidatePath(`/teams/${team.id}`);
  revalidatePublicDirectoryCaches();
  redirect(`/admin/clubs?notice=${encodeURIComponent(`${team.name} released back to seed state.`)}`);
}

async function getPendingClubForAdminAction(teamId: string) {
  if (!teamId) {
    redirect("/admin/club-verification?error=Choose a club verification request.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: team, error } = await serviceClient
    .from("teams")
    .select("id, name, logo_url, claim_status, claimed_by")
    .eq("id", teamId)
    .maybeSingle<{ id: string; name: string; logo_url: string | null; claim_status: string | null; claimed_by: string | null }>();

  if (error) {
    redirect(`/admin/club-verification?error=${encodeURIComponent(error.message)}`);
  }

  if (!team || team.claim_status !== "pending") {
    redirect("/admin/club-verification?error=That club verification request is no longer pending.");
  }

  return { serviceClient, team };
}

async function getCampusClubForAdminAction(teamId: string) {
  if (!teamId) {
    redirect("/admin/club-verification?error=Choose a Campus to Pro club.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: team, error } = await serviceClient
    .from("teams")
    .select("id, name, logo_url, league_id, pipeline_type")
    .eq("id", teamId)
    .maybeSingle<{ id: string; name: string; logo_url: string | null; league_id: string | null; pipeline_type: string | null }>();

  if (error) {
    redirect(`/admin/club-verification?error=${encodeURIComponent(error.message)}`);
  }

  if (!team || (!isCampusPipeline(team.league_id) && !isCampusPipeline(team.pipeline_type))) {
    redirect("/admin/club-verification?error=Only Campus to Pro seeded clubs can be deleted from this control.");
  }

  return { serviceClient, team };
}

export async function verifyClubClaimAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  const { serviceClient, team } = await getPendingClubForAdminAction(teamId);
  const now = new Date().toISOString();

  await failOnAdminClubError(
    await serviceClient
      .from("teams")
      .update({
        claim_status: "verified",
        verified: true,
        claim_expires_at: null,
        updated_at: now
      })
      .eq("id", team.id),
    "Could not verify club"
  );

  revalidatePath("/admin");
  revalidatePath("/admin/club-verification");
  revalidatePath("/scouts");
  revalidatePath(`/scouts/${team.id}`);
  revalidatePath(`/teams/${team.id}`);
  revalidatePublicDirectoryCaches();
  redirect(`/admin/club-verification?notice=${encodeURIComponent(`${team.name} verified.`)}`);
}

export async function declineAndDeleteClubClaimAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  const confirmation = text(formData, "confirmation");

  if (confirmation !== "DELETE CLUB") {
    redirect("/admin/club-verification?error=Type DELETE CLUB before declining and deleting a club.");
  }

  const { serviceClient, team } = await getPendingClubForAdminAction(teamId);
  const storagePaths = new Set<string>();
  const logoPath = storagePathFromPublicUrl(team.logo_url);
  if (logoPath) storagePaths.add(logoPath);

  const { data: clubMedia } = await serviceClient
    .from("club_media")
    .select("url")
    .eq("team_id", team.id)
    .returns<Array<{ url: string }>>();

  (clubMedia ?? []).forEach((media) => {
    const path = storagePathFromPublicUrl(media.url);
    if (path) storagePaths.add(path);
  });

  const { data: watchlists } = await serviceClient
    .from("watchlists")
    .select("id")
    .eq("team_id", team.id)
    .returns<Array<{ id: string }>>();
  const watchlistIds = (watchlists ?? []).map((watchlist) => watchlist.id);

  await failOnAdminClubError(await serviceClient.from("conversations").delete().eq("team_id", team.id), "Could not delete club conversations");
  if (watchlistIds.length) {
    await failOnAdminClubError(await serviceClient.from("watchlist_items").delete().in("watchlist_id", watchlistIds), "Could not delete club watchlist items");
  }
  await failOnAdminClubError(await serviceClient.from("watchlists").delete().eq("team_id", team.id), "Could not delete club watchlists");
  await failOnAdminClubError(await serviceClient.from("club_disputes").delete().eq("team_id", team.id), "Could not delete club disputes");
  await failOnAdminClubError(await serviceClient.from("club_media").delete().eq("team_id", team.id), "Could not delete club media");
  await failOnAdminClubError(await serviceClient.from("club_members").delete().eq("team_id", team.id), "Could not delete club memberships");
  await failOnAdminClubError(await serviceClient.from("teams").delete().eq("id", team.id), "Could not delete club");

  if (storagePaths.size) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/club-verification");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePublicDirectoryCaches();
  redirect(`/admin/club-verification?notice=${encodeURIComponent(`${team.name} declined and deleted.`)}`);
}

export async function deleteCampusClubAction(formData: FormData) {
  await requireAdminProfile();
  const teamId = text(formData, "team_id");
  const confirmation = text(formData, "confirmation");

  if (confirmation !== "DELETE CLUB") {
    redirect("/admin/club-verification?error=Type DELETE CLUB before deleting a Campus to Pro club.");
  }

  const { serviceClient, team } = await getCampusClubForAdminAction(teamId);
  const storagePaths = new Set<string>();
  const logoPath = storagePathFromPublicUrl(team.logo_url);
  if (logoPath) storagePaths.add(logoPath);

  const { data: clubMedia } = await serviceClient
    .from("club_media")
    .select("url")
    .eq("team_id", team.id)
    .returns<Array<{ url: string }>>();

  (clubMedia ?? []).forEach((media) => {
    const path = storagePathFromPublicUrl(media.url);
    if (path) storagePaths.add(path);
  });

  const { data: watchlists } = await serviceClient
    .from("watchlists")
    .select("id")
    .eq("team_id", team.id)
    .returns<Array<{ id: string }>>();
  const watchlistIds = (watchlists ?? []).map((watchlist) => watchlist.id);

  await failOnAdminClubError(await serviceClient.from("conversations").delete().eq("team_id", team.id), "Could not delete club conversations");
  await failOnAdminClubError(await serviceClient.from("club_interest_notifications").delete().eq("team_id", team.id), "Could not delete club interest notifications");
  if (watchlistIds.length) {
    await failOnAdminClubError(await serviceClient.from("watchlist_items").delete().in("watchlist_id", watchlistIds), "Could not delete club watchlist items");
  }
  await failOnAdminClubError(await serviceClient.from("watchlists").delete().eq("team_id", team.id), "Could not delete club watchlists");
  await failOnAdminClubError(await serviceClient.from("club_disputes").delete().eq("team_id", team.id), "Could not delete club disputes");
  await failOnAdminClubError(await serviceClient.from("club_media").delete().eq("team_id", team.id), "Could not delete club media");
  await failOnAdminClubError(await serviceClient.from("club_members").delete().eq("team_id", team.id), "Could not delete club memberships");
  await failOnAdminClubError(await serviceClient.from("teams").delete().eq("id", team.id), "Could not delete Campus to Pro club");

  if (storagePaths.size) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/club-verification");
  revalidatePath("/campus-to-pro");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePublicDirectoryCaches();
  redirect(`/admin/club-verification?notice=${encodeURIComponent(`${team.name} deleted from Campus to Pro.`)}`);
}

export async function deleteAdminAccountAction(formData: FormData) {
  const { user: adminUser } = await requireAdminProfile();
  const targetId = text(formData, "profile_id");
  const confirmation = text(formData, "confirmation");
  const deleteClubs = formData.get("delete_clubs") === "on";

  if (!targetId) {
    redirect("/admin/users?error=Choose an account to delete.");
  }

  if (confirmation !== "DELETE") {
    redirect("/admin/users?error=Type DELETE before removing an account.");
  }

  if (targetId === adminUser.id) {
    redirect("/admin/users?error=You cannot delete the signed-in admin account.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: profile }, { data: publicUser }, authResult] = await Promise.all([
    serviceClient.from("profiles").select("id, role, display_name, avatar_url").eq("id", targetId).maybeSingle<{ id: string; role: string; display_name: string; avatar_url: string | null }>(),
    serviceClient.from("users").select("id, email").eq("id", targetId).maybeSingle<{ id: string; email: string }>(),
    serviceClient.auth.admin.getUserById(targetId)
  ]);

  const targetEmail = authResult.data.user?.email ?? publicUser?.email ?? null;

  if (profile?.role === "admin" || isReservedAdminEmail(targetEmail)) {
    redirect("/admin/users?error=Reserved admin accounts cannot be deleted from this panel.");
  }

  const [{ data: playerProfiles }, { data: ownerMemberships }, { data: claimedTeams }] = await Promise.all([
    serviceClient.from("player_profiles").select("id, photo_urls").eq("profile_id", targetId).returns<Array<{ id: string; photo_urls: string[] | null }>>(),
    serviceClient.from("club_members").select("team_id").eq("profile_id", targetId).eq("club_role", "owner").returns<Array<{ team_id: string }>>(),
    serviceClient.from("teams").select("id, logo_url").eq("claimed_by", targetId).returns<Array<{ id: string; logo_url: string | null }>>()
  ]);

  const ownedTeamIds = new Set<string>([
    ...(ownerMemberships ?? []).map((membership) => membership.team_id),
    ...(claimedTeams ?? []).map((team) => team.id)
  ]);
  const teamIds = Array.from(ownedTeamIds);
  const playerProfileIds = (playerProfiles ?? []).map((playerProfile) => playerProfile.id);

  const storagePaths = new Set<string>();
  const avatarPath = storagePathFromPublicUrl(profile?.avatar_url);
  if (avatarPath) storagePaths.add(avatarPath);
  (playerProfiles ?? []).forEach((playerProfile) => {
    (playerProfile.photo_urls ?? []).forEach((url) => {
      const path = storagePathFromPublicUrl(url);
      if (path) storagePaths.add(path);
    });
  });
  (claimedTeams ?? []).forEach((team) => {
    const path = storagePathFromPublicUrl(team.logo_url);
    if (path) storagePaths.add(path);
  });

  if (teamIds.length) {
    const { data: clubMedia } = await serviceClient
      .from("club_media")
      .select("url")
      .in("team_id", teamIds)
      .returns<Array<{ url: string }>>();

    (clubMedia ?? []).forEach((media) => {
      const path = storagePathFromPublicUrl(media.url);
      if (path) storagePaths.add(path);
    });

    await failOnError(await serviceClient.from("conversations").delete().in("team_id", teamIds), "Could not delete club conversations");
    await failOnError(await serviceClient.from("watchlists").delete().in("team_id", teamIds), "Could not delete club watchlists");
    await failOnError(await serviceClient.from("club_disputes").delete().in("team_id", teamIds), "Could not delete club disputes");
    await failOnError(await serviceClient.from("club_media").delete().in("team_id", teamIds), "Could not delete club media");
    await failOnError(await serviceClient.from("club_members").delete().in("team_id", teamIds), "Could not delete club memberships");

    if (deleteClubs) {
      await failOnError(await serviceClient.from("teams").delete().in("id", teamIds), "Could not delete club records");
    } else {
      await failOnError(
        await serviceClient
          .from("teams")
          .update({
            claim_status: "unclaimed",
            claimed_at: null,
            claim_expires_at: null,
            claimed_by: null,
            verified: false,
            logo_url: null,
            website: null,
            contact_email: null,
            open_roster_spots: 0,
            recruiting_active: false,
            pipeline_names_public: false,
            roster_needs: [],
            pass_run_percentage: null,
            passing_yards: null,
            rushing_yards: null,
            touchdowns_scored: null,
            league_position: null,
            updated_at: new Date().toISOString()
          })
          .in("id", teamIds),
        "Could not release club records"
      );
    }
  }

  if (playerProfileIds.length) {
    await failOnError(await serviceClient.from("watchlist_items").delete().in("player_id", playerProfileIds), "Could not remove watchlist player references");
  }

  await failOnError(await serviceClient.from("club_disputes").delete().eq("raised_by", targetId), "Could not delete account disputes");
  await failOnError(await serviceClient.from("messages").delete().eq("sender_profile_id", targetId), "Could not delete account messages");
  await failOnError(await serviceClient.from("conversation_participants").delete().eq("profile_id", targetId), "Could not delete conversation participants");
  await failOnError(await serviceClient.from("conversations").delete().eq("created_by", targetId), "Could not delete account conversations");
  await failOnError(await serviceClient.from("club_members").delete().eq("profile_id", targetId), "Could not delete remaining club memberships");
  await failOnError(await serviceClient.from("watchlists").delete().eq("user_id", targetId), "Could not delete account watchlists");
  await failOnError(await serviceClient.from("player_profiles").delete().eq("profile_id", targetId), "Could not delete player profile");
  await failOnError(await serviceClient.from("users").delete().eq("id", targetId), "Could not delete public user row");
  await failOnError(await serviceClient.from("profiles").delete().eq("id", targetId), "Could not delete profile row");

  if (storagePaths.size) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  }

  if (authResult.data.user) {
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(targetId, false);
    if (authDeleteError) {
      redirect(`/admin/users?error=${encodeURIComponent(`App data was removed but Supabase Auth deletion failed: ${authDeleteError.message}`)}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/players");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  revalidatePublicDirectoryCaches();
  redirect("/admin/users?notice=Account deleted. The email can be reused for a new test account.");
}

export async function adminUpdateAccountTierAction(formData: FormData) {
  await requireAdminProfile();
  const profileId = text(formData, "profile_id");
  const accountTier = text(formData, "account_tier");
  const premiumExpiresAt = text(formData, "premium_expires_at");

  if (!profileId) {
    redirect("/admin/users?error=Choose an account to update.");
  }

  if (accountTier !== "free" && accountTier !== "premium") {
    redirect("/admin/users?error=Choose either Free or Premium.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  let expiresAt: string | null = null;
  if (accountTier === "premium" && premiumExpiresAt) {
    const expiryDate = new Date(`${premiumExpiresAt}T23:59:59.999Z`);
    if (Number.isNaN(expiryDate.getTime())) {
      redirect("/admin/users?error=Choose a valid premium expiry date.");
    }
    expiresAt = expiryDate.toISOString();
  }

  const { error } = await serviceClient
    .from("profiles")
    .update({
      account_tier: accountTier,
      premium_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", profileId);

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  await serviceClient.from("message_token_events").insert({
    profile_id: profileId,
    event_type: "admin_adjustment",
    metadata: { account_tier: accountTier, premium_expires_at: expiresAt }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  redirect(`/admin/users?notice=${encodeURIComponent(`Account tier updated to ${accountTier}.`)}`);
}
