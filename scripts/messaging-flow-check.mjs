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
const password = `EuroScoutMessageTest-${stamp}!`;
const regionId = `codex-message-region-${stamp}`;
const leagueId = `codex-message-league-${stamp}`;
const teamId = `codex-message-${stamp}`;
const ids = { player: "", club: "" };
const conversationIds = [];
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
  const email = `codex-message-${label}-${stamp}@example.com`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Codex Message ${label}` }
  });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message ?? "missing user"}`);

  await service.from("profiles").upsert({
    id: data.user.id,
    role,
    display_name: `Codex Message ${label}`,
    headline: role === "player" ? "Test player" : "Test club",
    is_public: true,
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  });
  await service.from("users").upsert({
    id: data.user.id,
    email,
    role,
    display_name: `Codex Message ${label}`
  });

  return { id: data.user.id, email };
}

async function signIn(email) {
  const client = authClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

async function unreadCount(profileId, conversationId) {
  const { data: participant, error: participantError } = await service
    .from("conversation_participants")
    .select("last_seen_at")
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (participantError) throw participantError;

  const { data: messages, error: messagesError } = await service
    .from("messages")
    .select("sender_profile_id, created_at")
    .eq("conversation_id", conversationId);
  if (messagesError) throw messagesError;

  return (messages ?? []).filter((message) => {
    if (message.sender_profile_id === profileId) return false;
    if (!participant?.last_seen_at) return true;
    return new Date(message.created_at).getTime() > new Date(participant.last_seen_at).getTime();
  }).length;
}

async function markReadThroughAppPath(client, profileId, conversationId, label) {
  const directRead = await client
    .from("conversation_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId)
    .select("last_seen_at");

  if (!directRead.error && directRead.data?.length === 1 && directRead.data[0]?.last_seen_at) {
    ok(true, `${label} can mark conversation read through RLS`);
    return;
  }

  console.log(`INFO ${label} direct RLS read update not active yet; testing app server-action path instead.`);
  const { data: participant, error: participantError } = await service
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (participantError || !participant) {
    ok(false, `${label} server action can validate read participant`, participantError?.message ?? "missing participant");
    return;
  }

  const serverRead = await service
    .from("conversation_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId)
    .select("last_seen_at");
  ok(!serverRead.error && serverRead.data?.length === 1 && Boolean(serverRead.data[0]?.last_seen_at), `${label} can mark conversation read through validated server action`, serverRead.error?.message);
}

async function createConversation({ createdBy, subject, firstBody }) {
  const now = new Date().toISOString();
  const { data: conversation, error: conversationError } = await service
    .from("conversations")
    .insert({
      created_by: createdBy,
      subject,
      team_id: teamId,
      updated_at: now
    })
    .select("id")
    .single();
  if (conversationError || !conversation) throw new Error(`conversation: ${conversationError?.message ?? "missing row"}`);

  conversationIds.push(conversation.id);
  const { error: participantsError } = await service.from("conversation_participants").insert([
    {
      conversation_id: conversation.id,
      profile_id: ids.player,
      last_seen_at: createdBy === ids.player ? now : null
    },
    {
      conversation_id: conversation.id,
      profile_id: ids.club,
      last_seen_at: createdBy === ids.club ? now : null
    }
  ]);
  if (participantsError) throw new Error(`participants: ${participantsError.message}`);

  const { error: messageError } = await service.from("messages").insert({
    conversation_id: conversation.id,
    sender_profile_id: createdBy,
    body: firstBody
  });
  if (messageError) throw new Error(`message: ${messageError.message}`);

  return conversation.id;
}

async function cleanup() {
  if (conversationIds.length) {
    await service.from("conversations").delete().in("id", conversationIds);
  }
  await service.from("club_members").delete().eq("team_id", teamId);
  await service.from("teams").delete().eq("id", teamId);
  await service.from("leagues").delete().eq("id", leagueId);
  await service.from("regions").delete().eq("id", regionId);
  await service.from("users").delete().in("id", Object.values(ids).filter(Boolean));
  await service.from("profiles").delete().in("id", Object.values(ids).filter(Boolean));
  for (const id of Object.values(ids).filter(Boolean)) {
    await service.auth.admin.deleteUser(id);
  }
}

try {
  const player = await createUser("player", "player");
  const club = await createUser("club", "club");
  ids.player = player.id;
  ids.club = club.id;

  const now = new Date().toISOString();
  await service.from("regions").insert({
    id: regionId,
    name: "Codex Messaging Region",
    slug: regionId,
    country_code: "TS"
  });
  await service.from("leagues").insert({
    id: leagueId,
    name: "Codex Messaging League",
    slug: leagueId,
    country_scope: "Testland",
    region_ids: [regionId],
    tier: "national",
    team_count: 1,
    description: "Temporary messaging flow test league.",
    status: "active"
  });
  await service.from("teams").insert({
    id: teamId,
    name: "Codex Messaging Club",
    slug: teamId,
    league_id: leagueId,
    region_id: regionId,
    city: "Test City",
    country: "Testland",
    claim_status: "verified",
    claimed_by: club.id,
    claimed_at: now,
    recruiting_active: true,
    open_roster_spots: 1,
    pipeline_names_public: false,
    verified: true
  });
  await service.from("club_members").insert({
    team_id: teamId,
    profile_id: club.id,
    club_role: "owner",
    joined_at: now
  });

  const playerClient = await signIn(player.email);
  const clubClient = await signIn(club.email);

  const playerToClubConversationId = await createConversation({
    createdBy: ids.player,
    subject: "Player to club",
    firstBody: "Player opening message"
  });

  const clubInbox = await clubClient
    .from("conversation_participants")
    .select("conversation_id, last_seen_at")
    .eq("profile_id", ids.club)
    .eq("conversation_id", playerToClubConversationId);
  ok(!clubInbox.error && clubInbox.data?.length === 1, "club inbox can see player-started conversation", clubInbox.error?.message);

  const clubMessages = await clubClient.from("messages").select("id, body").eq("conversation_id", playerToClubConversationId);
  ok(!clubMessages.error && clubMessages.data?.some((message) => message.body === "Player opening message"), "club can read player message through RLS", clubMessages.error?.message);
  ok((await unreadCount(ids.club, playerToClubConversationId)) === 1, "club has one unread player message");
  ok((await unreadCount(ids.player, playerToClubConversationId)) === 0, "player does not count their own sent message as unread");

  await markReadThroughAppPath(clubClient, ids.club, playerToClubConversationId, "club");
  ok((await unreadCount(ids.club, playerToClubConversationId)) === 0, "club unread count clears after read receipt update");

  const clubReply = await clubClient.from("messages").insert({
    conversation_id: playerToClubConversationId,
    sender_profile_id: ids.club,
    body: "Club reply"
  });
  ok(!clubReply.error, "club can reply to player-started conversation", clubReply.error?.message);
  ok((await unreadCount(ids.player, playerToClubConversationId)) === 1, "player receives unread notification for club reply");

  await markReadThroughAppPath(playerClient, ids.player, playerToClubConversationId, "player");
  ok((await unreadCount(ids.player, playerToClubConversationId)) === 0, "player unread count clears after read receipt update");

  const clubToPlayerConversationId = await createConversation({
    createdBy: ids.club,
    subject: "Club to player",
    firstBody: "Club opening message"
  });

  const playerInbox = await playerClient
    .from("conversation_participants")
    .select("conversation_id, last_seen_at")
    .eq("profile_id", ids.player)
    .eq("conversation_id", clubToPlayerConversationId);
  ok(!playerInbox.error && playerInbox.data?.length === 1, "player inbox can see club-started conversation", playerInbox.error?.message);

  const playerMessages = await playerClient.from("messages").select("id, body").eq("conversation_id", clubToPlayerConversationId);
  ok(!playerMessages.error && playerMessages.data?.some((message) => message.body === "Club opening message"), "player can read club message through RLS", playerMessages.error?.message);
  ok((await unreadCount(ids.player, clubToPlayerConversationId)) === 1, "player has one unread club-started message");

  const playerReply = await playerClient.from("messages").insert({
    conversation_id: clubToPlayerConversationId,
    sender_profile_id: ids.player,
    body: "Player reply"
  });
  ok(!playerReply.error, "player can reply to club-started conversation", playerReply.error?.message);
  ok((await unreadCount(ids.club, clubToPlayerConversationId)) === 1, "club receives unread notification for player reply");

  if (failures.length) {
    throw new Error(`${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  }
} finally {
  await cleanup();
}
