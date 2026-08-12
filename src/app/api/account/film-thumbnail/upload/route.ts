import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";
const MAX_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "thumbnail";
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`film-thumbnail-upload:${getClientIp(request)}`, 20, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many thumbnail uploads. Try again shortly." }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("thumbnail");

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (!IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Thumbnail must be 7 MB or smaller." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (!profile || profile.role !== "player") {
    return NextResponse.json({ error: "Only player accounts can upload film thumbnails." }, { status: 403 });
  }

  const ext = safeName(file.name).split(".").pop() || "jpg";
  const path = `${profile.id}/film-thumbnails/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await serviceClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = serviceClient.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
