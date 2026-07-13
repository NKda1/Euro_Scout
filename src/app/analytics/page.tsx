import Link from "next/link";
import type { Metadata } from "next";
import { Activity, BarChart3, CalendarCheck, Download, Eye, Film, MessageSquare, PhoneCall, Star, Target, UserPlus, Users } from "lucide-react";
import AdminAnalyticsCharts from "@/components/analytics/AdminAnalyticsCharts";
import { EmptyState } from "@/components/ui/StateDisplay";
import { requireOnboardedProfile, roleLabel, userRoles, type UserRole } from "@/lib/auth";
import { BILLING_PLANS, planForRole } from "@/lib/billing-plans";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics | EuroScout Pro",
  description: "Profile, recruiting and platform analytics for EuroScout Pro."
};

type IconType = typeof BarChart3;

interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
  icon: IconType;
}

interface ViewerRow {
  viewed_profile_id: string;
  viewer_role: string | null;
  viewer_team_id: string | null;
  viewed_at: string;
}

interface ClubViewerRow {
  viewed_profile_id: string;
  viewer_role: string | null;
  viewed_at: string;
}

interface ProfileMini {
  id: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

interface MessageRow {
  conversation_id: string;
  sender_profile_id: string;
  created_at: string;
}

interface JournalistArticleAnalyticsRow {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface JournalistArticleClickRow {
  article_id: string;
  clicked_at: string;
  viewer_profile_id: string | null;
  viewer_role: string | null;
}

interface TimeRow {
  created_at?: string;
  viewed_at?: string;
  clicked_at?: string;
  added_at?: string;
  reviewed_at?: string;
  scheduled_at?: string;
  room_opened_at?: string;
}

interface ChartPoint {
  label: string;
  value: number;
}

interface ChartSeries {
  name: string;
  tone: "red" | "slate" | "green";
  points: ChartPoint[];
}

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function safeRoleLabel(role: string | null | undefined) {
  return userRoles.includes(role as UserRole) ? roleLabel(role as UserRole) : "Member";
}

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function dailyBuckets(days: number) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date),
      value: 0
    };
  });
}

function buildDailyPoints(rows: TimeRow[], field: keyof TimeRow, days = 30): ChartPoint[] {
  const buckets = dailyBuckets(days);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const row of rows) {
    const rawValue = row[field];
    if (!rawValue) continue;
    const key = new Date(rawValue).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function mergePoints(label: string, ...points: ChartPoint[][]) {
  return {
    label,
    value: points.reduce((total, series) => total + series.reduce((seriesTotal, point) => seriesTotal + point.value, 0), 0)
  };
}

function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">{label}</p>
          <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{helper}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, helper }: { eyebrow: string; title: string; helper: string }) {
  return (
    <div className="border-b border-slate-200 pb-5 dark:border-white/10">
      <p className="eyebrow-red">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{helper}</p>
    </div>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200 dark:hover:border-red-500/50"
    >
      <Download aria-hidden className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ViewerList({
  rows,
  profilesById,
  teamsById
}: {
  rows: ViewerRow[];
  profilesById: Map<string, ProfileMini>;
  teamsById?: Map<string, string>;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No viewer history yet"
        description="Authenticated viewer activity will appear here once other users start opening this profile."
        actionHref="/dashboard"
        actionLabel="Back to dashboard"
      />
    );
  }

  return (
    <div className="divide-y divide-slate-200 border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#111]">
      {rows.map((row) => {
        const viewer = profilesById.get(row.viewed_profile_id);
        const teamName = row.viewer_team_id ? teamsById?.get(row.viewer_team_id) : null;
        const displayName = teamName ?? viewer?.display_name ?? "EuroScout member";
        const detail = teamName ? "Club" : safeRoleLabel(viewer?.role ?? row.viewer_role);
        return (
          <div key={`${row.viewed_profile_id}-${row.viewed_at}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-black text-slate-950 dark:text-white">{displayName}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                {detail}
              </p>
            </div>
            <p className="text-sm font-black text-slate-500 dark:text-white/40">{formatDate(row.viewed_at)}</p>
          </div>
        );
      })}
    </div>
  );
}

function InsightList({ items }: { items: Array<{ label: string; value: string; helper: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">{item.label}</p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{item.helper}</p>
        </div>
      ))}
    </div>
  );
}

async function getProfilesById(ids: string[]) {
  const supabase = createSupabaseServiceRoleClient();
  if (!ids.length) return new Map<string, ProfileMini>();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url, created_at")
    .in("id", ids)
    .returns<ProfileMini[]>();

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

async function PlayerAnalytics({ profileId }: { profileId: string }) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle<{ id: string }>();

  if (!playerProfile) {
    return (
      <EmptyState
        title="Player analytics need a player profile"
        description="Complete the player setup flow so EuroScout can connect profile views, film links and watchlist saves."
        actionHref="/onboarding"
        actionLabel="Finish setup"
      />
    );
  }

  const [{ count: totalViews }, { count: weeklyViews }, { count: watchlistSaves }, { count: filmClicks }, { data: recentViews }, { data: filmRows }, { data: clickRows }] = await Promise.all([
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id).neq("viewer_role", "admin"),
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id).neq("viewer_role", "admin").gte("viewed_at", since(7)),
    supabase.from("watchlist_items").select("id", { count: "exact", head: true }).eq("player_id", playerProfile.id),
    supabase.from("film_clicks").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id),
    supabase
      .from("player_profile_views")
      .select("viewed_profile_id, viewer_role, viewer_team_id, viewed_at")
      .eq("player_profile_id", playerProfile.id)
      .neq("viewer_role", "admin")
      .order("viewed_at", { ascending: false })
      .limit(8)
      .returns<ViewerRow[]>(),
    supabase.from("film_links").select("id, label, provider").eq("player_profile_id", playerProfile.id).returns<Array<{ id: string; label: string | null; provider: string | null }>>(),
    supabase.from("film_clicks").select("film_link_id").eq("player_profile_id", playerProfile.id).returns<Array<{ film_link_id: string }>>()
  ]);

  const viewerProfiles = await getProfilesById(Array.from(new Set((recentViews ?? []).map((row) => row.viewed_profile_id))));
  const teamIds = Array.from(new Set((recentViews ?? []).map((row) => row.viewer_team_id).filter((id): id is string => Boolean(id))));
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds).returns<Array<{ id: string; name: string }>>()
    : { data: [] as Array<{ id: string; name: string }> };
  const teamsById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const filmClickCounts = new Map<string, number>();
  (clickRows ?? []).forEach((click) => filmClickCounts.set(click.film_link_id, (filmClickCounts.get(click.film_link_id) ?? 0) + 1));

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Profile views" value={totalViews ?? 0} helper="All authenticated profile views." icon={Eye} />
        <MetricCard label="This week" value={weeklyViews ?? 0} helper="Views in the last seven days." icon={Activity} />
        <MetricCard label="Film views" value={filmClicks ?? 0} helper="Hover previews and external film opens." icon={Film} />
        <MetricCard label="Watchlist saves" value={watchlistSaves ?? 0} helper="Times clubs saved you to a shortlist." icon={Star} />
      </div>

      <section className="space-y-5">
        <SectionTitle eyebrow="Viewer Intelligence" title="Who viewed me" helper="Authenticated profile views are grouped by viewer and club context where EuroScout has it." />
        <ViewerList rows={recentViews ?? []} profilesById={viewerProfiles} teamsById={teamsById} />
      </section>

      <section className="space-y-5">
        <SectionTitle eyebrow="Film Performance" title="Which film is getting watched" helper="This tracks hover previews and EuroScout film button opens." />
        <InsightList
          items={(filmRows ?? []).map((film) => ({
            label: film.provider ?? "Film",
            value: String(filmClickCounts.get(film.id) ?? 0),
            helper: film.label ?? "Untitled film"
          }))}
        />
        {!(filmRows ?? []).length ? (
          <EmptyState title="No film links yet" description="Add film to start measuring previews and external opens." actionHref="/account" actionLabel="Add film" />
        ) : null}
      </section>
    </div>
  );
}

async function ClubAnalytics({ profileId }: { profileId: string }) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: membership } = await supabase
    .from("club_members")
    .select("team_id, teams!team_id ( name )")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle<{ team_id: string; teams: { name: string | null } | null }>();

  if (!membership?.team_id) {
    return (
      <EmptyState
        title="Connect a club first"
        description="Club analytics start once your account is attached to a team profile."
        actionHref="/account"
        actionLabel="Connect club"
      />
    );
  }

  const [{ count: totalViews }, { count: weeklyViews }, { count: interestCount }, { data: watchlists }, { data: conversations }, { data: staff }, { data: recentViews }] = await Promise.all([
    supabase.from("club_profile_views").select("id", { count: "exact", head: true }).eq("team_id", membership.team_id),
    supabase.from("club_profile_views").select("id", { count: "exact", head: true }).eq("team_id", membership.team_id).gte("viewed_at", since(7)),
    supabase.from("club_interest_notifications").select("id", { count: "exact", head: true }).eq("team_id", membership.team_id),
    supabase.from("watchlists").select("id").eq("team_id", membership.team_id).returns<Array<{ id: string }>>(),
    supabase.from("conversations").select("id").eq("team_id", membership.team_id).returns<Array<{ id: string }>>(),
    supabase.from("club_members").select("profile_id").eq("team_id", membership.team_id).returns<Array<{ profile_id: string }>>(),
    supabase
      .from("club_profile_views")
      .select("viewed_profile_id, viewer_role, viewed_at")
      .eq("team_id", membership.team_id)
      .order("viewed_at", { ascending: false })
      .limit(8)
      .returns<ClubViewerRow[]>()
  ]);

  const watchlistIds = (watchlists ?? []).map((watchlist) => watchlist.id);
  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  const [{ count: watchlistSaves }, { data: messages }] = await Promise.all([
    watchlistIds.length
      ? supabase.from("watchlist_items").select("id", { count: "exact", head: true }).in("watchlist_id", watchlistIds)
      : Promise.resolve({ count: 0 }),
    conversationIds.length
      ? supabase.from("messages").select("conversation_id, sender_profile_id, created_at").in("conversation_id", conversationIds).returns<MessageRow[]>()
      : Promise.resolve({ data: [] as MessageRow[] })
  ]);

  const staffIds = new Set((staff ?? []).map((member) => member.profile_id));
  const respondedThreads = new Set<string>();
  for (const message of messages ?? []) {
    if (!staffIds.has(message.sender_profile_id)) {
      respondedThreads.add(message.conversation_id);
    }
  }
  const viewerProfiles = await getProfilesById(Array.from(new Set((recentViews ?? []).map((row) => row.viewed_profile_id))));

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Club views" value={totalViews ?? 0} helper={`${membership.teams?.name ?? "Club"} public profile views.`} icon={Eye} />
        <MetricCard label="This week" value={weeklyViews ?? 0} helper="Views in the last seven days." icon={Activity} />
        <MetricCard label="Player interest" value={interestCount ?? 0} helper="Players who expressed interest." icon={Target} />
        <MetricCard label="Watchlist saves" value={watchlistSaves ?? 0} helper="Players saved across club lists." icon={Star} />
      </div>

      <InsightList
        items={[
          {
            label: "Conversations",
            value: String(conversationIds.length),
            helper: "Club-player threads attached to this team."
          },
          {
            label: "Response rate",
            value: percent(respondedThreads.size, conversationIds.length),
            helper: "Threads where a non-club participant has replied."
          },
          {
            label: "Watchlists",
            value: String(watchlistIds.length),
            helper: "Recruitment lists owned by this club."
          }
        ]}
      />

      <section className="space-y-5">
        <SectionTitle eyebrow="Viewer Intelligence" title="Who viewed the club" helper="Authenticated club profile viewers appear here, excluding your own club staff." />
        <ViewerList rows={(recentViews ?? []).map((row) => ({ ...row, viewer_team_id: null }))} profilesById={viewerProfiles} />
      </section>
    </div>
  );
}

async function JournalistAnalytics({ profileId }: { profileId: string }) {
  const supabase = createSupabaseServiceRoleClient();
  const [{ data: articles }, { data: clickRows }, { count: totalClicks }, { count: weeklyClicks }] = await Promise.all([
    supabase
      .from("journalist_articles")
      .select("id, title, status, published_at, created_at")
      .eq("journalist_profile_id", profileId)
      .order("created_at", { ascending: false })
      .returns<JournalistArticleAnalyticsRow[]>(),
    supabase
      .from("journalist_article_clicks")
      .select("article_id, clicked_at, viewer_profile_id, viewer_role")
      .eq("journalist_profile_id", profileId)
      .gte("clicked_at", since(30))
      .returns<JournalistArticleClickRow[]>(),
    supabase.from("journalist_article_clicks").select("id", { count: "exact", head: true }).eq("journalist_profile_id", profileId),
    supabase.from("journalist_article_clicks").select("id", { count: "exact", head: true }).eq("journalist_profile_id", profileId).gte("clicked_at", since(7))
  ]);

  const publishedArticles = (articles ?? []).filter((article) => article.status === "published");
  const publishedPoints = buildDailyPoints(
    publishedArticles.map((article) => ({ created_at: article.published_at ?? article.created_at })),
    "created_at"
  );
  const clickPoints = buildDailyPoints(clickRows ?? [], "clicked_at");
  const uniqueReaders = new Set((clickRows ?? []).map((row) => row.viewer_profile_id).filter(Boolean)).size;
  const clickCountsByArticle = new Map<string, number>();
  (clickRows ?? []).forEach((click) => clickCountsByArticle.set(click.article_id, (clickCountsByArticle.get(click.article_id) ?? 0) + 1));
  const topArticles = [...(articles ?? [])]
    .sort((a, b) => (clickCountsByArticle.get(b.id) ?? 0) - (clickCountsByArticle.get(a.id) ?? 0))
    .slice(0, 5);
  const articlesWithClicks = new Set((clickRows ?? []).map((row) => row.article_id)).size;
  const pulseSeries: ChartSeries[] = [
    { name: "Article opens", tone: "red", points: clickPoints },
    { name: "Published", tone: "slate", points: publishedPoints }
  ];
  const engagementBars = [
    mergePoints("Article opens", clickPoints),
    { label: "Unique signed-in readers", value: uniqueReaders },
    { label: "Published articles", value: publishedArticles.length },
    { label: "Articles with clicks", value: articlesWithClicks }
  ];
  const conversionBars = [
    { label: "All links", value: (articles ?? []).length },
    { label: "Published", value: publishedArticles.length },
    { label: "Opened", value: articlesWithClicks }
  ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Article links" value={(articles ?? []).length} helper="Draft and published links in your desk." icon={BarChart3} />
        <MetricCard label="Published" value={publishedArticles.length} helper="Visible on the public news page." icon={Target} />
        <MetricCard label="Article opens" value={totalClicks ?? 0} helper="Readers sent to your external links." icon={Eye} />
        <MetricCard label="This week" value={weeklyClicks ?? 0} helper="Article opens in the last seven days." icon={Activity} />
      </div>

      <AdminAnalyticsCharts
        pulseSeries={pulseSeries}
        engagementBars={engagementBars}
        conversionBars={conversionBars}
        pulseTitle="30-day article engagement"
        pulseHelper="Daily outbound clicks and publishing activity from your EuroScout journalist links."
        engagementTitle="Content engagement"
        engagementHelper="Last 30 days across reads and published content."
        funnelTitle="Article funnel"
        funnelHelper="How your submitted links move from draft/published to actual reader opens."
      />

      <section className="space-y-5">
        <SectionTitle eyebrow="Top Links" title="Best-performing articles" helper="Ranked by outbound clicks in the last 30 days." />
        {topArticles.length ? (
          <div className="divide-y divide-slate-200 border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#111]">
            {topArticles.map((article) => (
              <div key={article.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-950 dark:text-white">{article.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">{article.status}</p>
                </div>
                <p className="text-sm font-black text-red-600 dark:text-red-300">{clickCountsByArticle.get(article.id) ?? 0} opens</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No article analytics yet"
            description="Publish links and readers who open them from EuroScout will appear here."
            actionHref="/account"
            actionLabel="Add article link"
          />
        )}
      </section>
    </div>
  );
}

async function AdminAnalytics() {
  const supabase = createSupabaseServiceRoleClient();
  const [
    { count: users },
    { count: newUsers },
    { count: players },
    { count: clubs },
    { count: onboarded },
    { count: publicProfiles },
    { count: playerViews },
    { count: clubViews },
    { count: filmClicks },
    { count: messages },
    { count: watchlistSaves },
    { count: staffInvitesSent },
    { count: staffInvitesAccepted },
    { count: staffInvitesDeclined },
    { count: joinRequestsAccepted },
    { count: joinRequestsDeclined },
    { count: callsScheduled },
    { count: callsMade },
    { count: callJoinAttempts },
    { data: filmRows },
    { data: profileRows },
    { data: messageRows },
    { data: playerViewRows },
    { data: clubViewRows },
    { data: filmClickRows },
    { data: watchlistItemRows },
    { data: staffInviteRows },
    { data: joinRequestRows },
    { data: scheduledCallRows },
    { data: openedCallRows },
    { data: callJoinRows }
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "club"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_complete", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_public", true),
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }).neq("viewer_role", "admin"),
    supabase.from("club_profile_views").select("id", { count: "exact", head: true }),
    supabase.from("film_clicks").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("watchlist_items").select("id", { count: "exact", head: true }),
    supabase.from("club_staff_invites").select("id", { count: "exact", head: true }),
    supabase.from("club_staff_invites").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("club_staff_invites").select("id", { count: "exact", head: true }).eq("status", "declined"),
    supabase.from("club_join_requests").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("club_join_requests").select("id", { count: "exact", head: true }).eq("status", "declined"),
    supabase.from("meeting_requests").select("id", { count: "exact", head: true }).in("status", ["accepted", "completed"]).not("scheduled_at", "is", null),
    supabase.from("meeting_requests").select("id", { count: "exact", head: true }).not("room_opened_at", "is", null),
    supabase.from("meeting_join_tokens").select("id", { count: "exact", head: true }),
    supabase.from("film_links").select("player_profile_id").returns<Array<{ player_profile_id: string }>>(),
    supabase.from("profiles").select("created_at").gte("created_at", since(30)).returns<Array<{ created_at: string }>>(),
    supabase.from("messages").select("created_at").gte("created_at", since(30)).returns<Array<{ created_at: string }>>(),
    supabase.from("player_profile_views").select("viewed_at").neq("viewer_role", "admin").gte("viewed_at", since(30)).returns<Array<{ viewed_at: string }>>(),
    supabase.from("club_profile_views").select("viewed_at").gte("viewed_at", since(30)).returns<Array<{ viewed_at: string }>>(),
    supabase.from("film_clicks").select("clicked_at").gte("clicked_at", since(30)).returns<Array<{ clicked_at: string }>>(),
    supabase.from("watchlist_items").select("added_at").gte("added_at", since(30)).returns<Array<{ added_at: string }>>(),
    supabase.from("club_staff_invites").select("created_at").gte("created_at", since(30)).returns<Array<{ created_at: string }>>(),
    supabase.from("club_join_requests").select("created_at").gte("created_at", since(30)).returns<Array<{ created_at: string }>>(),
    supabase
      .from("meeting_requests")
      .select("scheduled_at")
      .in("status", ["accepted", "completed"])
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", since(30))
      .returns<Array<{ scheduled_at: string }>>(),
    supabase
      .from("meeting_requests")
      .select("room_opened_at")
      .not("room_opened_at", "is", null)
      .gte("room_opened_at", since(30))
      .returns<Array<{ room_opened_at: string }>>(),
    supabase.from("meeting_join_tokens").select("created_at").gte("created_at", since(30)).returns<Array<{ created_at: string }>>()
  ]);

  const playersWithFilm = new Set((filmRows ?? []).map((row) => row.player_profile_id)).size;
  const totalUsers = users ?? 0;
  const userGrowthPoints = buildDailyPoints(profileRows ?? [], "created_at");
  const messagePoints = buildDailyPoints(messageRows ?? [], "created_at");
  const playerViewPoints = buildDailyPoints(playerViewRows ?? [], "viewed_at");
  const clubViewPoints = buildDailyPoints(clubViewRows ?? [], "viewed_at");
  const filmClickPoints = buildDailyPoints(filmClickRows ?? [], "clicked_at");
  const watchlistSavePoints = buildDailyPoints(watchlistItemRows ?? [], "added_at");
  const staffInvitePoints = buildDailyPoints(staffInviteRows ?? [], "created_at");
  const joinRequestPoints = buildDailyPoints(joinRequestRows ?? [], "created_at");
  const scheduledCallPoints = buildDailyPoints(scheduledCallRows ?? [], "scheduled_at");
  const openedCallPoints = buildDailyPoints(openedCallRows ?? [], "room_opened_at");
  const callJoinPoints = buildDailyPoints(callJoinRows ?? [], "created_at");
  const allViewPoints = playerViewPoints.map((point, index) => ({
    label: point.label,
    value: point.value + (clubViewPoints[index]?.value ?? 0)
  }));
  const pulseSeries: ChartSeries[] = [
    { name: "New users", tone: "red", points: userGrowthPoints },
    { name: "Views", tone: "slate", points: allViewPoints },
    { name: "Messages", tone: "green", points: messagePoints }
  ];
  const operationsSeries: ChartSeries[] = [
    { name: "Staff invites", tone: "red", points: staffInvitePoints },
    { name: "Join requests", tone: "slate", points: joinRequestPoints },
    { name: "Calls scheduled", tone: "green", points: scheduledCallPoints }
  ];
  const engagementBars = [
    mergePoints("Profile views", playerViewPoints, clubViewPoints),
    mergePoints("Messages", messagePoints),
    mergePoints("Film views", filmClickPoints),
    mergePoints("Watchlist saves", watchlistSavePoints)
  ];
  const operationsBars = [
    mergePoints("Staff invites", staffInvitePoints),
    mergePoints("Join requests", joinRequestPoints),
    mergePoints("Calls scheduled", scheduledCallPoints),
    mergePoints("Rooms opened", openedCallPoints),
    mergePoints("Join attempts", callJoinPoints)
  ];
  const conversionBars = [
    { label: "All users", value: totalUsers },
    { label: "Onboarded", value: onboarded ?? 0 },
    { label: "Public profiles", value: publicProfiles ?? 0 },
    { label: "Players with film", value: playersWithFilm }
  ];
  const operationsFunnelBars = [
    { label: "Staff invites", value: staffInvitesSent ?? 0 },
    { label: "Staff accepted", value: staffInvitesAccepted ?? 0 },
    { label: "Join accepted", value: joinRequestsAccepted ?? 0 },
    { label: "Calls made", value: callsMade ?? 0 }
  ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Users" value={totalUsers} helper={`${newUsers ?? 0} joined in the last 30 days.`} icon={Users} />
        <MetricCard label="Players" value={players ?? 0} helper="Player accounts on the platform." icon={Target} />
        <MetricCard label="Clubs" value={clubs ?? 0} helper="Club accounts and representatives." icon={Star} />
        <MetricCard label="Messages" value={messages ?? 0} helper="Conversation messages sent." icon={MessageSquare} />
      </div>

      <AdminAnalyticsCharts pulseSeries={pulseSeries} engagementBars={engagementBars} conversionBars={conversionBars} />

      <section className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-red">Admin Operations</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Club staff, join requests and calls</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
              Track the health of club organisation setup and video-call marketplace activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href="/api/analytics/admin/export?dataset=summary" label="Summary CSV" />
            <ExportLink href="/api/analytics/admin/export?dataset=staff-invites" label="Staff invites" />
            <ExportLink href="/api/analytics/admin/export?dataset=join-requests" label="Join requests" />
            <ExportLink href="/api/analytics/admin/export?dataset=calls" label="Calls" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Coach invites" value={staffInvitesSent ?? 0} helper={`${staffInvitesAccepted ?? 0} accepted, ${staffInvitesDeclined ?? 0} declined.`} icon={UserPlus} />
          <MetricCard label="Join accepted" value={joinRequestsAccepted ?? 0} helper={`${joinRequestsDeclined ?? 0} club join requests declined.`} icon={Target} />
          <MetricCard label="Calls scheduled" value={callsScheduled ?? 0} helper="Accepted meeting requests with a confirmed time." icon={CalendarCheck} />
          <MetricCard label="Calls made" value={callsMade ?? 0} helper={`${callJoinAttempts ?? 0} authorised Daily join attempts recorded.`} icon={PhoneCall} />
        </div>

        <AdminAnalyticsCharts
          pulseSeries={operationsSeries}
          engagementBars={operationsBars}
          conversionBars={operationsFunnelBars}
          pulseTitle="30-day operations pulse"
          pulseHelper="Daily staff invites, organisation join requests and accepted call slots."
          engagementTitle="Operations mix"
          engagementHelper="Last 30 days across invites, join requests, rooms and call joins."
          funnelTitle="Operational conversion"
          funnelHelper="Current totals across staff onboarding and video-call activation."
        />
      </section>

      <InsightList
        items={[
          {
            label: "Onboarding conversion",
            value: percent(onboarded ?? 0, totalUsers),
            helper: `${onboarded ?? 0} of ${totalUsers} profiles completed setup.`
          },
          {
            label: "Public profile conversion",
            value: percent(publicProfiles ?? 0, totalUsers),
            helper: `${publicProfiles ?? 0} profiles are visible.`
          },
          {
            label: "Players with film",
            value: percent(playersWithFilm, players ?? 0),
            helper: `${playersWithFilm} player profiles have at least one film link.`
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Player views" value={playerViews ?? 0} helper="Tracked authenticated player profile views." icon={Eye} />
        <MetricCard label="Club views" value={clubViews ?? 0} helper="Tracked authenticated club profile views." icon={Activity} />
        <MetricCard label="Film views" value={filmClicks ?? 0} helper="Tracked film hover previews and button opens." icon={Film} />
        <MetricCard label="Watchlist saves" value={watchlistSaves ?? 0} helper="Player saves across club watchlists." icon={Star} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const { profile } = await requireOnboardedProfile();
  const billingPlan = planForRole(profile.role);
  const isPremium = isPremiumActive(profile);
  const needsPremium = profile.role !== "admin" && Boolean(billingPlan) && !isPremium;

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow-red">Analytics</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white">Product intelligence</h1>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">
              Understand whether your EuroScout presence is turning into views, film attention, messages and recruiting actions.
            </p>
          </div>
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8">
          {needsPremium && billingPlan ? (
            <div className="grid gap-5 border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">Premium analytics</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Unlock performance intelligence.</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-amber-900/75 dark:text-amber-100/70">
                  Standard accounts keep the core marketplace. Premium unlocks detailed views, engagement trends and recruiting signals.
                </p>
              </div>
              <Link href={`/api/billing/checkout?plan=${billingPlan}`} className="inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                Upgrade to {BILLING_PLANS[billingPlan].label}
              </Link>
            </div>
          ) : null}
          {!needsPremium && profile.role === "player" ? <PlayerAnalytics profileId={profile.id} /> : null}
          {!needsPremium && profile.role === "club" ? <ClubAnalytics profileId={profile.id} /> : null}
          {!needsPremium && profile.role === "journalist" ? <JournalistAnalytics profileId={profile.id} /> : null}
          {profile.role === "admin" ? <AdminAnalytics /> : null}
          {!["player", "club", "journalist", "admin"].includes(profile.role) ? (
            <EmptyState
              title="Analytics are coming for this role"
              description="Player, club, journalist and admin analytics are live first. Fan analytics can be connected once saved follows or alerts are added."
              actionHref="/dashboard"
              actionLabel="Back to dashboard"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
