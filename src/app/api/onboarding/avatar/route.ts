import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PROFILE_MEDIA_BUCKET = "profile-media";
const MAX_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "avatar";
}

/**
 * POST /api/onboarding/avatar
 * Uploads a profile avatar during onboarding and returns { url } as JSON.
 * The wizard stores the URL in state and submits it with the rest of the form.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`onboarding-avatar:${getClientIp(request)}`, 10, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose a profile photo to upload." }, { status: 400 });
  }
  if (!IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Profile images must be 7 MB or smaller." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const ext = safeFileName(file.name).split(".").pop() || "jpg";
  const path = `${user.id}/avatar/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await serviceClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = serviceClient.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
