import type { Metadata } from "next";
import EuroNewsSection from "@/components/news/EuroNewsSection";
import JournalistArticleCard, { type JournalistArticleCardData } from "@/components/news/JournalistArticleCard";
import { EmptyState, Notice } from "@/components/ui/StateDisplay";
import { leagues } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "News | EuroScout Pro",
  description: "Read EuroScout journalist links and live European American football headlines.",
  alternates: {
    canonical: "/news"
  },
  openGraph: {
    title: "News | EuroScout Pro",
    description: "Read EuroScout journalist links and live European American football headlines.",
    url: absoluteUrl("/news"),
    type: "website"
  }
};

export default async function NewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: articles, error } = await supabase
    .from("journalist_articles")
    .select(
      `
        id,
        title,
        article_url,
        thumbnail_url,
        excerpt,
        league_ids,
        published_at,
        created_at,
        profiles!journalist_profile_id (
          display_name,
          headline,
          avatar_url
        )
      `
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(24)
    .returns<JournalistArticleCardData[]>();

  const leagueLabels = Object.fromEntries(leagues.map((league) => [league.id, league.shortName ?? league.name]));

  return (
    <main className="app-surface min-h-screen">
      <section className="border-b border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-[92rem] px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">News Desk</p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(280px,0.25fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                European football news, curated and reported.
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">
                Journalist submissions sit alongside the live AFLE and EFA headline feed, giving scouts a single place to scan market stories.
              </p>
            </div>
            <div className="border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111]">
              <p className="text-3xl font-black text-slate-950 dark:text-white">{articles?.length ?? 0}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Journalist links
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Reported Links</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Journalist articles</h2>
          </div>
        </div>

        {error ? (
          <Notice tone="warning" title="Journalist articles are not available." actionHref="/news" actionLabel="Retry">
            The article feed could not load. If this is a new environment, run `src/db/012_journalist_articles.sql` in Supabase.
          </Notice>
        ) : articles?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <JournalistArticleCard key={article.id} article={article} leagueLabels={leagueLabels} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No journalist articles yet"
            description="Published links will appear here with thumbnails, bylines, league tags and short previews."
          />
        )}
      </section>

      <section className="border-t border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-[#090909]">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <EuroNewsSection />
        </div>
      </section>
    </main>
  );
}
