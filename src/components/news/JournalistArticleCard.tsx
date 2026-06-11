import Link from "next/link";

export interface JournalistArticleCardData {
  id: string;
  title: string;
  article_url: string;
  thumbnail_url: string | null;
  excerpt: string | null;
  league_ids: string[] | null;
  published_at: string | null;
  created_at: string;
  profiles: {
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
  } | null;
}

interface JournalistArticleCardProps {
  article: JournalistArticleCardData;
  leagueLabels?: Record<string, string>;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "Draft";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default function JournalistArticleCard({ article, leagueLabels = {} }: JournalistArticleCardProps) {
  const authorName = article.profiles?.display_name ?? "EuroScout journalist";
  const leagueIds = article.league_ids ?? [];

  return (
    <Link
      href={article.article_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:border-red-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/45 dark:hover:bg-[#151515]"
    >
      <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-[#181818]">
        {article.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail_url}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.18),transparent_36%),linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.22),transparent_36%),linear-gradient(135deg,#111827,#090909)]">
            <span className="border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-700 dark:text-red-200">
              EuroScout News
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
          Journalist
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          {leagueIds.length ? (
            leagueIds.slice(0, 3).map((leagueId) => (
              <span key={leagueId} className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-slate-300">
                {leagueLabels[leagueId] ?? leagueId}
              </span>
            ))
          ) : (
            <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-slate-300">
              Europe
            </span>
          )}
        </div>

        <h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-slate-950 group-hover:text-red-700 dark:text-white dark:group-hover:text-red-300">
          {article.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
          {article.excerpt ?? "Read the full report from this EuroScout journalist."}
        </p>

        <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 bg-cover bg-center text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-white/60"
            style={article.profiles?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${article.profiles.avatar_url})` } : undefined}
          >
            {article.profiles?.avatar_url ? "" : initials(authorName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{authorName}</p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-500">
              {formatDate(article.published_at ?? article.created_at)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
