import Link from "next/link";
import { startConversationAction } from "@/app/actions/messages";
import HudlFilmViewer, { type FilmLink } from "@/components/players/HudlFilmViewer";
import { roleLabel, type Profile } from "@/lib/auth";
import { leagues, teams } from "@/lib/data";

interface ProfileSummaryProps {
  profile: Profile;
  roleProfile?: Record<string, unknown> | null;
  showEditLink?: boolean;
  showMessageButton?: boolean;
  backHref?: string;
  backLabel?: string;
  showMessagesLink?: boolean;
  filmLinks?: FilmLink[];
}

type SummaryField = [string, unknown];

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

function Panel({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
      <p className="text-sm font-black uppercase text-red-500">{eyebrow}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ProfileSummary({
  profile,
  roleProfile,
  showEditLink,
  showMessageButton,
  backHref = "/profiles",
  backLabel = "Back to profiles",
  showMessagesLink,
  filmLinks = []
}: ProfileSummaryProps) {
  const currentTeam = teams.find((team) => team.id === roleProfile?.current_team_id || team.id === roleProfile?.team_id);
  const currentLeague = currentTeam ? leagues.find((league) => league.id === currentTeam.leagueId) : null;
  const age = ageFromDob(roleProfile?.dob);
  const photoUrls = Array.isArray(roleProfile?.photo_urls) ? roleProfile.photo_urls.slice(0, 5).map((item) => String(item)) : [];
  const isPlayer = profile.role === "player";
  const primaryTag = isPlayer ? stringValue(roleProfile?.position) || "Player" : roleLabel(profile.role);
  const secondaryTag = isPlayer ? formatPipeline(roleProfile?.pipeline_type) : profile.role === "fan" ? "Supporter" : roleLabel(profile.role);
  const availability = isPlayer && roleProfile?.available_for_transfer ? "Available" : "Open";
  const location = profile.location ?? currentTeam?.country ?? "Europe";
  const completion = Math.min(100, 35 + (profile.bio ? 15 : 0) + (profile.headline ? 10 : 0) + filmLinks.length * 10 + photoUrls.length * 5);

  const stats: SummaryField[] = isPlayer
    ? [
        ["Position", roleProfile?.position],
        ["Age", age],
        ["Height", roleProfile?.height_cm ? `${roleProfile.height_cm} cm` : null],
        ["Weight", roleProfile?.weight_kg ? `${roleProfile.weight_kg} kg` : null]
      ]
    : [
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
        ["Headline", profile.headline]
      ];

  return (
    <article className="overflow-hidden bg-[#090909] text-white">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link href={backHref} className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-white/30 transition hover:border-red-500/50 hover:text-white">
            ← {backLabel}
          </Link>
        </div>
      </section>

      <header className="border-b border-white/10 bg-[#120807]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-5xl font-black"
                  style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url(${profile.avatar_url})` } : undefined}
                >
                  {profile.avatar_url ? "" : initials(profile.display_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded border border-indigo-400/60 bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase text-indigo-200">
                      {primaryTag}
                    </span>
                    <span className="rounded border border-blue-500/60 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase text-blue-300">
                      {secondaryTag}
                    </span>
                    <span className="rounded border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase text-green-400">
                      {profile.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                  <h1 className="mt-4 text-5xl font-black leading-none sm:text-6xl">{profile.display_name}</h1>
                  <p className="mt-3 text-lg font-bold text-white/45">
                    {location}
                    {currentTeam ? ` · ${currentTeam.name}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                {tags.map(([label, item]) => (
                  <div key={label} className="min-h-9 rounded border border-white/20 bg-black/20 px-4 py-2 text-sm">
                    <span className="mr-1.5 uppercase text-white/35">{label}</span>
                    <span className="font-bold capitalize text-white/75">{value(item)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
              {stats.map(([label, item], index) => (
                <div key={label} className={`p-6 ${index % 2 === 0 ? "border-r border-white/10" : ""} ${index < 2 ? "border-b border-white/10" : ""}`}>
                  <p className="text-xs font-bold uppercase text-white/35">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value(item)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-8 lg:border-r lg:border-white/10 lg:pr-10">
          {isPlayer ? <HudlFilmViewer filmLinks={filmLinks} /> : null}

          <section>
            <p className="text-sm font-black uppercase text-red-500">Profile</p>
            <div className="mt-5 flex gap-8 border-b border-white/10 text-sm font-black uppercase">
              {["About", "Film", "History", "News"].map((tab, index) => (
                <span key={tab} className={`pb-4 ${index === 0 ? "border-b-2 border-red-500 text-red-500" : "text-white/35"}`}>
                  {tab}
                </span>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-white/15 bg-[#1a1a1a] p-7">
              <p className="text-lg font-semibold leading-8 text-white/65">
                {profile.bio ?? "This profile is ready for more detail. Account controls can update this public profile at any time."}
              </p>
              <div className="mt-7 border-t border-white/10 text-sm">
                {[
                  ["Current team", currentTeam?.name],
                  ["Current league", currentLeague?.name],
                  ["Headline", profile.headline]
                ].map(([label, item]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0">
                    <span className="text-white/35">{label}</span>
                    <span className="text-right font-bold text-white">{value(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm font-black uppercase text-red-500">Photos</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[0, 1, 2, 3, 4].map((slot) => (
                <div
                  key={slot}
                  className="flex aspect-[4/5] items-end rounded-lg border border-dashed border-white/15 bg-[#1a1a1a] bg-cover bg-center p-4 text-xs font-black uppercase text-white/35"
                  style={photoUrls[slot] ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(2,6,23,.72)), url(${photoUrls[slot]})` } : undefined}
                >
                  {photoUrls[slot] ? "" : `Photo ${slot + 1}`}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <Panel eyebrow="Availability">
            <div className="flex items-center gap-3 text-lg font-black text-white">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              {isPlayer && roleProfile?.available_for_transfer ? "Available for transfer" : "Open to connect"}
            </div>
          </Panel>

          <Panel eyebrow="Profile Health">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-bold text-white/55">Completeness</span>
              <span className="font-black text-white">{completion}%</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${completion}%` }} />
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Film links", filmLinks.length],
                ["Photos", `${photoUrls.length}/5`],
                ["Visibility", profile.is_public ? "Public" : "Private"]
              ].map(([label, item]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="font-bold text-white/55">{label}</span>
                  <span className="font-black text-white">{item}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Contact">
            <div className="space-y-3">
              {showMessageButton ? (
                <form action={startConversationAction}>
                  <input type="hidden" name="target_profile_id" value={profile.id} />
                  <input type="hidden" name="subject" value={`EuroScout intro with ${profile.display_name}`} />
                  <button className="h-14 w-full rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">Send message</button>
                </form>
              ) : showEditLink ? (
                <Link href="/account" className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                  Edit account
                </Link>
              ) : (
                <Link href="/auth/sign-in" className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                  Sign in to message
                </Link>
              )}
              {showMessagesLink ?? Boolean(showEditLink || showMessageButton) ? (
                <Link href="/messages" className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-sm font-black uppercase text-white/50 transition hover:border-red-500/40 hover:text-white">
                  Messages
                </Link>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </article>
  );
}
