import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createMeetingJoinLinkAction } from "@/app/actions/meetings";
import DailyPrebuiltCall from "@/components/meetings/DailyPrebuiltCall";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface MeetingRoomPageProps {
  params: Promise<{
    meetingId: string;
  }>;
  searchParams: Promise<{
    t?: string;
    error?: string;
    notice?: string;
  }>;
}

interface MeetingRoomRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  status: string;
  request_note: string | null;
  scheduled_at: string | null;
  scheduled_duration_minutes: number;
  daily_room_name: string | null;
  daily_room_url: string | null;
  daily_room_expires_at: string | null;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  } | null;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
  } | null;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "Time not set";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function MeetingRoomPage({ params, searchParams }: MeetingRoomPageProps) {
  const { meetingId } = await params;
  const { t: token, error, notice } = await searchParams;
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: meeting } = await serviceClient
    .from("meeting_requests")
    .select(
      `
        id,
        team_id,
        player_profile_id,
        status,
        request_note,
        scheduled_at,
        scheduled_duration_minutes,
        daily_room_name,
        daily_room_url,
        daily_room_expires_at,
        teams!meeting_requests_team_id_fkey (
          id,
          name,
          city,
          country,
          logo_url
        ),
        profiles!meeting_requests_player_profile_id_fkey (
          id,
          display_name,
          avatar_url,
          headline
        )
      `
    )
    .eq("id", meetingId)
    .maybeSingle<MeetingRoomRow>();

  if (!meeting) notFound();

  const isPlayer = meeting.player_profile_id === profile.id;
  const { data: clubMembership } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", meeting.team_id)
    .eq("profile_id", profile.id)
    .limit(1)
    .maybeSingle<{ profile_id: string }>();
  const isClub = Boolean(clubMembership) || profile.role === "admin";

  if (!isPlayer && !isClub) {
    redirect("/account?error=You are not a participant in that call.");
  }

  const teamName = meeting.teams?.name ?? "Club";
  const playerName = meeting.profiles?.display_name ?? "Player";
  const canLoadCall = Boolean(token && meeting.daily_room_url);
  const isAccepted = meeting.status === "accepted";

  return (
    <main className="theme-private min-h-screen bg-white text-slate-950 dark:bg-[#090909] dark:text-white">
      <section className="border-b border-white/10 bg-[#111]">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">EuroScout Video Call</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{teamName} x {playerName}</h1>
            <p className="mt-1 text-sm font-semibold text-white/45">
              {formatDateTime(meeting.scheduled_at)} · {meeting.scheduled_duration_minutes} min · Daily SFU room
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/account" className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-black text-white/55 transition hover:border-red-500/40 hover:text-white">
              Account
            </Link>
            <Link href={`/scouts/${meeting.team_id}`} className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
              Club profile
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[110rem] gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</p> : null}
        {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{notice}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-[#111] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Participants</p>
              <div className="mt-4 space-y-3">
                {[
                  [teamName, meeting.teams?.logo_url, [meeting.teams?.city, meeting.teams?.country].filter(Boolean).join(", ") || "Club account"],
                  [playerName, meeting.profiles?.avatar_url, meeting.profiles?.headline ?? "Player account"]
                ].map(([name, image, detail]) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 bg-cover bg-center text-sm font-black text-white/50"
                      style={image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${image})` } : undefined}
                    >
                      {image ? "" : initials(String(name))}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{name}</p>
                      <p className="truncate text-xs font-semibold text-white/35">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#111] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Call Access</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/45">
                Join tokens are generated per participant. The Daily SFU room opens 5 minutes before the scheduled call.
              </p>
              {isAccepted ? (
                <form action={createMeetingJoinLinkAction} className="mt-4">
                  <input type="hidden" name="meeting_request_id" value={meeting.id} />
                  <input type="hidden" name="return_to" value={`/meetings/${meeting.id}/room`} />
                  <button className="h-11 w-full rounded-lg bg-red-600 px-4 text-sm font-black uppercase text-white transition hover:bg-red-700">
                    {token ? "Refresh join token" : meeting.daily_room_url ? "Join call" : "Open room window"}
                  </button>
                </form>
              ) : (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-100/70">
                  This call has not been accepted by both sides yet.
                </p>
              )}
            </section>
          </aside>

          <section className="min-h-[70vh] overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl shadow-black/20">
            {canLoadCall && meeting.daily_room_url && token ? (
              <DailyPrebuiltCall roomUrl={meeting.daily_room_url} token={token} userName={profile.display_name} />
            ) : (
              <div className="flex min-h-[70vh] items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Ready Room</p>
                  <h2 className="mt-2 text-3xl font-black text-white">Generate your secure join token.</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/45">
                    The Daily room stays private until an authorised player or club staff member joins through EuroScout. If it is early, the join button will tell you when the room opens.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
