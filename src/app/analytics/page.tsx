import Link from "next/link";
import type { Metadata } from "next";
import { Activity, BarChart3, Eye, Film, MessageSquare, Star, Target, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/StateDisplay";
import { requireOnboardedProfile, roleLabel, userRoles, type UserRole } from "@/lib/auth";
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
        return (
          <div key={`${row.viewed_profile_id}-${row.viewed_at}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-black text-slate-950 dark:text-white">{viewer?.display_name ?? "EuroScout member"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                {teamName ? `${teamName} · ` : ""}
                {safeRoleLabel(viewer?.role ?? row.viewer_role)}
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
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id),
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id).gte("viewed_at", since(7)),
    supabase.from("watchlist_items").select("id", { count: "exact", head: true }).eq("player_id", playerProfile.id),
    supabase.from("film_clicks").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfile.id),
    supabase
      .from("player_profile_views")
      .select("viewed_profile_id, viewer_role, viewer_team_id, viewed_at")
      .eq("player_profile_id", playerProfile.id)
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
        <MetricCard label="Film opens" value={filmClicks ?? 0} helper="External film button clicks." icon={Film} />
        <MetricCard label="Watchlist saves" value={watchlistSaves ?? 0} helper="Times clubs saved you to a shortlist." icon={Star} />
      </div>

      <section className="space-y-5">
        <SectionTitle eyebrow="Viewer Intelligence" title="Who viewed me" helper="Authenticated profile views are grouped by viewer and club context where EuroScout has it." />
        <ViewerList rows={recentViews ?? []} profilesById={viewerProfiles} teamsById={teamsById} />
      </section>

      <section className="space-y-5">
        <SectionTitle eyebrow="Film Performance" title="Which film is getting opened" helper="This tracks clicks on EuroScout film buttons. Embedded provider playback cannot always be measured reliably." />
        <InsightList
          items={(filmRows ?? []).map((film) => ({
            label: film.provider ?? "Film",
            value: String(filmClickCounts.get(film.id) ?? 0),
            helper: film.label ?? "Untitled film"
          }))}
        />
        {!(filmRows ?? []).length ? (
          <EmptyState title="No film links yet" description="Add film to start measuring external film opens." actionHref="/account" actionLabel="Add film" />
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
    { data: filmRows }
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "club"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_complete", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_public", true),
    supabase.from("player_profile_views").select("id", { count: "exact", head: true }),
    supabase.from("club_profile_views").select("id", { count: "exact", head: true }),
    supabase.from("film_clicks").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("watchlist_items").select("id", { count: "exact", head: true }),
    supabase.from("film_links").select("player_profile_id").returns<Array<{ player_profile_id: string }>>()
  ]);

  const playersWithFilm = new Set((filmRows ?? []).map((row) => row.player_profile_id)).size;
  const totalUsers = users ?? 0;

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Users" value={totalUsers} helper={`${newUsers ?? 0} joined in the last 30 days.`} icon={Users} />
        <MetricCard label="Players" value={players ?? 0} helper="Player accounts on the platform." icon={Target} />
        <MetricCard label="Clubs" value={clubs ?? 0} helper="Club accounts and representatives." icon={Star} />
        <MetricCard label="Messages" value={messages ?? 0} helper="Conversation messages sent." icon={MessageSquare} />
      </div>

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
        <MetricCard label="Film opens" value={filmClicks ?? 0} helper="Tracked film button clicks." icon={Film} />
        <MetricCard label="Watchlist saves" value={watchlistSaves ?? 0} helper="Player saves across club watchlists." icon={Star} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const { profile } = await requireOnboardedProfile();

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
          {profile.role === "player" ? <PlayerAnalytics profileId={profile.id} /> : null}
          {profile.role === "club" ? <ClubAnalytics profileId={profile.id} /> : null}
          {profile.role === "admin" ? <AdminAnalytics /> : null}
          {!["player", "club", "admin"].includes(profile.role) ? (
            <EmptyState
              title="Analytics are coming for this role"
              description="Player, club and admin analytics are live first. Journalist article analytics can be connected once article view tracking is added."
              actionHref="/dashboard"
              actionLabel="Back to dashboard"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
