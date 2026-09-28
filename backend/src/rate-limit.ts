import { redis } from './redis';

function hourWindowKey(senderId: string, date: Date): string {
  const stamp = date.toISOString().slice(0, 13).replace(/[-:T]/g, '');
  return `rl:${senderId}:${stamp}`;
}

const HOUR_MS = 60 * 60 * 1000;

// Window keys are UTC hours, so the boundary must be too (local-time math breaks in half-hour zones like IST).
export function msUntilNextHour(date: Date): number {
  return HOUR_MS - (date.getTime() % HOUR_MS);
}

// SET NX + INCRBY in one MULTI works on any Redis version and never leaves a counter without a TTL.
export async function incrWithinWindow(key: string, by: number, ttlSeconds: number): Promise<number> {
  const results = await redis.multi().set(key, 0, 'EX', ttlSeconds, 'NX').incrby(key, by).exec();
  const count = Number(results?.[1]?.[1]);
  if (!Number.isFinite(count)) throw new Error('Redis counter returned no value');
  return count;
}

// Atomically increments the sender's count for this hour; true if still within limit.
export async function tryConsumeHourlySlot(
  senderId: string,
  hourlyLimit: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const key = hourWindowKey(senderId, now);

  const count = await incrWithinWindow(key, 1, 3700);

  if (count > hourlyLimit) {
    return { allowed: false, retryAfterMs: msUntilNextHour(now) };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// One Slack alert per sender per hour, not one per job that hits the cap.
export async function claimRateLimitAlert(senderId: string): Promise<boolean> {
  const key = `rl-alert:${hourWindowKey(senderId, new Date())}`;
  const claimed = await redis.set(key, '1', 'EX', 3700, 'NX');
  return claimed === 'OK';
}

function dailyQuotaKey(userId: string): string {
  return `quota:${userId}:${new Date().toISOString().slice(0, 10)}`;
}

// Reserves `count` sends against the user's UTC-day quota; false (and nothing reserved) if it would exceed it.
export async function tryReserveDailyQuota(userId: string, count: number, limit: number): Promise<boolean> {
  const key = dailyQuotaKey(userId);
  const results = await redis.multi().incrby(key, count).expire(key, 90_000, 'NX').exec();
  if (Number(results?.[0]?.[1]) > limit) {
    await redis.decrby(key, count);
    return false;
  }
  return true;
}

export async function releaseDailyQuota(userId: string, count: number): Promise<void> {
  await redis.decrby(dailyQuotaKey(userId), count);
}
