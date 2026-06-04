"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";

const PROFILE_MEDIA_BUCKET = "profile-media";
const MAX_PROFILE_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(name: string) {
  const fallback = "profile-image";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.has(file.type)) {
    redirect("/account?error=Upload a JPG, PNG, WebP or GIF image.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    redirect("/account?error=Profile images must be 7MB or smaller.");
  }
}

async function uploadProfileImage(folder: "avatar" | "photos", file: File) {
  const { supabase, profile } = await getAuthenticatedProfile();

  if (!profile) redirect("/auth/sign-in");

  validateImage(file);

  const extension = safeFileName(file.name).split(".").pop() || "jpg";
  const path = `${profile.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { supabase, profile, publicUrl: data.publicUrl };
}

export async function uploadAvatarAction(formData: FormData) {
  const file = fileValue(formData, "avatar");

  if (!file) {
    redirect("/account?error=Choose a profile photo to upload.");
  }

  const { supabase, profile, publicUrl } = await uploadProfileImage("avatar", file);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/profiles/${profile.id}`);
  revalidatePath(`/players/${profile.id}`);
  revalidatePath(`/scouts/${profile.id}`);
  redirect("/account?notice=Profile photo updated.");
}

export async function uploadPlayerPhotoAction(formData: FormData) {
  const file = fileValue(formData, "photo");

  if (!file) {
    redirect("/account?error=Choose a profile picture to upload.");
  }

  const { supabase, profile, publicUrl } = await uploadProfileImage("photos", file);

  if (profile.role !== "player") {
    redirect("/account?error=Only player accounts can manage player pictures.");
  }

  const { data: playerProfile, error: readError } = await supabase
    .from("player_profiles")
    .select("id, photo_urls")
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string; photo_urls: string[] | null }>();

  if (readError) {
    redirect(`/account?error=${encodeURIComponent(readError.message)}`);
  }

  if (!playerProfile) {
    redirect("/account?error=Save your player profile before adding pictures.");
  }

  const photos = [...(playerProfile.photo_urls ?? []), publicUrl].slice(0, 5);
  const { error } = await supabase
    .from("player_profiles")
    .update({ photo_urls: photos, updated_at: new Date().toISOString() })
    .eq("id", playerProfile.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Profile picture added.");
}

export async function removePlayerPhotoAction(formData: FormData) {
  const { supabase, profile } = await getAuthenticatedProfile();
  const url = String(formData.get("photo_url") ?? "").trim();

  if (!profile || profile.role !== "player" || !url) {
    redirect("/account");
  }

  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id, photo_urls")
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string; photo_urls: string[] | null }>();

  if (!playerProfile) {
    redirect("/account");
  }

  const photos = (playerProfile.photo_urls ?? []).filter((item) => item !== url);
  const { error } = await supabase
    .from("player_profiles")
    .update({ photo_urls: photos, updated_at: new Date().toISOString() })
    .eq("id", playerProfile.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath(`/players/${profile.id}`);
  redirect("/account?notice=Profile picture removed.");
}
