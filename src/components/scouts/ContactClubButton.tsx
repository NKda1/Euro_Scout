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
        className="h-16 w-full rounded-lg border border-white/10 bg-black/20 px-5 text-sm font-black text-white/25 transition hover:border-red-500/45 hover:bg-red-500/10 hover:text-white active:scale-[0.98]"
      >
        Message {teamName}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/25 bg-black/25 p-4">
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
          className="w-full resize-none rounded-lg border border-white/10 bg-[#111] p-3 text-sm text-white placeholder-white/25 focus:border-red-500 focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-black uppercase text-white transition hover:bg-red-700"
          >
            Send message
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-black text-white/45 transition hover:border-red-500/40 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
