"use client";

import { useState } from "react";
import Link from "next/link";
import { flagClubAccountAction } from "@/app/actions/club-flags";

interface FlagClubButtonProps {
  teamId: string;
  scoutId: string;
  canFlag: boolean;
  isMember: boolean;
}

export default function FlagClubButton({ teamId, scoutId, canFlag, isMember }: FlagClubButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isMember) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center gap-2 border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/15"
        title="Flag this club account"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <span className="hidden sm:inline">Flag account</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg border border-amber-200 bg-white shadow-2xl dark:border-amber-500/25 dark:bg-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-amber-200 bg-amber-50 p-6 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase text-amber-700 dark:text-amber-300">Flag Club Account</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/70 dark:text-amber-100/70">
                    Report this club if the claimed owner does not appear connected to the organisation.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {canFlag ? (
                <form action={flagClubAccountAction} onSubmit={() => setIsOpen(false)} className="space-y-4">
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="return_path" value={`/scouts/${scoutId}`} />
                  
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-slate-700 dark:text-white/70">
                      Reason for flagging
                    </label>
                    <select
                      name="reason"
                      required
                      defaultValue=""
                      className="h-12 w-full border border-amber-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-400/25 dark:bg-black/35 dark:text-white"
                    >
                      <option value="" disabled>Choose a reason</option>
                      <option value="not_affiliated">Owner is not affiliated</option>
                      <option value="wrong_owner">Wrong owner or staff member</option>
                      <option value="impersonation">Possible impersonation</option>
                      <option value="duplicate_claim">Duplicate club claim</option>
                      <option value="other">Other concern</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-slate-700 dark:text-white/70">
                      Additional details
                    </label>
                    <textarea
                      name="details"
                      rows={5}
                      placeholder="Add context for the admin review team..."
                      className="w-full border border-amber-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-400/25 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase text-slate-700 transition hover:bg-slate-50 dark:border-white/20 dark:bg-black/20 dark:text-white/70 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-amber-600 px-5 py-3 text-sm font-black uppercase text-white transition hover:bg-amber-700"
                    >
                      Submit Flag
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-white/55">
                    You need to be signed in to flag a club account.
                  </p>
                  <Link
                    href={`/auth/sign-in?return_url=/scouts/${scoutId}`}
                    className="inline-flex h-12 w-full items-center justify-center bg-amber-600 px-5 text-sm font-black uppercase text-white transition hover:bg-amber-700"
                  >
                    Sign in to flag
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
