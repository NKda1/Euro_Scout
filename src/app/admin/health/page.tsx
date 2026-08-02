import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile } from "@/lib/auth";
import { getProductionHealth, type HealthStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Health | EuroScout Pro",
  description: "Live integration and platform health for EuroScout Pro."
};

const tone: Record<HealthStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
  degraded: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
  down: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200"
};

function when(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "No event recorded";
}

export default async function AdminHealthPage() {
  await requireAdminProfile();
  const health = await getProductionHealth();
  const healthy = health.filter((item) => item.status === "healthy").length;

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Operations" title="Production health." description={`${healthy} of ${health.length} services are healthy. Probes are read-only and run when this protected page loads.`} />
        <AdminNav />
        <div className="flex justify-end">
          <Link href={`/admin/health?refresh=${Date.now()}`} className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
            Run probes again
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {health.map((item) => (
            <article key={item.service} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">{item.service}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{item.label}</h2>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone[item.status]}`}>{item.status}</span>
              </div>
              <p className="mt-4 min-h-12 text-sm font-semibold leading-6 text-slate-600 dark:text-white/55">{item.detail}</p>
              <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs dark:border-white/10">
                <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">Response</dt><dd className="font-black text-slate-700 dark:text-white/70">{item.responseTimeMs === null ? "—" : `${item.responseTimeMs} ms`}</dd></div>
                <div><dt className="font-bold text-slate-400">Last success</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-white/70">{when(item.lastSuccess)}</dd></div>
                <div><dt className="font-bold text-slate-400">Last failure</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-white/70">{when(item.lastFailure)}</dd></div>
              </dl>
              {item.lastError ? <p className="mt-3 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">{item.lastError}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
