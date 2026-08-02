"use client";

import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { deleteClubMediaAction, saveClubVideoAction, saveClubPhotoAction } from "@/app/actions/club";
import MediaFileInput from "@/components/account/MediaFileInput";
import VideoLinkComposer from "@/components/account/VideoLinkComposer";
import { getEmbeddableVideoUrl, getPreviewEmbedUrl, getVideoProviderLabel, getVideoThumbnailUrl } from "@/lib/video";
import ClubMediaManager from "@/components/account/ClubMediaManager";

export interface ClubMediaRow {
  id: string;
  team_id: string;
  media_type: "photo" | "video";
  url: string;
  provider: string | null;
  label: string | null;
  display_order: number;
  original_filename?: string | null;
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

export default function ClubMediaSection(props: ClubMediaSectionProps) {
  if (props.isMember) return <ClubMediaManager teamId={props.teamId} initialMedia={props.media} />;
  return <PublicClubMediaSection {...props} />;
}

function PublicClubMediaSection({ scoutId, teamId, media, isMember, returnTo }: ClubMediaSectionProps) {
  const [videoPreviewActive, setVideoPreviewActive] = useState(false);
  const [videoFullscreenOpen, setVideoFullscreenOpen] = useState(false);
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
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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

            {(video.label || video.provider || video.url) && (
              <div className="flex items-center gap-3 bg-[#1a1a1a] px-5 py-4">
                <p className="flex-1 text-base font-black text-white">{video.label ?? "Club video"}</p>
                <button
                  type="button"
                  onClick={() => setVideoFullscreenOpen(true)}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded border border-white/15 px-3 text-xs font-black uppercase tracking-wide text-white transition hover:border-red-400 hover:text-red-200"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                  Full screen
                </button>
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
          <form action={saveClubVideoAction} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <input type="hidden" name="team_id" value={teamId} />
            <input type="hidden" name="scout_id" value={scoutId} />
            {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
            <VideoLinkComposer compact />
            <button
              type="submit"
              className="h-10 w-fit rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700 md:ml-auto"
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
        <div className="grid max-w-full grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <form key={`slot-${slot}`} action={saveClubPhotoAction} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-black/20">
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="scout_id" value={scoutId} />
                  <input type="hidden" name="display_order" value={slot} />
                  {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
                  <MediaFileInput name="photo" label={`Photo ${slot + 1}`} shape="landscape" helper="Public gallery slot" />
                  <button
                    type="submit"
                    className="mt-2 h-8 w-full rounded bg-red-600 px-3 text-[10px] font-black uppercase text-white transition hover:bg-red-700"
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

      {video && videoFullscreenOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6" role="dialog" aria-modal="true" aria-label="Full screen club video">
          <div className="relative w-full max-w-6xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl">
            <button
              type="button"
              onClick={() => setVideoFullscreenOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-red-600"
              aria-label="Close full screen club video"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <div className="aspect-video bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={video.label ?? "Club video"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center bg-cover bg-center p-8 text-center"
                  style={videoThumbnailUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.9)), url(${videoThumbnailUrl})` } : undefined}
                >
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center bg-white px-6 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50">
                    Open video
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">Full Screen Video</p>
                <p className="mt-1 text-lg font-black text-white">{video.label ?? "Club video"}</p>
              </div>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center border border-white/20 bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-red-50">
                Open video
              </a>
            </div>
          </div>
        </div>
      ) : null}

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
