import type { League } from "@/types";

const tierLabel: Record<League["tier"], string> = {
  continental: "Continental",
  national: "National",
  premier: "Premier",
  university: "University",
  junior: "Junior"
};

export default function TierBadge({ tier }: { tier: League["tier"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-red-950 shadow-sm dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-100">
      {tierLabel[tier]}
    </span>
  );
}
