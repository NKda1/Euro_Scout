import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { teams } from "@/lib/data";
import { requireAdminProfile, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Players | EuroScout Pro",
  description: "Audit EuroScout Pro player profiles and film links."
};

interface AdminPlayerRow {
  id: string;
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  position: string | null;
  current_team_id: string | null;
  available_for_transfer: boolean;
  photo_urls: string[] | null;
  updated_at: string;
  profiles: Profile;
}

interface FilmCountRow {
  player_profile_id: string;
}

export default async function AdminPlayersPage() {
  const { supabase } = await requireAdminProfile();
  const [{ data: players, error }, { data: films }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select(
        `
          id,
          profile_id,
          first_name,
          last_name,
          nationality,
          position,
          current_team_id,
          available_for_transfer,
          photo_urls,
          updated_at,
          profiles!inner (*)
        `
      )
      .order("updated_at", { ascending: false })
      .returns<AdminPlayerRow[]>(),
    supabase.from("film_links").select("player_profile_id").returns<FilmCountRow[]>()
  ]);

  const filmCounts = new Map<string, number>();
  (films ?? []).forEach((film) => filmCounts.set(film.player_profile_id, (filmCounts.get(film.player_profile_id) ?? 0) + 1));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin Players" title="Player readiness audit." description="Review player profile completion signals: position, team, availability, pictures and Hudl film coverage." />
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error.message}</p> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {(players ?? []).map((player) => {
            const team = teams.find((item) => item.id === player.current_team_id);
            const filmCount = filmCounts.get(player.id) ?? 0;
            const photoCount = player.photo_urls?.length ?? 0;

            return (
              <Link key={player.id} href={`/players/${player.profile_id}`} className="rounded-3xl glass-card p-5 transition hover:border-red-200 hover:shadow-md dark:hover:border-red-400/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">{player.position ?? "Position missing"}</p>
                    <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{player.profiles.display_name}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{team?.name ?? "No current team"} · {player.nationality ?? "Nationality missing"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${player.available_for_transfer ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                    {player.available_for_transfer ? "Available" : "Not listed"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                    <p className="text-xl font-black text-slate-950 dark:text-white">{filmCount}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Films</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                    <p className="text-xl font-black text-slate-950 dark:text-white">{photoCount}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Photos</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                    <p className="text-xl font-black text-slate-950 dark:text-white">{player.profiles.is_public ? "Yes" : "No"}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Public</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
