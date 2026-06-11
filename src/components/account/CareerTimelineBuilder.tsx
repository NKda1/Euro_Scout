"use client";

import { useMemo, useState } from "react";
import { campusPipelines, campusTeams } from "@/lib/campus-to-pro";
import { teams } from "@/lib/data";

export interface CareerTimelineDraft {
  id?: string;
  team_id?: string | null;
  team_name: string;
  league_name?: string | null;
  country?: string | null;
  position?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean | null;
}

interface CareerTimelineBuilderProps {
  entries: CareerTimelineDraft[];
  onChange?: (entries: CareerTimelineDraft[]) => void;
  name?: string;
}

interface TeamOption {
  id: string;
  name: string;
  leagueName: string;
  country: string;
  group: string;
}

const inputClass = "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";
const labelClass = "mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/35";

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalise(entries: CareerTimelineDraft[]) {
  return entries.map((entry) => ({
    team_name: entry.team_name,
    team_id: entry.team_id ?? null,
    league_name: entry.league_name ?? null,
    country: entry.country ?? null,
    position: entry.position ?? null,
    start_year: entry.start_year ?? null,
    end_year: entry.is_current ? null : entry.end_year ?? null,
    is_current: Boolean(entry.is_current)
  }));
}

export default function CareerTimelineBuilder({ entries, onChange, name }: CareerTimelineBuilderProps) {
  const [localEntries, setLocalEntries] = useState<CareerTimelineDraft[]>(entries.length ? entries : []);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [position, setPosition] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  const teamOptions = useMemo<TeamOption[]>(() => [
    ...campusTeams.map((team) => ({
      id: team.id,
      name: team.name,
      leagueName: campusPipelines[team.leagueId].label,
      country: team.country,
      group: "Campus to Pro"
    })),
    ...teams.map((team) => ({
      id: team.id,
      name: team.name,
      leagueName: team.leagueId,
      country: team.country,
      group: "European clubs"
    }))
  ], []);

  const selectedTeam = teamOptions.find((team) => team.id === selectedTeamId);
  const sortedEntries = [...localEntries].sort((a, b) => (a.start_year ?? 0) - (b.start_year ?? 0));
  const jsonValue = JSON.stringify(normalise(localEntries));

  function commit(nextEntries: CareerTimelineDraft[]) {
    setLocalEntries(nextEntries);
    onChange?.(nextEntries);
  }

  function resetDraft() {
    setSelectedTeamId("");
    setCustomTeam("");
    setPosition("");
    setStartYear("");
    setEndYear("");
    setIsCurrent(false);
  }

  function addEntry() {
    const teamName = selectedTeam?.name ?? customTeam.trim();
    if (!teamName) return;

    commit([
      ...localEntries,
      {
        team_name: teamName,
        team_id: selectedTeam?.id ?? null,
        league_name: selectedTeam?.leagueName ?? null,
        country: selectedTeam?.country ?? null,
        position: position.trim() || null,
        start_year: toNumber(startYear),
        end_year: isCurrent ? null : toNumber(endYear),
        is_current: isCurrent
      }
    ]);
    resetDraft();
  }

  function removeEntry(indexToRemove: number) {
    commit(localEntries.filter((_, index) => index !== indexToRemove));
  }

  return (
    <div className="space-y-4">
      {name ? <input type="hidden" name={name} value={jsonValue} /> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.35fr)_repeat(3,minmax(120px,0.7fr))_auto]">
        <label className="block">
          <span className={labelClass}>Team</span>
          <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className={inputClass}>
            <option value="">Select team</option>
            <option value="__custom">Add unlisted team</option>
            <optgroup label="Campus to Pro">
              {teamOptions.filter((team) => team.group === "Campus to Pro").map((team) => (
                <option key={team.id} value={team.id}>{team.name} - {team.leagueName}</option>
              ))}
            </optgroup>
            <optgroup label="European clubs">
              {teamOptions.filter((team) => team.group === "European clubs").map((team) => (
                <option key={team.id} value={team.id}>{team.name} - {team.country}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Position</span>
          <input value={position} onChange={(event) => setPosition(event.target.value.toUpperCase())} placeholder="QB" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>From</span>
          <input type="number" min="2000" max="2035" value={startYear} onChange={(event) => setStartYear(event.target.value)} placeholder="2023" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>To</span>
          <input type="number" min="2000" max="2035" value={endYear} onChange={(event) => setEndYear(event.target.value)} placeholder="2026" disabled={isCurrent} className={inputClass} />
        </label>
        <button type="button" onClick={addEntry} className="mt-5 h-11 bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
          Add
        </button>
      </div>

      {selectedTeamId === "__custom" ? (
        <label className="block">
          <span className={labelClass}>Unlisted team name</span>
          <input value={customTeam} onChange={(event) => setCustomTeam(event.target.value)} placeholder="Team name" className={inputClass} />
        </label>
      ) : null}

      <label className="flex h-11 items-center gap-3 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-black/35 dark:text-white/70">
        <input type="checkbox" checked={isCurrent} onChange={(event) => setIsCurrent(event.target.checked)} className="h-4 w-4 rounded border-white/20 text-red-600" />
        Current team
      </label>

      {sortedEntries.length ? (
        <div className="grid gap-2">
          {sortedEntries.map((entry) => {
            const originalIndex = localEntries.indexOf(entry);
            return (
              <div key={`${entry.team_name}-${entry.start_year}-${originalIndex}`} className="grid gap-3 border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-white">{entry.team_name}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/35">
                    {[entry.position, entry.league_name, entry.country].filter(Boolean).join(" / ") || "Career stop"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-500 dark:text-white/55">
                    {entry.start_year ?? "----"} - {entry.is_current ? "Present" : entry.end_year ?? "----"}
                  </span>
                  <button type="button" onClick={() => removeEntry(originalIndex)} className="border border-red-500/40 px-3 py-1.5 text-xs font-black text-red-300 transition hover:bg-red-600 hover:text-white">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-white/15 dark:bg-black/20 dark:text-white/35">
          Add each team in order to build your public career line.
        </div>
      )}
    </div>
  );
}
