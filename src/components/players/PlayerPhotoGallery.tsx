"use client";

import { useState } from "react";

interface PlayerPhotoGalleryProps {
  photoUrls: string[];
  canRemove?: boolean;
}

const MAX_PLAYER_PHOTOS = 4;

export default function PlayerPhotoGallery({ photoUrls, canRemove = false }: PlayerPhotoGalleryProps) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const photos = photoUrls.slice(0, MAX_PLAYER_PHOTOS);

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: MAX_PLAYER_PHOTOS }).map((_, slot) => {
          const photo = photos[slot];

          return (
            <div
              key={photo ?? slot}
              className="relative flex aspect-square items-end overflow-hidden border border-dashed border-slate-300 bg-slate-50 text-xs font-black uppercase text-slate-500 dark:border-white/15 dark:bg-[#111] dark:text-white/35"
            >
              {photo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(photo)}
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
              onClick={() => setActivePhoto(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-xl font-black text-white transition hover:bg-red-600"
              aria-label="Close photo viewer"
            >
              x
            </button>
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
