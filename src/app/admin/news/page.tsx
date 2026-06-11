import type { Metadata } from "next";
import Link from "next/link";
import {
  adminCreateJournalistArticleAction,
  adminDeleteJournalistArticleAction,
  adminUpdateJournalistArticleAction
} from "@/app/actions/journalist";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import JournalistArticleCard, { type JournalistArticleCardData } from "@/components/news/JournalistArticleCard";
import { leagues } from "@/lib/data";
import { requireAdminProfile, type Profile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin News | EuroScout Pro",
  description: "Create, edit and moderate EuroScout journalist news links."
};

interface AdminNewsPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface AdminJournalistArticleRow extends JournalistArticleCardData {
  status: string;
  journalist_profile_id: string;
}

function formatDate(value: string | null) {
  if (!value) return "Not published";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

const inputClass = "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";
const textareaClass = "min-h-24 w-full border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";
const labelClass = "mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35";

function LeagueCheckboxes({ selected = [] }: { selected?: string[] | null }) {
  const selectedSet = new Set(selected ?? []);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {leagues.map((league) => (
        <label key={league.id} className="flex items-center gap-3 border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-white/60">
          <input name="league_ids" value={league.id} type="checkbox" defaultChecked={selectedSet.has(league.id)} className="h-4 w-4 rounded border-slate-300 text-red-600" />
          <span>{league.shortName}</span>
        </label>
      ))}
    </div>
  );
}

export default async function AdminNewsPage({ searchParams }: AdminNewsPageProps) {
  const { error, notice } = await searchParams;
  await requireAdminProfile();
  const serviceClient = createSupabaseServiceRoleClient();

  const [{ data: articles, error: articlesError }, { data: journalists }] = await Promise.all([
    serviceClient
      .from("journalist_articles")
      .select(
        `
          id,
          journalist_profile_id,
          title,
          article_url,
          thumbnail_url,
          excerpt,
          league_ids,
          status,
          published_at,
          created_at,
          profiles!journalist_profile_id (
            display_name,
            headline,
            avatar_url
          )
        `
      )
      .order("created_at", { ascending: false })
      .returns<AdminJournalistArticleRow[]>(),
    serviceClient
      .from("profiles")
      .select("*")
      .eq("role", "journalist")
      .order("display_name")
      .returns<Profile[]>()
  ]);

  const leagueLabels = Object.fromEntries(leagues.map((league) => [league.id, league.shortName ?? league.name]));
  const publishedCount = (articles ?? []).filter((article) => article.status === "published").length;
  const draftCount = (articles ?? []).filter((article) => article.status === "draft").length;

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[92rem] space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader
          eyebrow="Admin News"
          title="News feed control."
          description="Create, edit, publish, draft or delete journalist links that appear on the dedicated news page."
        />

        {error ? <p className="border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
        {notice ? <p className="border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card p-5">
            <p className="text-3xl font-black text-slate-950 dark:text-white">{articles?.length ?? 0}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Total links</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-300">{publishedCount}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Published</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-200">{draftCount}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Drafts</p>
          </div>
        </div>

        <section className="glass-card p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Create</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Add a news article link</h2>
            </div>
            <Link href="/news" className="bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700">
              View news page
            </Link>
          </div>

          {articlesError ? (
            <div className="border border-amber-400/40 bg-amber-500/10 p-5 text-sm font-bold text-amber-700 dark:text-amber-200">
              Run `src/db/012_journalist_articles.sql` in Supabase before using admin news controls.
            </div>
          ) : (
            <form action={adminCreateJournalistArticleAction} className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Journalist author</span>
                <select name="journalist_profile_id" className={inputClass} defaultValue="">
                  <option value="">Admin / EuroScout desk</option>
                  {(journalists ?? []).map((journalist) => (
                    <option key={journalist.id} value={journalist.id}>
                      {journalist.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Status</span>
                <select name="status" className={inputClass} defaultValue="published">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Article title</span>
                <input name="title" required minLength={4} maxLength={180} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Article link</span>
                <input name="article_url" required type="url" className={inputClass} />
              </label>
              <label className="block lg:col-span-2">
                <span className={labelClass}>Thumbnail image link</span>
                <input name="thumbnail_url" type="url" className={inputClass} />
              </label>
              <label className="block lg:col-span-2">
                <span className={labelClass}>Short preview</span>
                <textarea name="excerpt" required minLength={20} maxLength={360} className={textareaClass} />
              </label>
              <div className="lg:col-span-2">
                <span className={labelClass}>Leagues covered</span>
                <LeagueCheckboxes />
              </div>
              <button className="h-11 bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 lg:w-fit">
                Create article link
              </button>
            </form>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Moderate</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Existing journalist links</h2>
          </div>

          {(articles ?? []).map((article) => (
            <article key={article.id} className="grid gap-5 border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111] xl:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)]">
              <div>
                <JournalistArticleCard article={article} leagueLabels={leagueLabels} />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Control row</p>
                    <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                      {article.status === "published" ? `Published ${formatDate(article.published_at)}` : "Currently hidden from public news page"}
                    </p>
                  </div>
                  <form action={adminDeleteJournalistArticleAction}>
                    <input type="hidden" name="article_id" value={article.id} />
                    <button className="h-10 border border-red-300 bg-red-50 px-4 text-xs font-black uppercase text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200">
                      Delete
                    </button>
                  </form>
                </div>

                <form action={adminUpdateJournalistArticleAction} className="grid gap-4 lg:grid-cols-2">
                  <input type="hidden" name="article_id" value={article.id} />
                  <label className="block">
                    <span className={labelClass}>Status</span>
                    <select name="status" className={inputClass} defaultValue={article.status === "draft" ? "draft" : "published"}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Article title</span>
                    <input name="title" required minLength={4} maxLength={180} defaultValue={article.title} className={inputClass} />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className={labelClass}>Article link</span>
                    <input name="article_url" required type="url" defaultValue={article.article_url} className={inputClass} />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className={labelClass}>Thumbnail image link</span>
                    <input name="thumbnail_url" type="url" defaultValue={article.thumbnail_url ?? ""} className={inputClass} />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className={labelClass}>Short preview</span>
                    <textarea name="excerpt" required minLength={20} maxLength={360} defaultValue={article.excerpt ?? ""} className={textareaClass} />
                  </label>
                  <div className="lg:col-span-2">
                    <span className={labelClass}>Leagues covered</span>
                    <LeagueCheckboxes selected={article.league_ids} />
                  </div>
                  <button className="h-10 bg-slate-950 px-5 text-xs font-black uppercase text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-950 dark:hover:bg-red-100 lg:w-fit">
                    Save changes
                  </button>
                </form>
              </div>
            </article>
          ))}

          {!articles?.length && !articlesError ? (
            <div className="border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111]">
              <h3 className="text-sm font-black text-slate-950 dark:text-white">No journalist links yet</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Create the first article link above.</p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
