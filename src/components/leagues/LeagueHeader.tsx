import type { League } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";

export default function LeagueHeader({ league }: { league: League }) {
  return (
    <header className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600">{league.shortName}</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">{league.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{league.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TierBadge tier={league.tier} />
          <StatusBadge status={league.status} />
        </div>
      </div>
    </header>
  );
}
