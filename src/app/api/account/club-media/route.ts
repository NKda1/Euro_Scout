import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "profile-media";
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface ClubMediaRow {
  id: string;
  team_id: string;
  media_type: "photo" | "video";
  url: string;
  provider: string | null;
  label: string | null;
  display_order: number;
  original_filename: string | null;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "club-photo.jpg";
}

function storagePathFromPublicUrl(value?: string | null) {
  if (!value) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = value.indexOf(marker);
  return index < 0 ? null : decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
}

function videoProvider(value: string) {
  if (/youtu(?:\.be|be\.com)/i.test(value)) return "youtube";
  if (/vimeo\.com/i.test(value)) return "vimeo";
  if (/hudl\.com/i.test(value)) return "hudl";
  return "external";
}

async function authorisedContext(teamId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: membership } = await serviceClient.from("club_members").select("club_role").eq("team_id", teamId).eq("profile_id", user.id).maybeSingle<{ club_role: string }>();
  if (!membership) return null;
  return { user, serviceClient };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const formData = await request.formData();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const mediaId = String(formData.get("media_id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  if (!teamId || (kind !== "photo" && kind !== "video")) return NextResponse.json({ error: "Invalid media request." }, { status: 400 });
  const context = await authorisedContext(teamId);
  if (!context) return NextResponse.json({ error: "You do not have permission to manage this club media." }, { status: 403 });
  const { user, serviceClient } = context;

  if (kind === "video") {
    const rawUrl = String(formData.get("url") ?? "").trim().slice(0, 2000);
    const label = String(formData.get("label") ?? "").trim().slice(0, 120) || null;
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { return NextResponse.json({ error: "Enter a valid video URL." }, { status: 400 }); }
    if (parsed.protocol !== "https:") return NextResponse.json({ error: "Video links must use HTTPS." }, { status: 400 });

    const { data: existing } = mediaId
      ? await serviceClient.from("club_media").select("id").eq("id", mediaId).eq("team_id", teamId).eq("media_type", "video").maybeSingle<{ id: string }>()
      : await serviceClient.from("club_media").select("id").eq("team_id", teamId).eq("media_type", "video").maybeSingle<{ id: string }>();
    const values = { url: parsed.toString(), provider: videoProvider(parsed.hostname), label, display_order: 0, original_filename: null };
    const result = existing
      ? await serviceClient.from("club_media").update(values).eq("id", existing.id).select("id, team_id, media_type, url, provider, label, display_order, original_filename").single<ClubMediaRow>()
      : await serviceClient.from("club_media").insert({ team_id: teamId, media_type: "video", ...values }).select("id, team_id, media_type, url, provider, label, display_order, original_filename").single<ClubMediaRow>();
    if (result.error || !result.data) return NextResponse.json({ error: "The video could not be saved. Try again." }, { status: 500 });
    return NextResponse.json({ media: result.data });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, WebP or GIF image." }, { status: 415 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Club images must be 7 MB or smaller." }, { status: 413 });
  const displayOrder = Math.max(0, Math.min(3, Number.parseInt(String(formData.get("display_order") ?? "0"), 10) || 0));

  const { data: existing } = mediaId
    ? await serviceClient.from("club_media").select("id, url").eq("id", mediaId).eq("team_id", teamId).eq("media_type", "photo").maybeSingle<{ id: string; url: string }>()
    : { data: null as { id: string; url: string } | null };
  if (mediaId && !existing) return NextResponse.json({ error: "That photo no longer exists. Refresh and try again." }, { status: 404 });
  if (!existing) {
    const { count } = await serviceClient.from("club_media").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("media_type", "photo");
    if ((count ?? 0) >= 4) return NextResponse.json({ error: "This club already has four photos. Replace an existing slot." }, { status: 409 });
  }

  const filename = safeName(file.name);
  const path = `${user.id}/club-${teamId}/club-photo-${displayOrder}-${randomUUID()}-${filename}`;
  const { error: uploadError } = await serviceClient.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 502 });
  const { data: publicUrl } = serviceClient.storage.from(BUCKET).getPublicUrl(path);
  const values = { url: publicUrl.publicUrl, display_order: displayOrder, original_filename: file.name.slice(0, 180) };
  const result = existing
    ? await serviceClient.from("club_media").update(values).eq("id", existing.id).select("id, team_id, media_type, url, provider, label, display_order, original_filename").single<ClubMediaRow>()
    : await serviceClient.from("club_media").insert({ team_id: teamId, media_type: "photo", provider: null, label: null, ...values }).select("id, team_id, media_type, url, provider, label, display_order, original_filename").single<ClubMediaRow>();
  if (result.error || !result.data) {
    await serviceClient.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "The upload completed but the photo could not be saved. Try again." }, { status: 500 });
  }
  const previousPath = storagePathFromPublicUrl(existing?.url);
  if (previousPath) await serviceClient.storage.from(BUCKET).remove([previousPath]);
  return NextResponse.json({ media: result.data });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body = await request.json().catch(() => null) as { teamId?: string; mediaId?: string } | null;
  const teamId = body?.teamId?.trim() ?? "";
  const mediaId = body?.mediaId?.trim() ?? "";
  if (!teamId || !mediaId) return NextResponse.json({ error: "Invalid media request." }, { status: 400 });
  const context = await authorisedContext(teamId);
  if (!context) return NextResponse.json({ error: "You do not have permission to manage this club media." }, { status: 403 });
  const { serviceClient } = context;
  const { data: media } = await serviceClient.from("club_media").select("id, url").eq("id", mediaId).eq("team_id", teamId).maybeSingle<{ id: string; url: string }>();
  if (!media) return NextResponse.json({ error: "That media item no longer exists." }, { status: 404 });
  const { error } = await serviceClient.from("club_media").delete().eq("id", mediaId).eq("team_id", teamId);
  if (error) return NextResponse.json({ error: "The media item could not be removed." }, { status: 500 });
  const path = storagePathFromPublicUrl(media.url);
  if (path) await serviceClient.storage.from(BUCKET).remove([path]);
  return NextResponse.json({ removed: mediaId });
}
