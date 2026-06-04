"use client";

import { useMemo, useState } from "react";

export interface FilmLink {
  id: string;
  url: string;
  provider: string;
  film_type: string;
  label: string | null;
  is_default: boolean;
}

const filmTabs = [
  { value: "highlights", label: "Highlights" },
  { value: "game_film", label: "Game Film" },
  { value: "combine", label: "Combine" },
  { value: "college_bucs", label: "College/BUCS" },
  { value: "training", label: "Training" }
];

function hudlEmbedUrl(url: string) {
  const youtube = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return url;
}

export default function HudlFilmViewer({ filmLinks }: { filmLinks: FilmLink[] }) {
  const defaultFilm = filmLinks.find((film) => film.is_default) ?? filmLinks[0];
  const [activeType, setActiveType] = useState(defaultFilm?.film_type ?? "highlights");

  const activeFilm = useMemo(() => {
    return filmLinks.find((film) => film.film_type === activeType) ?? defaultFilm;
  }, [activeType, defaultFilm, filmLinks]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 shadow-xl shadow-slate-950/20">
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
        {filmTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
              activeType === tab.value ? "bg-red-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(239,68,68,.22),transparent_34%),linear-gradient(135deg,#020617,#111827)]">
        {activeFilm ? (
          <iframe
            src={hudlEmbedUrl(activeFilm.url)}
            title={activeFilm.label ?? "Hudl film"}
            className="h-full w-full"
            allow="fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">Hudl Film</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">No film linked yet.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Players can add Hudl URLs from account edit. EuroScout stores links only and does not host video.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">Film Viewer</p>
          <p className="mt-1 text-lg font-black text-white">{activeFilm?.label ?? "Hudl film placeholder"}</p>
        </div>
        {activeFilm ? (
          <a href={activeFilm.url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-red-50">
            Open on Hudl
          </a>
        ) : null}
      </div>
    </section>
  );
}
