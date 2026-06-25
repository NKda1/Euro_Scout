import Link from "next/link";
import { AlertTriangle, Inbox, RefreshCw, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "neutral" | "danger" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-300",
  danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
};

interface NoticeProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}

export function Notice({ tone = "neutral", title, children, actionHref, actionLabel }: NoticeProps) {
  const Icon = tone === "danger" ? AlertTriangle : tone === "warning" ? AlertTriangle : tone === "success" ? RefreshCw : Inbox;

  return (
    <div className={`flex flex-col gap-3 border p-4 sm:flex-row sm:items-start sm:justify-between ${toneClasses[tone]}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-current/20">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <div>
          {title ? <p className="text-sm font-black">{title}</p> : null}
          <div className="text-sm font-semibold leading-6 opacity-80">{children}</div>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex h-10 shrink-0 items-center justify-center bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111] ${className}`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{description}</p>
      {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {actionHref && actionLabel ? (
            <Link href={actionHref} className="inline-flex h-11 items-center bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              {actionLabel}
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="inline-flex h-11 items-center border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/80 dark:bg-white/10 ${className}`} />;
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-12 w-full max-w-xl" />
        <SkeletonBlock className="mt-4 h-5 w-full max-w-2xl" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
              <SkeletonBlock className="h-36 w-full" />
              <SkeletonBlock className="mt-4 h-5 w-3/4" />
              <SkeletonBlock className="mt-3 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
