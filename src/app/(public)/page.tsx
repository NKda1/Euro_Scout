import HeroSection from "@/components/home/HeroSection";
import LeagueStatsStrip from "@/components/home/LeagueStatsStrip";
import MapExplorerSection from "@/components/home/MapExplorerSection";
import regions from "@/data/regions.seed";
import leagues from "@/data/leagues.seed";
import teams from "@/data/teams.seed";

export default function HomePage() {
  const continentalLeagueCount = leagues.filter((league) => league.tier === "continental").length;

  return (
    <main>
      <HeroSection
        leagueCount={leagues.length}
        teamCount={teams.length}
        regionCount={regions.length}
        continentalLeagueCount={continentalLeagueCount}
      />
      <LeagueStatsStrip regions={regions} leagues={leagues} teams={teams} />
      <MapExplorerSection regions={regions} leagues={leagues} teams={teams} />
    </main>
  );
}
