import Link from "next/link";
import type { Metadata } from "next";
import { signOutAction } from "@/app/actions/auth";
import { restoreAdminRoleAction } from "@/app/actions/profile";
import { requireOnboardedProfile, roleLabel, isReservedAdminEmail, type Profile, type UserRole } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | EuroScout Pro",
  description: "EuroScout Pro account dashboard."
};

interface DashboardPageProps {
  searchParams: Promise<{
    error?: string;
    onboarded?: string;
  }>;
}

interface ClubMembershipSummary {
  team_id: string;
  teams: {
    id: string;
    name: string;
    claim_status: string | null;
    logo_url: string | null;
    recruiting_active: boolean | null;
    open_roster_spots: number | null;
    roster_needs: unknown;
  } | null;
}

interface ReadinessStep {
  title: string;
  helper: string;
  href: string;
  complete: boolean;
}

interface DashboardModel {
  eyebrow: string;
  title: string;
  summary: string;
  primaryHref: string;
  primaryLabel: string;
  steps: ReadinessStep[];
  emptyTitle: string;
  emptyHelper: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-4 last:border-b-0 dark:border-white/10">
      <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
      <span className="text-right text-sm font-black text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}

function OverviewMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#151515]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">{helper}</p> : null}
    </div>
  );
}

function ActionLink({ href, title, helper, primary = false }: { href: string; title: string; helper: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`block border p-5 transition ${
        primary
          ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
          : "border-slate-200 bg-white text-slate-950 hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#151515] dark:text-white dark:hover:border-red-500/40"
      }`}
    >
      <p className="text-base font-black">{title}</p>
      <p className={`mt-2 text-sm font-semibold leading-6 ${primary ? "text-red-50" : "text-slate-500 dark:text-white/45"}`}>{helper}</p>
    </Link>
  );
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function percentComplete(steps: ReadinessStep[]) {
  if (!steps.length) return 0;
  return Math.round((steps.filter((step) => step.complete).length / steps.length) * 100);
}

function firstOpenStep(steps: ReadinessStep[]) {
  return steps.find((step) => !step.complete) ?? steps[0];
}

function ReadinessPanel({ model }: { model: DashboardModel }) {
  const percent = percentComplete(model.steps);
  const openStep = firstOpenStep(model.steps);

  return (
    <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#151515] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-500">{model.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{model.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{model.summary}</p>
        </div>
        <Link href={openStep?.href ?? model.primaryHref} className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
          {openStep?.complete ? model.primaryLabel : openStep?.title}
        </Link>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">Profile readiness</span>
          <span className="text-sm font-black text-slate-950 dark:text-white">{percent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-red-600" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {model.steps.map((step) => (
          <Link
            key={step.title}
            href={step.href}
            className={`border p-4 transition ${
              step.complete
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100"
                : "border-slate-200 bg-slate-50 text-slate-950 hover:border-red-300 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:border-red-500/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${step.complete ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                {step.complete ? "OK" : "GO"}
              </span>
              <span>
                <span className="block text-sm font-black">{step.title}</span>
                <span className={`mt-1 block text-sm font-semibold leading-6 ${step.complete ? "text-emerald-700 dark:text-emerald-200/75" : "text-slate-500 dark:text-white/45"}`}>{step.helper}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {percent < 100 ? (
        <div className="mt-5 border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-500/10">
          <p className="text-sm font-black text-amber-900 dark:text-amber-100">{model.emptyTitle}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-800/75 dark:text-amber-100/65">{model.emptyHelper}</p>
        </div>
      ) : null}
    </section>
  );
}

function buildDashboardModel(params: {
  profile: Profile;
  roleProfile: Record<string, unknown> | null;
  clubMembership: ClubMembershipSummary | null;
  filmCount: number;
  careerCount: number;
  clubMediaCount: number;
  watchlistCount: number;
  articleCount: number;
  pendingClubCount: number;
}): DashboardModel {
  const { profile, roleProfile, clubMembership, filmCount, careerCount, clubMediaCount, watchlistCount, articleCount, pendingClubCount } = params;
  const role = profile.role as UserRole;
  const team = clubMembership?.teams ?? null;
  const playerPhotos = Array.isArray(roleProfile?.photo_urls) ? roleProfile.photo_urls.length : 0;

  const commonSteps: ReadinessStep[] = [
    {
      title: "Publish profile",
      helper: profile.is_public ? "Your profile is visible." : "Make your profile visible when you are ready.",
      href: "/account",
      complete: profile.is_public
    },
    {
      title: "Add profile identity",
      helper: profile.avatar_url || profile.bio ? "Your account has a recognisable public identity." : "Add a photo or a short bio.",
      href: "/account",
      complete: Boolean(profile.avatar_url || profile.bio)
    }
  ];

  if (role === "player") {
    const steps = [
      {
        title: "Add position",
        helper: hasText(roleProfile?.position) ? "Position is set for discovery." : "Choose the position clubs should filter you by.",
        href: "/account",
        complete: hasText(roleProfile?.position)
      },
      {
        title: "Add measurements",
        helper: hasNumber(roleProfile?.height_cm) && hasNumber(roleProfile?.weight_kg) ? "Height and weight are ready." : "Add height and weight for scout comparisons.",
        href: "/account",
        complete: hasNumber(roleProfile?.height_cm) && hasNumber(roleProfile?.weight_kg)
      },
      {
        title: "Add film",
        helper: filmCount > 0 ? `${filmCount} film link${filmCount === 1 ? "" : "s"} attached.` : "Add Hudl, YouTube, Vimeo or external film.",
        href: "/account",
        complete: filmCount > 0
      },
      {
        title: "Add career history",
        helper: careerCount > 0 ? "Career timeline is started." : "Add teams, leagues and seasons played.",
        href: "/account",
        complete: careerCount > 0
      },
      {
        title: "Add profile photos",
        helper: playerPhotos > 0 ? `${playerPhotos} player photo${playerPhotos === 1 ? "" : "s"} uploaded.` : "Add action shots for your public profile.",
        href: "/account",
        complete: playerPhotos > 0
      },
      ...commonSteps
    ];

    return {
      eyebrow: "Player launch path",
      title: "Get discovered faster.",
      summary: "Complete the fields clubs need before they shortlist a player: position, measurable profile data, film and a public profile.",
      primaryHref: "/account",
      primaryLabel: "Improve player profile",
      steps,
      emptyTitle: "Your next best move is visible above.",
      emptyHelper: "Start with position and film. Those two make your profile useful in player search and club review."
    };
  }

  if (role === "club") {
    const hasRosterNeeds = Array.isArray(team?.roster_needs)
      ? team.roster_needs.length > 0
      : Boolean(team?.roster_needs);
    const steps = [
      {
        title: "Connect club",
        helper: team ? `${team.name} is connected.` : "Claim, join or create the club you represent.",
        href: "/account",
        complete: Boolean(team)
      },
      {
        title: "Verification status",
        helper: team?.claim_status === "verified" ? "Club profile is verified." : "Keep claim details ready for admin approval.",
        href: "/account",
        complete: team?.claim_status === "verified"
      },
      {
        title: "Add club logo",
        helper: team?.logo_url ? "Club logo is live." : "Upload a crest or logo for directory trust.",
        href: "/account",
        complete: Boolean(team?.logo_url)
      },
      {
        title: "Publish roster needs",
        helper: hasRosterNeeds || Number(team?.open_roster_spots ?? 0) > 0 ? "Recruiting needs are visible." : "Show open positions and roster needs.",
        href: "/account",
        complete: hasRosterNeeds || Number(team?.open_roster_spots ?? 0) > 0
      },
      {
        title: "Create watchlist",
        helper: watchlistCount > 0 ? `${watchlistCount} watchlist${watchlistCount === 1 ? "" : "s"} ready.` : "Start a private shortlist for prospects.",
        href: "/watchlists",
        complete: watchlistCount > 0
      },
      {
        title: "Add club media",
        helper: clubMediaCount > 0 ? "Club media is attached." : "Add photos or video to make the club profile credible.",
        href: "/account",
        complete: clubMediaCount > 0
      },
      ...commonSteps
    ];

    return {
      eyebrow: "Club launch path",
      title: "Turn the club profile into a recruiting hub.",
      summary: "Connect the club, show trust signals, publish roster needs and start your first prospect list.",
      primaryHref: team ? "/watchlists" : "/account",
      primaryLabel: team ? "Open watchlists" : "Connect club",
      steps,
      emptyTitle: "Recruiting tools unlock after the club connection is clear.",
      emptyHelper: "A verified club, roster needs and a first watchlist give scouts and players a clear reason to interact."
    };
  }

  if (role === "journalist") {
    const steps = [
      ...commonSteps,
      {
        title: "Publish first article",
        helper: articleCount > 0 ? `${articleCount} article link${articleCount === 1 ? "" : "s"} added.` : "Add a league report, interview or external article.",
        href: "/account",
        complete: articleCount > 0
      }
    ];

    return {
      eyebrow: "Journalist launch path",
      title: "Build your reporter profile.",
      summary: "Make your byline credible, publish your first link and keep your profile visible to readers.",
      primaryHref: "/account",
      primaryLabel: "Add article",
      steps,
      emptyTitle: "Your first article is the key empty state.",
      emptyHelper: "Once an article is added, your profile has a public reason to be discovered from the news surface."
    };
  }

  if (role === "admin") {
    const steps = [
      {
        title: "Open control room",
        helper: "Review platform activity and moderation queues.",
        href: "/admin",
        complete: true
      },
      {
        title: "Review club claims",
        helper: pendingClubCount > 0 ? `${pendingClubCount} club claim${pendingClubCount === 1 ? "" : "s"} need review.` : "No pending club claims right now.",
        href: "/admin/club-verification",
        complete: pendingClubCount === 0
      },
      {
        title: "Check users",
        helper: "Audit roles, onboarding state and profile quality.",
        href: "/admin/users",
        complete: true
      }
    ];

    return {
      eyebrow: "Admin launch path",
      title: "Keep the network clean.",
      summary: "Use the admin dashboard to review club claims, user roles, profile quality and publishing activity.",
      primaryHref: "/admin",
      primaryLabel: "Open admin",
      steps,
      emptyTitle: "Admin queues are quiet.",
      emptyHelper: "When new club claims, disputes or articles arrive, the admin control room should be the first stop."
    };
  }

  const steps = [
    ...commonSteps,
    {
      title: "Explore players",
      helper: "Browse player profiles and learn the market.",
      href: "/players",
      complete: true
    },
    {
      title: "Explore clubs",
      helper: "Find clubs, leagues and recruiting contexts.",
      href: "/scouts",
      complete: true
    }
  ];

  return {
    eyebrow: "Fan launch path",
    title: "Start exploring the network.",
    summary: "Use your account to follow the European football landscape and discover players, clubs and league news.",
    primaryHref: "/players",
    primaryLabel: "Browse players",
    steps,
    emptyTitle: "Your profile is enough to start exploring.",
    emptyHelper: "Add a public identity if you want other members to recognise you when interaction tools expand."
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { profile, user } = await requireOnboardedProfile();
  const { error, onboarded } = await searchParams;
  const adminRoleDrifted = isReservedAdminEmail(user.email) && profile.role !== "admin";
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: roleProfile } = profile.role === "player"
    ? await serviceClient.from("player_profiles").select("*").eq("profile_id", profile.id).maybeSingle<Record<string, unknown>>()
    : { data: null };
  const { data: clubMembership } = profile.role === "club"
    ? await serviceClient
        .from("club_members")
        .select("team_id, teams!team_id ( id, name, claim_status, logo_url, recruiting_active, open_roster_spots, roster_needs )")
        .eq("profile_id", profile.id)
        .limit(1)
        .maybeSingle<ClubMembershipSummary>()
    : { data: null };
  const { count: watchlistCount } = profile.role === "club" && clubMembership?.team_id
    ? await serviceClient
        .from("watchlists")
        .select("id", { count: "exact", head: true })
        .eq("team_id", clubMembership.team_id)
    : { count: 0 };
  const { count: profileViewCount } = profile.role === "player"
    ? await serviceClient
        .from("player_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("viewed_profile_id", profile.id)
    : { count: 0 };
  const playerProfileId = profile.role === "player" && roleProfile?.id ? String(roleProfile.id) : "";
  const { count: filmCount } = playerProfileId
    ? await serviceClient.from("film_links").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfileId)
    : { count: 0 };
  const { count: careerCount } = playerProfileId
    ? await serviceClient.from("player_career_entries").select("id", { count: "exact", head: true }).eq("player_profile_id", playerProfileId)
    : { count: 0 };
  const { count: clubMediaCount } = profile.role === "club" && clubMembership?.team_id
    ? await serviceClient.from("club_media").select("id", { count: "exact", head: true }).eq("team_id", clubMembership.team_id)
    : { count: 0 };
  const { count: articleCount } = profile.role === "journalist"
    ? await serviceClient.from("journalist_articles").select("id", { count: "exact", head: true }).eq("journalist_profile_id", profile.id)
    : { count: 0 };
  const { count: pendingClubCount } = profile.role === "admin"
    ? await serviceClient.from("teams").select("id", { count: "exact", head: true }).eq("claim_status", "pending")
    : { count: 0 };
  const publicProfileHref =
    profile.role === "player"
      ? `/players/${profile.id}`
      : profile.role === "club" && clubMembership?.team_id
        ? `/scouts/${clubMembership.team_id}`
        : `/profiles/${profile.id}`;
  const dashboardModel = buildDashboardModel({
    profile,
    roleProfile,
    clubMembership: clubMembership ?? null,
    filmCount: filmCount ?? 0,
    careerCount: careerCount ?? 0,
    clubMediaCount: clubMediaCount ?? 0,
    watchlistCount: watchlistCount ?? 0,
    articleCount: articleCount ?? 0,
    pendingClubCount: pendingClubCount ?? 0
  });

  return (
    <main className="theme-private min-h-screen bg-white text-slate-950 dark:bg-[#090909] dark:text-white">
      <section className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#101010]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-slate-100 bg-cover bg-center text-xl font-black dark:bg-[#202020]"
              style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.55)), url(${profile.avatar_url})` } : undefined}
            >
              {profile.avatar_url ? "" : initials(profile.display_name)}
            </div>
            <div>
              <p className="text-sm font-black uppercase text-red-500">Dashboard</p>
              <h1 className="mt-1 text-3xl font-black leading-none">{profile.display_name}</h1>
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-white/45">
                {roleLabel(profile.role)} account control center
              </p>
            </div>
          </div>
          <Link href={publicProfileHref} className="inline-flex h-11 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
            Public preview
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-700 dark:text-red-200">{error}</p> : null}
          {onboarded === "1" ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-800 dark:text-emerald-200">
              Onboarding complete. Your next best step is ready below.
            </p>
          ) : null}

          {adminRoleDrifted ? (
            <form action={restoreAdminRoleAction} className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-amber-900 dark:text-amber-200">Admin role overwritten during QA testing.</p>
                  <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">This account is currently set to {profile.role}.</p>
                </div>
                <button className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-black text-white transition hover:bg-amber-400">
                  Restore admin role
                </button>
              </div>
            </form>
          ) : null}

          <ReadinessPanel model={dashboardModel} />

          <section>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-red-500">Overview</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewMetric label="Role" value={roleLabel(profile.role)} helper="Account type" />
              <OverviewMetric label="Visibility" value={profile.is_public ? "Public" : "Private"} helper="Profile status" />
              <OverviewMetric label="Onboarding" value={profile.onboarding_complete ? "Complete" : "Incomplete"} helper="Setup flow" />
              {profile.role === "club" ? (
                <OverviewMetric label="Watchlists" value={String(watchlistCount ?? 0)} helper={clubMembership?.teams?.name ?? "No club connected"} />
              ) : profile.role === "player" ? (
                <OverviewMetric label="Views" value={String(profileViewCount ?? 0)} helper="Profile visits" />
              ) : (
                <OverviewMetric label="Email" value={user.email ? "Connected" : "Missing"} helper={user.email ?? "Not available"} />
              )}
            </div>
          </section>

          <section>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-red-500">Tools</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ActionLink href={publicProfileHref} title="Public profile preview" helper="See the profile exactly as other users see it." primary />
              <ActionLink href="/analytics" title="Analytics" helper="Track profile views, film attention and recruiting signals." />
              <ActionLink href="/messages" title="Messages" helper="Open club-player conversations and unread replies." />
              <ActionLink href="/account" title="Edit account fields" helper="Update photos, media, stats and public profile content." />
              {profile.role === "club" ? (
                <>
                  <ActionLink href="/watchlists" title="Recruitment watchlists" helper="Manage shortlists, notes, statuses and player comparison." />
                  <ActionLink href="/account" title="Club profile controls" helper="Update club media, roster needs and public team details." />
                </>
              ) : null}
              {profile.role === "admin" ? (
                <ActionLink href="/admin" title="Admin control room" helper="Review users, clubs, verification requests and published content." />
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a1a]">
            <p className="text-sm font-black uppercase text-red-500">Account</p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-5 dark:border-white/10 dark:bg-black/20">
              <SettingsRow label="Email" value={user.email ?? "Not available"} />
              <SettingsRow label="Role" value={roleLabel(profile.role)} />
              {profile.role === "club" ? <SettingsRow label="Club" value={clubMembership?.teams?.name ?? "Not connected"} /> : null}
            </div>
            <form action={signOutAction} className="mt-5">
              <button className="h-11 w-full rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
                Sign out
              </button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}
