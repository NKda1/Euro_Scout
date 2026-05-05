import type { League } from "@/types";
import { cn } from "@/lib/utils";

const statusLabel: Record<League["status"], string> = {
  active: "Active",
  inactive: "Inactive",
  "coming-soon": "Coming soon"
};

export default function StatusBadge({ status }: { status: League["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
        status === "inactive" && "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400",
        status === "coming-soon" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
