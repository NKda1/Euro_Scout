import { deleteFilmLinkAction, saveFilmLinkAction } from "@/app/actions/film";
import type { FilmLink } from "@/components/players/HudlFilmViewer";

const inputClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-red-500";

function getVideoEmbedUrl(url: string): string {
  const youtube = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return url;
}

export default function FilmLinksManager({ filmLinks }: { filmLinks: FilmLink[] }) {
  const defaultFilm = filmLinks.find((film) => film.is_default) ?? filmLinks[0] ?? null;

  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
      <p className="text-sm font-black uppercase text-red-500">Film Links</p>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/15 bg-black/30">
        <div className="aspect-video">
          {defaultFilm ? (
            <iframe
              src={getVideoEmbedUrl(defaultFilm.url)}
              title={defaultFilm.label ?? "Player film"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
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

      <form action={saveFilmLinkAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <input name="label" placeholder="Label, e.g. 2026 highlights" className={inputClass} />
        <select name="film_type" defaultValue="highlights" className={inputClass}>
          <option value="highlights">Highlights</option>
          <option value="game_film">Game Film</option>
          <option value="combine">Combine</option>
          <option value="college_bucs">College/BUCS</option>
          <option value="training">Training</option>
        </select>
        <input name="url" required placeholder="Hudl, YouTube or Vimeo URL" className={`${inputClass} md:col-span-2`} />
        <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
          <input name="is_default" type="checkbox" className="h-4 w-4 rounded border-white/20 text-red-600" />
          Set as default film
        </label>
        <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">Add film</button>
      </form>

      <div className="mt-5 space-y-3">
        {filmLinks.map((film) => (
          <div key={film.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">{film.label ?? "Player film"}</p>
                <p className="mt-1 text-xs font-semibold text-white/35">{film.film_type} {film.is_default ? "- Default" : ""}</p>
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
                <select name="film_type" defaultValue={film.film_type} className={inputClass}>
                  <option value="highlights">Highlights</option>
                  <option value="game_film">Game Film</option>
                  <option value="combine">Combine</option>
                  <option value="college_bucs">College/BUCS</option>
                  <option value="training">Training</option>
                </select>
                <input name="url" required defaultValue={film.url} placeholder="Hudl URL" className={`${inputClass} md:col-span-2`} />
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
