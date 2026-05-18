import type { League } from "@/types";
import { marketTierLabels } from "@/lib/data";

const marketTierClass: Record<League["marketTier"], string> = {
  gold: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/40 dark:bg-amber-400/20 dark:text-amber-200",
  silver: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-300/25 dark:bg-slate-300/20 dark:text-slate-200",
  bronze: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/20 dark:text-orange-300"
};

export default function MarketTierBadge({ tier }: { tier: League["marketTier"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${marketTierClass[tier]}`}>
      {marketTierLabels[tier]}
    </span>
  );
}
