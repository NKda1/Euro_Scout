import type { Metadata } from "next";
import Link from "next/link";
import AdminAnalyticsCharts from "@/components/analytics/AdminAnalyticsCharts";
import JournalistArticleCard, { type JournalistArticleCardData } from "@/components/news/JournalistArticleCard";
import ShareProfileButton from "@/components/profiles/ShareProfileButton";
import { leagues } from "@/lib/data";
import { requireAdminProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mock Journalist Preview | Admin"
};

const mockArticles: JournalistArticleCardData[] = [
  {
    id: "mock-journalist-article-1",
    title: "Rhein Fire reload their import class before a defining summer stretch",
    article_url: "https://example.com/rhein-fire-import-class",
    thumbnail_url: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "A closer look at how Rhein Fire are reshaping their international depth chart and what it means for the wider ELF recruiting market.",
    league_ids: ["elf", "gfl"],
    published_at: "2026-06-10T13:30:00.000Z",
    created_at: "2026-06-10T12:20:00.000Z",
    profiles: {
      display_name: "Mara Voss",
      headline: "European football correspondent covering Germany, Austria and continental competitions.",
      avatar_url: null
    }
  },
  {
    id: "mock-journalist-article-2",
    title: "How France D1 clubs are using film to close the scouting gap",
    article_url: "https://example.com/france-d1-film-scouting",
    thumbnail_url: "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80",
    excerpt:
      "Clubs across France are leaning into film-heavy recruitment workflows, giving late-cycle players more routes into verified European rosters.",
    league_ids: ["france-d1", "efa"],
    published_at: "2026-06-09T17:15:00.000Z",
    created_at: "2026-06-09T16:50:00.000Z",
    profiles: {
      display_name: "Mara Voss",
      headline: "European football correspondent covering Germany, Austria and continental competitions.",
      avatar_url: null
    }
  }
];

const pulseLabels = [
  "28 May",
  "29 May",
  "30 May",
  "31 May",
  "1 Jun",
  "2 Jun",
  "3 Jun",
  "4 Jun",
  "5 Jun",
  "6 Jun",
  "7 Jun",
  "8 Jun",
  "9 Jun",
  "10 Jun",
  "11 Jun",
  "12 Jun",
  "13 Jun",
  "14 Jun",
  "15 Jun",
  "16 Jun",
  "17 Jun",
  "18 Jun",
  "19 Jun",
  "20 Jun",
  "21 Jun",
  "22 Jun",
  "23 Jun",
  "24 Jun",
  "25 Jun",
  "26 Jun"
];

function points(values: number[]) {
  return pulseLabels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}

const journalistPulseSeries = [
  {
    name: "Article opens",
    tone: "red" as const,
    points: points([0, 1, 0, 2, 1, 0, 3, 4, 2, 1, 0, 2, 3, 6, 2, 1, 4, 5, 3, 2, 1, 4, 7, 3, 2, 5, 6, 4, 8, 7])
  },
  {
    name: "Published",
    tone: "slate" as const,
    points: points([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0])
  }
];

const journalistEngagement = [
  { label: "Article opens", value: 86 },
  { label: "Unique signed-in readers", value: 31 },
  { label: "Published articles", value: 3 },
  { label: "Articles with clicks", value: 3 }
];

const journalistFunnel = [
  { label: "All links", value: 5 },
  { label: "Published", value: 3 },
  { label: "Opened", value: 3 }
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function JournalistPreviewPage() {
  await requireAdminProfile();
  const author = mockArticles[0].profiles;
  const leagueLabels = Object.fromEntries(leagues.map((league) => [league.id, league.shortName ?? league.name]));

  return (
    <main className="app-surface min-h-screen">
      <div className="sticky top-0 z-50 border-b border-amber-400/30 bg-amber-50 px-4 py-3 dark:bg-[#171105]">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-amber-950">
              Admin Preview
            </span>
            <p className="text-sm font-black text-amber-800 dark:text-amber-200/85">
              Mock journalist profile and news-card preview. No database writes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/news" className="border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-400/20 dark:text-amber-200">
              News controls
            </Link>
            <Link href="/admin" className="border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-400/20 dark:text-amber-200">
              Back to admin
            </Link>
          </div>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:px-8">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-red-500/40 bg-red-50 text-2xl font-black text-red-700 dark:bg-red-500/10 dark:text-red-200">
              {initials(author?.display_name ?? "Journalist")}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-black uppercase text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-200">
                  Journalist
                </span>
                <span className="border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Public
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{author?.display_name}</h1>
              <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">{author?.headline}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
              <p className="text-3xl font-black text-slate-950 dark:text-white">{mockArticles.length}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Articles</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
              <p className="text-3xl font-black text-slate-950 dark:text-white">4</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Leagues</p>
            </div>
            <div className="col-span-2">
              <ShareProfileButton
                path="/profiles/mock-journalist"
                title={`${author?.display_name ?? "Journalist"} | EuroScout Pro`}
                text={`View ${author?.display_name ?? "this journalist"} on EuroScout Pro.`}
                variant="solid"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Account Controls</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Journalist desk controls.</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">Publish article link</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Article title</span>
                <div className="flex h-11 items-center border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 dark:border-white/10 dark:bg-black/25 dark:text-white">
                  ELF import market heats up before July
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Article link</span>
                <div className="flex h-11 items-center truncate border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 dark:border-white/10 dark:bg-black/25 dark:text-white">
                  https://mavoss.media/elf-import-market
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Thumbnail image link</span>
                <div className="flex h-11 items-center truncate border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-500 dark:border-white/10 dark:bg-black/25 dark:text-white/45">
                  Optional URL fallback
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Upload thumbnail</span>
                <div className="flex h-11 items-center justify-between border border-red-200 bg-red-50 px-3 text-sm font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  <span>image selected</span>
                  <span className="text-xs uppercase tracking-[0.14em]">JPG / PNG / WebP</span>
                </div>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Short preview</span>
                <div className="min-h-24 border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-white/55">
                  A fast scout-facing preview that explains why the story matters before readers open the external article.
                </div>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="h-11 bg-red-600 px-5 text-sm font-black uppercase text-white">Publish link</button>
              <button className="h-11 border border-slate-200 px-5 text-sm font-black uppercase text-slate-700 dark:border-white/10 dark:text-slate-200">Save draft</button>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">Shareable profile</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
              Journalists can copy their profile link for bylines, social bios and publication pages.
            </p>
            <div className="mt-5 border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Public URL</p>
              <p className="mt-2 truncate text-sm font-black text-slate-950 dark:text-white">/profiles/mock-journalist</p>
            </div>
            <ShareProfileButton
              path="/profiles/mock-journalist"
              title={`${author?.display_name ?? "Journalist"} | EuroScout Pro`}
              text={`View ${author?.display_name ?? "this journalist"} on EuroScout Pro.`}
              className="mt-5 w-full"
            />
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Analytics Preview</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Journalist content performance.</h2>
        </div>
        <div className="mb-5 grid gap-4 md:grid-cols-4">
          {[
            ["Article links", "5", "Draft and published links"],
            ["Published", "3", "Visible on news"],
            ["Article opens", "86", "Outbound article clicks"],
            ["This week", "24", "Recent reader activity"]
          ].map(([label, value, helper]) => (
            <div key={label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">{label}</p>
              <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">{helper}</p>
            </div>
          ))}
        </div>
        <AdminAnalyticsCharts
          pulseSeries={journalistPulseSeries}
          engagementBars={journalistEngagement}
          conversionBars={journalistFunnel}
          pulseTitle="30-day article engagement"
          pulseHelper="Daily outbound clicks and publishing activity from journalist links."
          engagementTitle="Content engagement"
          engagementHelper="Last 30 days across reads and published content."
          funnelTitle="Article funnel"
          funnelHelper="How links move from draft/published to reader opens."
        />
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Published Work</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Article cards as they appear on EuroScout news.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {mockArticles.map((article) => (
            <JournalistArticleCard key={article.id} article={article} leagueLabels={leagueLabels} />
          ))}
        </div>
      </section>
    </main>
  );
}
