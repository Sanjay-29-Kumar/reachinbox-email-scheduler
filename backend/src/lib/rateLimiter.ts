import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

export function getHourlyRateLimitKey(senderId: string, date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');

  // Allow custom test window if configured in env for automated testing
  if (process.env.RATE_LIMIT_WINDOW === 'minute') {
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    return `rate_limit:${senderId}:${yyyy}-${mm}-${dd}-${hh}-${min}`;
  }

  return `rate_limit:${senderId}:${yyyy}-${mm}-${dd}-${hh}`;
}

export function getMsUntilNextHour(date: Date = new Date()): number {
  if (process.env.RATE_LIMIT_TEST_WINDOW_MS) {
    return parseInt(process.env.RATE_LIMIT_TEST_WINDOW_MS, 10);
  }

  if (process.env.RATE_LIMIT_WINDOW === 'minute') {
    const nextMinute = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes() + 1,
      0,
      0
    ));
    return Math.max(1000, nextMinute.getTime() - date.getTime());
  }

  const nextHour = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + 1,
    0,
    0,
    0
  ));
  return Math.max(1000, nextHour.getTime() - date.getTime());
}

const checkAndIncrementLua = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])

  local current = tonumber(redis.call('GET', key) or "0")
  if current < limit then
      local val = redis.call('INCR', key)
      if val == 1 then
          redis.call('EXPIRE', key, ttl)
      end
      return { 1, val }
  else
      return { 0, current }
  end
`;

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  key: string;
}

export async function consumeRateLimitQuota(senderId: string, limit: number): Promise<RateLimitCheckResult> {
  const key = getHourlyRateLimitKey(senderId);
  const ttlSeconds = process.env.RATE_LIMIT_WINDOW === 'minute' ? 300 : 7200;

  try {
    const result = (await redisClient.eval(
      checkAndIncrementLua,
      1,
      key,
      limit,
      ttlSeconds
    )) as [number, number];

    const allowed = result[0] === 1;
    const currentCount = result[1];

    return {
      allowed,
      currentCount,
      key,
    };
  } catch (error) {
    console.error(`[RateLimiter Error] Failed to evaluate rate limit for sender ${senderId}:`, error);
    // Safe fallback: allow sending if Redis eval fails to avoid blocking email delivery unexpectedly
    return {
      allowed: true,
      currentCount: 0,
      key,
    };
  }
}
