"use client";

import { useState } from "react";

const commonNeeds = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P", "Returner"];

interface RosterNeedsBuilderProps {
  name: string;
  defaultValue?: string[];
}

export default function RosterNeedsBuilder({ name, defaultValue = [] }: RosterNeedsBuilderProps) {
  const [needs, setNeeds] = useState<string[]>(Array.from(new Set(defaultValue.filter(Boolean))));
  const [customNeed, setCustomNeed] = useState("");

  function toggleNeed(need: string) {
    setNeeds((current) => current.includes(need) ? current.filter((item) => item !== need) : [...current, need]);
  }

  function addCustomNeed() {
    const value = customNeed.trim();
    if (!value) return;
    setNeeds((current) => Array.from(new Set([...current, value])).slice(0, 12));
    setCustomNeed("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/25">
      <input type="hidden" name={name} value={needs.join("\n")} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {commonNeeds.map((need) => {
          const active = needs.includes(need);
          return (
            <button
              key={need}
              type="button"
              onClick={() => toggleNeed(need)}
              className={`h-10 border px-3 text-xs font-black uppercase transition ${
                active
                  ? "border-red-500 bg-red-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300 dark:border-white/10 dark:bg-black/35 dark:text-white/55"
              }`}
            >
              {need}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={customNeed}
          onChange={(event) => setCustomNeed(event.target.value)}
          placeholder="Add custom roster need"
          className="h-11 border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white"
        />
        <button type="button" onClick={addCustomNeed} className="h-11 bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-950">
          Add need
        </button>
      </div>
      {needs.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {needs.map((need) => (
            <button
              key={need}
              type="button"
              onClick={() => toggleNeed(need)}
              className="border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black uppercase text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200"
            >
              {need} x
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
