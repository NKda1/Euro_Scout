import type { League } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";

export default function LeagueHeader({ league }: { league: League }) {
  return (
    <header className="glass-card p-6 sm:p-8">
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">{league.shortName}</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{league.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{league.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TierBadge tier={league.tier} />
          <StatusBadge status={league.status} />
        </div>
      </div>
    </header>
  );
}
