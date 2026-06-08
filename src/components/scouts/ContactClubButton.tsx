"use client";

import { useState } from "react";
import { contactClubAction, expressInterestInClubAction } from "@/app/actions/messages";

interface ContactClubButtonProps {
  scoutId: string;
  teamId: string;
  teamName: string;
}

export default function ContactClubButton({ scoutId, teamId, teamName }: ContactClubButtonProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="grid gap-3">
        <form action={expressInterestInClubAction}>
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="scout_id" value={scoutId} />
          <button
            type="submit"
            className="h-14 w-full bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            Express interest
          </button>
        </form>
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 active:scale-[0.98] dark:border-white/10 dark:bg-black/20 dark:text-white/45 dark:hover:border-red-500/45 dark:hover:bg-red-500/10 dark:hover:text-white"
        >
          Message {teamName}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-black/25">
      <p className="mb-3 text-xs font-black uppercase text-red-500">
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
          className="w-full resize-none border border-slate-200 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-red-500 focus:outline-none dark:border-white/10 dark:bg-[#111] dark:text-white dark:placeholder:text-white/25"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-red-600 py-2.5 text-xs font-black uppercase text-white transition hover:bg-red-700"
          >
            Send message
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:text-white/45 dark:hover:border-red-500/40 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
