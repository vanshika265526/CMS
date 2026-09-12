// MCP Server — In-memory sliding-window rate limiter
//
// Lightweight, dependency-free. Suitable for a single Render instance. For a
// horizontally-scaled deployment, swap the Map for a shared store (e.g. Redis).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  limit: number;
}

/**
 * Fixed-window limiter. Returns whether the call is allowed and how many
 * requests remain in the current window.
 */
export function checkRateLimit(
  key: string,
  limit = Number(process.env.MCP_RATE_LIMIT || 120),
  windowMs = Number(process.env.MCP_RATE_WINDOW_MS || 60_000)
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetInMs: bucket.resetAt - now,
    limit,
  };
}

// Periodically evict stale buckets to bound memory. unref() so it never keeps
// the process alive on its own.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000);
if (typeof sweep.unref === 'function') sweep.unref();
