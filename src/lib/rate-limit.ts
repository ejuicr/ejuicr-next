/**
 * Best-effort, per-instance rate limiting for public authentication routes.
 *
 * Buckets live in process memory, so limits apply per Vercel instance rather
 * than globally. That still slows down guessing and reset-email spam from a
 * single instance; a distributed store would be needed for a hard global cap.
 */

import { ApiError } from "@/lib/api";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5000;

/** Consume one unit for `key`, throwing a 429 once the fixed window is full. */
export function enforceRateLimit(key: string, rule: RateLimitRule): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  if (bucket.count >= rule.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    throw new ApiError(429, "Too many attempts. Please try again later.", {
      "Retry-After": String(retryAfterSeconds),
    });
  }

  bucket.count += 1;
}

/** Best-effort client address for rate-limit keys behind a proxy. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Clear all in-memory buckets; used by tests to isolate cases. */
export function clearRateLimits(): void {
  buckets.clear();
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
