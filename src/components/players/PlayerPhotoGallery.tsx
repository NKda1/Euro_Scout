"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PlayerPhotoGalleryProps {
  photoUrls: string[];
  canRemove?: boolean;
}

const MAX_PLAYER_PHOTOS = 4;

export default function PlayerPhotoGallery({ photoUrls, canRemove = false }: PlayerPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const photos = photoUrls.slice(0, MAX_PLAYER_PHOTOS);
  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;

  function showPreviousPhoto() {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return current === 0 ? photos.length - 1 : current - 1;
    });
  }

  function showNextPhoto() {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return current === photos.length - 1 ? 0 : current + 1;
    });
  }

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") showPreviousPhoto();
      else if (e.key === "ArrowRight") showNextPhoto();
      else if (e.key === "Escape") setActiveIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex]);

  return (
    <>
      {/* Photo grid */}
      <div className="mt-5 grid snap-x grid-flow-col auto-cols-[minmax(13rem,1fr)] gap-2 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-4 sm:overflow-visible sm:pb-0">
        {Array.from({ length: MAX_PLAYER_PHOTOS }).map((_, slot) => {
          const photo = photos[slot];
          return (
            <div
              key={photo ?? slot}
              className="relative flex aspect-square snap-start items-end overflow-hidden border border-dashed border-slate-300 bg-slate-50 text-xs font-black uppercase text-slate-500 dark:border-white/15 dark:bg-[#111] dark:text-white/35"
            >
              {photo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(slot)}
                    className="absolute inset-0 bg-cover bg-center transition duration-300 hover:scale-[1.04]"
                    style={{ backgroundImage: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,.75)), url(${photo})` }}
                    aria-label={`Open player photo ${slot + 1}`}
                  />
                  {/* Slot number badge */}
                  <span className="pointer-events-none absolute bottom-2 left-2 z-10 text-[10px] font-black uppercase tracking-widest text-white/60">
                    Photo {slot + 1}
                  </span>
                  {canRemove ? (
                    <form action="/api/account/player-photos/remove" method="post" className="absolute right-2 top-2 z-10">
                      <input type="hidden" name="photo_url" value={photo} />
                      <button
                        className="flex h-7 w-7 items-center justify-center bg-black/70 text-xs font-black text-white transition hover:bg-red-600"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : null}
                </>
              ) : (
                <span className="p-3">Photo {slot + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveIndex(null); }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:border-red-500 hover:bg-red-600"
            aria-label="Close photo viewer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Counter */}
          {photos.length > 1 && activeIndex !== null && (
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`h-1 transition-all duration-200 ${
                    i === activeIndex ? "w-8 bg-white" : "w-3 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Prev */}
          {photos.length > 1 ? (
            <button
              type="button"
              onClick={showPreviousPhoto}
              className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:border-red-500 hover:bg-red-600"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          {/* Next */}
          {photos.length > 1 ? (
            <button
              type="button"
              onClick={showNextPhoto}
              className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:border-red-500 hover:bg-red-600"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}

          {/* Main image */}
          <div className="relative mx-16 max-h-[90vh] w-full max-w-4xl">
            <div
              className="h-[82vh] w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${activePhoto})` }}
              role="img"
              aria-label={`Player photo ${(activeIndex ?? 0) + 1} of ${photos.length}`}
            />
            {activeIndex !== null && (
              <div className="absolute bottom-0 left-0 border-t border-white/10 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/60 backdrop-blur-sm">
                {activeIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
