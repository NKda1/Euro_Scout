import { deleteClubMediaAction, saveClubVideoAction, saveClubPhotoAction } from "@/app/actions/club";

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
}

function getVideoEmbedUrl(url: string, provider: string | null): string | null {
  if (provider === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (provider === "vimeo" || url.includes("vimeo.com")) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return null;
}

export default function ClubMediaSection({ scoutId, teamId, media, isMember }: ClubMediaSectionProps) {
  const video = media.find((m) => m.media_type === "video") ?? null;
  const photos = media.filter((m) => m.media_type === "photo").sort((a, b) => a.display_order - b.display_order);
  const embedUrl = video ? getVideoEmbedUrl(video.url, video.provider) : null;

  const isEmpty = !video && photos.length === 0;
  if (isEmpty && !isMember) return null;

  return (
    <section className="space-y-6">
      <p className="eyebrow-red">Club Media</p>

      {/* ── Team Video ─────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Team Video</p>

        {video ? (
          <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  title={video.label ?? "Team video"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-video items-center justify-center"
              >
                <span className="font-bold text-white">Watch video ↗</span>
              </a>
            )}

            {(video.label || video.provider) && (
              <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-3">
                {video.label && <p className="flex-1 text-sm font-bold text-white">{video.label}</p>}
                {video.provider && (
                  <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    {video.provider}
                  </span>
                )}
              </div>
            )}

            {isMember && (
              <form action={deleteClubMediaAction} className="absolute right-3 top-3">
                <input type="hidden" name="media_id" value={video.id} />
                <input type="hidden" name="team_id" value={teamId} />
                <input type="hidden" name="scout_id" value={scoutId} />
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
          /* TODO: Replace URL-based input with Supabase Storage upload when file upload infrastructure is enabled */
          <form
            action={saveClubVideoAction}
            className="space-y-3 rounded-2xl border-2 border-dashed border-slate-300 p-5 dark:border-white/15"
          >
            <input type="hidden" name="team_id" value={teamId} />
            <input type="hidden" name="scout_id" value={scoutId} />
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Add team video</p>
            <input
              type="url"
              name="url"
              required
              placeholder="YouTube or Vimeo URL"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            <input
              type="text"
              name="label"
              placeholder="Label (optional, e.g. 2025 Season Highlights)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-red-400 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700"
            >
              Save video
            </button>
          </form>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-bold text-slate-400">No team video yet</p>
          </div>
        )}
      </div>

      {/* ── Photos (3 slots) ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Photos</p>
          <span className="text-xs font-bold text-slate-400">{photos.length} / 3</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((slot) => {
            const photo = photos[slot];

            if (photo) {
              return (
                <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  {/* Next.js <Image> not used intentionally — external URL origin is unknown at build time */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Club photo ${slot + 1}`} className="h-full w-full object-cover" />
                  {isMember && (
                    <form action={deleteClubMediaAction} className="absolute right-1.5 top-1.5">
                      <input type="hidden" name="media_id" value={photo.id} />
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="scout_id" value={scoutId} />
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
                /* TODO: Replace URL-based input with Supabase Storage upload when file upload infrastructure is enabled */
                <form
                  key={`slot-${slot}`}
                  action={saveClubPhotoAction}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3 dark:border-white/15"
                >
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="scout_id" value={scoutId} />
                  <input type="hidden" name="display_order" value={slot} />
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Photo {slot + 1}</p>
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="Image URL"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-red-400 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-red-700"
                  >
                    Add
                  </button>
                </form>
              );
            }

            return (
              <div
                key={`empty-${slot}`}
                className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Photo {slot + 1}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
