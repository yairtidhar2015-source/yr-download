import "server-only";

/**
 * Small in-memory sliding-window limiter for auth actions.
 * Per-instance only: on multi-instance deploys (Vercel) pair it with Supabase Auth's own
 * rate limits, or replace with a shared store such as Upstash Redis.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}
