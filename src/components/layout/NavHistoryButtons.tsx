"use client";

import { usePathname, useRouter } from "next/navigation";

export default function NavHistoryButtons() {
  const router = useRouter();
  const pathname = usePathname();

  // Only show after leaving the home page
  if (pathname === "/") return null;

  return (
    <div className="fixed right-4 top-[68px] z-30 flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 px-2 py-1.5 shadow-md shadow-slate-950/[0.06] backdrop-blur-xl dark:border-white/[0.10] dark:bg-[#060914]/90 dark:shadow-black/20">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
      <button
        type="button"
        onClick={() => router.forward()}
        aria-label="Go forward"
        className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
