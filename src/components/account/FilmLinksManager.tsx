import { deleteFilmLinkAction, saveFilmLinkAction } from "@/app/actions/film";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import VideoLinkComposer from "@/components/account/VideoLinkComposer";
import FilmSubmitButton from "@/components/account/FilmSubmitButton";
import FilmUploadGuide from "@/components/account/FilmUploadGuide";
import { detectVideoProvider, getEmbeddableVideoUrl, getVideoProviderLabel, getVideoThumbnailUrl, normalizeVideoUrl } from "@/lib/video";
import { Youtube } from "lucide-react";

const inputClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-red-500";
const filmTypeLabels: Record<string, string> = {
  highlights: "Highlights",
  game_film: "Game Film",
  combine: "Combine"
};
const HUDL_DEFAULT_THUMBNAIL = "/images/PlaceHolder.PNG";
const LEGACY_HUDL_THUMBNAIL = "/images/film-placeholder.svg";

function normaliseFilmType(value: string) {
  return filmTypeLabels[value] ? value : "highlights";
}

export default function FilmLinksManager({ filmLinks }: { filmLinks: FilmLink[] }) {
  const defaultFilm = filmLinks.find((film) => film.is_default) ?? filmLinks[0] ?? null;
  const defaultUrl = defaultFilm ? normalizeVideoUrl(defaultFilm.url) : "";
  const defaultProvider = defaultFilm ? detectVideoProvider(defaultFilm.url) : "hudl";
  const defaultProviderLabel = getVideoProviderLabel(defaultProvider);
  const defaultEmbedUrl = defaultFilm ? getEmbeddableVideoUrl(defaultFilm.url) : null;
  const defaultThumbnailUrl = defaultFilm
    ? defaultFilm.thumbnail_url
      && defaultFilm.thumbnail_url !== LEGACY_HUDL_THUMBNAIL
      ? defaultFilm.thumbnail_url
      : getVideoThumbnailUrl(defaultFilm.url)
        ?? (defaultProvider === "hudl" ? HUDL_DEFAULT_THUMBNAIL : null)
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950 dark:text-white">Film reel</p>
        <FilmUploadGuide />
      </div>

      {/* YouTube recommendation */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.07] p-3">
        <Youtube className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-400">Host on YouTube for the best experience</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-white/50">
            YouTube film embeds directly in your profile so scouts can watch without leaving EuroScout. Hudl links open externally. Upload your highlights to YouTube, set the video to <strong className="text-white/70">Unlisted</strong>, then paste the link here — your profile gets a live preview and every view is tracked.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/15 bg-black/30">
        <div className="aspect-video">
          {defaultThumbnailUrl ? (
            <div
              className="flex h-full items-end bg-cover bg-center p-6"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.78)), url(${defaultThumbnailUrl})` }}
            >
              <div>
                <p className="text-xs font-black uppercase text-red-400">{defaultProviderLabel} thumbnail</p>
                <p className="mt-2 text-xl font-black text-white">{defaultFilm.label ?? "Player film"}</p>
              </div>
            </div>
          ) : defaultFilm && defaultEmbedUrl ? (
            <iframe
              src={defaultEmbedUrl}
              title={defaultFilm.label ?? "Player film"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          ) : defaultFilm ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <p className="text-xs font-black uppercase text-red-500">{defaultProviderLabel} preview</p>
                <p className="mt-2 text-xl font-black text-white">Open this film in a new tab.</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/45">
                  Hudl and some film providers block iframe playback, but the saved link is ready to use.
                </p>
                <a
                  href={defaultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
                >
                  Watch on {defaultProviderLabel}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="text-xs font-black uppercase text-red-500">Film preview</p>
                <p className="mt-2 text-xl font-black text-white">No video link yet.</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-black uppercase text-white/35">Default preview</p>
          <p className="mt-1 text-base font-black text-white">{defaultFilm?.label ?? "Add a Hudl, YouTube or Vimeo link"}</p>
        </div>
      </div>

      <form action={saveFilmLinkAction} className="mt-4 grid gap-3">
        <VideoLinkComposer showThumbnailField />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select name="film_type" defaultValue="highlights" className={inputClass}>
          <option value="highlights">Highlights</option>
          <option value="game_film">Game Film</option>
          <option value="combine">Combine</option>
        </select>
        <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
          <input name="is_default" type="checkbox" className="h-4 w-4 rounded border-white/20 text-red-600" />
          Set as default film
        </label>
        <FilmSubmitButton label="Add film" />
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {filmLinks.map((film) => (
          <div key={film.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">{film.label ?? "Player film"}</p>
                <p className="mt-1 text-xs font-semibold text-white/35">
                  {filmTypeLabels[normaliseFilmType(film.film_type)]} {film.is_default ? "- Default" : ""} {film.thumbnail_url ? "- Thumbnail set" : ""}
                </p>
              </div>
              <form action={deleteFilmLinkAction}>
                <input type="hidden" name="film_id" value={film.id} />
                <button className="h-9 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-black uppercase tracking-wide text-red-200 transition hover:bg-red-600 hover:text-white">Remove</button>
              </form>
            </div>
            <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase text-white/35 transition hover:text-red-400">Edit film link</summary>
              <form action={saveFilmLinkAction} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="film_id" value={film.id} />
                <input name="label" defaultValue={film.label ?? ""} placeholder="Label" className={inputClass} />
                <select name="film_type" defaultValue={normaliseFilmType(film.film_type)} className={inputClass}>
                  <option value="highlights">Highlights</option>
                  <option value="game_film">Game Film</option>
                  <option value="combine">Combine</option>
                </select>
                <input name="url" required defaultValue={film.url} placeholder="Hudl, YouTube or Vimeo URL" className={`${inputClass} md:col-span-2`} />
                <input name="thumbnail_url" type="url" defaultValue={film.thumbnail_url ?? ""} placeholder="Thumbnail image URL (optional)" className={`${inputClass} md:col-span-2`} />
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="is_default" type="checkbox" defaultChecked={film.is_default} className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Set as default film
                </label>
        <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">Save changes</button>
              </form>
            </details>
          </div>
        ))}
        {filmLinks.length === 0 ? <p className="text-sm font-semibold text-white/45">No film links yet.</p> : null}
      </div>
    </section>
  );
}
