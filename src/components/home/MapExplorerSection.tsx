"use client";

import { useMemo, useState } from "react";
import type { League, Region, Team } from "@/types";
import EuropeMap from "@/components/map/EuropeMap";
import MapLegend from "@/components/map/MapLegend";
import RegionLeagueModal from "@/components/map/RegionLeagueModal";
import FootballNewsCarousel from "@/components/news/FootballNewsCarousel";
import { cn } from "@/lib/utils";

interface MapExplorerSectionProps {
  regions: Region[];
  leagues: League[];
  teams: Team[];
}

export default function MapExplorerSection({ regions, leagues, teams }: MapExplorerSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const selectedLeagues = useMemo(() => {
    if (!selectedRegion) {
      return [];
    }

    return leagues.filter((league) => league.regionIds.includes(selectedRegion.id));
  }, [leagues, selectedRegion]);

  const selectedTeams = useMemo(() => {
    if (!selectedRegion) {
      return [];
    }

    return teams.filter((team) => team.regionId === selectedRegion.id);
  }, [selectedRegion, teams]);

  const availableRegions = regions.map((region) => ({
    ...region,
    leagueCount: leagues.filter((league) => league.regionIds.includes(region.id)).length,
    teamCount: teams.filter((team) => team.regionId === region.id).length
  }));

  const totalLeagues = leagues.length;
  const totalTeams = teams.length;

  return (
    <section id="map-explorer" className="relative overflow-hidden border-y border-red-100/70 bg-slate-50/80 py-8 dark:border-white/10 dark:bg-[#050817] sm:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,.12),transparent_28rem)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,.18),transparent_30rem)]" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(5,8,23,.92),rgba(15,23,42,.98))] dark:block" />
      <div className="relative mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-red dark:text-red-300">Interactive Market Map</p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
              Click a country and open its leagues, teams and regional footprint.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[28rem]">
            {[
              { label: "Countries", value: regions.length },
              { label: "Leagues", value: totalLeagues },
              { label: "Teams", value: totalTeams }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/88 dark:shadow-lg dark:shadow-black/30">
                <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-white/70 bg-white/68 p-3 shadow-[0_30px_100px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/15 dark:bg-slate-900/82 dark:shadow-black/40">
            <div className="overflow-hidden rounded-[1.5rem]">
              <EuropeMap regions={regions} selectedRegionId={selectedRegion?.id} onRegionSelect={setSelectedRegion} />
            </div>
            <div className="mt-3">
              <MapLegend />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/78 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/15 dark:bg-slate-900/92 dark:shadow-2xl dark:shadow-black/40">
              <p className="eyebrow-red dark:text-red-300">Region Explorer</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">
                Countries with seed data are highlighted. Select one to open the league and team overlay.
              </p>
              <div className="region-scroll mt-5 max-h-[25rem] space-y-2 overflow-y-auto pr-1">
                {availableRegions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition",
                      selectedRegion?.id === region.id
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-300/50 dark:bg-red-500/18 dark:text-red-100"
                        : "border-slate-200 bg-white/80 text-slate-950 hover:border-red-200 hover:bg-red-50 dark:border-white/12 dark:bg-white/[0.07] dark:text-slate-100 dark:hover:border-red-300/40 dark:hover:bg-red-500/12"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{region.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-300">
                        {region.leagueCount} leagues / {region.teamCount} teams
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/25 dark:text-red-100">{region.countryCode}</span>
                  </button>
                ))}
              </div>
            </div>

            <FootballNewsCarousel />
          </aside>
        </div>
      </div>

      <RegionLeagueModal region={selectedRegion} leagues={selectedLeagues} teams={selectedTeams} onClose={() => setSelectedRegion(null)} />
    </section>
  );
}
