import type { Metadata } from "next";
import Link from "next/link";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ClubPipelineSection from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";

export const metadata: Metadata = {
  title: "Mock Club Profile Preview | Admin"
};

const MOCK_SCOUT_ID = "mock-preview";
const MOCK_TEAM_ID = "mock-team-preview";

const MOCK_TEAM = {
  name: "Berlin Eagles AFC",
  city: "Berlin",
  country: "Germany",
  league: "GFL",
  tier: 1,
  type: "Premier",
  market: "Gold",
  stadium: "Olympiastadion Berlin",
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
    id: "mock-video-1",
    team_id: MOCK_TEAM_ID,
    media_type: "video",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    provider: "youtube",
    label: "Berlin Eagles - 2025 Season Highlights",
    display_order: 0
  },
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

const MOCK_STAFF = [
  { initials: "MK", name: "Mara Keller", role: "owner", title: "General Manager" },
  { initials: "JS", name: "Jonas Stein", role: "coach", title: "Head Coach" },
  { initials: "AL", name: "Amir Lewis", role: "recruiter", title: "International Recruiting" }
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
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="sticky top-0 z-50 border-b border-amber-400/30 bg-[#171105] px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-amber-950">
              Admin Preview
            </span>
            <p className="text-sm font-black text-amber-200/85">
              Mock club profile - no real data or DB calls. For QA purposes only.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-400/15"
          >
            ← Back to admin
          </Link>
        </div>
      </div>

      <section className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/scouts"
            className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-white/30 transition hover:border-red-500/50 hover:text-white"
          >
            ← Back to clubs
          </Link>
        </div>
      </section>

      <article>
        <header className="border-b border-white/10 bg-[#120807]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] text-5xl font-black text-white">
                    {initials(MOCK_TEAM.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded border border-indigo-400/60 bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase text-indigo-200">
                        Club
                      </span>
                      <span className="rounded border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase text-green-400">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                      <span className="rounded border border-blue-500/60 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase text-blue-300">
                        {MOCK_TEAM.league} - Tier {MOCK_TEAM.tier}
                      </span>
                    </div>
                    <h1 className="mt-4 text-5xl font-black leading-none text-white sm:text-6xl">{MOCK_TEAM.name}</h1>
                    <p className="mt-3 text-lg font-bold text-white/45">
                      {MOCK_TEAM.city}, {MOCK_TEAM.country}
                    </p>
                  </div>
                </div>

                <div className="mt-9 flex flex-wrap gap-3">
                  {[
                    ["Region", MOCK_TEAM.country],
                    ["Type", MOCK_TEAM.type],
                    ["Market", MOCK_TEAM.market],
                    ["Pipeline", MOCK_TEAM.pipeline_names_public ? "Public" : "Open"]
                  ].map(([label, value]) => (
                    <div key={label} className="min-h-9 rounded border border-white/20 bg-black/20 px-4 py-2 text-sm">
                      <span className="mr-1.5 uppercase text-white/35">{label}</span>
                      <span className="font-bold text-white/75">{value}</span>
                    </div>
                  ))}
                  <span className="min-h-9 px-2 py-2 text-sm font-black uppercase text-red-500">Public Profile</span>
                </div>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
                {[
                  ["League", MOCK_TEAM.league],
                  ["Founded", "2008"],
                  ["Open Spots", String(MOCK_TEAM.open_roster_spots)],
                  ["Staff", String(MOCK_STAFF.length)]
                ].map(([label, value], index) => (
                  <div key={label} className={`p-6 ${index % 2 === 0 ? "border-r border-white/10" : ""} ${index < 2 ? "border-b border-white/10" : ""}`}>
                    <p className="text-xs font-bold uppercase text-white/35">{label}</p>
                    <p className={`mt-2 text-2xl font-black ${label === "Open Spots" ? "text-green-400" : "text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="space-y-8 lg:border-r lg:border-white/10 lg:pr-10">
            <ClubMediaSection scoutId={MOCK_SCOUT_ID} teamId={MOCK_TEAM_ID} media={MOCK_MEDIA} isMember={false} />

            <ClubPipelineSection
              scoutId={MOCK_SCOUT_ID}
              canView={false}
              watchlisted={[]}
              reachedOut={[]}
              interested={[]}
            />

            <section>
              <p className="text-sm font-black uppercase text-red-500">Club Profile</p>
              <div className="mt-5 rounded-lg border border-white/15 bg-[#1a1a1a] p-7">
                <p className="text-base font-semibold leading-7 text-white/65">{MOCK_PROFILE.bio}</p>
                <div className="mt-5 border-t border-white/10 text-sm">
                  <div className="flex items-center justify-between border-b border-white/10 py-3">
                    <span className="text-white/35">Stadium</span>
                    <span className="font-bold text-white">{MOCK_TEAM.stadium}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 py-3">
                    <span className="text-white/35">Website</span>
                    <a href={MOCK_TEAM.website} className="font-bold text-blue-400 hover:text-blue-300">
                      {MOCK_TEAM.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-white/35">Contact</span>
                    <a href={`mailto:${MOCK_TEAM.contact_email}`} className="font-bold text-blue-400 hover:text-blue-300">
                      {MOCK_TEAM.contact_email}
                    </a>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-red-500/25 bg-[#1a1a1a] p-7">
              <p className="mb-5 text-sm font-black uppercase text-red-500">Contact Club</p>
              <button
                disabled
                className="inline-flex h-16 w-full cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-black/20 px-5 text-sm font-black text-white/25"
              >
                Message {MOCK_TEAM.name}
              </button>
              <p className="mt-3 text-center text-xs font-semibold text-white/30">
                Live page shows the real CTA based on auth state.
              </p>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
              <p className="text-sm font-black uppercase text-red-500">Recruiting Status</p>
              <div className="mt-5 flex items-center gap-3 text-lg font-black text-white">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Actively recruiting
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
              <p className="text-sm font-black uppercase text-red-500">Open Roster Spots</p>
              <div className="mt-5 space-y-3">
                {["Wide Receiver", "Defensive Back", "Offensive Line"].map((spot) => (
                  <div key={spot} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                    <span className="font-bold text-white">{spot}</span>
                    <span className="rounded border border-green-500/60 px-3 py-1 text-xs font-bold text-green-400">Open</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
              <p className="text-sm font-black uppercase text-red-500">Staff Directory</p>
              <div className="mt-5 divide-y divide-white/10">
                {MOCK_STAFF.map((staffMember) => (
                  <div key={staffMember.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/50">
                        {staffMember.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">{staffMember.name}</p>
                        <p className="text-sm text-white/35">{staffMember.title}</p>
                      </div>
                    </div>
                    <span className="rounded border border-white/20 px-3 py-1 text-xs font-bold uppercase text-white/45">
                      {staffMember.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <ClubProfileHealthCard
              hasBio={true}
              hasWebsite={true}
              photoCount={photos.length}
              hasVideo={Boolean(video)}
              isVerified={isVerified}
            />

            <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
              <p className="text-sm font-black uppercase text-red-500">Verification</p>
              <div className="mt-5 flex items-center gap-3 text-base font-black text-white">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Community verified
              </div>
              <p className="mt-3 text-sm font-semibold text-white/35">Claimed 14 May 2026 · No disputes raised</p>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
