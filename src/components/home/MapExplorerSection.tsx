"use client";

import { useMemo, useState } from "react";
import type { League, Region, Team } from "@/types";
import EuropeMap from "@/components/map/EuropeMap";
import MapLegend from "@/components/map/MapLegend";
import RegionLeagueModal from "@/components/map/RegionLeagueModal";
import GlassPanel from "@/components/ui/GlassPanel";

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

  const leadingRegions = regions.slice(0, 6).map((region) => ({
    ...region,
    teamCount: teams.filter((team) => team.regionId === region.id).length
  }));

  return (
    <section id="map-explorer" className="bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <GlassPanel className="p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Map Explorer</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Click a country to open its football market.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Regions with seed data are highlighted. The overlay groups leagues and teams so you can jump straight into a league or club profile.
          </p>
          <div className="mt-6 space-y-3">
            {leadingRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegion(region)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-red-200 hover:bg-red-50"
              >
                <span>
                  <span className="block text-sm font-black text-slate-950">{region.name}</span>
                  <span className="block text-xs text-slate-500">{region.teamCount} teams indexed</span>
                </span>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{region.countryCode}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        <div className="space-y-4">
          <EuropeMap regions={regions} selectedRegionId={selectedRegion?.id} onRegionSelect={setSelectedRegion} />
          <MapLegend />
        </div>
      </div>

      <RegionLeagueModal region={selectedRegion} leagues={selectedLeagues} teams={selectedTeams} onClose={() => setSelectedRegion(null)} />
    </section>
  );
}
