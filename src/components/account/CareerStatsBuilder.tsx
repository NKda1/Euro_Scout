"use client";

import { useMemo, useState } from "react";

type CareerStats = Record<string, number | string>;

interface CareerStatsBuilderProps {
  name: string;
  position?: string | null;
  defaultValue?: CareerStats | null;
}

const statGroups: Record<string, Array<{ key: string; label: string; max: number; step?: number; unit?: string }>> = {
  QB: [
    { key: "passing_yards", label: "Passing yards", max: 8000, step: 25, unit: "yds" },
    { key: "passing_touchdowns", label: "Passing TDs", max: 80, unit: "TD" },
    { key: "completion_percentage", label: "Completion", max: 100, step: 0.1, unit: "%" },
    { key: "interceptions", label: "Interceptions", max: 40 },
    { key: "rushing_yards", label: "Rushing yards", max: 2500, step: 25, unit: "yds" }
  ],
  WR: [
    { key: "receptions", label: "Receptions", max: 180 },
    { key: "targets", label: "Targets", max: 240 },
    { key: "receiving_yards", label: "Receiving yards", max: 3000, step: 25, unit: "yds" },
    { key: "touchdowns", label: "Touchdowns", max: 40, unit: "TD" }
  ],
  TE: [
    { key: "receptions", label: "Receptions", max: 150 },
    { key: "targets", label: "Targets", max: 200 },
    { key: "receiving_yards", label: "Receiving yards", max: 2500, step: 25, unit: "yds" },
    { key: "touchdowns", label: "Touchdowns", max: 35, unit: "TD" }
  ],
  RB: [
    { key: "carries", label: "Carries", max: 350 },
    { key: "rushing_yards", label: "Rushing yards", max: 3000, step: 25, unit: "yds" },
    { key: "receptions", label: "Receptions", max: 120 },
    { key: "touchdowns", label: "Touchdowns", max: 45, unit: "TD" }
  ],
  DB: [
    { key: "tackles", label: "Tackles", max: 180 },
    { key: "interceptions", label: "Picks", max: 20 },
    { key: "pass_breakups", label: "PBUs", max: 40 },
    { key: "touchdowns", label: "Touchdowns", max: 12, unit: "TD" }
  ],
  LB: [
    { key: "tackles", label: "Tackles", max: 220 },
    { key: "sacks", label: "Sacks", max: 35, step: 0.5 },
    { key: "tackles_for_loss", label: "TFLs", max: 50, step: 0.5 },
    { key: "forced_fumbles", label: "Forced fumbles", max: 15 }
  ],
  DL: [
    { key: "tackles", label: "Tackles", max: 160 },
    { key: "sacks", label: "Sacks", max: 35, step: 0.5 },
    { key: "tackles_for_loss", label: "TFLs", max: 50, step: 0.5 },
    { key: "forced_fumbles", label: "Forced fumbles", max: 15 }
  ],
  OL: [
    { key: "games_started", label: "Games started", max: 80 },
    { key: "sacks_allowed", label: "Sacks allowed", max: 40, step: 0.5 },
    { key: "pressures_allowed", label: "Pressures allowed", max: 80 },
    { key: "penalties", label: "Penalties", max: 40 }
  ],
  K: [
    { key: "field_goal_percentage", label: "FG made", max: 100, step: 0.1, unit: "%" },
    { key: "extra_point_percentage", label: "XP made", max: 100, step: 0.1, unit: "%" },
    { key: "longest_field_goal", label: "Long FG", max: 70, unit: "yd" },
    { key: "touchbacks", label: "Touchbacks", max: 120 }
  ],
  P: [
    { key: "punt_average", label: "Punt average", max: 60, step: 0.1, unit: "yd" },
    { key: "inside_20", label: "Inside 20", max: 80 },
    { key: "longest_punt", label: "Long punt", max: 90, unit: "yd" },
    { key: "touchbacks", label: "Touchbacks", max: 40 }
  ]
};

function groupForPosition(position?: string | null) {
  const clean = String(position ?? "").toUpperCase();
  if (clean.includes("QB")) return "QB";
  if (clean.includes("WR")) return "WR";
  if (clean.includes("TE")) return "TE";
  if (clean.includes("RB")) return "RB";
  if (clean.includes("DB") || clean.includes("CB") || clean.includes("S")) return "DB";
  if (clean.includes("LB")) return "LB";
  if (clean.includes("DL") || clean.includes("DE") || clean.includes("DT") || clean.includes("EDGE")) return "DL";
  if (clean.includes("OL") || clean.includes("OT") || clean.includes("OG") || clean.includes("C")) return "OL";
  if (clean.includes("K")) return "K";
  if (clean.includes("P")) return "P";
  return "WR";
}

export default function CareerStatsBuilder({ name, position, defaultValue }: CareerStatsBuilderProps) {
  const [group, setGroup] = useState(groupForPosition(position));
  const [stats, setStats] = useState<CareerStats>(() => defaultValue ?? {});
  const fields = statGroups[group] ?? statGroups.WR;
  const serialized = useMemo(() => JSON.stringify(stats), [stats]);

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <input type="hidden" name={name} value={serialized} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">Career stats</p>
          <p className="mt-1 text-xs font-semibold text-white/40">Pick a position group and use sliders for season or career totals.</p>
        </div>
        <select value={group} onChange={(event) => setGroup(event.target.value)} className="h-10 border border-white/10 bg-black px-3 text-xs font-black text-white">
          {Object.keys(statGroups).map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const value = Number(stats[field.key] ?? 0);
          return (
            <label key={field.key} className="block border border-white/10 bg-black/25 p-3">
              <span className="text-xs font-black uppercase text-white/40">{field.label}</span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={field.max}
                  step={field.step ?? 1}
                  value={Number.isFinite(value) ? value : 0}
                  onChange={(event) => setStats((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                  className="h-2 flex-1 accent-red-600"
                />
                <span className="w-20 text-right text-sm font-black text-white">
                  {Number.isFinite(value) ? value : 0}{field.unit ? ` ${field.unit}` : ""}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
