"use client";

import { useState } from "react";

interface ClubStatsVisualPanelProps {
  passRunPercentage?: number | null;
  passingYards?: number | null;
  rushingYards?: number | null;
  touchdowns?: number | null;
  leaguePosition?: number | null;
  openSpots?: number | null;
}

function valueOrZero(value?: number | null) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatNumber(value?: number | null) {
  return value == null ? "—" : new Intl.NumberFormat("en-GB").format(value);
}

export default function ClubStatsVisualPanel({
  passRunPercentage,
  passingYards,
  rushingYards,
  touchdowns,
  leaguePosition,
  openSpots
}: ClubStatsVisualPanelProps) {
  const [mode, setMode] = useState<"split" | "production" | "summary">("split");
  const pass = Math.max(0, Math.min(100, valueOrZero(passRunPercentage)));
  const run = 100 - pass;
  const passYards = valueOrZero(passingYards);
  const rushYards = valueOrZero(rushingYards);
  const totalYards = Math.max(1, passYards + rushYards);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-black uppercase text-red-500">Team Stats</p>
        <div className="flex border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
          {[
            ["split", "Run/pass"],
            ["production", "Yards"],
            ["summary", "Summary"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key as "split" | "production" | "summary")}
              className={`h-9 px-3 text-xs font-black uppercase transition ${mode === key ? "bg-red-600 text-white" : "text-slate-500 hover:text-red-600 dark:text-white/45 dark:hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a1a]">
        {mode === "split" ? (
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            <div
              className="grid aspect-square place-items-center rounded-full"
              style={{ background: `conic-gradient(#ef4444 0 ${pass}%, #2563eb ${pass}% 100%)` }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center dark:bg-[#111]">
                <span className="text-3xl font-black text-slate-950 dark:text-white">{pass}%</span>
                <span className="-mt-6 text-xs font-black uppercase text-slate-500 dark:text-white/40">Pass</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-500 dark:text-white/40">
                  <span>Pass play</span>
                  <span>{pass}%</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-white/10"><div className="h-full bg-red-500" style={{ width: `${pass}%` }} /></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-500 dark:text-white/40">
                  <span>Run play</span>
                  <span>{run}%</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-white/10"><div className="h-full bg-blue-600" style={{ width: `${run}%` }} /></div>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "production" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Passing yards", passYards, passYards / totalYards],
              ["Rushing yards", rushYards, rushYards / totalYards]
            ].map(([label, value, ratio]) => (
              <div key={String(label)} className="border border-slate-200 p-4 dark:border-white/10">
                <p className="text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{formatNumber(Number(value))}</p>
                <div className="mt-4 h-2 bg-slate-200 dark:bg-white/10">
                  <div className="h-full bg-red-500" style={{ width: `${Math.round(Number(ratio) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {mode === "summary" ? (
          <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-3">
            {[
              ["Touchdowns", formatNumber(touchdowns)],
              ["League rank", leaguePosition ? `#${leaguePosition}` : "—"],
              ["Open spots", openSpots ? String(openSpots) : "—"]
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-4 dark:bg-[#111]">
                <p className="text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
