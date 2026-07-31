import { normaliseSeasonStats, POSITION_STAT_FIELDS } from "@/lib/player-stats";

interface CareerStatsPanelProps {
  stats?: Record<string, unknown> | null;
  position?: string | null;
}

function displayValue(value: number | null | undefined, unit?: string) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
}

export default function CareerStatsPanel({ stats, position }: CareerStatsPanelProps) {
  const seasons = normaliseSeasonStats(stats, position);
  if (!seasons.length) return null;

  const fieldMap = new Map<string, { key: string; label: string; shortLabel?: string; unit?: string }>();
  for (const season of seasons) {
    for (const field of POSITION_STAT_FIELDS[season.positionGroup] ?? []) fieldMap.set(field.key, field);
  }
  for (const season of seasons) {
    for (const key of Object.keys(season.stats)) {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, { key, label: key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) });
      }
    }
  }
  const fields = Array.from(fieldMap.values());

  return (
    <section aria-labelledby="career-statistics-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Performance</p>
          <h2 id="career-statistics-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Season statistics</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-white/40">Scroll horizontally to compare every column</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
              <th className="sticky left-0 z-10 min-w-40 bg-slate-50 px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-[#171717] dark:text-white/35">Club</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Season</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Games</th>
              {fields.map((field) => (
                <th key={field.key} title={field.label} className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">
                  {field.shortLabel ?? field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {seasons.map((season) => (
              <tr key={season.id} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.025]">
                <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-black text-slate-950 dark:bg-[#111] dark:text-white">
                  <span className="block max-w-52 truncate">{season.club || "Unlisted club"}</span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] text-red-600 dark:text-red-400">{season.positionGroup}</span>
                </th>
                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-600 dark:text-white/55">{season.season || "—"}</td>
                <td className="px-3 py-3 text-right font-black tabular-nums text-slate-900 dark:text-white">{displayValue(season.games)}</td>
                {fields.map((field) => (
                  <td key={field.key} className="px-3 py-3 text-right font-black tabular-nums text-slate-900 dark:text-white">
                    {displayValue(season.stats[field.key], field.unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
