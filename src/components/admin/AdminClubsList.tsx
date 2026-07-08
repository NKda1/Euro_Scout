"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { adminDeleteClubAction, adminReleaseClubToSeedAction, adminUpdateClubAction } from "@/app/actions/admin";
import { leagues } from "@/lib/data";
import { europeanCountries, regionForEuropeanCountry } from "@/lib/europe";

export interface AdminClubRow {
  id: string;
  name: string;
  slug: string;
  league_id: string;
  region_id: string | null;
  city: string;
  country: string;
  division: string | null;
  stadium: string | null;
  logo_url: string | null;
  tier: number | null;
  claim_status: string | null;
  verified: boolean | null;
  website: string | null;
  contact_email: string | null;
  open_roster_spots: number | null;
  recruiting_active: boolean | null;
  updated_at: string;
}

interface AdminClubsListProps {
  clubs: AdminClubRow[];
  memberCounts: Record<string, number>;
}

const inputClass = "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/25 dark:text-white";
const labelClass = "mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35";
const textareaClass = "w-full border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/25 dark:text-white";

function leagueLabel(leagueId: string) {
  const league = leagues.find((item) => item.id === leagueId);
  return league?.shortName ?? league?.name ?? leagueId;
}

function ClubEditFields({ club }: { club: AdminClubRow }) {
  const derivedRegion = regionForEuropeanCountry(club.country);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="team_id" value={club.id} />
      <label>
        <span className={labelClass}>Club name</span>
        <input name="name" required defaultValue={club.name} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>City</span>
        <input name="city" required defaultValue={club.city} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Country / SVG region</span>
        <select name="country" required defaultValue={club.country} className={inputClass}>
          <option value="">Select country</option>
          {europeanCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>League</span>
        <select name="league_id" required defaultValue={club.league_id} className={inputClass}>
          <option value="">Select league</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Division</span>
        <input name="division" defaultValue={club.division ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Stadium</span>
        <input name="stadium" defaultValue={club.stadium ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Tier</span>
        <select name="tier" defaultValue={club.tier ?? ""} className={inputClass}>
          <option value="">Auto / market tier</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
          <option value="4">Tier 4</option>
        </select>
      </label>
      <label>
        <span className={labelClass}>Status</span>
        <select name="claim_status" defaultValue={club.claim_status ?? "unclaimed"} className={inputClass}>
          <option value="unclaimed">Unclaimed</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="disputed">Disputed</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label>
        <span className={labelClass}>Website</span>
        <input name="website" type="url" defaultValue={club.website ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Contact email</span>
        <input name="contact_email" type="email" defaultValue={club.contact_email ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Open roster spots</span>
        <input name="open_roster_spots" type="number" min={0} max={99} defaultValue={club.open_roster_spots ?? 0} className={inputClass} />
      </label>
      <label className="flex h-11 items-center gap-3 self-end border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-slate-200">
        <input name="recruiting_active" type="checkbox" defaultChecked={Boolean(club.recruiting_active)} className="h-4 w-4 accent-red-600" />
        Recruiting active
      </label>
      <label className="md:col-span-2 xl:col-span-4">
        <span className={labelClass}>Logo URL</span>
        <input name="logo_url" type="url" defaultValue={club.logo_url ?? ""} className={inputClass} />
      </label>
      <p className="text-xs font-bold text-slate-500 dark:text-white/40 md:col-span-2 xl:col-span-4">
        Current stored region: {club.region_id ?? "not set"}. Country maps to: {derivedRegion?.name ?? "outside Europe"}.
      </p>
    </div>
  );
}

export default function AdminClubsList({ clubs, memberCounts }: AdminClubsListProps) {
  const [query, setQuery] = useState("");
  const [leagueId, setLeagueId] = useState("all");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");
  const [mapStatus, setMapStatus] = useState("all");
  const [recruiting, setRecruiting] = useState("all");

  const countries = useMemo(() => Array.from(new Set(clubs.map((club) => club.country).filter(Boolean))).sort(), [clubs]);
  const statuses = useMemo(() => Array.from(new Set(clubs.map((club) => club.claim_status ?? "unclaimed"))).sort(), [clubs]);

  const filteredClubs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clubs.filter((club) => {
      const searchable = [club.name, club.city, club.country, club.division, leagueLabel(club.league_id), club.claim_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const isInEuropeanMap = Boolean(regionForEuropeanCountry(club.country));

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (leagueId === "all" || club.league_id === leagueId) &&
        (country === "all" || club.country === country) &&
        (status === "all" || (club.claim_status ?? "unclaimed") === status) &&
        (mapStatus === "all" || (mapStatus === "map" ? isInEuropeanMap : !isInEuropeanMap)) &&
        (recruiting === "all" || (recruiting === "active" ? club.recruiting_active : !club.recruiting_active))
      );
    });
  }, [clubs, country, leagueId, mapStatus, query, recruiting, status]);

  function resetFilters() {
    setQuery("");
    setLeagueId("all");
    setCountry("all");
    setStatus("all");
    setMapStatus("all");
    setRecruiting("all");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">Existing Clubs</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {filteredClubs.length} of {clubs.length} club records
          </h2>
        </div>
        <Link href="/teams" className="border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200">
          View team directory
        </Link>
      </div>

      <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_0.9fr_auto]">
          <label>
            <span className={labelClass}>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Club, city, country, league..." className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>League</span>
            <select value={leagueId} onChange={(event) => setLeagueId(event.target.value)} className={inputClass}>
              <option value="all">All leagues</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)} className={inputClass}>
              <option value="all">All countries</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
              <option value="all">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Map</span>
            <select value={mapStatus} onChange={(event) => setMapStatus(event.target.value)} className={inputClass}>
              <option value="all">All clubs</option>
              <option value="map">On Europe map</option>
              <option value="outside">Outside map</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>Recruiting</span>
            <select value={recruiting} onChange={(event) => setRecruiting(event.target.value)} className={inputClass}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="h-11 self-end border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:text-slate-200">
            Reset
          </button>
        </div>
      </div>

      {filteredClubs.map((club) => (
        <details key={club.id} className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
          <summary className="cursor-pointer list-none p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xl font-black text-slate-950 dark:text-white">{club.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                  {club.city}, {club.country} / {leagueLabel(club.league_id)} / {club.claim_status ?? "unclaimed"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                  {memberCounts[club.id] ?? 0} members
                </span>
                {club.recruiting_active ? (
                  <span className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Recruiting
                  </span>
                ) : null}
                <Link href={`/scouts/${club.id}`} className="border border-red-200 bg-red-50 px-3 py-1 text-xs font-black uppercase text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  Public profile
                </Link>
              </div>
            </div>
          </summary>
          <div className="border-t border-slate-200 p-5 dark:border-white/10">
            <form action={adminUpdateClubAction} className="space-y-4">
              <ClubEditFields club={club} />
              <button className="h-11 bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                Save changes
              </button>
            </form>
            <form action={adminReleaseClubToSeedAction} className="mt-6 border-t border-amber-200 pt-5 dark:border-amber-500/25">
              <input type="hidden" name="team_id" value={club.id} />
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                Release keeps the seeded club record, league, country, city and slug, but clears dummy ownership, staff, invites, messages, calls, watchlists, media, analytics and claim state.
              </div>
              <label>
                <span className={labelClass}>Release confirmation</span>
                <textarea name="confirmation" rows={2} placeholder="Type RELEASE CLUB" className={textareaClass} />
              </label>
              <button className="mt-3 h-11 border border-amber-300 px-5 text-sm font-black uppercase text-amber-800 transition hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-100 dark:hover:bg-amber-500/10">
                Release back to seed state
              </button>
            </form>
            <form action={adminDeleteClubAction} className="mt-6 border-t border-red-200 pt-5 dark:border-red-500/25">
              <input type="hidden" name="team_id" value={club.id} />
              <label>
                <span className={labelClass}>Delete confirmation</span>
                <textarea name="confirmation" rows={2} placeholder="Type DELETE CLUB" className={textareaClass} />
              </label>
              <button className="mt-3 h-11 border border-red-300 px-5 text-sm font-black uppercase text-red-700 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10">
                Delete club and related club data
              </button>
            </form>
          </div>
        </details>
      ))}

      {!filteredClubs.length ? (
        <div className="border border-dashed border-slate-300 bg-white p-6 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-[#111] dark:text-white/45">
          No club records match those filters.
        </div>
      ) : null}
    </section>
  );
}
