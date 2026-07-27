"use client";

import { useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { detectVideoProvider, getEmbeddableVideoUrl, getPreviewEmbedUrl, getVideoProviderLabel, getVideoThumbnailUrl, normalizeVideoUrl } from "@/lib/video";

export interface FilmLink {
  id: string;
  url: string;
  provider: string;
  film_type: string;
  label: string | null;
  thumbnail_url?: string | null;
  is_default: boolean;
}

const filmTabs = [
  { value: "highlights", label: "Highlights" },
  { value: "game_film", label: "Game Film" },
  { value: "combine", label: "Combine" }
];
const filmTypeValues = new Set(filmTabs.map((tab) => tab.value));

function normaliseFilmType(value: string | null | undefined) {
  return value && filmTypeValues.has(value) ? value : "highlights";
}

export default function HudlFilmViewer({ filmLinks }: { filmLinks: FilmLink[] }) {
  const defaultFilm = filmLinks.find((film) => film.is_default) ?? filmLinks[0];
  const [activeType, setActiveType] = useState(normaliseFilmType(defaultFilm?.film_type));
  const [previewingFilmId, setPreviewingFilmId] = useState<string | null>(null);
  const [fullscreenFilmId, setFullscreenFilmId] = useState<string | null>(null);
  const hoverTrackedFilmIds = useRef(new Set<string>());

  const activeFilm = useMemo(() => {
    return filmLinks.find((film) => normaliseFilmType(film.film_type) === activeType) ?? defaultFilm;
  }, [activeType, defaultFilm, filmLinks]);
  const activeProvider = activeFilm ? detectVideoProvider(activeFilm.url) : "hudl";
  const embedUrl = activeFilm ? getEmbeddableVideoUrl(activeFilm.url) : null;
  const previewEmbedUrl = activeFilm ? getPreviewEmbedUrl(activeFilm.url) : null;
  const activeThumbnailUrl = activeFilm ? activeFilm.thumbnail_url ?? getVideoThumbnailUrl(activeFilm.url) : null;
  const providerLabel = getVideoProviderLabel(activeProvider);
  const fullscreenFilm = fullscreenFilmId ? filmLinks.find((film) => film.id === fullscreenFilmId) ?? null : null;
  const fullscreenProvider = fullscreenFilm ? detectVideoProvider(fullscreenFilm.url) : "external";
  const fullscreenProviderLabel = getVideoProviderLabel(fullscreenProvider);
  const fullscreenEmbedUrl = fullscreenFilm ? getEmbeddableVideoUrl(fullscreenFilm.url) : null;
  const fullscreenThumbnailUrl = fullscreenFilm ? fullscreenFilm.thumbnail_url ?? getVideoThumbnailUrl(fullscreenFilm.url) : null;

  function trackFilmEvent(film: FilmLink, eventType: "open" | "hover_preview") {
    return fetch("/api/analytics/film-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filmId: film.id, eventType }),
      keepalive: true
    }).catch(() => undefined);
  }

  function openTrackedFilm(film: FilmLink) {
    const filmUrl = normalizeVideoUrl(film.url);
    if (!filmUrl) return;

    window.open(filmUrl, "_blank", "noopener,noreferrer");
    void trackFilmEvent(film, "open");
  }

  function startHoverPreview(film: FilmLink) {
    setPreviewingFilmId(film.id);
    if (hoverTrackedFilmIds.current.has(film.id)) return;

    hoverTrackedFilmIds.current.add(film.id);
    void trackFilmEvent(film, "hover_preview");
  }

  return (
    <section className="overflow-hidden border border-slate-800 bg-slate-950 shadow-xl shadow-slate-950/20">
      <div className="flex flex-wrap gap-px border-b border-white/10 bg-white/[0.04]">
        {filmTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={`relative px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
              activeType === tab.value
                ? "bg-slate-950 text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-red-500"
                : "text-slate-400 hover:bg-slate-950/60 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(239,68,68,.22),transparent_34%),linear-gradient(135deg,#020617,#111827)]">
        {activeFilm && embedUrl ? (
          <div
            className="h-full w-full"
            onMouseEnter={() => startHoverPreview(activeFilm)}
            onFocus={() => startHoverPreview(activeFilm)}
            onMouseLeave={() => setPreviewingFilmId(null)}
          >
            {previewingFilmId === activeFilm.id && previewEmbedUrl ? (
              <div className="relative h-full w-full">
                <iframe
                  src={previewEmbedUrl}
                  title={`${activeFilm.label ?? providerLabel} hover preview`}
                  className="pointer-events-none h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
                <button
                  type="button"
                  onClick={() => openTrackedFilm(activeFilm)}
                  className="absolute bottom-5 right-5 inline-flex h-10 items-center justify-center border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-xl transition hover:bg-red-50"
                >
                  Open on {providerLabel}
                </button>
              </div>
            ) : activeThumbnailUrl ? (
              <button
                type="button"
                onClick={() => startHoverPreview(activeFilm)}
                className="group flex h-full w-full items-end bg-cover bg-center text-left"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.08), rgba(2,6,23,.86)), url(${activeThumbnailUrl})` }}
                aria-label={`Preview ${activeFilm.label ?? providerLabel}`}
              >
                <span className="m-5 inline-flex h-10 items-center gap-2 border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-xl transition group-hover:bg-red-50">
                  Hover preview
                </span>
              </button>
            ) : (
              <iframe
                src={embedUrl}
                title={activeFilm.label ?? "Hudl film"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
        ) : activeFilm ? (
          <div
            className="flex h-full items-center justify-center bg-cover bg-center p-8 text-center"
            style={activeThumbnailUrl ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.9)), url(${activeThumbnailUrl})` } : undefined}
            onMouseEnter={() => startHoverPreview(activeFilm)}
            onFocus={() => startHoverPreview(activeFilm)}
          >
            <div className="max-w-md">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">{providerLabel} Film</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{activeThumbnailUrl ? "Film preview ready." : "Open film externally."}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {activeThumbnailUrl
                  ? "Hover previews count as film views, and the full film opens in a new tab."
                  : "This provider does not allow reliable in-page playback, so EuroScout opens the saved film link in a new tab."}
              </p>
              <button
                type="button"
                onClick={() => openTrackedFilm(activeFilm)}
                className="mt-5 inline-flex h-10 items-center border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50"
              >
                Watch on {providerLabel}
              </button>
              <button
                type="button"
                onClick={() => setFullscreenFilmId(activeFilm.id)}
                className="mt-3 inline-flex h-10 items-center gap-2 border border-white/20 bg-transparent px-5 text-xs font-black uppercase tracking-wide text-white transition hover:border-red-400 hover:text-red-200"
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
                Full screen
              </button>
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFullscreenFilmId(activeFilm.id)}
              className="inline-flex h-10 items-center gap-2 border border-white/20 bg-transparent px-5 text-xs font-black uppercase tracking-wide text-white transition hover:border-red-400 hover:text-red-200"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              Full screen
            </button>
            <button
              type="button"
              onClick={() => openTrackedFilm(activeFilm)}
              className="inline-flex h-10 items-center border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50"
            >
              Open on {providerLabel}
            </button>
          </div>
        ) : null}
      </div>

      {fullscreenFilm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6" role="dialog" aria-modal="true" aria-label="Full screen film viewer">
          <div className="relative w-full max-w-6xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setFullscreenFilmId(null)}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center bg-black/70 text-white transition hover:bg-red-600"
              aria-label="Close full screen film"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <div className="aspect-video bg-black">
              {fullscreenEmbedUrl ? (
                <iframe
                  src={fullscreenEmbedUrl}
                  title={fullscreenFilm.label ?? "Full screen film"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center bg-cover bg-center p-8 text-center"
                  style={fullscreenThumbnailUrl ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.2), rgba(2,6,23,.9)), url(${fullscreenThumbnailUrl})` } : undefined}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">{fullscreenProviderLabel} Film</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">Open this film externally.</p>
                    <button
                      type="button"
                      onClick={() => openTrackedFilm(fullscreenFilm)}
                      className="mt-5 inline-flex h-11 items-center border border-white/20 bg-white px-6 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50"
                    >
                      Watch on {fullscreenProviderLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">Full Screen Film</p>
                <p className="mt-1 text-lg font-black text-white">{fullscreenFilm.label ?? fullscreenProviderLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => openTrackedFilm(fullscreenFilm)}
                className="inline-flex h-10 items-center justify-center border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50"
              >
                Open on {fullscreenProviderLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
