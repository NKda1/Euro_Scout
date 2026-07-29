import type { LucideIcon } from "lucide-react";
import { Activity, Hash, Shield, Target, Trophy, Zap } from "lucide-react";

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
      <div className="mt-5 overflow-hidden border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30">
                Stat
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {rows.map(([key, value]) => {
              const Icon = iconForKey(key);
              return (
                <tr key={key} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-500 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                        <Icon aria-hidden className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-slate-600 dark:text-white/55">{labelForKey(key)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-base font-black text-slate-950 dark:text-white">
                    {value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

