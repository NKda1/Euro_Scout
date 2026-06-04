"use client";

import { useState } from "react";
import { contactClubAction } from "@/app/actions/messages";

interface ContactClubButtonProps {
  scoutId: string;
  teamId: string;
  teamName: string;
}

export default function ContactClubButton({ scoutId, teamId, teamName }: ContactClubButtonProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-16 w-full rounded-2xl bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 hover:shadow-red-600/40 active:scale-[0.98]"
      >
        Message {teamName}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 backdrop-blur-sm dark:border-red-400/20 dark:bg-red-500/5">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
        Message {teamName}
      </p>
      <form action={contactClubAction}>
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="scout_id" value={scoutId} />
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          placeholder="Introduce yourself and let the club know why you're reaching out..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:ring-red-500/15"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-700"
          >
            Send message
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-red-200 dark:border-white/10 dark:text-slate-300 dark:hover:border-red-400/40"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
