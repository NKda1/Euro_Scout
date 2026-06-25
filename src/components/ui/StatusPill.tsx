import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "red" | "green" | "blue" | "indigo" | "amber";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-slate-400 bg-slate-200 text-slate-950 shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-white/80",
  red: "border-red-300 bg-red-100 text-red-950 shadow-sm dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-100",
  green: "border-emerald-300 bg-emerald-100 text-emerald-950 shadow-sm dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100",
  blue: "border-blue-300 bg-blue-100 text-blue-950 shadow-sm dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-100",
  indigo: "border-indigo-300 bg-indigo-100 text-indigo-950 shadow-sm dark:border-indigo-400/35 dark:bg-indigo-500/15 dark:text-indigo-100",
  amber: "border-amber-300 bg-amber-100 text-amber-950 shadow-sm dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-100"
};

export default function StatusPill({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center border px-3 py-1 text-xs font-black uppercase", toneClass[tone], className)}>
      {children}
    </span>
  );
}
