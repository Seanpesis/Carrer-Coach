const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Returns { success: true } if Redis isn't configured (rate limiting disabled)
async function noopLimit() {
  return { success: true };
}

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };

function makeRatelimit(prefix: string): Limiter {
  if (!hasRedis) return { limit: noopLimit };

  const { Ratelimit } = require("@upstash/ratelimit");
  const { Redis } = require("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: prefix === "ratelimit:upload"
      ? Ratelimit.slidingWindow(5, "1 h")
      : Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix,
  });
}

export const chatRatelimit = makeRatelimit("ratelimit:chat");
export const uploadRatelimit = makeRatelimit("ratelimit:upload");
