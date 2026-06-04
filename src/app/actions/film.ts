"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveFilmLinkAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile || profile.role !== "player") {
    redirect("/account?error=Only player accounts can manage film links.");
  }

  const { data: playerProfile } = await supabase.from("player_profiles").select("id").eq("profile_id", profile.id).maybeSingle<{ id: string }>();

  if (!playerProfile) {
    redirect("/account?error=Create your player profile before adding film.");
  }

  const id = text(formData, "film_id");
  const url = text(formData, "url");
  const filmType = text(formData, "film_type") || "highlights";
  const label = text(formData, "label") || "Hudl film";
  const isDefault = formData.get("is_default") === "on";

  if (!url) {
    redirect("/account?error=Film URL is required.");
  }

  if (isDefault) {
    await supabase.from("film_links").update({ is_default: false }).eq("player_profile_id", playerProfile.id);
  }

  const payload = {
    player_profile_id: playerProfile.id,
    url,
    provider: "hudl",
    film_type: filmType,
    label,
    is_default: isDefault,
    updated_at: new Date().toISOString()
  };

  const { error } = id
    ? await supabase.from("film_links").update(payload).eq("id", id)
    : await supabase.from("film_links").insert(payload);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/account/edit");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Film link saved.");
}

export async function deleteFilmLinkAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  const id = text(formData, "film_id");

  if (!profile || profile.role !== "player" || !id) {
    redirect("/account");
  }

  await supabase.from("film_links").delete().eq("id", id);
  revalidatePath("/account");
  revalidatePath("/account/edit");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Film link removed.");
}
