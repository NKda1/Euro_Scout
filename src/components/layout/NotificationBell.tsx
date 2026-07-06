"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, Bell, Eye, Inbox, PhoneCall, ShieldAlert, Star, UserPlus, Users } from "lucide-react";
import type { NotificationSummary } from "@/lib/notifications";
import { routes } from "@/constants/routes";

interface NotificationBellProps {
  summary: NotificationSummary;
}

const notificationItems = [
  { key: "unreadMessages", label: "Messages", href: routes.messages, icon: Inbox },
  { key: "callRequests", label: "Call bookings", href: routes.account, icon: PhoneCall },
  { key: "staffInvites", label: "Staff invites", href: routes.dashboard, icon: UserPlus },
  { key: "clubInterest", label: "Club interest", href: routes.account, icon: Star },
  { key: "watchlistUpdates", label: "Watchlists", href: "/watchlists", icon: Users },
  { key: "profileViews", label: "Profile views", href: routes.analytics, icon: Eye },
  { key: "articleEngagement", label: "Article opens", href: routes.analytics, icon: BarChart3 },
  { key: "adminAlerts", label: "Admin alerts", href: routes.admin, icon: ShieldAlert }
] as const;

export default function NotificationBell({ summary }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleItems = notificationItems
    .map((item) => ({ ...item, count: summary[item.key] }))
    .filter((item) => item.count > 0);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      >
        <Bell aria-hidden className="h-5 w-5" />
        {summary.total ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#090909]">
            {summary.total > 9 ? "9+" : summary.total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[3.25rem] z-50 w-[min(22rem,calc(100vw-2rem))] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101010]">
          <div className="border-b border-slate-200 p-4 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Notifications</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-white/45">
              {summary.total ? `${summary.total} item${summary.total === 1 ? "" : "s"} need attention` : "No new notifications"}
            </p>
          </div>

          {visibleItems.length ? (
            <div className="max-h-80 overflow-y-auto">
              {visibleItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      <Icon aria-hidden className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{item.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-white/45">
                        {item.count} new
                      </span>
                    </span>
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
                Messages, calls, profile attention and role-specific alerts will appear here when there is something new.
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 p-3 dark:border-white/10">
            <Link
              href={routes.notifications}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700"
            >
              View notification center
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
