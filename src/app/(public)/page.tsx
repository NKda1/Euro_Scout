import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import MapExplorerSection from "@/components/home/MapExplorerSection";
import EuroNewsSection from "@/components/news/EuroNewsSection";
import { leagues, regions, teams } from "@/lib/data";

export const metadata: Metadata = {
  title: "EuroScout Pro | European American Football Intelligence",
  description: "Explore American football leagues, teams and active markets across Europe with EuroScout Pro."
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <section className="border-b border-slate-200/70 bg-white py-12 dark:border-white/[0.08] dark:bg-[#050817]">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <EuroNewsSection />
        </div>
      </section>
      <MapExplorerSection regions={regions} leagues={leagues} teams={teams} />
    </main>
  );
}
