import { Activity, Hash, Shield, Target, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CareerStats = Record<string, unknown>;

interface CareerStatsPanelProps {
  stats?: CareerStats | null;
}

function labelForKey(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Pbus", "PBUs")
    .replace("Tfls", "TFLs")
    .replace("Fg", "FG")
    .replace("Xp", "XP");
}

function numericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iconForKey(key: string): LucideIcon {
  if (key.includes("touchdown") || key.includes("score")) return Trophy;
  if (key.includes("target") || key.includes("reception") || key.includes("catch")) return Target;
  if (key.includes("tackle") || key.includes("interception") || key.includes("breakup") || key.includes("sack")) return Shield;
  if (key.includes("yard") || key.includes("carry") || key.includes("rush")) return Zap;
  if (key.includes("percentage") || key.includes("rate")) return Activity;
  return Hash;
}

export default function CareerStatsPanel({ stats }: CareerStatsPanelProps) {
  const rows = Object.entries(stats ?? {})
    .map(([key, value]) => [key, numericValue(value)] as const)
    .filter(([, value]) => value != null && value > 0);

  if (!rows.length) return null;

  return (
    <section>
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Career Stats</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([key, value]) => {
          const safeValue = value ?? 0;
          const Icon = iconForKey(key);
          return (
            <div key={key} className="flex items-center gap-3 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">{labelForKey(key)}</p>
                <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{safeValue}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
