"use client";

import { useState } from "react";

export interface PublicPlayerNote {
  id: string;
  note: string;
  createdAt: string;
  clubName?: string | null;
}

export default function PublicNotesPanel({ notes }: { notes: PublicPlayerNote[] }) {
  const [activeNote, setActiveNote] = useState<PublicPlayerNote | null>(null);

  if (!notes.length) return null;

  return (
    <section>
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Club Notes</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setActiveNote(note)}
            className="border border-slate-200 bg-white p-4 text-left transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/40"
          >
            <p className="line-clamp-2 text-sm font-semibold text-slate-600 dark:text-white/65">{note.note}</p>
            <p className="mt-3 text-xs font-black uppercase text-slate-400 dark:text-white/30">{note.clubName ?? "Club note"}</p>
          </button>
        ))}
      </div>

      {activeNote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg border border-white/10 bg-[#111] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-red-400">{activeNote.clubName ?? "Club note"}</p>
                <h3 className="mt-2 text-2xl font-black">Player note</h3>
              </div>
              <button type="button" onClick={() => setActiveNote(null)} className="border border-white/10 px-3 py-2 text-sm font-black text-white/60 transition hover:border-red-500/40 hover:text-white">
                Close
              </button>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-7 text-white/70">{activeNote.note}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
