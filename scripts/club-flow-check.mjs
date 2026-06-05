import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing Supabase env vars in .env.local");
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `EuroScoutTest-${stamp}!`;
const ids = { coach: "", player: "", otherClub: "" };
const teamIds = [`codex-flow-${stamp}`, `codex-flow-second-${stamp}`, `codex-flow-other-${stamp}`];
const createdWatchlists = [];
const createdMedia = [];
const failures = [];

function ok(condition, message, details) {
  if (condition) {
    console.log(`PASS ${message}`);
  } else {
    failures.push(`${message}${details ? `: ${details}` : ""}`);
    console.log(`FAIL ${message}${details ? `: ${details}` : ""}`);
  }
}

function authClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function createUser(label, role) {
  const email = `codex-${label}-${stamp}@example.com`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Codex ${label}` }
  });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message ?? "missing user"}`);

  await service.from("profiles").upsert({
    id: data.user.id,
    role,
    display_name: `Codex ${label}`,
    is_public: true,
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  });
  await service.from("users").upsert({
    id: data.user.id,
    email,
    role,
    display_name: `Codex ${label}`
  });

  return { id: data.user.id, email };
}

async function signIn(email) {
  const client = authClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

async function cleanup() {
  for (const mediaId of createdMedia) {
    await service.from("club_media").delete().eq("id", mediaId);
  }
  for (const watchlistId of createdWatchlists) {
    await service.from("watchlists").delete().eq("id", watchlistId);
  }
  await service.from("club_members").delete().in("team_id", teamIds);
  await service.from("teams").delete().in("id", teamIds);
  await service.from("users").delete().in("id", Object.values(ids).filter(Boolean));
  await service.from("profiles").delete().in("id", Object.values(ids).filter(Boolean));
  for (const id of Object.values(ids).filter(Boolean)) {
    await service.auth.admin.deleteUser(id);
  }
}

try {
  const [{ data: league }, { data: region }] = await Promise.all([
    service.from("leagues").select("id").limit(1).maybeSingle(),
    service.from("regions").select("id").limit(1).maybeSingle()
  ]);
  if (!league?.id || !region?.id) throw new Error("Need at least one league and region to create test teams.");

  const coach = await createUser("coach", "club");
  const player = await createUser("player", "player");
  const otherClub = await createUser("other-club", "club");
  ids.coach = coach.id;
  ids.player = player.id;
  ids.otherClub = otherClub.id;

  const now = new Date().toISOString();
  await service.from("teams").insert([
    {
      id: teamIds[0],
      name: "Codex Flow Club",
      slug: teamIds[0],
      league_id: league.id,
      region_id: region.id,
      city: "Test City",
      country: "Testland",
      claim_status: "pending",
      claimed_by: coach.id,
      claimed_at: now,
      claim_expires_at: now,
      recruiting_active: false,
      open_roster_spots: 0,
      pipeline_names_public: false,
      verified: false
    },
    {
      id: teamIds[1],
      name: "Codex Second Club",
      slug: teamIds[1],
      league_id: league.id,
      region_id: region.id,
      city: "Test City",
      country: "Testland",
      claim_status: "unclaimed",
      recruiting_active: false,
      open_roster_spots: 0,
      pipeline_names_public: false,
      verified: false
    },
    {
      id: teamIds[2],
      name: "Codex Other Club",
      slug: teamIds[2],
      league_id: league.id,
      region_id: region.id,
      city: "Test City",
      country: "Testland",
      claim_status: "pending",
      claimed_by: otherClub.id,
      claimed_at: now,
      claim_expires_at: now,
      recruiting_active: false,
      open_roster_spots: 0,
      pipeline_names_public: false,
      verified: false
    }
  ]);

  const ownerInsert = await service.from("club_members").insert({
    team_id: teamIds[0],
    profile_id: coach.id,
    club_role: "owner",
    joined_at: now
  });
  if (ownerInsert.error) throw new Error(`owner insert: ${ownerInsert.error.message}`);

  await service.from("club_members").insert({
    team_id: teamIds[2],
    profile_id: otherClub.id,
    club_role: "owner",
    joined_at: now
  });

  const { data: watchlist, error: watchlistError } = await service
    .from("watchlists")
    .insert({
      user_id: coach.id,
      team_id: teamIds[0],
      name: "Codex private shortlist",
      is_shared: false,
      updated_at: now
    })
    .select("id")
    .single();
  if (watchlistError || !watchlist) throw new Error(`watchlist insert: ${watchlistError?.message ?? "missing row"}`);
  createdWatchlists.push(watchlist.id);

  const duplicateMembership = await service.from("club_members").insert({
    team_id: teamIds[1],
    profile_id: coach.id,
    club_role: "owner",
    joined_at: now
  });
  ok(Boolean(duplicateMembership.error), "database rejects a second club membership for the same coach account", duplicateMembership.error?.message);
  if (!duplicateMembership.error) {
    await service.from("club_members").delete().eq("team_id", teamIds[1]).eq("profile_id", coach.id);
  }

  const [{ count: coachMembershipCount }, { count: coachClaimedCount }] = await Promise.all([
    service.from("club_members").select("id", { count: "exact", head: true }).eq("profile_id", coach.id),
    service.from("teams").select("id", { count: "exact", head: true }).eq("claimed_by", coach.id)
  ]);
  ok(coachMembershipCount === 1 && coachClaimedCount === 1, "created club is attached to coach and no second club is attached");

  const coachClient = await signIn(coach.email);
  const playerClient = await signIn(player.email);
  const otherClubClient = await signIn(otherClub.email);

  const coachWatchlists = await coachClient.from("watchlists").select("id, team_id").eq("team_id", teamIds[0]);
  ok(!coachWatchlists.error && (coachWatchlists.data?.length ?? 0) === 1, "owning coach can read their club watchlist", coachWatchlists.error?.message);

  const playerWatchlists = await playerClient.from("watchlists").select("id, team_id").eq("team_id", teamIds[0]);
  ok(!playerWatchlists.error && (playerWatchlists.data?.length ?? 0) === 0, "player cannot read club watchlists", playerWatchlists.error?.message);

  const otherClubWatchlists = await otherClubClient.from("watchlists").select("id, team_id").eq("team_id", teamIds[0]);
  ok(!otherClubWatchlists.error && (otherClubWatchlists.data?.length ?? 0) === 0, "another club cannot read this club's watchlists", otherClubWatchlists.error?.message);

  const coachMedia = await coachClient
    .from("club_media")
    .insert({ team_id: teamIds[0], media_type: "photo", url: "https://example.com/coach-photo.jpg", display_order: 77 })
    .select("id")
    .single();
  ok(!coachMedia.error && Boolean(coachMedia.data?.id), "club stakeholder can create club media", coachMedia.error?.message);
  if (coachMedia.data?.id) createdMedia.push(coachMedia.data.id);

  const playerMedia = await playerClient
    .from("club_media")
    .insert({ team_id: teamIds[0], media_type: "photo", url: "https://example.com/player-photo.jpg", display_order: 78 })
    .select("id")
    .single();
  ok(Boolean(playerMedia.error), "player cannot create club media", playerMedia.error?.message);
  if (playerMedia.data?.id) createdMedia.push(playerMedia.data.id);

  const otherClubMedia = await otherClubClient
    .from("club_media")
    .insert({ team_id: teamIds[0], media_type: "photo", url: "https://example.com/other-club-photo.jpg", display_order: 79 })
    .select("id")
    .single();
  ok(Boolean(otherClubMedia.error), "another club cannot create media for this club", otherClubMedia.error?.message);
  if (otherClubMedia.data?.id) createdMedia.push(otherClubMedia.data.id);

  const accountSource = fs.readFileSync("src/app/account/page.tsx", "utf8");
  ok(!accountSource.includes("claimTeamFromAccountAction") && !accountSource.includes("requestNewTeamFromAccountAction"), "account page has no post-onboarding claim/create actions");
  ok(!accountSource.includes("Claim club") && !accountSource.includes("Create club profile"), "account page has no post-onboarding claim/create controls");

  if (failures.length) {
    throw new Error(`${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  }
} finally {
  await cleanup();
}
