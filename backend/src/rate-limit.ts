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

// Atomically increments the sender's count for this hour; true if still within limit.
export async function tryConsumeHourlySlot(
  senderId: string,
  hourlyLimit: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const key = hourWindowKey(senderId, now);

  const results = await redis.multi().incr(key).expire(key, 3700, 'NX').exec();
  const count = Number(results?.[0]?.[1]);

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
