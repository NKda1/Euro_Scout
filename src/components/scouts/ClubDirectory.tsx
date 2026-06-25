import Link from "next/link";
import type { Profile } from "@/lib/auth";

export interface ClubDirectoryItem {
  profile_id: string;
  club_role: string;
  team_id: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    claim_status: string | null;
    recruiting_active: boolean | null;
    open_roster_spots: number | null;
  };
  profiles: Profile;
}

export default function ClubDirectory({ clubs }: { clubs: ClubDirectoryItem[] }) {
  if (clubs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <h2 className="text-sm font-black text-slate-950 dark:text-white">No club accounts yet</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Verified club accounts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {clubs.map((club) => (
        <Link
          key={club.team_id}
          href={`/scouts/${club.team_id}`}
          className="rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              {club.teams.claim_status === "verified" ? "Verified Club" : "Club"}
            </p>
            {club.teams.recruiting_active && (
              <span className="rounded-full border border-green-300 bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-950 shadow-sm dark:border-green-400/35 dark:bg-green-500/15 dark:text-green-100">
                Recruiting
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{club.teams.name}</h2>
          {(club.teams.city || club.teams.country) && (
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {[club.teams.city, club.teams.country].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{club.profiles.headline ?? club.profiles.display_name}</p>
          {club.teams.open_roster_spots != null && club.teams.open_roster_spots > 0 && (
            <div className="mt-4">
              <span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-black text-red-950 shadow-sm dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-100">
                {club.teams.open_roster_spots} open spot{club.teams.open_roster_spots !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
