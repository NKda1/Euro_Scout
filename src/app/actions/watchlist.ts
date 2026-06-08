"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

interface WatchlistExportItem {
  id: string;
  notes: string | null;
  added_at: string;
  player_profiles: {
    position: string | null;
    nationality: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    pipeline_type: string | null;
    available_for_transfer: boolean | null;
    profiles: {
      display_name: string | null;
      location: string | null;
      headline: string | null;
    } | null;
  } | null;
}

async function requireClubProfile() {
  const ctx = await getAuthenticatedProfile();
  if (!ctx.profile || (ctx.profile.role !== "club" && ctx.profile.role !== "admin")) {
    redirect("/dashboard?error=Only club accounts can use watchlists.");
  }
  return ctx as typeof ctx & { profile: NonNullable<typeof ctx.profile> };
}

async function requireConnectedClub() {
  const ctx = await requireClubProfile();
  const serviceClient = createSupabaseServiceRoleClient();

  if (ctx.profile.role === "admin") {
    return { ...ctx, serviceClient, teamId: null as string | null };
  }

  const { data: membership } = await serviceClient
    .from("club_members")
    .select("team_id, club_role")
    .eq("profile_id", ctx.profile.id)
    .limit(1)
    .maybeSingle<{ team_id: string; club_role: string }>();

  if (!membership?.team_id) {
    redirect("/account?error=Claim or create a club before using watchlists.");
  }

  return { ...ctx, serviceClient, teamId: membership.team_id };
}

// ─── Create watchlist ─────────────────────────────────────────────────────────

export async function createWatchlistAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const name = text(formData, "name").slice(0, 100);
  const isShared = formData.get("is_shared") === "on";
  const submittedTeamId = text(formData, "team_id") || teamId;

  if (!name) redirect("/watchlists?error=Watchlist name is required.");

  const { error } = await serviceClient.from("watchlists").insert({
    user_id: profile.id,
    team_id: submittedTeamId,
    name,
    is_shared: isShared,
    updated_at: new Date().toISOString()
  });

  if (error) redirect(`/watchlists?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/watchlists");
  revalidatePath("/dashboard");
  redirect("/watchlists");
}

// ─── Delete watchlist ─────────────────────────────────────────────────────────

export async function deleteWatchlistAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const watchlistId = text(formData, "watchlist_id");

  let query = serviceClient.from("watchlists").delete().eq("id", watchlistId);
  if (profile.role !== "admin") query = query.eq("team_id", teamId);
  await query;
  revalidatePath("/watchlists");
  revalidatePath("/dashboard");
  redirect("/watchlists");
}

// ─── Add player to watchlist ──────────────────────────────────────────────────

export async function addToWatchlistAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const watchlistId = text(formData, "watchlist_id");
  const playerProfileId = text(formData, "player_profile_id");
  const returnPath = text(formData, "return_path") || "/players";

  // Verify ownership
  let watchlistQuery = serviceClient
    .from("watchlists")
    .select("id, team_id")
    .eq("id", watchlistId)
    .limit(1);

  if (profile.role !== "admin") {
    watchlistQuery = watchlistQuery.eq("team_id", teamId);
  }

  const { data: wl } = await watchlistQuery.maybeSingle<{ id: string; team_id: string | null }>();

  if (!wl) redirect(`${returnPath}?error=Watchlist not found.`);

  // Resolve profile_id → player_profiles.id
  const { data: playerProfile } = await serviceClient
    .from("player_profiles")
    .select("id")
    .eq("profile_id", playerProfileId)
    .maybeSingle<{ id: string }>();

  if (!playerProfile) redirect(`${returnPath}?error=Player profile not found.`);

  const { error } = await serviceClient
    .from("watchlist_items")
    .upsert({ watchlist_id: watchlistId, player_id: playerProfile.id }, { onConflict: "watchlist_id,player_id" });

  if (error) {
    redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/watchlists");
  revalidatePath(returnPath);
  redirect(`${returnPath}?notice=Player added to shortlist.`);
}

// ─── Remove player from watchlist ────────────────────────────────────────────

export async function removeFromWatchlistAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const watchlistItemId = text(formData, "watchlist_item_id");
  const watchlistId = text(formData, "watchlist_id");

  if (profile.role !== "admin") {
    const { data: wl } = await serviceClient
      .from("watchlists")
      .select("id")
      .eq("id", watchlistId)
      .eq("team_id", teamId)
      .maybeSingle<{ id: string }>();
    if (!wl) redirect("/watchlists?error=Watchlist not found.");
  }

  await serviceClient.from("watchlist_items").delete().eq("id", watchlistItemId).eq("watchlist_id", watchlistId);
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/watchlists");
  redirect(`/watchlists/${watchlistId}`);
}

// ─── Update notes on a watchlist item ────────────────────────────────────────

export async function updateWatchlistItemNotesAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const watchlistItemId = text(formData, "watchlist_item_id");
  const watchlistId = text(formData, "watchlist_id");
  const notes = text(formData, "notes").slice(0, 2000) || null;

  if (profile.role !== "admin") {
    const { data: wl } = await serviceClient
      .from("watchlists")
      .select("id")
      .eq("id", watchlistId)
      .eq("team_id", teamId)
      .maybeSingle<{ id: string }>();
    if (!wl) redirect("/watchlists?error=Watchlist not found.");
  }

  await serviceClient.from("watchlist_items").update({ notes }).eq("id", watchlistItemId).eq("watchlist_id", watchlistId);
  revalidatePath(`/watchlists/${watchlistId}`);
}

// ─── Update recruitment status on a watchlist item ───────────────────────────

export async function updateWatchlistItemRecruitmentStatusAction(formData: FormData) {
  const { serviceClient, profile, teamId } = await requireConnectedClub();
  const watchlistItemId = text(formData, "watchlist_item_id");
  const watchlistId = text(formData, "watchlist_id");
  const status = text(formData, "recruitment_status");
  const returnPath = text(formData, "return_path") || "/watchlists";
  const allowedStatuses = new Set(["watchlisted", "in_negotiations", "signed", "archived"]);

  if (!allowedStatuses.has(status)) {
    redirect(`${returnPath}?error=Choose a valid recruitment status.`);
  }

  if (profile.role !== "admin") {
    const { data: wl } = await serviceClient
      .from("watchlists")
      .select("id")
      .eq("id", watchlistId)
      .eq("team_id", teamId)
      .maybeSingle<{ id: string }>();
    if (!wl) redirect("/watchlists?error=Watchlist not found.");
  }

  const { error } = await serviceClient
    .from("watchlist_items")
    .update({
      recruitment_status: status,
      status_updated_at: new Date().toISOString()
    })
    .eq("id", watchlistItemId)
    .eq("watchlist_id", watchlistId);

  if (error) redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath(returnPath);
  redirect(`${returnPath}?notice=Recruitment status updated.`);
}

// ─── Export watchlist as CSV (premium gate stub) ──────────────────────────────

export async function exportWatchlistCsvAction(watchlistId: string): Promise<string> {
  // TODO: Gate behind premium subscription when billing is implemented — stub returns data for all club users
  const { serviceClient, profile, teamId } = await requireConnectedClub();

  if (profile.role !== "admin") {
    const { data: wl } = await serviceClient
      .from("watchlists")
      .select("id")
      .eq("id", watchlistId)
      .eq("team_id", teamId)
      .maybeSingle<{ id: string }>();
    if (!wl) return "Name,Position,Nationality,Location,Pipeline,Available,Notes,Added\n";
  }

  const { data: items } = await serviceClient
    .from("watchlist_items")
    .select(
      `id, notes, added_at,
       player_profiles!player_id (
         position, nationality, height_cm, weight_kg, pipeline_type, available_for_transfer,
         profiles!profile_id ( display_name, location, headline )
       )`
    )
    .eq("watchlist_id", watchlistId)
    .returns<WatchlistExportItem[]>();

  if (!items?.length) return "Name,Position,Nationality,Location,Pipeline,Available,Notes,Added\n";

  const header = "Name,Position,Nationality,Location,Pipeline,Available,Notes,Added";
  const rows = items.map((item) => {
    const p = item.player_profiles;
    const prof = p?.profiles;
    return [
      `"${prof?.display_name ?? ""}"`,
      p?.position ?? "",
      p?.nationality ?? "",
      `"${prof?.location ?? ""}"`,
      p?.pipeline_type ?? "",
      p?.available_for_transfer ? "Yes" : "No",
      `"${(item.notes ?? "").replace(/"/g, "'")}"`,
      new Date(item.added_at).toLocaleDateString()
    ].join(",");
  });

  void profile; // used via requireClubProfile auth check
  return [header, ...rows].join("\n");
}
