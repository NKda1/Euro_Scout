import Link from "next/link";
import type { Metadata } from "next";
import { Bell, Eye, Inbox, ShieldAlert, Star, Users } from "lucide-react";
import { requireOnboardedProfile } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";
import { EmptyState } from "@/components/ui/StateDisplay";

export const metadata: Metadata = {
  title: "Notifications | EuroScout Pro",
  description: "EuroScout Pro notification center."
};

function NotificationCard({
  title,
  description,
  count,
  href,
  label,
  icon: Icon
}: {
  title: string;
  description: string;
  count: number;
  href: string;
  label: string;
  icon: typeof Bell;
}) {
  return (
    <Link href={href} className="group block border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/40 dark:hover:bg-red-500/10">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className={`min-w-8 px-2 py-1 text-center text-sm font-black ${count ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/45"}`}>
          {count}
        </span>
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-950 group-hover:text-red-700 dark:text-white dark:group-hover:text-red-200">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{description}</p>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">{label}</p>
    </Link>
  );
}

export default async function NotificationsPage() {
  const { profile } = await requireOnboardedProfile();
  const summary = await getNotificationSummary(profile);

  const cards = [
    {
      title: "Messages",
      description: "Unread replies from club-player conversations and account inbox threads.",
      count: summary.unreadMessages,
      href: "/messages",
      label: "Open inbox",
      icon: Inbox
    },
    ...(profile.role === "club"
      ? [
          {
            title: "Club interest",
            description: "Players who expressed interest in your club and recruitment activity around your team.",
            count: summary.clubInterest,
            href: "/account",
            label: "Review interest",
            icon: Star
          },
          {
            title: "Watchlist updates",
            description: "Recent additions to your recruitment watchlists from the last seven days.",
            count: summary.watchlistUpdates,
            href: "/watchlists",
            label: "Open watchlists",
            icon: Users
          }
        ]
      : []),
    ...(profile.role === "player"
      ? [
          {
            title: "Profile views",
            description: "Authenticated profile views from clubs, journalists, admins and other players this week.",
            count: summary.profileViews,
            href: "/analytics",
            label: "View profile analytics",
            icon: Eye
          }
        ]
      : []),
    ...(profile.role === "admin"
      ? [
          {
            title: "Admin alerts",
            description: "Pending club claims and open dispute items that need platform review.",
            count: summary.adminAlerts,
            href: "/admin",
            label: "Open control room",
            icon: ShieldAlert
          }
        ]
      : [])
  ];

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="eyebrow-red">Notifications</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white">Notification center</h1>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">
            One place for messages, recruitment activity, profile attention and admin review alerts.
          </p>
        </div>

        {summary.total ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <NotificationCard key={card.title} {...card} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No new notifications"
              description="Messages, profile views, interest alerts and admin tasks will appear here when there is something to review."
              actionHref="/dashboard"
              actionLabel="Back to dashboard"
            />
          </div>
        )}
      </section>
    </main>
  );
}
