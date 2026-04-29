"use client";

import { useMemo, useState } from "react";
import type { League } from "@/types";
import LeagueCard from "@/components/leagues/LeagueCard";
import SearchBar from "@/components/ui/SearchBar";

export default function LeagueDirectory({ leagues }: { leagues: League[] }) {
  const [query, setQuery] = useState("");

  const filteredLeagues = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) {
      return leagues;
    }

    return leagues.filter((league) =>
      [league.name, league.shortName, league.countryScope, league.description].some((field) =>
        field.toLowerCase().includes(value)
      )
    );
  }, [leagues, query]);

  return (
    <section className="space-y-6">
      <div className="max-w-md">
        <SearchBar value={query} onChange={setQuery} placeholder="Search leagues, countries, tiers..." />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredLeagues.map((league) => (
          <LeagueCard key={league.id} league={league} />
        ))}
      </div>
    </section>
  );
}
