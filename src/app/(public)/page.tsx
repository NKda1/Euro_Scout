import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import MapExplorerSection from "@/components/home/MapExplorerSection";
import EuroNewsSection from "@/components/news/EuroNewsSection";
import { getCachedHomeMapData } from "@/lib/public-cache";

export const metadata: Metadata = {
  title: {
    absolute: "EuroScout Pro | European American Football Intelligence"
  },
  description:
    "Discover European American football teams, player profiles, film, recruiting signals and league intelligence on EuroScout Pro.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "EuroScout Pro | European American Football Intelligence",
    description:
      "Discover European American football teams, player profiles, film, recruiting signals and league intelligence on EuroScout Pro.",
    url: "https://euroscoutpro.com",
    siteName: "EuroScout Pro",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "EuroScout Pro logo"
      }
    ]
  }
};

export default async function HomePage() {
  const { regions, leagues, teams } = await getCachedHomeMapData();

  return (
    <main>
      <HeroSection />
      <section className="border-b border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-[#090909]">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <EuroNewsSection />
        </div>
      </section>
      <MapExplorerSection regions={regions} leagues={leagues} teams={teams} />
    </main>
  );
}
