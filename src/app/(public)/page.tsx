import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import LeagueStatsStrip from "@/components/home/LeagueStatsStrip";
import MapExplorerSection from "@/components/home/MapExplorerSection";
import { leagues, regions, teams } from "@/lib/data";

export const metadata: Metadata = {
  title: "EuroScout Pro | European American Football Intelligence",
  description: "Explore American football leagues, teams and active markets across Europe with EuroScout Pro."
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <MapExplorerSection regions={regions} leagues={leagues} teams={teams} />
      <LeagueStatsStrip regions={regions} leagues={leagues} teams={teams} />
    </main>
  );
}
