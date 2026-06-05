import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";
const MAX_PROFILE_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function accountRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/account", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}

function safeFileName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "profile-image";
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url), { status: 303 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (!profile || profile.role !== "player") {
    return accountRedirect(request, { error: "Only player accounts can manage player pictures." });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size <= 0) {
    return accountRedirect(request, { error: "Choose a profile picture to upload." });
  }

  if (!IMAGE_TYPES.has(photo.type)) {
    return accountRedirect(request, { error: "Upload a JPG, PNG, WebP or GIF image." });
  }

  if (photo.size > MAX_PROFILE_IMAGE_BYTES) {
    return accountRedirect(request, { error: "Profile images must be 7MB or smaller." });
  }

  const { data: playerProfile, error: playerError } = await serviceClient
    .from("player_profiles")
    .select("id, photo_urls")
    .eq("profile_id", profile.id)
    .maybeSingle<{ id: string; photo_urls: string[] | null }>();

  if (playerError) {
    return accountRedirect(request, { error: playerError.message });
  }

  if (!playerProfile) {
    return accountRedirect(request, { error: "Save your player profile before adding pictures." });
  }

  const currentPhotos = playerProfile.photo_urls ?? [];
  if (currentPhotos.length >= 5) {
    return accountRedirect(request, { error: "Maximum of 5 profile pictures reached." });
  }

  const extension = safeFileName(photo.name).split(".").pop() || "jpg";
  const path = `${profile.id}/photos/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).upload(path, photo, {
    cacheControl: "31536000",
    contentType: photo.type,
    upsert: false
  });

  if (uploadError) {
    return accountRedirect(request, { error: uploadError.message });
  }

  const { data } = serviceClient.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  const photos = [...currentPhotos, data.publicUrl].slice(0, 5);
  const { error: updateError } = await serviceClient
    .from("player_profiles")
    .update({ photo_urls: photos, updated_at: new Date().toISOString() })
    .eq("id", playerProfile.id);

  if (updateError) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
    return accountRedirect(request, { error: updateError.message });
  }

  return accountRedirect(request, { notice: "Profile picture added." });
}
