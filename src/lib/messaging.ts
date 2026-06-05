import type { Profile } from "@/lib/auth";

export interface MessageRow {
  id: string;
  conversation_id?: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export interface ParticipantReadState {
  conversation_id?: string;
  profile_id: string;
  last_seen_at: string | null;
}

export function profileInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function isMessageUnreadForProfile(message: MessageRow, profileId: string, lastSeenAt: string | null) {
  if (message.sender_profile_id === profileId) return false;
  if (!lastSeenAt) return true;

  return new Date(message.created_at).getTime() > new Date(lastSeenAt).getTime();
}

export function countUnreadMessages(messages: MessageRow[], profileId: string, lastSeenAt: string | null) {
  return messages.filter((message) => isMessageUnreadForProfile(message, profileId, lastSeenAt)).length;
}

export function getDisplayProfile(profiles: Profile[], currentProfileId: string) {
  return profiles.find((profile) => profile.id !== currentProfileId) ?? profiles[0] ?? null;
}
