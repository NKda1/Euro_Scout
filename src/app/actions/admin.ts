"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isReservedAdminEmail, requireAdminProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";

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
  revalidatePath("/admin/profiles");
  revalidatePath("/admin/players");
  revalidatePath("/scouts");
  revalidatePath("/teams");
  redirect("/admin/users?notice=Account deleted. The email can be reused for a new test account.");
}
