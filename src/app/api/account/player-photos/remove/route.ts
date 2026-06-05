import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";

function accountRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/account", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
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

  const formData = await request.formData();
  const photoUrl = String(formData.get("photo_url") ?? "").trim();

  if (!profile || profile.role !== "player" || !photoUrl) {
    return accountRedirect(request, {});
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
    return accountRedirect(request, {});
  }

  const photos = (playerProfile.photo_urls ?? []).filter((item) => item !== photoUrl);
  const { error: updateError } = await serviceClient
    .from("player_profiles")
    .update({ photo_urls: photos, updated_at: new Date().toISOString() })
    .eq("id", playerProfile.id);

  if (updateError) {
    return accountRedirect(request, { error: updateError.message });
  }

  const storagePath = storagePathFromPublicUrl(photoUrl);
  if (storagePath) {
    await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove([storagePath]);
  }

  return accountRedirect(request, { notice: "Profile picture removed." });
}
