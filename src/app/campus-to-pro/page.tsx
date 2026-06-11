import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/constants/routes";
import {
  campusPipelines,
  getCampusTeam,
  getCampusTeamsForPipeline,
  isCampusPipeline,
  type CampusPipeline
} from "@/lib/campus-to-pro";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Campus to Pro | EuroScout Pro",
  description: "Track U Sports, CJFL and BUCS players entering the European football market."
};

interface CampusToProPageProps {
  searchParams: Promise<{
    pipeline?: string;
    position?: string;
    conference?: string;
    eligibility?: string;
    passport_ready?: string;
    available?: string;
  }>;
}

interface CampusDbTeam {
  id: string;
  name: string;
  slug: string | null;
  league_id: CampusPipeline | string | null;
  city: string | null;
  country: string | null;
  region_id: string | null;
  recruiting_active: boolean | null;
  claim_status: string | null;
  logo_url: string | null;
}

interface CampusPlayerRow {
  id: string;
  profile_id: string;
  nationality: string | null;
  position: string | null;
  current_team_id: string | null;
  pipeline_type: string | null;
  available_for_transfer: boolean | null;
  passport_ready: boolean | null;
  profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    location: string | null;
    avatar_url: string | null;
  };
  na_background: Array<{
    conference: string | null;
    institution: string | null;
    year_start: number | null;
    year_end: number | null;
  }> | null;
}

const labelClass = "text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400";
const panelClass = "border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111]";

function flagForCountry(country: string | null | undefined) {
  if (country === "United Kingdom") return "GB";
  if (country === "Canada") return "CA";
  return "";
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildQuery(base: Record<string, string | undefined>, next: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries({ ...base, ...next }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export default async function CampusToProPage({ searchParams }: CampusToProPageProps) {
  const sp = await searchParams;
  const activePipeline: CampusPipeline = isCampusPipeline(sp.pipeline) ? sp.pipeline : "usports";
  const pipeline = campusPipelines[activePipeline];
  const baseFilters = {
    pipeline: activePipeline,
    position: sp.position,
    conference: sp.conference,
    eligibility: sp.eligibility,
    passport_ready: sp.passport_ready,
    available: sp.available
  };
  const supabase = await createSupabaseServerClient();

  const [{ data: dbTeams }, { data: players, error: playersError }, { data: userData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, league_id, city, country, region_id, recruiting_active, claim_status, logo_url")
      .eq("league_id", activePipeline)
      .order("name")
      .returns<CampusDbTeam[]>(),
    supabase
      .from("player_profiles")
      .select(
        `id, profile_id, nationality, position, current_team_id, pipeline_type,
         available_for_transfer, passport_ready,
         profiles!inner ( id, display_name, headline, location, avatar_url, is_public, role ),
         na_background ( conference, institution, year_start, year_end )`
      )
      .eq("pipeline_type", activePipeline)
      .eq("profiles.is_public", true)
      .eq("profiles.role", "player")
      .order("updated_at", { ascending: false })
      .returns<CampusPlayerRow[]>(),
    supabase.auth.getUser()
  ]);

  const { data: currentProfile } = userData.user
    ? await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle<{ role: string }>()
    : { data: null };

  const directoryTeams = (dbTeams?.length ? dbTeams : getCampusTeamsForPipeline(activePipeline).map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    league_id: team.leagueId,
    city: team.city,
    country: team.country,
    region_id: team.regionId,
    recruiting_active: true,
    claim_status: "unclaimed",
    logo_url: null
  }))).filter((team) => team.league_id === activePipeline);

  const allPipelinePlayers = players ?? [];
  const positions = Array.from(new Set(allPipelinePlayers.map((player) => player.position).filter(Boolean) as string[])).sort();
  const conferences = Array.from(
    new Set(
      getCampusTeamsForPipeline(activePipeline)
        .map((team) => team.conference)
        .concat(allPipelinePlayers.flatMap((player) => player.na_background?.map((bg) => bg.conference).filter(Boolean) ?? []) as string[])
        .filter(Boolean) as string[]
    )
  ).sort();

  const filteredPlayers = allPipelinePlayers.filter((player) => {
    const backgrounds = player.na_background ?? [];
    const team = getCampusTeam(player.current_team_id);
    const conference = backgrounds.find((bg) => bg.conference)?.conference ?? team?.conference ?? null;
    const endYear = backgrounds.find((bg) => bg.year_end)?.year_end ?? null;

    if (sp.position && player.position !== sp.position) return false;
    if (sp.conference && conference !== sp.conference) return false;
    if (sp.eligibility && String(endYear ?? "") !== sp.eligibility) return false;
    if (sp.passport_ready === "1" && player.passport_ready !== true) return false;
    if (sp.available === "1" && player.available_for_transfer !== true) return false;
    return true;
  });

  return (
    <main className="app-surface min-h-screen">
      <section className="border-b border-slate-200 dark:border-white/10">
        <div className="mx-auto grid max-w-[92rem] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] lg:px-8">
          <div>
            <p className={labelClass}>Campus to Pro</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              North American and UK campus talent, ready for European clubs.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-white/55">
              Browse U Sports, CJFL and BUCS programs, then filter public player profiles by position,
              conference, eligibility year, passport readiness and transfer availability.
            </p>
          </div>
          <div className={`${panelClass} self-end p-5`}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-slate-200 bg-white p-2 dark:border-white/10">
                <Image src={pipeline.logoPath} alt={`${pipeline.label} logo`} width={56} height={56} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <p className={labelClass}>League brief</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{pipeline.label}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-600 dark:text-white/55">
              {pipeline.about}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {Object.values(campusPipelines).map((item) => (
                <Link
                  key={item.id}
                  href={`/campus-to-pro${buildQuery(baseFilters, { pipeline: item.id, position: undefined, conference: undefined, eligibility: undefined })}`}
                  className={`border p-3 text-center transition ${activePipeline === item.id ? "border-red-400 bg-red-500/15 text-red-700 dark:text-red-100" : "border-slate-200 bg-white text-slate-950 hover:border-red-400/40 dark:border-white/10 dark:bg-black/30 dark:text-white"}`}
                >
                  <span className="block text-xl font-black">{item.teamCount}</span>
                  <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">{item.shortLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {Object.values(campusPipelines).map((item) => (
            <Link
              key={item.id}
              href={`/campus-to-pro${buildQuery(baseFilters, { pipeline: item.id, position: undefined, conference: undefined, eligibility: undefined })}`}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-black transition ${activePipeline === item.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-slate-200 text-slate-600 hover:border-red-400/40 hover:text-red-600 dark:border-white/10 dark:text-white/65 dark:hover:text-white"}`}
            >
              <span className="flex h-7 w-7 items-center justify-center bg-white p-1">
                <Image src={item.logoPath} alt="" width={24} height={24} className="max-h-full max-w-full object-contain" />
              </span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className={labelClass}>Team Directory</p>
                <h2 className="mt-2 text-2xl font-black">{pipeline.label}</h2>
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-white/45">{directoryTeams.length} teams</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {directoryTeams.map((team) => {
                const localTeam = getCampusTeam(team.id);
                return (
                  <Link key={team.id} href={`/scouts/${team.id}`} className={`${panelClass} p-4 transition hover:border-red-400/45 hover:bg-slate-50 dark:hover:bg-[#151515]`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-200 bg-slate-100 bg-cover bg-center text-xs font-black text-slate-900 dark:border-white/10 dark:bg-[#1b1b1b] dark:text-white"
                          style={team.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58)), url(${team.logo_url})` } : undefined}
                        >
                          {team.logo_url ? "" : initials(team.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">{localTeam?.conference ?? pipeline.label}</p>
                          <h3 className="mt-2 truncate text-lg font-black text-slate-950 dark:text-white">{team.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">{team.city}, {team.country}</p>
                        </div>
                      </div>
                      <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-black/30 dark:text-white">{flagForCountry(team.country)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                      <span className="border border-slate-200 px-2 py-1 text-slate-500 dark:border-white/10 dark:text-white/45">{team.claim_status === "verified" ? "Verified" : "Available"}</span>
                      {localTeam?.bilingual ? <span className="border border-red-400/30 bg-red-500/10 px-2 py-1 text-red-200">French useful</span> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 md:flex-row md:items-end md:justify-between">
              <div>
                <p className={labelClass}>Player Discovery</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{filteredPlayers.length} public prospects</h2>
              </div>
              {currentProfile?.role === "club" ? (
                <Link href="/watchlists" className="self-start bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700">
                  Open club watchlists
                </Link>
              ) : null}
            </div>

            <form className={`${panelClass} mb-4 grid gap-3 p-4 md:grid-cols-5`} action="/campus-to-pro">
              <input type="hidden" name="pipeline" value={activePipeline} />
              <select name="position" defaultValue={sp.position ?? ""} className="h-11 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white">
                <option value="">All positions</option>
                {positions.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
              <select name="conference" defaultValue={sp.conference ?? ""} className="h-11 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white">
                <option value="">All conferences</option>
                {conferences.map((conference) => <option key={conference} value={conference}>{conference}</option>)}
              </select>
              <input name="eligibility" defaultValue={sp.eligibility ?? ""} placeholder="Eligibility year" className="h-11 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30" />
              <select name="passport_ready" defaultValue={sp.passport_ready ?? ""} className="h-11 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white">
                <option value="">Any passport</option>
                <option value="1">Passport ready</option>
              </select>
              <button className="h-11 bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-950 dark:hover:bg-red-100">
                Filter
              </button>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-white/60 md:col-span-5">
                <input name="available" value="1" type="checkbox" defaultChecked={sp.available === "1"} className="h-4 w-4 rounded border-white/20 text-red-600" />
                Available only
              </label>
            </form>

            {playersError ? (
              <div className="border border-red-500/40 bg-red-500/10 p-5 text-sm font-bold text-red-700 dark:text-red-200">{playersError.message}</div>
            ) : filteredPlayers.length ? (
              <div className="grid gap-3">
                {filteredPlayers.map((player) => {
                  const profile = player.profiles;
                  const team = getCampusTeam(player.current_team_id);
                  const background = player.na_background?.[0];
                  return (
                    <Link key={player.id} href={routes.player(profile.id)} className={`${panelClass} grid grid-cols-[74px_minmax(0,1fr)] transition hover:border-red-400/45 hover:bg-slate-50 dark:hover:bg-[#151515]`}>
                      <div
                        className="flex min-h-24 items-center justify-center border-r border-slate-200 bg-slate-100 bg-cover bg-center text-lg font-black text-slate-900 dark:border-white/10 dark:bg-[#1b1b1b] dark:text-white"
                        style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url(${profile.avatar_url})` } : undefined}
                      >
                        {profile.avatar_url ? "" : initials(profile.display_name)}
                      </div>
                      <div className="min-w-0 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-red-300">{player.position ?? "ATH"}</span>
                          {player.passport_ready ? <span className="border border-green-400/25 bg-green-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-green-200">Passport</span> : null}
                          {player.available_for_transfer ? <span className="border border-red-400/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-200">Available</span> : null}
                        </div>
                        <h3 className="mt-2 truncate text-xl font-black text-slate-950 dark:text-white">{profile.display_name}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                          {background?.institution ?? team?.name ?? "Campus program"} · {background?.conference ?? team?.conference ?? pipeline.label}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={`${panelClass} p-8 text-center`}>
                <h3 className="text-base font-black text-slate-950 dark:text-white">No public campus players found</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/45">Adjust the filters or add campus details from a player account.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
