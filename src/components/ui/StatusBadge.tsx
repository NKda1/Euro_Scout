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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide",
        status === "active" && "border-emerald-400 bg-emerald-100 text-emerald-950 shadow-sm dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100",
        status === "inactive" && "border-slate-400 bg-slate-200 text-slate-950 shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-slate-100",
        status === "coming-soon" && "border-amber-400 bg-amber-100 text-amber-950 shadow-sm dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-100"
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
