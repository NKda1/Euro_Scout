import type { League } from "@/types";
import { marketTierLabels } from "@/lib/data";

const marketTierClass: Record<League["marketTier"], string> = {
  gold: "border-amber-400 bg-amber-100 text-amber-950 shadow-sm dark:border-amber-300/45 dark:bg-amber-400/20 dark:text-amber-100",
  silver: "border-slate-400 bg-slate-200 text-slate-950 shadow-sm dark:border-slate-300/35 dark:bg-slate-300/20 dark:text-slate-100",
  bronze: "border-orange-400 bg-orange-100 text-orange-950 shadow-sm dark:border-orange-400/35 dark:bg-orange-500/20 dark:text-orange-100"
};

export default function MarketTierBadge({ tier }: { tier: League["marketTier"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase ${marketTierClass[tier]}`}>
      {marketTierLabels[tier]}
    </span>
  );
}
