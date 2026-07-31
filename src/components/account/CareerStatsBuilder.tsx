"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  normaliseSeasonStats,
  POSITION_GROUPS,
  POSITION_STAT_FIELDS,
  positionGroupFor,
  statsPayload,
  type SeasonStatRow
} from "@/lib/player-stats";

interface CareerStatsBuilderProps {
  name: string;
  position?: string | null;
  defaultValue?: Record<string, unknown> | null;
}

function newSeason(position?: string | null): SeasonStatRow {
  return {
    id: `season-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    club: "",
    season: "",
    games: null,
    positionGroup: positionGroupFor(position),
    stats: {}
  };
}

const inputClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/30 dark:text-white";

export default function CareerStatsBuilder({ name, position, defaultValue }: CareerStatsBuilderProps) {
  const [seasons, setSeasons] = useState<SeasonStatRow[]>(() => normaliseSeasonStats(defaultValue, position));
  const serialized = useMemo(() => JSON.stringify(statsPayload(seasons)), [seasons]);

  function updateSeason(id: string, update: Partial<SeasonStatRow>) {
    setSeasons((current) => current.map((season) => season.id === id ? { ...season, ...update } : season));
  }

  function updateStat(id: string, key: string, value: string) {
    setSeasons((current) => current.map((season) => {
      if (season.id !== id) return season;
      const stats = { ...season.stats };
      if (value === "") delete stats[key];
      else stats[key] = Math.max(0, Number(value));
      return { ...season, stats };
    }));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">Season statistics</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-white/40">One row per club season. Columns adapt to the position group.</p>
        </div>
        <button
          type="button"
          onClick={() => setSeasons((current) => [...current, newSeason(position)])}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add season
        </button>
      </div>

      {seasons.length ? (
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {seasons.map((season, index) => {
            const fields = POSITION_STAT_FIELDS[season.positionGroup] ?? POSITION_STAT_FIELDS.WR;
            return (
              <fieldset key={season.id} className="p-4">
                <legend className="sr-only">Season {index + 1}</legend>
                <div className="grid gap-2 sm:grid-cols-[minmax(150px,1.2fr)_120px_86px_88px_auto] sm:items-end">
                  <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">Club</span>
                    <input value={season.club} onChange={(event) => updateSeason(season.id, { club: event.target.value })} placeholder="Rhein Fire" className={inputClass} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">Season</span>
                    <input value={season.season} onChange={(event) => updateSeason(season.id, { season: event.target.value })} placeholder="2025/26" className={inputClass} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">Games</span>
                    <input type="number" min={0} max={99} value={season.games ?? ""} onChange={(event) => updateSeason(season.id, { games: event.target.value === "" ? null : Number(event.target.value) })} className={inputClass} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">Group</span>
                    <select value={season.positionGroup} onChange={(event) => updateSeason(season.id, { positionGroup: event.target.value, stats: {} })} className={inputClass}>
                      {POSITION_GROUPS.map((group) => <option key={group}>{group}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setSeasons((current) => current.filter((item) => item.id !== season.id))} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-500 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> <span className="sm:sr-only">Remove season</span>
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {fields.map((field) => (
                    <label key={field.key}>
                      <span className="mb-1 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-white/35" title={field.label}>{field.shortLabel ?? field.label}</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={field.step ?? 1}
                          value={season.stats[field.key] ?? ""}
                          onChange={(event) => updateStat(season.id, field.key, event.target.value)}
                          className={`${inputClass} ${field.unit ? "pr-9" : ""}`}
                        />
                        {field.unit ? <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-black text-slate-400">{field.unit}</span> : null}
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-black text-slate-700 dark:text-white/70">No seasons added</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/35">Add only verified statistics. You can return to this later.</p>
        </div>
      )}
    </div>
  );
}
