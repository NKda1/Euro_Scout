"use client";

import { useMemo, useState } from "react";
import { trackFilmClickAction } from "@/app/actions/film";
import { detectVideoProvider, getEmbeddableVideoUrl, getVideoProviderLabel, normalizeVideoUrl } from "@/lib/video";

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

export default function HudlFilmViewer({ filmLinks }: { filmLinks: FilmLink[] }) {
  const defaultFilm = filmLinks.find((film) => film.is_default) ?? filmLinks[0];
  const [activeType, setActiveType] = useState(defaultFilm?.film_type ?? "highlights");

  const activeFilm = useMemo(() => {
    return filmLinks.find((film) => film.film_type === activeType) ?? defaultFilm;
  }, [activeType, defaultFilm, filmLinks]);
  const activeUrl = activeFilm ? normalizeVideoUrl(activeFilm.url) : "";
  const activeProvider = activeFilm ? detectVideoProvider(activeFilm.url) : "hudl";
  const embedUrl = activeFilm ? getEmbeddableVideoUrl(activeFilm.url) : null;
  const providerLabel = getVideoProviderLabel(activeProvider);

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
        {activeFilm && embedUrl ? (
          <iframe
            src={embedUrl}
            title={activeFilm.label ?? "Hudl film"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : activeFilm ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">{providerLabel} Film</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Open film externally.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                This provider does not allow reliable in-page playback, so EuroScout opens the saved film link in a new tab.
              </p>
              <form action={trackFilmClickAction} target="_blank">
                <input type="hidden" name="film_id" value={activeFilm.id} />
                <input type="hidden" name="fallback_url" value={activeUrl} />
                <button className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-red-50">
                  Watch on {providerLabel}
                </button>
              </form>
            </div>
          </div>
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
          <form action={trackFilmClickAction} target="_blank">
            <input type="hidden" name="film_id" value={activeFilm.id} />
            <input type="hidden" name="fallback_url" value={activeUrl} />
            <button className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-red-50">
              Open on {providerLabel}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
