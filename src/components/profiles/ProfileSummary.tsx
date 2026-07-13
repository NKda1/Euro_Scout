import Link from "next/link";
import { startConversationAction } from "@/app/actions/messages";
import { createPlayerProfileNoteAction } from "@/app/actions/player-notes";
import HudlFilmViewer, { type FilmLink } from "@/components/players/HudlFilmViewer";
import InvitePlayerToCallButton from "@/components/players/InvitePlayerToCallButton";
import PlayerPhotoGallery from "@/components/players/PlayerPhotoGallery";
import PublicNotesPanel, { type PublicPlayerNote } from "@/components/players/PublicNotesPanel";
import CareerStatsPanel from "@/components/profiles/CareerStatsPanel";
import CombineMetricsPanel from "@/components/profiles/CombineMetricsPanel";
import PlayerMeasureGrid from "@/components/profiles/PlayerMeasureGrid";
import ShareProfileButton from "@/components/profiles/ShareProfileButton";
import TrustSignals, { lastActiveLabel } from "@/components/ui/TrustSignals";
import { roleLabel, type Profile } from "@/lib/auth";
import { campusPipelines, getCampusTeam } from "@/lib/campus-to-pro";
import { leagues, teams } from "@/lib/data";

interface ProfileSummaryProps {
  profile: Profile;
  roleProfile?: Record<string, unknown> | null;
  showEditLink?: boolean;
  showMessageButton?: boolean;
  backHref?: string;
  backLabel?: string;
  filmLinks?: FilmLink[];
  careerEntries?: CareerEntry[];
  publicNotes?: PublicPlayerNote[];
  viewerTeamId?: string | null;
  isWatchlistedByViewerClub?: boolean;
  sharePath?: string;
}

type SummaryField = [string, unknown];

export interface CareerEntry {
  id: string;
  team_id?: string | null;
  team_name: string;
  league_name?: string | null;
  country?: string | null;
  position?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean | null;
}

function value(item: unknown) {
  if (Array.isArray(item)) return item.length ? item.join(", ") : "Not listed";
  return item ? String(item) : "Not listed";
}

function stringValue(item: unknown) {
  return item ? String(item) : "";
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

function formatPipeline(item: unknown) {
  const pipeline = stringValue(item);
  return pipeline ? pipeline.replaceAll("_", " ") : "Open pathway";
}

function ageFromDob(item: unknown) {
  const dob = stringValue(item);
  if (!dob) return null;

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function numberValue(item: unknown) {
  const parsed = Number(item);
  return Number.isFinite(parsed) ? parsed : null;
}

function Panel({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111]">
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">{eyebrow}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ProfileSummary({
  profile,
  roleProfile,
  showEditLink,
  showMessageButton,
  backHref = "/players",
  backLabel = "Back to players",
  filmLinks = [],
  careerEntries = [],
  publicNotes = [],
  viewerTeamId = null,
  isWatchlistedByViewerClub = false,
  sharePath
}: ProfileSummaryProps) {
  const currentTeamId = stringValue(roleProfile?.current_team_id || roleProfile?.team_id);
  const campusTeam = getCampusTeam(currentTeamId);
  const currentTeam = campusTeam ?? teams.find((team) => team.id === currentTeamId);
  const currentLeagueName = campusTeam
    ? campusPipelines[campusTeam.leagueId].label
    : currentTeam
      ? leagues.find((league) => league.id === currentTeam.leagueId)?.name
      : null;
  const age = ageFromDob(roleProfile?.dob);
  const photoUrls = Array.isArray(roleProfile?.photo_urls) ? roleProfile.photo_urls.slice(0, 4).map((item) => String(item)) : [];
  const isPlayer = profile.role === "player";
  const primaryTag = isPlayer ? stringValue(roleProfile?.position) || "Player" : roleLabel(profile.role);
  const secondaryTag = isPlayer ? formatPipeline(roleProfile?.pipeline_type) : profile.role === "fan" ? "Supporter" : roleLabel(profile.role);
  const availability = isPlayer && roleProfile?.available_for_transfer ? "Available" : "Open";
  const location = profile.location ?? currentTeam?.country ?? "Europe";
  const completion = Math.min(100, 35 + (profile.bio ? 20 : 0) + filmLinks.length * 10 + photoUrls.length * 5);
  const sortedCareerEntries = [...careerEntries].sort((a, b) => (a.start_year ?? 0) - (b.start_year ?? 0));
  const resolvedSharePath = sharePath ?? (isPlayer ? `/players/${profile.id}` : `/profiles/${profile.id}`);

  const stats: SummaryField[] = [
        ["Role", roleLabel(profile.role)],
        ["Location", location],
        ["Status", availability],
        ["Visibility", profile.is_public ? "Public" : "Private"]
      ];

  const tags: SummaryField[] = isPlayer
    ? [
        ["Nationality", roleProfile?.nationality],
        ["Pipeline", roleProfile?.pipeline_type],
        ["Passport", roleProfile?.passport_ready ? "Ready" : "Not listed"],
        ["Transfer", roleProfile?.available_for_transfer ? "Available" : "Not listed"]
      ]
    : [
        ["Location", profile.location],
        ["Bio", profile.bio]
      ];

  return (
    <article className="overflow-hidden bg-white text-slate-950 dark:bg-[#090909] dark:text-white">
      <header className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#120807]">
        <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6 lg:px-8">
          <Link href={backHref} className="mb-5 inline-flex h-10 items-center border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40 dark:hover:border-red-500/50 dark:hover:text-white">
            ← {backLabel}
          </Link>
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start">
            <div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className="flex h-32 w-32 shrink-0 items-center justify-center border-2 border-red-500 bg-slate-200 bg-cover bg-center text-5xl font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                  style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url(${profile.avatar_url})` } : undefined}
                >
                  {profile.avatar_url ? "" : initials(profile.display_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="border border-indigo-400 bg-indigo-100 px-3 py-1 text-xs font-black uppercase text-indigo-950 shadow-sm dark:border-indigo-400/60 dark:bg-indigo-500/15 dark:text-indigo-100">
                      {primaryTag}
                    </span>
                    <span className="border border-blue-400 bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-950 shadow-sm dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-100">
                      {secondaryTag}
                    </span>
                    <span className="border border-green-400 bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-950 shadow-sm dark:border-green-500/50 dark:bg-green-500/15 dark:text-green-100">
                      {profile.is_public ? "Public" : "Private"}
                    </span>
                    {isPlayer && isWatchlistedByViewerClub ? (
                      <span className="border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-950 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100">
                        Added to watchlist
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-4 text-4xl font-black leading-none sm:text-5xl">{profile.display_name}</h1>
                  <p className="mt-3 text-lg font-bold text-slate-500 dark:text-white/45">
                    {location}
                    {currentTeam ? ` · ${currentTeam.name}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {tags.map(([label, item]) => (
                  <div key={label} className="min-h-9 border border-slate-200 bg-white px-4 py-2 text-sm dark:border-white/20 dark:bg-black/20">
                    <span className="mr-1.5 uppercase text-slate-500 dark:text-white/35">{label}</span>
                    <span className="font-bold capitalize text-slate-800 dark:text-white/75">{value(item)}</span>
                  </div>
                ))}
              </div>
            </div>

            {isPlayer ? (
              <PlayerMeasureGrid
                position={stringValue(roleProfile?.position)}
                age={age}
                heightCm={numberValue(roleProfile?.height_cm)}
                weightKg={numberValue(roleProfile?.weight_kg)}
              />
            ) : (
              <div className="grid grid-cols-2 overflow-hidden border border-slate-200 bg-white dark:border-white/15 dark:bg-[#1a1a1a]">
                {stats.map(([label, item], index) => (
                  <div key={label} className={`p-6 ${index % 2 === 0 ? "border-r border-slate-200 dark:border-white/10" : ""} ${index < 2 ? "border-b border-slate-200 dark:border-white/10" : ""}`}>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-white/35">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value(item)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[110rem] gap-7 px-4 py-7 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-8 xl:border-r xl:border-slate-200 xl:pr-10 dark:xl:border-white/10">
          <section>
            <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Profile</p>
            <div className="mt-5 space-y-5">
              <div className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 dark:border-white/15 dark:from-[#1a1a1a] dark:to-[#111]">
                <p className="text-base font-semibold leading-7 text-slate-600 dark:text-white/65">
                  {profile.bio ?? "This profile is ready for more detail. Account controls can update this public profile at any time."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Current Team Card */}
                <div className="group relative overflow-hidden border border-slate-200 bg-white transition hover:border-indigo-300 hover:shadow-md dark:border-white/15 dark:bg-[#1a1a1a] dark:hover:border-indigo-500/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 opacity-0 transition group-hover:opacity-100 dark:to-indigo-500/10" />
                  <div className="relative p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Current Team</p>
                    </div>
                    <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{currentTeam?.name ?? "Not listed"}</p>
                  </div>
                </div>

                {/* Current League Card */}
                <div className="group relative overflow-hidden border border-slate-200 bg-white transition hover:border-purple-300 hover:shadow-md dark:border-white/15 dark:bg-[#1a1a1a] dark:hover:border-purple-500/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 transition group-hover:opacity-100 dark:to-purple-500/10" />
                  <div className="relative p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Current League</p>
                    </div>
                    <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{currentLeagueName ?? "Not listed"}</p>
                  </div>
                </div>

                {/* Bio Status Card */}
                <div className="group relative overflow-hidden border border-slate-200 bg-white transition hover:border-amber-300 hover:shadow-md dark:border-white/15 dark:bg-[#1a1a1a] dark:hover:border-amber-500/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 opacity-0 transition group-hover:opacity-100 dark:to-amber-500/10" />
                  <div className="relative p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Bio</p>
                    </div>
                    <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{profile.bio ? "Complete" : "Not listed"}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isPlayer && sortedCareerEntries.length ? (
            <section>
              <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Career Timeline</p>
              <div className="mt-5 overflow-x-auto border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
                <div className="flex min-w-max items-start gap-4">
                  {sortedCareerEntries.map((entry, index) => (
                    <div key={entry.id} className="flex items-start gap-4">
                      <div className="w-56">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-red-500 bg-red-600 text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <span className="text-xs font-black text-slate-500 dark:text-white/35">
                            {entry.start_year ?? "----"} - {entry.is_current ? "Present" : entry.end_year ?? "----"}
                          </span>
                        </div>
                        <div className="mt-4 border-l-2 border-red-500/50 pl-4">
                          <p className="text-base font-black text-slate-950 dark:text-white">{entry.team_name}</p>
                          <p className="mt-1 text-xs font-bold uppercase text-slate-500 dark:text-white/35">
                            {[entry.position, entry.league_name, entry.country].filter(Boolean).join(" / ") || "Career entry"}
                          </p>
                        </div>
                      </div>
                      {index < sortedCareerEntries.length - 1 ? (
                        <div className="mt-4 h-px w-16 bg-red-500/50" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {isPlayer ? (
            <CombineMetricsPanel
              fortyYardDash={numberValue(roleProfile?.forty_yard_dash)}
              shuttleSeconds={numberValue(roleProfile?.shuttle_seconds)}
              verticalJumpInches={numberValue(roleProfile?.vertical_jump_cm)}
              broadJumpFeet={numberValue(roleProfile?.broad_jump_cm)}
              benchReps={numberValue(roleProfile?.bench_reps)}
            />
          ) : null}

          {isPlayer ? <CareerStatsPanel stats={roleProfile?.career_stats as Record<string, unknown> | null | undefined} /> : null}

          {isPlayer ? <PublicNotesPanel notes={publicNotes} /> : null}

          {isPlayer ? <HudlFilmViewer filmLinks={filmLinks} /> : null}

          <section>
            <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Photos</p>
            <PlayerPhotoGallery photoUrls={photoUrls} />
          </section>
        </div>

        <aside className="space-y-6">
          <Panel eyebrow="Availability">
            <div className="flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              {isPlayer && roleProfile?.available_for_transfer ? "Available for transfer" : "Open to connect"}
            </div>
          </Panel>

          <Panel eyebrow="Profile Health">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500 dark:text-white/55">Completeness</span>
              <span className="font-black text-slate-950 dark:text-white">{completion}%</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden bg-slate-200 dark:bg-white/10">
              <div className="h-full bg-red-500" style={{ width: `${completion}%` }} />
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Film links", filmLinks.length],
                ["Photos", `${photoUrls.length}/4`],
                ["Visibility", profile.is_public ? "Public" : "Private"]
              ].map(([label, item]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 dark:text-white/55">{label}</span>
                  <span className="font-black text-slate-950 dark:text-white">{item}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Trust Signals">
            <TrustSignals
              signals={[
                {
                  label: "Last active",
                  value: lastActiveLabel(profile.updated_at),
                  tone: "slate"
                },
                {
                  label: "Completeness",
                  value: `${completion}% profile readiness`,
                  tone: completion >= 80 ? "green" : completion >= 55 ? "amber" : "red"
                },
                {
                  label: "Public status",
                  value: profile.is_public ? "Visible and shareable" : "Private profile",
                  tone: profile.is_public ? "green" : "amber"
                }
              ]}
            />
          </Panel>

          <Panel eyebrow="Share">
            <p className="mb-4 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
              Copy this public profile link or send it through your device share menu.
            </p>
            <ShareProfileButton
              path={resolvedSharePath}
              title={`${profile.display_name} | EuroScout Pro`}
              text={`View ${profile.display_name} on EuroScout Pro.`}
              className="w-full"
            />
          </Panel>

          <Panel eyebrow="Contact">
            <div className="space-y-3">
              {showMessageButton ? (
                <form action={startConversationAction}>
                  <input type="hidden" name="target_profile_id" value={profile.id} />
                  <input type="hidden" name="subject" value={`EuroScout intro with ${profile.display_name}`} />
                  <button className="h-14 w-full bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">Send message</button>
                </form>
              ) : showEditLink ? (
                <Link href="/account" className="inline-flex h-14 w-full items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                  Edit account
                </Link>
              ) : (
                <Link href="/auth/sign-in" className="inline-flex h-14 w-full items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                  Sign in to message
                </Link>
              )}
              {isPlayer && showMessageButton && viewerTeamId ? (
                <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                  <InvitePlayerToCallButton
                    targetProfileId={profile.id}
                    playerDisplayName={profile.display_name}
                    teamId={viewerTeamId}
                    returnTo={`/players/${profile.id}`}
                  />
                </div>
              ) : null}
              {isPlayer && showMessageButton && viewerTeamId ? (
                <form action={createPlayerProfileNoteAction} className="border-t border-slate-200 pt-4 dark:border-white/10">
                  <input type="hidden" name="player_profile_id" value={String(roleProfile?.id ?? "")} />
                  <input type="hidden" name="team_id" value={viewerTeamId} />
                  <input type="hidden" name="return_path" value={`/players/${profile.id}`} />
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-white/35">Leave public note</span>
                    <textarea name="note" required rows={4} className="w-full border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white" />
                  </label>
                  <button className="mt-3 h-11 w-full bg-red-600 px-4 text-sm font-black uppercase text-white transition hover:bg-red-700">
                    Send for player review
                  </button>
                </form>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </article>
  );
}
