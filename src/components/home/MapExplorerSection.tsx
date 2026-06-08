"use client";

import { useMemo, useState } from "react";
import type { League, Region, Team } from "@/types";
import Link from "next/link";
import EuropeMap from "@/components/map/EuropeMap";
import MapLegend from "@/components/map/MapLegend";
import RegionLeagueModal from "@/components/map/RegionLeagueModal";
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
    <section id="map-explorer" className="border-y border-slate-200 bg-white py-10 text-slate-950 dark:border-white/10 dark:bg-[#090909] dark:text-white">
      <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Interactive Market Map</p>
            <h2 className="mt-3 max-w-3xl text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl lg:text-3xl">
              Click a country and open its leagues, teams and regional footprint.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[28rem]">
            {[
              { label: "Countries", value: regions.length, href: "" },
              { label: "Leagues", value: totalLeagues, href: "/leagues" },
              { label: "Teams", value: totalTeams, href: "/teams" }
            ].map((item) => {
              const cardClass = "border border-slate-200 bg-white p-4 text-center transition dark:border-white/10 dark:bg-[#111]";
              const content = (
                <>
                <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                <p className="mt-1 text-[10px] font-black uppercase text-slate-500 dark:text-white/45">{item.label}</p>
                </>
              );

              return item.href ? (
                <Link key={item.label} href={item.href} className={`${cardClass} hover:border-red-300 dark:hover:border-red-500/45`}>
                  {content}
                </Link>
              ) : (
                <div key={item.label} className={cardClass}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#111]">
            <div className="flex-1 overflow-hidden">
              <EuropeMap regions={regions} selectedRegionId={selectedRegion?.id} onRegionSelect={setSelectedRegion} />
            </div>
            <div className="border-t border-slate-200 dark:border-white/10">
              <MapLegend />
            </div>
          </div>

          <aside className="flex flex-col">
            <div className="flex flex-1 flex-col border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Region Explorer</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
                Countries with seed data are highlighted. Select one to open the league and team overlay.
              </p>
              <div className="region-scroll mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
                {availableRegions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition",
                      selectedRegion?.id === region.id
                        ? "border-red-500/50 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100"
                        : "border-slate-200 bg-slate-50 text-slate-950 hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:border-red-500/40 dark:hover:bg-red-500/10"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{region.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-white/45">
                        {region.leagueCount} leagues / {region.teamCount} teams
                      </span>
                    </span>
                    <span className="shrink-0 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-100">{region.countryCode}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <RegionLeagueModal region={selectedRegion} leagues={selectedLeagues} teams={selectedTeams} onClose={() => setSelectedRegion(null)} />
    </section>
  );
}
