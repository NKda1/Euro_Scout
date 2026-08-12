"use client";

import { useState } from "react";
import { Info, X, Upload, Link2, Film } from "lucide-react";

const DISMISSED_KEY = "film-upload-guide-dismissed";

const steps = [
  {
    icon: Film,
    title: "Get your Hudl link",
    body: "Log in to Hudl, open your highlight or game film, click Share, and copy the public link."
  },
  {
    icon: Link2,
    title: "Paste the URL",
    body: "Paste it into the \"Video URL\" field below. EuroScout will auto-detect Hudl and embed it where supported."
  },
  {
    icon: Upload,
    title: "Add a title & save",
    body: "Give your film a label (e.g. \"2026 Highlights\"), set it as default if it's your best reel, then click Add film."
  }
];

export default function FilmUploadGuide() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });

  if (dismissed && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-red-500 dark:text-white/35 dark:hover:text-red-400"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        How to set up film
      </button>
    );
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-white/40 transition hover:text-red-400"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          How to set up Hudl film?
        </button>
      )}

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 duration-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">How to upload film</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-white/40 transition hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-black text-white">{step.title}</p>
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-white/55">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold text-white/35 transition hover:text-white/60"
            >
              Don&apos;t show again
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex h-8 items-center rounded bg-red-600 px-4 text-xs font-black text-white transition hover:bg-red-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
