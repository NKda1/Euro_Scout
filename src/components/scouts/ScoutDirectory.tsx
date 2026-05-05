import Link from "next/link";
import type { Profile } from "@/lib/auth";

export interface ScoutDirectoryItem {
  id: string;
  profile_id: string;
  organization: string | null;
  focus_regions: string[] | null;
  focus_positions: string[] | null;
  years_experience: number | null;
  profiles: Profile;
}

export default function ScoutDirectory({ scouts }: { scouts: ScoutDirectoryItem[] }) {
  if (scouts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <h2 className="text-sm font-black text-slate-950 dark:text-white">No scout profiles yet</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Public scout and coach accounts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {scouts.map((scout) => (
        <Link key={scout.id} href={`/scouts/${scout.profile_id}`} className="rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">{scout.profiles.role}</p>
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{scout.profiles.display_name}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{scout.organization ?? scout.profiles.headline ?? "EuroScout network"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(scout.focus_regions ?? []).slice(0, 3).map((region) => (
              <span key={region} className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">{region}</span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
