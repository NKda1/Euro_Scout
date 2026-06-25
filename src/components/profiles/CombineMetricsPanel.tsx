import { Activity, ArrowUp, Dumbbell, Gauge, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CombineMetricsPanelProps {
  fortyYardDash?: number | null;
  shuttleSeconds?: number | null;
  verticalJumpInches?: number | null;
  broadJumpFeet?: number | null;
  benchReps?: number | null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CombineMetricsPanel({
  fortyYardDash,
  shuttleSeconds,
  verticalJumpInches,
  broadJumpFeet,
  benchReps
}: CombineMetricsPanelProps) {
  const rows: Array<[string, number | null, string, LucideIcon]> = [
    ["40 yd", numberValue(fortyYardDash), "sec", Timer],
    ["Shuttle", numberValue(shuttleSeconds), "sec", Gauge],
    ["Vertical", numberValue(verticalJumpInches), "in", ArrowUp],
    ["Broad", numberValue(broadJumpFeet), "ft", Activity],
    ["Bench", numberValue(benchReps), "reps", Dumbbell]
  ];
  const hasMetrics = rows.some(([, value]) => value != null);

  if (!hasMetrics) return null;

  return (
    <section>
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Combine Metrics</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {rows.map(([label, value, unit, Icon]) => (
          <div key={label} className="flex items-center gap-3 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">{label}</p>
              <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                {value == null ? "Not listed" : `${value} ${unit}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
