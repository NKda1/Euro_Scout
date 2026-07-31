"use client";

import { useState } from "react";

interface PlayerMeasureGridProps {
  position?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

function formatHeightImperial(heightCm?: number | null) {
  if (!heightCm) return "Not listed";
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

function formatWeightImperial(weightKg?: number | null) {
  if (!weightKg) return "Not listed";
  return `${Math.round(weightKg * 2.20462)} lb`;
}

export default function PlayerMeasureGrid({ position, age, heightCm, weightKg }: PlayerMeasureGridProps) {
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const isMetric = unitSystem === "metric";
  const measurements = [
    ["Position", position || "Not listed"],
    ["Age", age ?? "Not listed"],
    ["Height", heightCm ? (isMetric ? `${heightCm} cm` : formatHeightImperial(heightCm)) : "Not listed"],
    ["Weight", weightKg ? (isMetric ? `${weightKg} kg` : formatWeightImperial(weightKg)) : "Not listed"]
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/15 dark:bg-[#1a1a1a]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
        <span className="text-xs font-black uppercase text-slate-500 dark:text-white/35">Measurements</span>
        <div className="grid grid-cols-2 border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-black/35">
          {(["metric", "imperial"] as const).map((system) => (
            <button
              key={system}
              type="button"
              onClick={() => setUnitSystem(system)}
              className={`min-h-8 px-2.5 py-1 text-[10px] font-black uppercase transition ${
                unitSystem === system ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-white/45"
              }`}
            >
              {system}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 overflow-hidden">
        {measurements.map(([label, item], index) => (
          <div key={label} className={`px-3 py-2.5 ${index % 2 === 0 ? "border-r border-slate-200 dark:border-white/10" : ""} ${index < 2 ? "border-b border-slate-200 dark:border-white/10" : ""}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/35">{label}</p>
            <p className="mt-1 text-lg font-black leading-6 text-slate-950 dark:text-white">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
