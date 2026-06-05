import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getLeagueByIdOrSlug } from "@/lib/data";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ContactClubButton from "@/components/scouts/ContactClubButton";
import ClubPipelineSection from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";

export const metadata: Metadata = {
  title: "Club Profile | EuroScout Pro"
};

interface ClubProfilePageProps {
  params: Promise<{
    scoutId: string;
  }>;
}

interface ClubTeam {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  stadium: string | null;
  logo_url: string | null;
  tier: number | null;
  claim_status: string | null;
  recruiting_active: boolean | null;
  open_roster_spots: number | null;
  website: string | null;
  contact_email: string | null;
  pipeline_names_public: boolean;
}

interface ClubMemberRow {
  profile_id: string;
  club_role: string;
  team_id: string;
  teams: ClubTeam;
  profiles: Profile;
}

interface StaffMemberRow {
  profile_id: string;
  club_role: string;
  profiles: Profile;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { scoutId } = await params;
  const authClient = await createSupabaseServerClient();
  const supabase = createSupabaseServiceRoleClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  const memberSelect = `
    profile_id,
    club_role,
    team_id,
    teams!team_id (
      id, name, city, country, league_id, stadium, tier, claim_status,
      logo_url, recruiting_active, open_roster_spots, website,
      contact_email, pipeline_names_public
    ),
    profiles!profile_id (
      id, role, display_name, headline, bio, location,
      avatar_url, is_public, onboarding_complete, created_at, updated_at
    )
  `;

  const { data: memberByTeam } = await supabase
    .from("club_members")
    .select(memberSelect)
    .eq("team_id", scoutId)
    .eq("club_role", "owner")
    .maybeSingle<ClubMemberRow>();

  const { data: memberByProfile } = !memberByTeam
    ? await supabase
        .from("club_members")
        .select(memberSelect)
        .eq("profile_id", scoutId)
        .eq("club_role", "owner")
        .maybeSingle<ClubMemberRow>()
    : { data: null };

  const member = memberByTeam ?? memberByProfile;

  const { data: profileFallback } = !member
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", scoutId)
        .eq("role", "club")
        .maybeSingle<Profile>()
    : { data: null };

  const resolvedProfile = member?.profiles ?? profileFallback;
  if (!resolvedProfile) notFound();

  const team = member?.teams ?? null;
  const teamId = team?.id ?? null;

  // Viewer context
  let isMember = false;
  let isOwner = false;
  let viewerRole: string | null = null;

  if (user) {
    const [{ data: viewerProfile }, membershipResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
      teamId
        ? supabase
            .from("club_members")
            .select("club_role")
            .eq("team_id", teamId)
            .eq("profile_id", user.id)
            .maybeSingle<{ club_role: string }>()
        : Promise.resolve({ data: null })
    ]);
    viewerRole = viewerProfile?.role ?? null;
    isMember = Boolean(membershipResult.data);
    isOwner = membershipResult.data?.club_role === "owner";
    if (viewerRole === "admin") {
      isMember = true;
      isOwner = true;
    }
  }

  // Club media
  const { data: media } = teamId
    ? await supabase
        .from("club_media")
        .select("*")
        .eq("team_id", teamId)
        .order("display_order")
    : { data: null };

  const allMedia = (media ?? []) as ClubMediaRow[];
  const photos = allMedia.filter((m) => m.media_type === "photo");
  const video = allMedia.find((m) => m.media_type === "video") ?? null;
  const { data: staffRows } = teamId
    ? await supabase
        .from("club_members")
        .select(
          `
            profile_id,
            club_role,
            profiles!profile_id (
              id, role, display_name, headline, bio, location,
              avatar_url, is_public, onboarding_complete, created_at, updated_at
            )
          `
        )
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true })
        .returns<StaffMemberRow[]>()
    : { data: [] as StaffMemberRow[] };

  const isVerified = team?.claim_status === "verified";
  const pipelineNamesPublic = team?.pipeline_names_public ?? false;
  const isAuthenticated = Boolean(user);
  const canContact = isAuthenticated && !isMember;
  const staff = staffRows ?? [];
  const league = team?.league_id ? getLeagueByIdOrSlug(team.league_id) : null;
  const leagueLabel = league?.shortName ?? league?.name ?? "League";
  const teamName = team?.name ?? resolvedProfile.display_name;
  const location = [team?.city, team?.country].filter(Boolean).join(", ");
  const profileText =
    resolvedProfile.bio ??
    resolvedProfile.headline ??
    `${teamName} is setting up its EuroScout club profile. Recruiting information, staff details, media, and contact preferences will appear here as the club completes its profile.`;
  const openSpots = team?.open_roster_spots ?? 0;

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/scouts"
            className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-white/30 transition hover:border-red-500/50 hover:text-white"
          >
            ← Back to clubs
          </Link>
        </div>
      </section>

      <article>
        <header className="border-b border-white/10 bg-[#120807]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div
                    className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-5xl font-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                    style={team?.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.62)), url(${team.logo_url})` } : undefined}
                  >
                    {team?.logo_url ? "" : initials(teamName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded border border-indigo-400/60 bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase text-indigo-200">
                        Club
                      </span>
                      <span className="rounded border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase text-green-400">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                      <span className="rounded border border-blue-500/60 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase text-blue-300">
                        {leagueLabel} {team?.tier ? `- Tier ${team.tier}` : ""}
                      </span>
                    </div>
                    <h1 className="mt-4 text-5xl font-black leading-none text-white sm:text-6xl">{teamName}</h1>
                    {location && <p className="mt-3 text-lg font-bold text-white/45">{location}</p>}
                  </div>
                </div>

                <div className="mt-9 flex flex-wrap gap-3">
                  {[
                    ["Region", team?.country ?? "Europe"],
                    ["Type", league?.tier ?? "Club"],
                    ["Market", league?.marketTier ?? "—"],
                    ["Pipeline", pipelineNamesPublic ? "Public" : "Open"]
                  ].map(([label, value]) => (
                    <div key={label} className="min-h-9 rounded border border-white/20 bg-black/20 px-4 py-2 text-sm">
                      <span className="mr-1.5 uppercase text-white/35">{label}</span>
                      <span className="font-bold capitalize text-white/75">{value}</span>
                    </div>
                  ))}
                  <span className="min-h-9 px-2 py-2 text-sm font-black uppercase text-red-500">
                    {resolvedProfile.is_public ? "Public Profile" : "Private Profile"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a]">
                {([
                  ["League", leagueLabel],
                  ["Founded", "—"],
                  ["Open Spots", String(openSpots || "—")],
                  ["Staff", String(staff.length || "—")]
                ] as [string, string][]).map(([label, value], index) => (
                  <div key={label} className={`p-6 ${index % 2 === 0 ? "border-r border-white/10" : ""} ${index < 2 ? "border-b border-white/10" : ""}`}>
                    <p className="text-xs font-bold uppercase text-white/35">{label}</p>
                    <p className={`mt-2 text-2xl font-black ${label === "Open Spots" ? "text-green-400" : "text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="space-y-8 lg:border-r lg:border-white/10 lg:pr-10">
            {teamId && (
              <ClubMediaSection
                scoutId={scoutId}
                teamId={teamId}
                media={allMedia}
                isMember={isMember}
              />
            )}

            {teamId && (
              <ClubPipelineSection
                teamId={teamId}
                isOwner={isOwner}
                pipelineNamesPublic={pipelineNamesPublic}
              />
            )}

            <section>
              <p className="text-sm font-black uppercase text-red-500">Club Profile</p>
              <div className="mt-5 flex gap-8 border-b border-white/10 text-sm font-black uppercase">
                {["About", "Roster", "History", "News"].map((tab, index) => (
                  <span key={tab} className={`pb-4 ${index === 0 ? "border-b-2 border-red-500 text-red-500" : "text-white/35"}`}>
                    {tab}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-white/15 bg-[#1a1a1a] p-7">
                <p className="text-lg font-semibold leading-8 text-white/65">{profileText}</p>
                <div className="mt-7 space-y-0 border-t border-white/10 text-sm">
                  <div className="flex items-center justify-between border-b border-white/10 py-3">
                    <span className="text-white/35">Stadium</span>
                    <span className="font-bold text-white">{team?.stadium ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 py-3">
                    <span className="text-white/35">Website</span>
                    {team?.website ? (
                      <a href={team.website} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:text-blue-300">
                        {team.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="font-bold text-white">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-white/35">Contact</span>
                    {team?.contact_email ? (
                      <a href={`mailto:${team.contact_email}`} className="font-bold text-blue-400 hover:text-blue-300">
                        {team.contact_email}
                      </a>
                    ) : (
                      <span className="font-bold text-white">—</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-red-500/25 bg-[#1a1a1a] p-7">
              <p className="mb-5 text-sm font-black uppercase text-red-500">Contact Club</p>
                {canContact && teamId ? (
                  <ContactClubButton
                    scoutId={scoutId}
                    teamId={teamId}
                    teamName={teamName}
                  />
                ) : isOwner ? (
                  <Link
                    href="/account/edit"
                    className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Edit profile
                  </Link>
                ) : isMember && !isOwner ? (
                  <Link
                    href="/messages"
                    className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Club inbox
                  </Link>
                ) : (
                  <Link
                    href={`/auth/sign-in?return_url=/scouts/${scoutId}`}
                    className="inline-flex h-16 w-full items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Sign in to message
                  </Link>
                )}

                {isAuthenticated && (
                  <Link
                    href="/messages"
                    className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-sm font-black uppercase text-white/50 transition hover:border-red-500/40 hover:text-white"
                  >
                    Messages
                  </Link>
                )}
              </section>

              {team && (
                <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
                  <p className="text-sm font-black uppercase text-red-500">Recruiting Status</p>
                  <div className="mt-5 flex items-center gap-3 text-lg font-black text-white">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        team.recruiting_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    {team.recruiting_active ? "Actively recruiting" : "Not currently recruiting"}
                  </div>
                </section>
              )}

              <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
                <p className="text-sm font-black uppercase text-red-500">Open Roster Spots</p>
                <div className="mt-5 space-y-3">
                  {(openSpots > 0 ? Array.from({ length: openSpots }) : [null]).map((_, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                      <span className="font-bold text-white">{openSpots > 0 ? `Roster Spot ${index + 1}` : "No open spots listed"}</span>
                      <span className={`rounded border px-3 py-1 text-xs font-bold ${openSpots > 0 ? "border-green-500/60 text-green-400" : "border-white/15 text-white/25"}`}>
                        {openSpots > 0 ? "Open" : "Filled"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
                <p className="text-sm font-black uppercase text-red-500">Staff Directory</p>
                <div className="mt-5 divide-y divide-white/10">
                  {staff.length ? (
                    staff.map((staffMember) => (
                      <div key={staffMember.profile_id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/50">
                            {initials(staffMember.profiles.display_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{staffMember.profiles.display_name}</p>
                            <p className="text-sm capitalize text-white/35">{staffMember.profiles.headline ?? staffMember.club_role.replace("_", " ")}</p>
                          </div>
                        </div>
                        <span className="rounded border border-white/20 px-3 py-1 text-xs font-bold uppercase text-white/45">
                          {staffMember.club_role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm font-semibold text-white/40">No staff members listed yet.</p>
                  )}
                </div>
              </section>

              <ClubProfileHealthCard
                hasBio={Boolean(resolvedProfile.bio)}
                hasWebsite={Boolean(team?.website)}
                photoCount={photos.length}
                hasVideo={Boolean(video)}
                isVerified={isVerified}
              />

              {isOwner && (
                <Link
                  href="/account/edit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-sm font-black uppercase text-white/50 transition hover:border-red-500/40 hover:text-white"
                >
                  Edit profile
                </Link>
              )}
            </aside>
          </div>
        </article>
    </main>
  );
}
