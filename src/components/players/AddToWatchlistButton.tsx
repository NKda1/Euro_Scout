"use client";

import { useState } from "react";
import Link from "next/link";
import { addToWatchlistAction } from "@/app/actions/watchlist";

interface AddToWatchlistButtonProps {
  playerProfileId: string;
  returnPath: string;
  watchlists: Array<{ id: string; name: string }>;
}

export default function AddToWatchlistButton({ playerProfileId, returnPath, watchlists }: AddToWatchlistButtonProps) {
  const [open, setOpen] = useState(false);

  if (watchlists.length === 0) {
    return (
      <Link
        href="/watchlists"
        className="mt-2 flex h-9 items-center justify-center rounded-2xl border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-red-400"
      >
        + Add to watchlist
      </Link>
    );
  }

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-center rounded-2xl border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-red-400"
      >
        + Add to watchlist
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close"
            tabIndex={-1}
          />
          <div className="relative z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
            <p className="border-b border-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
              Your watchlists
            </p>
            {watchlists.map((wl) => (
              <form key={wl.id} action={addToWatchlistAction} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="watchlist_id" value={wl.id} />
                <input type="hidden" name="player_profile_id" value={playerProfileId} />
                <input type="hidden" name="return_path" value={returnPath} />
                <button
                  type="submit"
                  className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  {wl.name}
                </button>
              </form>
            ))}
            <div className="border-t border-slate-100 dark:border-white/10">
              <Link
                href="/watchlists"
                className="block px-4 py-3 text-xs font-bold text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                onClick={() => setOpen(false)}
              >
                Manage watchlists →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
