"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { NewsArticle } from "@/app/api/news/route";
import { EmptyState, Notice, SkeletonBlock } from "@/components/ui/StateDisplay";

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  AFLE: { label: "AFLE", bg: "bg-blue-600",   text: "text-white" },
  EFA:  { label: "EFA",  bg: "bg-emerald-600", text: "text-white" }
};

const CARD_STEP = 272;
const SCROLL_SPEED = 34;

function NewsCard({ article }: { article: NewsArticle }) {
  const style = SOURCE_STYLES[article.source] ?? { label: article.source, bg: "bg-slate-600", text: "text-white" };

  return (
    <Link
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-64 flex-shrink-0 flex-col overflow-hidden border border-slate-200 bg-white transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/45"
    >
      {/* Image / fallback */}
      <div className="relative h-32 overflow-hidden bg-slate-100 dark:bg-[#181818]">
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ display: article.image ? "none" : "flex" }}
        >
          <span className={`px-3 py-1 text-xs font-black ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>
        <span className={`absolute left-3 top-3 px-2 py-0.5 text-[10px] font-black uppercase ${style.bg} ${style.text}`}>
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
  const [fetchError, setFetchError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => {
        if (!r.ok) throw new Error("News request failed");
        return r.json();
      })
      .then((data: NewsArticle[]) => { setArticles(data); setFetchError(false); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  useEffect(() => {
    if (loading || articles.length === 0) return;

    function animate(timestamp: number) {
      const el = scrollRef.current;
      if (el) {
        if (lastFrameRef.current == null) {
          lastFrameRef.current = timestamp;
        }

        const deltaSeconds = (timestamp - lastFrameRef.current) / 1000;
        lastFrameRef.current = timestamp;

        if (!pausedRef.current) {
          const loopWidth = el.scrollWidth / 2;
          el.scrollLeft += SCROLL_SPEED * deltaSeconds;

          if (loopWidth > 0 && el.scrollLeft >= loopWidth) {
            el.scrollLeft -= loopWidth;
          }
        }
      }

      rafRef.current = window.requestAnimationFrame(animate);
    }

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
    };
  }, [loading, articles.length]);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const loopWidth = el.scrollWidth / 2;
    if (dir === "left" && loopWidth > 0 && el.scrollLeft < CARD_STEP) {
      el.scrollLeft += loopWidth;
    }
    el.scrollBy({ left: dir === "right" ? CARD_STEP : -CARD_STEP, behavior: "smooth" });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Latest News</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            European Football Headlines
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:text-slate-300 dark:hover:border-red-500/45"
            aria-label="Scroll left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:text-slate-300 dark:hover:border-red-500/45"
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
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-64 flex-shrink-0 border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#111]">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="mt-4 h-4 w-3/4" />
              <SkeletonBlock className="mt-3 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <Notice tone="warning" title="Live headlines could not load." actionHref="/news" actionLabel="Retry">
          Check your connection and try again. Journalist articles above are still available when published.
        </Notice>
      ) : articles.length === 0 ? (
        <EmptyState
          title="No live headlines right now"
          description="The external news feeds did not return stories. Try again shortly or check the source sites directly."
          actionHref="/news"
          actionLabel="Retry"
          className="p-6"
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => { pausedRef.current = false; }}
        >
          {[...articles, ...articles].map((article, i) => (
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
