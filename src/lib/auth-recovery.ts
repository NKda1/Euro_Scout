import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_COOKIE_NAME = "euroscout-recovery";
export const RECOVERY_WINDOW_SECONDS = 20 * 60;

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Password recovery signing is not configured.");
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(`password-recovery:${payload}`).digest("base64url");
}

export function createRecoveryMarker(userId: string, issuedAt = Date.now()) {
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${signature(payload)}`;
}

export function isValidRecoveryMarker(value: string | undefined, userId: string, now = Date.now()) {
  if (!value) return false;
  const [storedUserId, issuedAtValue, suppliedSignature] = value.split(".");
  const issuedAt = Number(issuedAtValue);
  if (storedUserId !== userId || !Number.isFinite(issuedAt) || !suppliedSignature) return false;
  if (issuedAt > now + 60_000 || now - issuedAt > RECOVERY_WINDOW_SECONDS * 1000) return false;

  const expectedSignature = signature(`${storedUserId}.${issuedAtValue}`);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function recoveryCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: RECOVERY_WINDOW_SECONDS
  };
}
