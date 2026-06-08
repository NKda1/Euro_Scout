"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ActiveFilters {
  position?: string;
  nationality?: string;
  available?: string;
  pipeline?: string;
  tier?: string;
  passport_ready?: string;
}

interface PlayerFiltersProps {
  nationalities: string[];
  activeFilters: ActiveFilters;
}

const POSITIONS = [
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P", "LS",
  "OT", "OG", "C", "DE", "DT", "MLB", "OLB", "ILB", "FS", "SS", "DB", "Athlete"
].sort();

const PIPELINE_TYPES: Array<{ value: string; label: string }> = [
  { value: "pro", label: "Professional" },
  { value: "semi_pro", label: "Semi-Pro" },
  { value: "clubs", label: "Clubs" },
  { value: "na_import", label: "NA Import" }
];

const TIERS: Array<{ value: string; label: string }> = [
  { value: "1", label: "Tier 1 — Top" },
  { value: "2", label: "Tier 2 — Second" },
  { value: "3", label: "Tier 3 — Development" },
  { value: "4", label: "Tier 4 — Entry" }
];

export default function PlayerFilters({ nationalities, activeFilters }: PlayerFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/players?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push("/players");
  }, [router]);

  const activeCount = [
    activeFilters.position,
    activeFilters.nationality,
    activeFilters.available,
    activeFilters.pipeline,
    activeFilters.tier,
    activeFilters.passport_ready
  ].filter(Boolean).length;

  return (
    <div className="mb-5 border border-white/10 bg-[#111] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Filters</p>
          {activeCount > 0 && (
            <p className="mt-1 text-xs font-bold text-white/35">
              {activeCount} active filter{activeCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-black text-white/45 transition hover:text-red-300"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {/* Position */}
        <select
          value={activeFilters.position ?? ""}
          onChange={(e) => setFilter("position", e.target.value || null)}
          className="h-10 border border-white/10 bg-black/35 px-3 text-sm font-black text-white outline-none transition focus:border-red-500"
        >
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Nationality */}
        <select
          value={activeFilters.nationality ?? ""}
          onChange={(e) => setFilter("nationality", e.target.value || null)}
          className="h-10 border border-white/10 bg-black/35 px-3 text-sm font-black text-white outline-none transition focus:border-red-500"
        >
          <option value="">All nationalities</option>
          {nationalities.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* Pipeline type */}
        <select
          value={activeFilters.pipeline ?? ""}
          onChange={(e) => setFilter("pipeline", e.target.value || null)}
          className="h-10 border border-white/10 bg-black/35 px-3 text-sm font-black text-white outline-none transition focus:border-red-500"
        >
          <option value="">All pipelines</option>
          {PIPELINE_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>{pt.label}</option>
          ))}
        </select>

        {/* League tier */}
        <select
          value={activeFilters.tier ?? ""}
          onChange={(e) => setFilter("tier", e.target.value || null)}
          className="h-10 border border-white/10 bg-black/35 px-3 text-sm font-black text-white outline-none transition focus:border-red-500"
        >
          <option value="">All tiers</option>
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Available toggle */}
        <button
          type="button"
          onClick={() => setFilter("available", activeFilters.available === "1" ? null : "1")}
          className={`h-10 border px-4 text-sm font-black transition ${
            activeFilters.available === "1"
              ? "border-red-400 bg-red-600 text-white"
              : "border-white/10 bg-black/35 text-white hover:border-red-500/45"
          }`}
        >
          Available only
        </button>

        {/* Passport ready toggle */}
        <button
          type="button"
          onClick={() => setFilter("passport_ready", activeFilters.passport_ready === "1" ? null : "1")}
          className={`h-10 border px-4 text-sm font-black transition ${
            activeFilters.passport_ready === "1"
              ? "border-red-400 bg-red-600 text-white"
              : "border-white/10 bg-black/35 text-white hover:border-red-500/45"
          }`}
        >
          Passport ready
        </button>
      </div>
    </div>
  );
}
