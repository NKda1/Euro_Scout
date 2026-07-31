import Link from "next/link";
import { Bell, CalendarClock, CheckCircle2, CircleUserRound, Crown, MessageSquare, MoveUpRight } from "lucide-react";

interface AccountWorkspaceOverviewProps {
  completion: number;
  unreadMessages: number;
  pendingCalls: number;
  planLabel: string;
  isPublic: boolean;
  publicHref: string;
  role: string;
  organisationName?: string | null;
}

export default function AccountWorkspaceOverview({
  completion,
  unreadMessages,
  pendingCalls,
  planLabel,
  isPublic,
  publicHref,
  role,
  organisationName
}: AccountWorkspaceOverviewProps) {
  const metrics = [
    { label: "Profile", value: `${completion}%`, detail: completion === 100 ? "Ready" : "Complete setup", icon: CircleUserRound, href: "#profile" },
    { label: "Messages", value: String(unreadMessages), detail: unreadMessages ? "Unread" : "Up to date", icon: MessageSquare, href: "/messages" },
    { label: "Calls", value: String(pendingCalls), detail: pendingCalls ? "Need attention" : "No pending", icon: CalendarClock, href: "#recruitment" },
    { label: "Membership", value: planLabel, detail: role === "journalist" ? "No paid plan needed" : "Account plan", icon: Crown, href: "#membership" }
  ];

  return (
    <section id="overview" className="scroll-mt-28 border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111] sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-500">Workspace overview</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isPublic ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/45"}`}>
              <CheckCircle2 className="h-3 w-3" aria-hidden /> {isPublic ? "Public" : "Private"}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
            {organisationName ? `${organisationName} workspace` : "Your account at a glance"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/notifications" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:text-white/55">
            <Bell className="h-4 w-4" aria-hidden /> Notifications
          </Link>
          <Link href={publicHref} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700">
            Public preview <MoveUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:divide-white/10 dark:border-white/10 dark:bg-black/20 lg:grid-cols-4 lg:divide-y-0">
        {metrics.map(({ label, value, detail, icon: Icon, href }) => (
          <Link key={label} href={href} className="group flex min-w-0 items-center gap-3 p-3 transition hover:bg-white dark:hover:bg-white/[0.04] sm:p-4">
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-300 sm:flex"><Icon className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-white/30">{label}</span>
              <span className="mt-0.5 block truncate text-lg font-black text-slate-950 dark:text-white">{value}</span>
              <span className="block truncate text-[11px] font-semibold text-slate-500 dark:text-white/35">{detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
