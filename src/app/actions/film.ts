"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type FilmProvider = "youtube" | "vimeo" | "hudl" | "external";

function normalizeFilmUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function detectFilmProvider(url: string): FilmProvider {
  const normalized = normalizeFilmUrl(url).toLowerCase();

  if (normalized.includes("youtube.com") || normalized.includes("youtube-nocookie.com") || normalized.includes("youtu.be")) return "youtube";
  if (normalized.includes("vimeo.com")) return "vimeo";
  if (normalized.includes("hudl.com")) return "hudl";

  return "external";
}

function filmProviderLabel(provider: FilmProvider) {
  const labels: Record<FilmProvider, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    hudl: "Hudl",
    external: "Film Link"
  };

  return labels[provider];
}

export async function saveFilmLinkAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile || profile.role !== "player") {
    redirect("/account?error=Only player accounts can manage film links.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: playerProfile } = await serviceClient.from("player_profiles").select("id").eq("profile_id", profile.id).maybeSingle<{ id: string }>();

  if (!playerProfile) {
    redirect("/account?error=Create your player profile before adding film.");
  }

  const id = text(formData, "film_id");
  const rawUrl = text(formData, "url");
  const url = normalizeFilmUrl(rawUrl);
  const filmType = text(formData, "film_type") || "highlights";
  const isDefault = formData.get("is_default") === "on";

  if (!url) {
    redirect("/account?error=Film URL is required.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    redirect("/account?error=Enter a valid film URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    redirect("/account?error=Film URL must start with http or https.");
  }
  const provider = detectFilmProvider(url);
  const label = text(formData, "label") || `${filmProviderLabel(provider)} film`;

  if (isDefault) {
    await serviceClient.from("film_links").update({ is_default: false }).eq("player_profile_id", playerProfile.id);
  }

  const payload = {
    player_profile_id: playerProfile.id,
    url,
    provider,
    film_type: filmType,
    label,
    is_default: isDefault,
    updated_at: new Date().toISOString()
  };

  const { error } = id
    ? await serviceClient.from("film_links").update(payload).eq("id", id).eq("player_profile_id", playerProfile.id)
    : await serviceClient.from("film_links").insert(payload);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/account/edit");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Film link saved.");
}

export async function deleteFilmLinkAction(formData: FormData) {
  const { profile } = await getAuthenticatedProfile();
  const id = text(formData, "film_id");

  if (!profile || profile.role !== "player" || !id) {
    redirect("/account");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: playerProfile } = await serviceClient.from("player_profiles").select("id").eq("profile_id", profile.id).maybeSingle<{ id: string }>();
  if (!playerProfile) {
    redirect("/account?error=Create your player profile before removing film.");
  }

  await serviceClient.from("film_links").delete().eq("id", id).eq("player_profile_id", playerProfile.id);
  revalidatePath("/account");
  revalidatePath("/account/edit");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Film link removed.");
}

export async function trackFilmClickAction(formData: FormData) {
  const filmId = text(formData, "film_id");
  const fallbackUrl = text(formData, "fallback_url");

  if (!filmId) {
    redirect(fallbackUrl || "/players");
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: film } = await serviceClient
    .from("film_links")
    .select("id, url, player_profile_id, player_profiles!player_profile_id ( profile_id )")
    .eq("id", filmId)
    .maybeSingle<{
      id: string;
      url: string;
      player_profile_id: string;
      player_profiles: { profile_id: string } | null;
    }>();

  if (!film?.url) {
    redirect(fallbackUrl || "/players");
  }

  let viewerRole: string | null = null;
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>();
    viewerRole = viewerProfile?.role ?? null;
  }

  if (!user || user.id !== film.player_profiles?.profile_id) {
    await serviceClient.from("film_clicks").insert({
      film_link_id: film.id,
      player_profile_id: film.player_profile_id,
      viewer_profile_id: user?.id ?? null,
      viewer_role: viewerRole
    });
  }

  redirect(normalizeFilmUrl(film.url));
}
