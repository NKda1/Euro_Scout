import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Bell, Eye, Inbox, PhoneCall, Settings, ShieldAlert, Star, UserPlus, Users } from "lucide-react";
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
  const { profile, user } = await requireOnboardedProfile();
  const summary = await getNotificationSummary(profile, user.email);

  const cards = [
    {
      title: "Messages",
      description: "Unread replies from club-player conversations and account inbox threads.",
      count: summary.unreadMessages,
      href: "/messages",
      label: "Open inbox",
      icon: Inbox
    },
    {
      title: "Call bookings",
      description: "Video call requests, accepted meeting times and negotiation slots connected to your account.",
      count: summary.callRequests,
      href: "/account",
      label: "Open call threads",
      icon: PhoneCall
    },
    ...(profile.role !== "player" && profile.role !== "admin"
      ? [
          {
            title: "Staff invites",
            description: "Pending invitations to join a club organisation and work from its shared team account.",
            count: summary.staffInvites,
            href: "/dashboard",
            label: "Review invites",
            icon: UserPlus
          }
        ]
      : []),
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
            description: "Authenticated profile views from clubs, journalists and other players this week.",
            count: summary.profileViews,
            href: "/analytics",
            label: "View profile analytics",
            icon: Eye
          }
        ]
      : []),
    ...(profile.role === "journalist"
      ? [
          {
            title: "Article engagement",
            description: "Outbound article opens from your EuroScout journalist links in the last seven days.",
            count: summary.articleEngagement,
            href: "/analytics",
            label: "Open article analytics",
            icon: BarChart3
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

        {/* Email notification preferences */}
        <div className="mt-10 border-t border-slate-200 pt-8 dark:border-white/10">
          <div className="mb-5">
            <p className="eyebrow-red">Manage notifications</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Email preferences</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Choose which activity you want delivered directly to your email inbox.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: PhoneCall, title: "Call requests", description: "Get emailed when a club or player requests a video call.", key: "calls" },
              { icon: Eye, title: "Profile views", description: "Weekly digest of who viewed your player or club profile.", key: "views" },
              { icon: Inbox, title: "New messages", description: "Receive an email when you have an unread message.", key: "messages" },
              { icon: Star, title: "Club interest", description: "Notify club staff when a player expresses interest.", key: "interest" },
              { icon: Users, title: "Watchlist activity", description: "Updates when players on your watchlists change status.", key: "watchlist" },
              { icon: Bell, title: "Platform updates", description: "Product news, new features and EuroScout announcements.", key: "platform" },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500 dark:text-white/45">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden />
            To update email preferences, contact us at{" "}
            <a href="mailto:info@euroscoutpro.com?subject=Email notification preferences" className="font-bold text-red-600 hover:underline dark:text-red-400">
              info@euroscoutpro.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
