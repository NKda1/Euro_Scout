import { BadgeCheck, Clock, Eye, ShieldCheck } from "lucide-react";

interface TrustSignal {
  label: string;
  value: string;
  tone?: "green" | "amber" | "slate" | "red";
}

const toneClasses = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
  red: "border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200"
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function lastActiveLabel(value?: string | null) {
  if (!value) return "Activity unknown";
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (diffDays <= 0) return "Active today";
  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 30) return `Active ${diffDays} days ago`;
  return `Updated ${formatDate(value)}`;
}

export default function TrustSignals({ signals }: { signals: TrustSignal[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {signals.map((signal, index) => {
        const Icon = index === 0 ? ShieldCheck : index === 1 ? Clock : index === 2 ? Eye : BadgeCheck;
        return (
          <div key={signal.label} className={`border p-4 ${toneClasses[signal.tone ?? "slate"]}`}>
            <div className="flex items-center gap-2">
              <Icon aria-hidden className="h-4 w-4" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">{signal.label}</p>
            </div>
            <p className="mt-2 text-sm font-black">{signal.value}</p>
          </div>
        );
      })}
    </div>
  );
}
