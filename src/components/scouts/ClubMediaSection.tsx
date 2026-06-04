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
  returnTo?: string;
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

export default function ClubMediaSection({ scoutId, teamId, media, isMember, returnTo }: ClubMediaSectionProps) {
  const video = media.find((m) => m.media_type === "video") ?? null;
  const photos = media.filter((m) => m.media_type === "photo").sort((a, b) => a.display_order - b.display_order);
  const embedUrl = video ? getVideoEmbedUrl(video.url, video.provider) : null;

  const isEmpty = !video && photos.length === 0;
  if (isEmpty && !isMember) return null;

  return (
    <section className="space-y-5">
      <p className="text-sm font-black uppercase text-red-500">Club Media</p>

      <div>
        {video ? (
          <div className="relative overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
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
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((slot) => {
            const photo = photos[slot];

            if (photo) {
              return (
                <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/15">
                  {/* Next.js <Image> not used intentionally — external URL origin is unknown at build time */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Club photo ${slot + 1}`} className="h-full w-full object-cover" />
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
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#1a1a1a] p-3"
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
                    className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white file:mr-2 file:rounded file:border-0 file:bg-red-600 file:px-2 file:py-1 file:text-[10px] file:font-black file:text-white focus:border-red-500 focus:outline-none"
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
                className="flex aspect-[4/3] items-end rounded-lg border border-dashed border-white/15 bg-[#1a1a1a] p-4"
              >
                <p className="text-xs font-black uppercase text-white/35">Photo {slot + 1}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
