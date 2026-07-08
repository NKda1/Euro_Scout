import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getClientIp, rateLimit, type RateLimitResult } from "@/lib/rate-limit";

function waitMinutes(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
}

function withError(path: string, message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;
}

export async function getActionRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const headerStore = await headers();
  const ip = getClientIp({ headers: headerStore } as unknown as Request);
  return rateLimit(`${key}:${ip}`, limit, windowMs);
}

export async function enforceActionRateLimit(key: string, limit: number, windowMs: number, redirectPath: string) {
  const result = await getActionRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    redirect(withError(redirectPath, `Too many attempts. Please wait ${waitMinutes(result.resetAt)} minute(s) before trying again.`));
  }
  return result;
}
