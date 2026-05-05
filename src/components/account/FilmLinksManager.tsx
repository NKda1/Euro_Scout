import { deleteFilmLinkAction, saveFilmLinkAction } from "@/app/actions/film";
import type { FilmLink } from "@/components/players/HudlFilmViewer";

const inputClass = "mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20";

export default function FilmLinksManager({ filmLinks }: { filmLinks: FilmLink[] }) {
  return (
    <section className="rounded-3xl border border-red-100 bg-red-50/40 p-5 dark:border-red-400/20 dark:bg-red-500/10">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Hudl Film Links</p>
      <form action={saveFilmLinkAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <input name="label" placeholder="Label, e.g. 2026 highlights" className={inputClass} />
        <select name="film_type" defaultValue="highlights" className={inputClass}>
          <option value="highlights">Highlights</option>
          <option value="game_film">Game Film</option>
          <option value="combine">Combine</option>
          <option value="college_bucs">College/BUCS</option>
          <option value="training">Training</option>
        </select>
        <input name="url" required placeholder="Hudl URL" className={`${inputClass} md:col-span-2`} />
        <label className="flex items-center gap-3 rounded-2xl border border-red-100 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 backdrop-blur-xl dark:border-red-400/20 dark:bg-white/10 dark:text-slate-200">
          <input name="is_default" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-red-600" />
          Set as default film
        </label>
        <button className="h-11 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">Add Hudl film</button>
      </form>

      <div className="mt-5 space-y-3">
        {filmLinks.map((film) => (
          <div key={film.id} className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">{film.label ?? "Hudl film"}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{film.film_type} {film.is_default ? "· Default" : ""}</p>
              </div>
              <form action={deleteFilmLinkAction}>
                <input type="hidden" name="film_id" value={film.id} />
                <button className="h-9 rounded-xl border border-red-200 bg-white px-3 text-xs font-black uppercase tracking-wide text-red-700 transition hover:bg-red-50 dark:border-red-400/30 dark:bg-white/10 dark:text-red-200">Remove</button>
              </form>
            </div>
            <details className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/40">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300">Edit film link</summary>
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
                <label className="flex items-center gap-3 rounded-2xl border border-red-100 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 backdrop-blur-xl dark:border-red-400/20 dark:bg-white/10 dark:text-slate-200">
                  <input name="is_default" type="checkbox" defaultChecked={film.is_default} className="h-4 w-4 rounded border-slate-300 text-red-600" />
                  Set as default film
                </label>
                <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-red-700 dark:bg-white dark:text-slate-950 dark:hover:bg-red-100">Save changes</button>
              </form>
            </details>
          </div>
        ))}
        {filmLinks.length === 0 ? <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No Hudl film links yet.</p> : null}
      </div>
    </section>
  );
}
