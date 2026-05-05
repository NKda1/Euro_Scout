"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const newsItems = [
  {
    label: "Market Watch",
    title: "Continental expansion puts France and Germany at the centre of 2026 planning.",
    summary: "Cross-border leagues are building deeper regional footprints as teams cluster around major city markets.",
    imageTone: "from-red-600 via-red-500 to-slate-950"
  },
  {
    label: "Club Focus",
    title: "New-look franchises are reshaping the European American football map.",
    summary: "Seed data highlights how domestic powers and continental projects overlap across key football countries.",
    imageTone: "from-slate-950 via-red-700 to-red-100"
  },
  {
    label: "Scouting Note",
    title: "Domestic premier leagues remain the backbone of European player discovery.",
    summary: "National competitions keep supplying the density, depth and local context behind every market snapshot.",
    imageTone: "from-red-100 via-white to-red-600"
  }
];

export default function FootballNewsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = newsItems[activeIndex];

  const nextItem = () => setActiveIndex((index) => (index + 1) % newsItems.length);
  const previousItem = () => setActiveIndex((index) => (index - 1 + newsItems.length) % newsItems.length);

  const imageStyle = useMemo(
    () => ({
      backgroundImage: "url('/europe.svg')"
    }),
    []
  );

  return (
    <aside className="overflow-hidden rounded-3xl glass-card">
      <div className={cn("relative min-h-56 bg-gradient-to-br p-5", activeItem.imageTone)}>
        <div className="absolute inset-0 bg-white/10" style={imageStyle} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        <div className="relative flex h-48 flex-col justify-end">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-100">{activeItem.label}</p>
          <h2 className="mt-2 text-xl font-black leading-tight text-white">{activeItem.title}</h2>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activeItem.summary}</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {newsItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Show ${item.label}`}
                onClick={() => setActiveIndex(index)}
                className={cn("h-2.5 rounded-full transition", index === activeIndex ? "w-7 bg-red-600" : "w-2.5 bg-slate-200 hover:bg-red-200 dark:bg-white/15 dark:hover:bg-red-400/50")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={previousItem}
              aria-label="Previous news item"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-red-400/40 dark:hover:text-red-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextItem}
              aria-label="Next news item"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-red-400/40 dark:hover:text-red-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
