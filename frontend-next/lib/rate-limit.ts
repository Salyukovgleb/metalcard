import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  expiresAt: number;
};

type GlobalWithRateLimit = typeof globalThis & {
  __metalcardsRateLimitBuckets?: Map<string, Bucket>;
  __metalcardsRateLimitCleanupAt?: number;
};

const globalWithRateLimit = globalThis as GlobalWithRateLimit;
const buckets = globalWithRateLimit.__metalcardsRateLimitBuckets ?? new Map<string, Bucket>();
if (!globalWithRateLimit.__metalcardsRateLimitBuckets) {
  globalWithRateLimit.__metalcardsRateLimitBuckets = buckets;
}
if (!globalWithRateLimit.__metalcardsRateLimitCleanupAt) {
  globalWithRateLimit.__metalcardsRateLimitCleanupAt = 0;
}

function asBool(value: string | undefined, fallback: boolean): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(normalized);
}

function rateLimitEnabled(): boolean {
  return asBool(process.env.RATE_LIMIT_ENABLED, true);
}

function clientIp(request: Request): string {
  const xForwardedFor = (request.headers.get("x-forwarded-for") ?? "").trim();
  if (xForwardedFor) {
    const [first] = xForwardedFor.split(",", 1);
    const parsed = (first ?? "").trim();
    if (parsed) {
      return parsed;
    }
  }

  const xRealIp = (request.headers.get("x-real-ip") ?? "").trim();
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown";
}

function cleanup(now: number): void {
  const nextCleanupAt = globalWithRateLimit.__metalcardsRateLimitCleanupAt ?? 0;
  if (now < nextCleanupAt) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) {
      buckets.delete(key);
    }
  }

  globalWithRateLimit.__metalcardsRateLimitCleanupAt = now + 30_000;
}

export function rateLimitResponse(
  request: Request,
  name: string,
  options: {
    limit: number;
    windowSec: number;
  },
): NextResponse | null {
  const { limit, windowSec } = options;

  if (!rateLimitEnabled()) {
    return null;
  }

  try {
    const now = Date.now();
    cleanup(now);

    const key = `rl:${name}:${clientIp(request)}`;
    const ttlMs = Math.max(1, Math.trunc(windowSec * 1000));
    const current = buckets.get(key);

    if (!current || current.expiresAt <= now) {
      buckets.set(key, {
        count: 1,
        expiresAt: now + ttlMs,
      });
      return null;
    }

    const nextCount = current.count + 1;
    buckets.set(key, {
      count: nextCount,
      expiresAt: now + ttlMs,
    });

    if (nextCount > limit) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    return null;
  } catch {
    // Fail open: do not break critical checkout/order flows because of rate-limit state errors.
    return null;
  }
}
