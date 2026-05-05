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

function value(item: unknown) {
  if (Array.isArray(item)) {
    return item.length ? item.join(", ") : "Not listed";
  }

  return item ? String(item) : "Not listed";
}

type SummaryField = [string, unknown];

function stringValue(item: unknown) {
  return item ? String(item) : "";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatPipeline(item: unknown) {
  const pipeline = stringValue(item);

  if (!pipeline) {
    return "Open pathway";
  }

  return pipeline.replaceAll("_", " ");
}

function ageFromDob(item: unknown) {
  const dob = stringValue(item);

  if (!dob) {
    return null;
  }

  const birthDate = new Date(dob);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
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
  const primaryTag = profile.role === "player" ? stringValue(roleProfile?.position) || "Player" : roleLabel(profile.role);
  const secondaryTag =
    profile.role === "player"
      ? formatPipeline(roleProfile?.pipeline_type)
      : profile.role === "team_admin"
        ? stringValue(roleProfile?.title) || "Club operations"
        : profile.role === "fan"
          ? "Supporter"
          : stringValue(roleProfile?.organization) || "Talent network";
  const availability = profile.role === "player" && roleProfile?.available_for_transfer ? "Available for transfer" : "Open to connect";
  const location = profile.location ?? currentTeam?.country ?? "Europe";

  const fields: SummaryField[] =
    profile.role === "player"
      ? [
          ["Position", roleProfile?.position],
          ["Nationality", roleProfile?.nationality],
          ["Pipeline", roleProfile?.pipeline_type],
          ["Transfer", roleProfile?.available_for_transfer ? "Available" : "Not listed"]
        ]
      : profile.role === "team_admin"
        ? [
            ["Organization", roleProfile?.organization_name],
            ["Title", roleProfile?.title],
            ["Recruiting", roleProfile?.recruiting_needs]
          ]
        : profile.role === "fan"
          ? [["Interest", profile.headline]]
          : [
              ["Organization", roleProfile?.organization],
              ["Regions", roleProfile?.focus_regions],
              ["Positions", roleProfile?.focus_positions],
              ["Experience", roleProfile?.years_experience ? `${roleProfile.years_experience} years` : null]
            ];

  const combineStats: SummaryField[] =
    profile.role === "player"
      ? [
          ["Height", roleProfile?.height_cm ? `${roleProfile.height_cm} cm` : null],
          ["Weight", roleProfile?.weight_kg ? `${roleProfile.weight_kg} kg` : null],
          ["Age", age],
          ["Position", roleProfile?.position]
        ]
      : [
          ["Role", roleLabel(profile.role)],
          ["Location", location],
          ["Status", availability],
          ["Visibility", profile.is_public ? "Public" : "Private"]
        ];

  return (
    <article className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_8%_10%,rgba(239,68,68,.16),transparent_26rem),linear-gradient(135deg,#ffffff_0%,#fff7f7_42%,#fee2e2_100%)] px-5 py-6 dark:bg-[radial-gradient(circle_at_8%_10%,rgba(239,68,68,.28),transparent_26rem),linear-gradient(135deg,#020617_0%,#0f172a_48%,#2a0f14_100%)] sm:px-8 lg:px-10">
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(135deg,rgba(220,38,38,.08)_1px,transparent_1px)] [background-size:30px_30px] dark:opacity-30" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href={backHref} className="inline-flex w-fit items-center rounded-full border border-red-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 shadow-sm backdrop-blur-xl transition hover:bg-red-50 dark:border-white/10 dark:bg-white/10 dark:text-red-200 dark:hover:bg-red-500/10">
              {backLabel}
            </Link>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-red-600/20">
              <span className="h-2 w-2 rounded-full bg-white" />
              {availability}
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-end">
              <div className="relative flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-slate-950 text-6xl font-black tracking-tight text-white shadow-2xl shadow-red-100 ring-4 ring-red-500 dark:shadow-red-950/40">
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,.35),transparent_48%)]" />
                <span className="relative">{initials(profile.display_name)}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-red-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 shadow-sm backdrop-blur-xl dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{primaryTag}</span>
                  <span className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-800 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-100">{secondaryTag}</span>
                </div>
                <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight text-slate-950 dark:text-white sm:text-7xl">{profile.display_name}</h1>
                <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
                  {location}
                  {currentTeam ? ` · ${currentTeam.name}` : ""}
                  {profile.headline ? ` · ${profile.headline}` : ""}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-white/10">
                {combineStats.map(([label, item]) => (
                  <div key={label} className="bg-white/88 p-4 dark:bg-slate-950/70">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{value(item)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="border-y border-red-100 bg-white/70 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {fields.map(([label, item]) => (
              <span key={label} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                <span className="font-black uppercase tracking-wide text-slate-400">{label}</span> {value(item)}
              </span>
            ))}
          </div>
          <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">{profile.is_public ? "Public profile" : "Private profile"}</span>
        </div>
      </div>

      <div className="grid gap-8 bg-slate-50/80 p-5 dark:bg-slate-950/70 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
        <main className="space-y-8">
          {profile.role === "player" ? <HudlFilmViewer filmLinks={filmLinks} /> : null}

          <section className="border-l-4 border-red-600 pl-6">
            <p className="eyebrow-red">Scouting Notes</p>
            <p className="mt-5 max-w-4xl text-2xl font-black leading-snug tracking-tight text-slate-950 dark:text-white">
              {profile.bio ?? "This profile is ready for more detail. Add background, goals, recruitment context and contact preferences from account edit."}
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow-red">Photos</p>
              <span className="text-xs font-bold text-slate-400">Up to 5</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex aspect-[4/5] items-end overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white/75 bg-cover bg-center p-3 text-xs font-black uppercase tracking-wide text-slate-400 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  style={photoUrls[item - 1] ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(2,6,23,.72)), url(${photoUrls[item - 1]})` } : undefined}
                >
                  {photoUrls[item - 1] ? "" : `Photo ${item}`}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <p className="eyebrow-red">Career Timeline</p>
              <div className="mt-5 space-y-4 border-l border-red-200 pl-5 dark:border-red-400/30">
                {[
                  ["North American background", formatPipeline(roleProfile?.pipeline_type)],
                  ["Current European team", currentTeam?.name ?? "Unlisted"],
                  ["Current league", currentLeague?.name ?? "Unlisted"],
                  ["BUCS / university", profile.headline ?? "Not listed"]
                ].map(([label, item]) => (
                  <div key={label} className="relative">
                    <span className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100 dark:ring-red-500/15" />
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
              <p className="eyebrow-red">Performance Snapshot</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {["Games", "Starts", "Impact", "Reports"].map((label) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">--</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
            <p className="eyebrow-red">Availability</p>
            <div className="mt-5 flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white">
              <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
              {availability}
            </div>
            {currentTeam ? (
              <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Current organization</p>
                <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{currentTeam.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{currentTeam.city}, {currentTeam.country}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
            <p className="eyebrow-red">Profile Health</p>
            <div className="mt-5 space-y-4">
              {[
                ["Completeness", `${Math.min(100, 35 + fields.filter(([, item]) => Boolean(item)).length * 12 + filmLinks.length * 10 + photoUrls.length * 5)}%`],
                ["Film links", filmLinks.length],
                ["Photos", `${photoUrls.length}/5`],
                ["Verified", "Pending"]
              ].map(([label, item]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm last:border-b-0 last:pb-0 dark:border-white/10">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-black text-slate-950 dark:text-white">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
            <p className="eyebrow-red">Contact</p>
            <div className="mt-5 space-y-3">
              {showMessageButton ? (
                <form action={startConversationAction}>
                  <input type="hidden" name="target_profile_id" value={profile.id} />
                  <input type="hidden" name="subject" value={`EuroScout intro with ${profile.display_name}`} />
                  <button className="h-14 w-full rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-red-700">Send message</button>
                </form>
              ) : showEditLink ? (
                <Link href="/account/edit" className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-red-700">
                  Edit profile
                </Link>
              ) : (
                <Link href="/auth/sign-in" className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-red-700">
                  Sign in to message
                </Link>
              )}
              {showMessagesLink ?? Boolean(showEditLink || showMessageButton) ? (
                <Link href="/messages" className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 text-sm font-black uppercase tracking-[0.14em] text-slate-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                  Messages
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
