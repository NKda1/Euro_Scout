"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function requireClubProfile() {
  const ctx = await getAuthenticatedProfile();
  if (!ctx.profile || (ctx.profile.role !== "club" && ctx.profile.role !== "admin")) {
    redirect("/dashboard?error=Only club accounts can use watchlists.");
  }
  return ctx as typeof ctx & { profile: NonNullable<typeof ctx.profile> };
}

// ─── Create watchlist ─────────────────────────────────────────────────────────

export async function createWatchlistAction(formData: FormData) {
  const { supabase, profile } = await requireClubProfile();
  const name = text(formData, "name").slice(0, 100);
  const isShared = formData.get("is_shared") === "on";
  const teamId = text(formData, "team_id") || null;

  if (!name) redirect("/watchlists?error=Watchlist name is required.");

  const { error } = await supabase.from("watchlists").insert({
    user_id: profile.id,
    team_id: teamId,
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
  const { supabase, profile } = await requireClubProfile();
  const watchlistId = text(formData, "watchlist_id");

  await supabase.from("watchlists").delete().eq("id", watchlistId).eq("user_id", profile.id);
  revalidatePath("/watchlists");
  revalidatePath("/dashboard");
  redirect("/watchlists");
}

// ─── Add player to watchlist ──────────────────────────────────────────────────

export async function addToWatchlistAction(formData: FormData) {
  const { supabase, profile } = await requireClubProfile();
  const watchlistId = text(formData, "watchlist_id");
  const playerProfileId = text(formData, "player_profile_id");
  const returnPath = text(formData, "return_path") || "/players";

  // Verify ownership
  const { data: wl } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", watchlistId)
    .eq("user_id", profile.id)
    .maybeSingle<{ id: string }>();

  if (!wl) redirect(`${returnPath}?error=Watchlist not found.`);

  // Resolve profile_id → player_profiles.id
  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("profile_id", playerProfileId)
    .maybeSingle<{ id: string }>();

  if (!playerProfile) redirect(`${returnPath}?error=Player profile not found.`);

  await supabase
    .from("watchlist_items")
    .upsert({ watchlist_id: watchlistId, player_id: playerProfile.id }, { onConflict: "watchlist_id,player_id" });

  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

// ─── Remove player from watchlist ────────────────────────────────────────────

export async function removeFromWatchlistAction(formData: FormData) {
  const { supabase } = await requireClubProfile();
  const watchlistItemId = text(formData, "watchlist_item_id");
  const watchlistId = text(formData, "watchlist_id");

  await supabase.from("watchlist_items").delete().eq("id", watchlistItemId);
  revalidatePath(`/watchlists/${watchlistId}`);
  redirect(`/watchlists/${watchlistId}`);
}

// ─── Update notes on a watchlist item ────────────────────────────────────────

export async function updateWatchlistItemNotesAction(formData: FormData) {
  const { supabase } = await requireClubProfile();
  const watchlistItemId = text(formData, "watchlist_item_id");
  const watchlistId = text(formData, "watchlist_id");
  const notes = text(formData, "notes").slice(0, 2000) || null;

  await supabase.from("watchlist_items").update({ notes }).eq("id", watchlistItemId);
  revalidatePath(`/watchlists/${watchlistId}`);
}

// ─── Export watchlist as CSV (premium gate stub) ──────────────────────────────

export async function exportWatchlistCsvAction(watchlistId: string): Promise<string> {
  // TODO: Gate behind premium subscription when billing is implemented — stub returns data for all club users
  const { supabase, profile } = await requireClubProfile();

  const { data: items } = await supabase
    .from("watchlist_items")
    .select(
      `id, notes, added_at,
       player_profiles!player_id (
         position, nationality, height_cm, weight_kg, pipeline_type, available_for_transfer,
         profiles!profile_id ( display_name, location, headline )
       )`
    )
    .eq("watchlist_id", watchlistId);

  if (!items?.length) return "Name,Position,Nationality,Location,Pipeline,Available,Notes,Added\n";

  const header = "Name,Position,Nationality,Location,Pipeline,Available,Notes,Added";
  const rows = (items as any[]).map((item) => {
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
