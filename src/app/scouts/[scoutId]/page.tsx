import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ContactClubButton from "@/components/scouts/ContactClubButton";
import ClubPipelineSection from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";

export const metadata: Metadata = {
  title: "Club Profile | EuroScout Pro"
};

interface ClubProfilePageProps {
  params: Promise<{
    scoutId: string;
  }>;
}

interface ClubTeam {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  claim_status: string | null;
  recruiting_active: boolean | null;
  open_roster_spots: number | null;
  website: string | null;
  contact_email: string | null;
  pipeline_names_public: boolean;
}

interface ClubMemberRow {
  profile_id: string;
  club_role: string;
  team_id: string;
  teams: ClubTeam;
  profiles: Profile;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { scoutId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Fetch the club owner member row
  const { data: member } = await supabase
    .from("club_members")
    .select(
      `
        profile_id,
        club_role,
        team_id,
        teams!team_id (
          id, name, city, country, claim_status,
          recruiting_active, open_roster_spots, website,
          contact_email, pipeline_names_public
        ),
        profiles!profile_id (
          id, role, display_name, headline, bio, location,
          avatar_url, is_public, onboarding_complete, created_at, updated_at
        )
      `
    )
    .eq("profile_id", scoutId)
    .eq("club_role", "owner")
    .maybeSingle<ClubMemberRow>();

  const { data: profileFallback } = !member
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", scoutId)
        .eq("role", "club")
        .maybeSingle<Profile>()
    : { data: null };

  const resolvedProfile = member?.profiles ?? profileFallback;
  if (!resolvedProfile) notFound();

  const team = member?.teams ?? null;
  const teamId = team?.id ?? null;

  // Viewer context
  let isMember = false;
  let isOwner = false;
  let viewerRole: string | null = null;

  if (user) {
    const [{ data: viewerProfile }, membershipResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
      teamId
        ? supabase
            .from("club_members")
            .select("club_role")
            .eq("team_id", teamId)
            .eq("profile_id", user.id)
            .maybeSingle<{ club_role: string }>()
        : Promise.resolve({ data: null })
    ]);
    viewerRole = viewerProfile?.role ?? null;
    isMember = Boolean(membershipResult.data);
    isOwner = membershipResult.data?.club_role === "owner";
    if (viewerRole === "admin") {
      isMember = true;
      isOwner = true;
    }
  }

  // Club media
  const { data: media } = teamId
    ? await supabase
        .from("club_media")
        .select("*")
        .eq("team_id", teamId)
        .order("display_order")
    : { data: null };

  const allMedia = (media ?? []) as ClubMediaRow[];
  const photos = allMedia.filter((m) => m.media_type === "photo");
  const video = allMedia.find((m) => m.media_type === "video") ?? null;

  const isVerified = team?.claim_status === "verified";
  const pipelineNamesPublic = team?.pipeline_names_public ?? false;
  const isAuthenticated = Boolean(user);
  const canContact = isAuthenticated && !isMember;

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_30px_100px_rgba(0,0,0,0.42)]">

          {/* Header */}
          <header className="relative overflow-hidden bg-[radial-gradient(circle_at_8%_10%,rgba(239,68,68,.16),transparent_26rem),linear-gradient(135deg,#ffffff_0%,#fff7f7_42%,#fee2e2_100%)] px-5 py-6 dark:bg-[radial-gradient(circle_at_8%_10%,rgba(239,68,68,.28),transparent_26rem),linear-gradient(135deg,#020617_0%,#0f172a_48%,#2a0f14_100%)] sm:px-8 lg:px-10">
            <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(135deg,rgba(220,38,38,.08)_1px,transparent_1px)] [background-size:30px_30px] dark:opacity-30" />
            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/scouts"
                  className="inline-flex w-fit items-center rounded-full border border-red-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 shadow-sm backdrop-blur-xl transition hover:bg-red-50 dark:border-white/10 dark:bg-white/10 dark:text-red-200 dark:hover:bg-red-500/10"
                >
                  Back to clubs
                </Link>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-red-600/20">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  {isVerified ? "Verified Club" : "Club"}
                </div>
              </div>

              <div className="mt-8 grid gap-8 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                <div className="flex flex-col gap-7 sm:flex-row sm:items-end">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-950 text-4xl font-black tracking-tight text-white shadow-2xl shadow-red-100 ring-4 ring-red-500 dark:shadow-red-950/40 sm:h-44 sm:w-44 sm:rounded-[2rem] sm:text-6xl">
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,.35),transparent_48%)]" />
                    <span className="relative">{initials(resolvedProfile.display_name)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full border border-red-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 shadow-sm backdrop-blur-xl dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                        Club
                      </span>
                      {team && (
                        <span className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-800 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                          {[team.city, team.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:mt-5 sm:text-5xl lg:text-7xl">
                      {team?.name ?? resolvedProfile.display_name}
                    </h1>
                    {resolvedProfile.headline && (
                      <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
                        {resolvedProfile.headline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-white/10">
                    {([
                      ["Status", isVerified ? "Verified" : "Unverified"],
                      ["Location", [team?.city, team?.country].filter(Boolean).join(", ") || "—"],
                      ["Recruiting", team?.recruiting_active ? "Active" : "Inactive"],
                      ["Open Spots", String(team?.open_roster_spots ?? "—")]
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label} className="bg-white/88 p-4 dark:bg-slate-950/70">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                        <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Status strip */}
          <div className="border-y border-red-100 bg-white/70 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 sm:px-8 lg:px-10">
            <div className="flex flex-wrap gap-2">
              {team?.recruiting_active && (
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700 dark:bg-green-500/15 dark:text-green-300">
                  Actively recruiting
                </span>
              )}
              {team?.open_roster_spots != null && team.open_roster_spots > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">
                  {team.open_roster_spots} open spot{team.open_roster_spots !== 1 ? "s" : ""}
                </span>
              )}
              {team?.website && (
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  Website ↗
                </a>
              )}
              {isVerified && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="grid gap-8 bg-slate-50/80 p-5 dark:bg-slate-950/70 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-10">

            {/* Main column */}
            <div className="space-y-10">

              {/* Bio */}
              <section className="border-l-4 border-red-600 pl-6">
                <p className="eyebrow-red">About</p>
                <p className="mt-5 max-w-4xl text-2xl font-black leading-snug tracking-tight text-slate-950 dark:text-white">
                  {resolvedProfile.bio ??
                    "This club is setting up its EuroScout profile. Check back soon for more detail on their recruiting focus, pipeline, and contact preferences."}
                </p>
              </section>

              {teamId && (
                <ClubMediaSection
                  scoutId={scoutId}
                  teamId={teamId}
                  media={allMedia}
                  isMember={isMember}
                />
              )}

              {teamId && (
                <ClubPipelineSection
                  teamId={teamId}
                  isOwner={isOwner}
                  pipelineNamesPublic={pipelineNamesPublic}
                />
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">

              {/* Contact CTA */}
              <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                <p className="eyebrow-red mb-4">Contact</p>
                {canContact && teamId ? (
                  <ContactClubButton
                    scoutId={scoutId}
                    teamId={teamId}
                    teamName={team?.name ?? "Club"}
                  />
                ) : isOwner ? (
                  <Link
                    href="/account/edit"
                    className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-red-700"
                  >
                    Edit profile
                  </Link>
                ) : isMember && !isOwner ? (
                  <Link
                    href="/messages"
                    className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-700"
                  >
                    Club inbox
                  </Link>
                ) : (
                  <Link
                    href={`/auth/sign-in?return_url=/scouts/${scoutId}`}
                    className="inline-flex h-16 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
                  >
                    Sign in to message
                  </Link>
                )}

                {isAuthenticated && (
                  <Link
                    href="/messages"
                    className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 text-sm font-black uppercase tracking-[0.14em] text-slate-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  >
                    Messages
                  </Link>
                )}
              </section>

              {/* Recruiting Status */}
              {team && (
                <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                  <p className="eyebrow-red">Recruiting</p>
                  <div className="mt-5 flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white">
                    <span
                      className={`h-3 w-3 rounded-full shadow-[0_0_0_6px_rgba(16,185,129,0.12)] ${
                        team.recruiting_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    {team.recruiting_active ? "Actively recruiting" : "Not currently recruiting"}
                  </div>
                  {team.open_roster_spots != null && team.open_roster_spots > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Open spots</p>
                      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                        {team.open_roster_spots}
                      </p>
                    </div>
                  )}
                  {team.contact_email && (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact email</p>
                      <a
                        href={`mailto:${team.contact_email}`}
                        className="mt-2 block text-sm font-bold text-red-600 hover:underline dark:text-red-400"
                      >
                        {team.contact_email}
                      </a>
                    </div>
                  )}
                </section>
              )}

              {/* Profile Health */}
              <ClubProfileHealthCard
                hasBio={Boolean(resolvedProfile.bio)}
                hasWebsite={Boolean(team?.website)}
                photoCount={photos.length}
                hasVideo={Boolean(video)}
                isVerified={isVerified}
              />

              {isOwner && (
                <Link
                  href="/account/edit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 text-sm font-black uppercase tracking-[0.14em] text-slate-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                >
                  Edit profile
                </Link>
              )}
            </aside>
          </div>
        </article>
      </section>
    </main>
  );
}
