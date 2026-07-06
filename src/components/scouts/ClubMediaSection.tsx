"use client";

import { useMemo, useState } from "react";
import { deleteClubMediaAction, saveClubVideoAction, saveClubPhotoAction } from "@/app/actions/club";
import { getEmbeddableVideoUrl, getPreviewEmbedUrl, getVideoProviderLabel, getVideoThumbnailUrl } from "@/lib/video";

export interface ClubMediaRow {
  id: string;
  team_id: string;
  media_type: "photo" | "video";
  url: string;
  provider: string | null;
  label: string | null;
  display_order: number;
}

interface ClubMediaSectionProps {
  scoutId: string;
  teamId: string;
  media: ClubMediaRow[];
  isMember: boolean;
  returnTo?: string;
}

const MAX_CLUB_PHOTOS = 4;

function getVideoEmbedUrl(url: string, provider: string | null): string | null {
  return getEmbeddableVideoUrl(url) ?? (provider === "youtube" || provider === "vimeo" ? getEmbeddableVideoUrl(url) : null);
}

export default function ClubMediaSection({ scoutId, teamId, media, isMember, returnTo }: ClubMediaSectionProps) {
  const [videoPreviewActive, setVideoPreviewActive] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const video = media.find((m) => m.media_type === "video") ?? null;
  const photos = useMemo(
    () =>
      media
        .filter((m) => m.media_type === "photo")
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, MAX_CLUB_PHOTOS),
    [media]
  );
  const embedUrl = video ? getVideoEmbedUrl(video.url, video.provider) : null;
  const previewEmbedUrl = video ? getPreviewEmbedUrl(video.url) : null;
  const videoThumbnailUrl = video ? getVideoThumbnailUrl(video.url) : null;
  const activePhoto = activePhotoIndex === null ? null : photos[activePhotoIndex] ?? null;

  function showPreviousPhoto() {
    setActivePhotoIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return current === 0 ? photos.length - 1 : current - 1;
    });
  }

  function showNextPhoto() {
    setActivePhotoIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return current === photos.length - 1 ? 0 : current + 1;
    });
  }

  const isEmpty = !video && photos.length === 0;
  if (isEmpty && !isMember) return null;

  return (
    <section className="max-w-full space-y-5 overflow-hidden">
      <p className="text-sm font-black uppercase text-red-500">Club Media</p>

      <div>
        {video ? (
          <div className="relative overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
            {embedUrl ? (
              <div
                className="aspect-video"
                onMouseEnter={() => setVideoPreviewActive(true)}
                onFocus={() => setVideoPreviewActive(true)}
                onMouseLeave={() => setVideoPreviewActive(false)}
              >
                {videoPreviewActive && previewEmbedUrl ? (
                  <div className="relative h-full w-full">
                    <iframe
                      src={previewEmbedUrl}
                      title={`${video.label ?? "Team video"} hover preview`}
                      className="pointer-events-none h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-5 right-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-xl transition hover:bg-red-50"
                    >
                      Open video
                    </a>
                  </div>
                ) : videoThumbnailUrl ? (
                  <button
                    type="button"
                    onClick={() => setVideoPreviewActive(true)}
                    className="group flex h-full w-full items-end bg-cover bg-center p-6 text-left"
                    style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.82)), url(${videoThumbnailUrl})` }}
                    aria-label={`Preview ${video.label ?? "team video"}`}
                  >
                    <span className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-xl transition group-hover:bg-red-50">
                      Hover preview
                    </span>
                  </button>
                ) : (
                  <iframe
                    src={embedUrl}
                    title={video.label ?? "Team video"}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-28 items-center gap-5 px-8 py-7"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl text-white">▶</span>
                <span className="font-bold text-white">Watch team video</span>
              </a>
            )}

            {(video.label || video.provider) && (
              <div className="flex items-center gap-3 bg-[#1a1a1a] px-5 py-4">
                {video.label && <p className="flex-1 text-base font-black text-white">{video.label}</p>}
                {video.provider && (
                  <span className="shrink-0 rounded border border-white/15 px-3 py-1 text-xs font-bold uppercase text-white/35">
                    {getVideoProviderLabel(video.provider === "youtube" || video.provider === "vimeo" || video.provider === "hudl" ? video.provider : "external")}
                  </span>
                )}
              </div>
            )}

            {isMember && (
              <form action={deleteClubMediaAction} className="absolute right-3 top-3">
                <input type="hidden" name="media_id" value={video.id} />
                <input type="hidden" name="team_id" value={teamId} />
                <input type="hidden" name="scout_id" value={scoutId} />
                {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-sm transition hover:bg-red-600"
                  title="Remove video"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        ) : isMember ? (
          <form
            action={saveClubVideoAction}
            className="space-y-3 rounded-lg border border-dashed border-white/20 bg-[#1a1a1a] p-5"
          >
            <input type="hidden" name="team_id" value={teamId} />
            <input type="hidden" name="scout_id" value={scoutId} />
            {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
            <p className="text-xs font-black uppercase text-white/35">Add team video</p>
            <input
              type="url"
              name="url"
              required
              placeholder="YouTube or Vimeo URL"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-red-500 focus:outline-none"
            />
            <input
              type="text"
              name="label"
              placeholder="Label (optional, e.g. 2025 Season Highlights)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-red-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-red-700"
            >
              Save video
            </button>
          </form>
        ) : (
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#1a1a1a]">
            <p className="text-sm font-bold text-white/35">No team video yet</p>
          </div>
        )}
      </div>

      <div>
        <div className="grid max-w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: MAX_CLUB_PHOTOS }).map((_, slot) => {
            const photo = photos[slot];

            if (photo) {
              return (
                <div key={photo.id} className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg border border-white/15">
                  <button
                    type="button"
                    onClick={() => setActivePhotoIndex(slot)}
                    className="absolute inset-0 transition hover:scale-[1.03]"
                    aria-label={`Open club photo ${slot + 1}`}
                  >
                    {/* Next.js Image is not used because club media can point at arbitrary external origins. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={`Club photo ${slot + 1}`} className="h-full w-full object-cover" />
                  </button>
                  {isMember && (
                    <form action={deleteClubMediaAction} className="absolute right-1.5 top-1.5">
                      <input type="hidden" name="media_id" value={photo.id} />
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="scout_id" value={scoutId} />
                      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                      <button
                        type="submit"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-xs text-white backdrop-blur-sm transition hover:bg-red-600"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </div>
              );
            }

            if (isMember) {
              return (
                <form
                  key={`slot-${slot}`}
                  action={saveClubPhotoAction}
                  className="flex aspect-[4/3] min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#1a1a1a] p-3"
                >
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="scout_id" value={scoutId} />
                  <input type="hidden" name="display_order" value={slot} />
                  {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                  <p className="text-[10px] font-black uppercase text-white/35">Photo {slot + 1}</p>
                  <input
                    type="file"
                    name="photo"
                    required
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="max-w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white file:mr-2 file:rounded file:border-0 file:bg-red-600 file:px-2 file:py-1 file:text-[10px] file:font-black file:text-white focus:border-red-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded bg-red-600 px-3 py-1 text-[10px] font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Add
                  </button>
                </form>
              );
            }

            return (
              <div
                key={`empty-${slot}`}
                className="flex aspect-[4/3] min-w-0 items-end rounded-lg border border-dashed border-white/15 bg-[#1a1a1a] p-4"
              >
                <p className="text-xs font-black uppercase text-white/35">Photo {slot + 1}</p>
              </div>
            );
          })}
        </div>
      </div>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-5xl border border-white/10 bg-[#111] p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setActivePhotoIndex(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-xl font-black text-white transition hover:bg-red-600"
              aria-label="Close club photo viewer"
            >
              x
            </button>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPreviousPhoto}
                  className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black text-white transition hover:bg-red-600"
                  aria-label="Previous club photo"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black text-white transition hover:bg-red-600"
                  aria-label="Next club photo"
                >
                  {">"}
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activePhoto.url} alt={activePhoto.label ?? "Club profile gallery"} className="max-h-[82vh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
