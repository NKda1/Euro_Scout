import type { League } from "@/types";
import { marketTierLabels } from "@/lib/data";

const marketTierClass: Record<League["marketTier"], string> = {
  gold: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/35 dark:bg-amber-400/15 dark:text-amber-100",
  silver: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-300/25 dark:bg-slate-300/15 dark:text-slate-100",
  bronze: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-300/25 dark:bg-orange-400/12 dark:text-orange-100"
};

export default function MarketTierBadge({ tier }: { tier: League["marketTier"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${marketTierClass[tier]}`}>
      {marketTierLabels[tier]}
    </span>
  );
}
