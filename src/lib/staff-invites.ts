import { createHash, randomBytes } from "node:crypto";

const STAFF_INVITE_TOKEN_BYTES = 32;

export function createStaffInviteToken() {
  return randomBytes(STAFF_INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashStaffInviteToken(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function staffInvitePath(token: string) {
  return `/invites/club-staff/${encodeURIComponent(token)}`;
}

export function isStaffInvitePath(value?: string | null) {
  return Boolean(value?.startsWith("/invites/club-staff/"));
}
