"use client";

import { useState } from "react";

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

  return (
    <>
      <div className="mt-5 grid snap-x grid-flow-col auto-cols-[minmax(13rem,1fr)] gap-3 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-4 sm:overflow-visible sm:pb-0">
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
                    className="absolute inset-0 bg-cover bg-center transition hover:scale-[1.03]"
                    style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.72)), url(${photo})` }}
                    aria-label={`Open player photo ${slot + 1}`}
                  />
                  {canRemove ? (
                    <form action="/api/account/player-photos/remove" method="post" className="absolute right-2 top-2 z-10">
                      <input type="hidden" name="photo_url" value={photo} />
                      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm text-white transition hover:bg-red-600" title="Remove picture">
                        x
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

      {activePhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-4xl border border-white/10 bg-[#111] p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-xl font-black text-white transition hover:bg-red-600"
              aria-label="Close photo viewer"
            >
              x
            </button>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPreviousPhoto}
                  className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black text-white transition hover:bg-red-600"
                  aria-label="Previous player photo"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black text-white transition hover:bg-red-600"
                  aria-label="Next player photo"
                >
                  {">"}
                </button>
              </>
            ) : null}
            <div
              className="h-[82vh] w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${activePhoto})` }}
              role="img"
              aria-label="Player profile gallery"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
