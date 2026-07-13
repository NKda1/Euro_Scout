"use client";

import { useState, useEffect } from "react";

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

// Get current season string (e.g., "25/26")
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Season starts in August (month 7)
  if (month >= 7) {
    const currentYear = year.toString().slice(-2);
    const nextYear = (year + 1).toString().slice(-2);
    return `${currentYear}/${nextYear}`;
  } else {
    const prevYear = (year - 1).toString().slice(-2);
    const currentYear = year.toString().slice(-2);
    return `${prevYear}/${currentYear}`;
  }
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
  const [animatedPass, setAnimatedPass] = useState(0);
  const pass = Math.max(0, Math.min(100, valueOrZero(passRunPercentage)));
  const run = 100 - pass;
  const passYards = valueOrZero(passingYards);
  const rushYards = valueOrZero(rushingYards);
  const totalYards = Math.max(1, passYards + rushYards);
  const season = getCurrentSeason();

  // Animate pie chart on mount and mode change
  useEffect(() => {
    setAnimatedPass(0);
    const timer = setTimeout(() => {
      setAnimatedPass(pass);
    }, 100);
    return () => clearTimeout(timer);
  }, [pass, mode]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-red-500">Team Stats</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-white/40">Season {season}</p>
        </div>
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
              className="grid aspect-square place-items-center rounded-full transition-all duration-1000 ease-out"
              style={{ background: `conic-gradient(#ef4444 0 ${animatedPass}%, #2563eb ${animatedPass}% 100%)` }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center dark:bg-[#111]">
                <span className="text-3xl font-black text-slate-950 transition-all duration-1000 dark:text-white">{Math.round(animatedPass)}%</span>
                <span className="-mt-6 text-xs font-black uppercase text-slate-500 dark:text-white/40">Pass</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-500 dark:text-white/40">
                  <span>Pass play</span>
                  <span>{pass}%</span>
                </div>
                <div className="h-3 overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full bg-red-500 transition-all duration-1000 ease-out"
                    style={{ width: `${animatedPass}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs font-black uppercase text-slate-500 dark:text-white/40">
                  <span>Run play</span>
                  <span>{run}%</span>
                </div>
                <div className="h-3 overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full bg-blue-600 transition-all duration-1000 ease-out"
                    style={{ width: `${100 - animatedPass}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "production" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Passing yards", passYards, passYards / totalYards, "text-red-500", "bg-red-500"],
              ["Rushing yards", rushYards, rushYards / totalYards, "text-blue-600", "bg-blue-600"]
            ].map(([label, value, ratio, textColor, bgColor]) => (
              <div key={String(label)} className="border border-slate-200 p-5 transition hover:shadow-md dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-black uppercase ${textColor} dark:opacity-90`}>{label}</p>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30">{season}</span>
                </div>
                <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{formatNumber(Number(value))}</p>
                <div className="mt-4 h-2 overflow-hidden bg-slate-200 dark:bg-white/10">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${bgColor}`}
                    style={{ width: `${Math.round(Number(ratio) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {mode === "summary" ? (
          <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10 sm:grid-cols-3">
            {[
              ["Touchdowns", formatNumber(touchdowns), season],
              ["League rank", leaguePosition ? `#${leaguePosition}` : "—", season],
              ["Open spots", openSpots ? String(openSpots) : "—", "Available"]
            ].map(([label, value, context]) => (
              <div key={label} className="bg-white p-5 transition hover:bg-slate-50 dark:bg-[#111] dark:hover:bg-[#151515]">
                <p className="text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
                <p className="mt-2 text-xs font-bold text-slate-400 dark:text-white/30">{context}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
