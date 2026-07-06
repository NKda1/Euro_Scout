import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function readFilmId(body: unknown) {
  if (!body || typeof body !== "object" || !("filmId" in body)) return "";
  const value = (body as { filmId?: unknown }).filmId;
  return typeof value === "string" ? value.trim() : "";
}

function readEventType(body: unknown) {
  if (!body || typeof body !== "object" || !("eventType" in body)) return "open";
  const value = (body as { eventType?: unknown }).eventType;
  return value === "hover_preview" ? "hover_preview" : "open";
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const filmId = readFilmId(body);
  const eventType = readEventType(body);
  if (!filmId) {
    return NextResponse.json({ error: "Film id is required." }, { status: 400 });
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: film } = await serviceClient
    .from("film_links")
    .select("id, player_profile_id, player_profiles!player_profile_id ( profile_id )")
    .eq("id", filmId)
    .maybeSingle<{
      id: string;
      player_profile_id: string;
      player_profiles: { profile_id: string } | null;
    }>();

  if (!film) {
    return NextResponse.json({ error: "Film link was not found." }, { status: 404 });
  }

  let viewerRole: string | null = null;
  if (user) {
    const { data: viewerProfile } = await serviceClient.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
    viewerRole = viewerProfile?.role ?? null;
  }

  if (!user || user.id !== film.player_profiles?.profile_id) {
    const { error } = await serviceClient.from("film_clicks").insert({
      film_link_id: film.id,
      player_profile_id: film.player_profile_id,
      viewer_profile_id: user?.id ?? null,
      viewer_role: viewerRole,
      event_type: eventType
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ tracked: true });
}
