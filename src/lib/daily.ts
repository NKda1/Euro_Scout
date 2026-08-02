import type { Profile } from "@/lib/auth";

const DAILY_API_BASE = "https://api.daily.co/v1";
const ROOM_START_BUFFER_MINUTES = 5;
const ROOM_END_BUFFER_MINUTES = 30;
const DEFAULT_CALL_DURATION_MINUTES = 30;
const DAILY_REQUEST_TIMEOUT_MS = 10_000;
const DAILY_MAX_ATTEMPTS = 3;

interface DailyRoomResponse {
  id: string;
  name: string;
  url: string;
  privacy: string;
  config?: Record<string, unknown>;
}

interface DailyMeetingTokenResponse {
  token: string;
}

interface CreateDailyRoomInput {
  meetingId: string;
  scheduledAt: string;
  durationMinutes?: number;
}

interface CreateDailyMeetingTokenInput {
  roomName: string;
  user: Pick<Profile, "id" | "display_name">;
  isOwner?: boolean;
  expiresAt?: string | null;
}

function getDailyApiKey() {
  return process.env.DAILY_API_KEY ?? process.env.DAILY_API_TOKEN ?? "";
}

export function dailyConfigured() {
  return Boolean(getDailyApiKey());
}

function epochSeconds(value: Date) {
  return Math.floor(value.getTime() / 1000);
}

function roomNameForMeeting(meetingId: string) {
  return `euroscout-${meetingId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 70)}`;
}

function callWindow(scheduledAt: string, durationMinutes = DEFAULT_CALL_DURATION_MINUTES) {
  const scheduledDate = new Date(scheduledAt);
  const safeScheduledDate = Number.isNaN(scheduledDate.getTime()) ? new Date() : scheduledDate;
  const startsAt = new Date(safeScheduledDate.getTime() - ROOM_START_BUFFER_MINUTES * 60 * 1000);
  const endsAt = new Date(safeScheduledDate.getTime() + (durationMinutes + ROOM_END_BUFFER_MINUTES) * 60 * 1000);

  return { startsAt, endsAt };
}

async function dailyPost<T>(path: string, body: Record<string, unknown>) {
  const apiKey = getDailyApiKey();

  if (!apiKey) {
    throw new Error("Daily is not configured. Add DAILY_API_KEY to enable video calls.");
  }

  let lastError = "Daily request failed.";
  for (let attempt = 1; attempt <= DAILY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${DAILY_API_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(DAILY_REQUEST_TIMEOUT_MS)
      });

      if (response.ok) return (await response.json()) as T;

      const errorText = (await response.text()).slice(0, 500);
      lastError = errorText || `Daily request failed with status ${response.status}.`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === DAILY_MAX_ATTEMPTS) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Daily network request failed.";
      if (attempt === DAILY_MAX_ATTEMPTS) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
  }

  console.error("Daily API request failed", { path, attempts: DAILY_MAX_ATTEMPTS, error: lastError });
  throw new Error(`Video provider request failed. ${lastError}`);
}

export async function deleteDailyRoom(roomName: string) {
  const apiKey = getDailyApiKey();
  if (!apiKey || !roomName) return;

  const response = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(DAILY_REQUEST_TIMEOUT_MS)
  }).catch(() => null);

  if (response && !response.ok && response.status !== 404) {
    console.error("[daily.room_cleanup.failed]", { roomName, status: response.status });
  }
}

export async function createDailyRoom({ meetingId, scheduledAt, durationMinutes = DEFAULT_CALL_DURATION_MINUTES }: CreateDailyRoomInput) {
  const roomName = roomNameForMeeting(meetingId);
  const { startsAt, endsAt } = callWindow(scheduledAt, durationMinutes);

  const room = await dailyPost<DailyRoomResponse>("/rooms", {
    name: roomName,
    privacy: "private",
    properties: {
      nbf: epochSeconds(startsAt),
      exp: epochSeconds(endsAt),
      max_participants: 6,
      enable_people_ui: true,
      enable_prejoin_ui: true,
      enable_network_ui: true,
      enable_pip_ui: true,
      enable_hand_raising: true,
      enable_screenshare: true,
      enable_chat: false,
      start_video_off: false,
      start_audio_off: false,
      eject_at_room_exp: true,
      enable_mesh_sfu: true,
      sfu_switchover: 0.5,
      enable_adaptive_simulcast: true
    }
  });

  return {
    room,
    roomExpiresAt: endsAt.toISOString()
  };
}

export async function createDailyMeetingToken({ roomName, user, isOwner = false, expiresAt }: CreateDailyMeetingTokenInput) {
  const tokenExpiresAt = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  const safeExpiresAt = Number.isNaN(tokenExpiresAt.getTime()) ? new Date(Date.now() + 2 * 60 * 60 * 1000) : tokenExpiresAt;

  const response = await dailyPost<DailyMeetingTokenResponse>("/meeting-tokens", {
    properties: {
      room_name: roomName,
      exp: epochSeconds(safeExpiresAt),
      nbf: epochSeconds(new Date(Date.now() - 60 * 1000)),
      eject_at_token_exp: true,
      is_owner: isOwner,
      user_name: user.display_name,
      user_id: user.id,
      enable_screenshare: true,
      enable_prejoin_ui: true,
      start_video_off: false,
      start_audio_off: false,
      lang: "en"
    }
  });

  return {
    token: response.token,
    expiresAt: safeExpiresAt.toISOString()
  };
}

export function buildDailyJoinUrl(roomUrl: string, token: string) {
  const separator = roomUrl.includes("?") ? "&" : "?";
  return `${roomUrl}${separator}t=${encodeURIComponent(token)}`;
}
