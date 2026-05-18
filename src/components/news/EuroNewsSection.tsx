"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { NewsArticle } from "@/app/api/news/route";

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  AFLE: { label: "AFLE", bg: "bg-blue-600",   text: "text-white" },
  EFA:  { label: "EFA",  bg: "bg-emerald-600", text: "text-white" }
};

// Card width (w-72 = 288) + gap (gap-5 = 20)
const CARD_STEP = 308;
// How long to pause between auto-steps (ms)
const AUTO_INTERVAL = 3500;

function NewsCard({ article }: { article: NewsArticle }) {
  const style = SOURCE_STYLES[article.source] ?? { label: article.source, bg: "bg-slate-600", text: "text-white" };

  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-72 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-800/70"
    >
      {/* Image / fallback */}
      <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-700">
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className={`rounded-xl px-3 py-1 text-xs font-black ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-3 flex-1 text-sm font-bold leading-snug text-slate-900 capitalize dark:text-white">
          {article.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        {article.date && (
          <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            {article.date}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function EuroNewsSection() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: NewsArticle[]) => { setArticles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stepForward = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // If at or near the end, snap back to start
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - CARD_STEP) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: CARD_STEP, behavior: "smooth" });
    }
  }, []);

  // Start auto-scroll once articles are loaded
  useEffect(() => {
    if (loading || articles.length === 0) return;
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) stepForward();
    }, AUTO_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, articles.length, stepForward]);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? CARD_STEP : -CARD_STEP, behavior: "smooth" });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Latest News</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            European Football Headlines
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Scroll left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Scroll right"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 w-72 flex-shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-slate-400">No news available right now. Check back soon.</p>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => { pausedRef.current = false; }}
        >
          {articles.map((article, i) => (
            <NewsCard key={`${article.source}-${i}`} article={article} />
          ))}
        </div>
      )}

      {/* Source attribution */}
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        News sourced from{" "}
        <a href="https://www.aflepro.com/news/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-blue-500">AFLE</a>
        {" "}and{" "}
        <a href="https://efafootball.com/news/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-emerald-500">EFA</a>
        . Updated hourly.
      </p>
    </div>
  );
}
