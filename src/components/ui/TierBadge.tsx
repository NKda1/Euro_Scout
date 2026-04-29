import type { League } from "@/types";

const tierLabel: Record<League["tier"], string> = {
  continental: "Continental",
  national: "National",
  premier: "Premier"
};

export default function TierBadge({ tier }: { tier: League["tier"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
      {tierLabel[tier]}
    </span>
  );
}
