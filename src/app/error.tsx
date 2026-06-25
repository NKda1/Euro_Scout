"use client";

import Link from "next/link";
import { Notice } from "@/components/ui/StateDisplay";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Notice tone="danger" title="Something interrupted this page.">
          The page could not finish loading. This can happen after a network hiccup or a temporary data issue.
        </Notice>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="inline-flex h-11 items-center bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
            Retry
          </button>
          <Link href="/dashboard" className="inline-flex h-11 items-center border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200">
            Back to dashboard
          </Link>
        </div>
        {error.digest ? <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">Error reference: {error.digest}</p> : null}
      </section>
    </main>
  );
}
