import type { Metadata } from "next";
import Link from "next/link";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ClubPipelineSection from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";

export const metadata: Metadata = {
  title: "Mock Club Profile Preview | Admin"
};

// ── Mock data — no DB required ────────────────────────────────────────────────

const MOCK_SCOUT_ID = "mock-preview";
const MOCK_TEAM_ID = "mock-team-preview";

const MOCK_TEAM = {
  name: "Berlin Eagles AFC",
  city: "Berlin",
  country: "Germany",
  claim_status: "verified",
  recruiting_active: true,
  open_roster_spots: 3,
  website: "https://example.com",
  contact_email: "recruiting@berlineagles.example.com",
  pipeline_names_public: true
};

const MOCK_PROFILE = {
  display_name: "Berlin Eagles AFC",
  headline: "German Football League Division I · Building championship-calibre rosters since 2008",
  bio: "The Berlin Eagles are one of Germany's most storied American football programs, competing in the GFL Division I. We run a collegiate-style player development system with strong ties to North American feeder programs. Our coaching staff has experience at every level from high school through semi-professional football."
};

const MOCK_MEDIA: ClubMediaRow[] = [
  {
    id: "mock-photo-1",
    team_id: MOCK_TEAM_ID,
    media_type: "photo",
    url: "https://picsum.photos/seed/berlineagles1/800/500",
    provider: null,
    label: "Game day at Olympiastadion",
    display_order: 0
  },
  {
    id: "mock-photo-2",
    team_id: MOCK_TEAM_ID,
    media_type: "photo",
    url: "https://picsum.photos/seed/berlineagles2/800/500",
    provider: null,
    label: "Training camp 2025",
    display_order: 1
  }
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function MockClubProfilePreviewPage() {
  const isVerified = MOCK_TEAM.claim_status === "verified";
  const photos = MOCK_MEDIA.filter((m) => m.media_type === "photo");
  const video = MOCK_MEDIA.find((m) => m.media_type === "video") ?? null;

  return (
    <main className="app-surface">

      {/* Mock banner */}
      <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-950">
              Admin Preview
            </span>
            <p className="text-sm font-black text-amber-900 dark:text-amber-200">
              Mock club profile — no real data or DB calls. For QA purposes only.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-amber-300 bg-white/80 px-4 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          >
            ← Back to admin
          </Link>
        </div>
      </div>

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
                    <span className="relative">{initials(MOCK_PROFILE.display_name)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full border border-red-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 shadow-sm backdrop-blur-xl dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                        Club
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-800 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                        {MOCK_TEAM.city}, {MOCK_TEAM.country}
                      </span>
                    </div>
                    <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:mt-5 sm:text-5xl lg:text-7xl">
                      {MOCK_TEAM.name}
                    </h1>
                    <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
                      {MOCK_PROFILE.headline}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-white/10">
                    {([
                      ["Status", isVerified ? "Verified" : "Unverified"],
                      ["Location", `${MOCK_TEAM.city}, ${MOCK_TEAM.country}`],
                      ["Recruiting", MOCK_TEAM.recruiting_active ? "Active" : "Inactive"],
                      ["Open Spots", String(MOCK_TEAM.open_roster_spots)]
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
              {MOCK_TEAM.recruiting_active && (
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700 dark:bg-green-500/15 dark:text-green-300">
                  Actively recruiting
                </span>
              )}
              {MOCK_TEAM.open_roster_spots > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">
                  {MOCK_TEAM.open_roster_spots} open spots
                </span>
              )}
              <a
                href={MOCK_TEAM.website}
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                Website ↗
              </a>
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
                  {MOCK_PROFILE.bio}
                </p>
              </section>

              <ClubMediaSection
                scoutId={MOCK_SCOUT_ID}
                teamId={MOCK_TEAM_ID}
                media={MOCK_MEDIA}
                isMember={false}
              />

              <ClubPipelineSection
                teamId={MOCK_TEAM_ID}
                isOwner={false}
                pipelineNamesPublic={MOCK_TEAM.pipeline_names_public}
              />
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">

              {/* Contact CTA — preview shows sign-in state */}
              <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                <p className="eyebrow-red mb-4">Contact</p>
                <button
                  disabled
                  className="inline-flex h-16 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white opacity-80 shadow-lg shadow-red-600/25"
                >
                  Message {MOCK_TEAM.name}
                </button>
                <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                  (Live page shows real CTA based on auth state)
                </p>
              </section>

              {/* Recruiting Status */}
              <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
                <p className="eyebrow-red">Recruiting</p>
                <div className="mt-5 flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  Actively recruiting
                </div>
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Open spots</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{MOCK_TEAM.open_roster_spots}</p>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact email</p>
                  <p className="mt-2 text-sm font-bold text-red-600 dark:text-red-400">
                    {MOCK_TEAM.contact_email}
                  </p>
                </div>
              </section>

              {/* Profile Health */}
              <ClubProfileHealthCard
                hasBio={true}
                hasWebsite={true}
                photoCount={photos.length}
                hasVideo={Boolean(video)}
                isVerified={isVerified}
              />

            </aside>
          </div>
        </article>
      </section>
    </main>
  );
}
