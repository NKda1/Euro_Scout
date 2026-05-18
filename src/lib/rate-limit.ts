/**
 * In-memory sliding-window rate limiter.
 *
 * Works correctly for single-instance Node.js deployments (local dev, single
 * container). For multi-replica production you would replace the Map with a
 * shared store such as Upstash Redis.
 *
 * Keys are arbitrary strings — typically `"ip:<address>"` or
 * `"action:<name>:<ip>"`.
 */

interface Entry {
  count: number;
  /** Unix ms timestamp at which the window resets */
  reset: number;
}

// Module-level store — survives across requests in the same process.
const store = new Map<string, Entry>();

// Prune stale entries every 10 minutes so the Map doesn't grow unbounded.
let pruneTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePrune() {
  if (pruneTimer) return;
  pruneTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.reset) store.delete(key);
    }
    pruneTimer = null;
    schedulePrune();
  }, 10 * 60 * 1000);
  // Don't prevent the process from exiting
  if (pruneTimer && typeof pruneTimer === "object" && "unref" in pruneTimer) {
    (pruneTimer as NodeJS.Timeout).unref();
  }
}
schedulePrune();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix ms timestamp — when the window resets */
  resetAt: number;
}

/**
 * @param key       Unique identifier for this rate-limit bucket
 * @param limit     Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // New window or expired window — reset the counter
  if (!entry || now > entry.reset) {
    const reset = now + windowMs;
    store.set(key, { count: 1, reset });
    return { allowed: true, remaining: limit - 1, resetAt: reset };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.reset };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.reset };
}

/** Helper: extract best-effort client IP from a Next.js Request/NextRequest */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
