import { redis } from './redis';

function hourWindowKey(senderId: string, date: Date): string {
  const stamp = date.toISOString().slice(0, 13).replace(/[-:T]/g, '');
  return `rl:${senderId}:${stamp}`;
}

export function msUntilNextHour(date: Date): number {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime() - date.getTime();
}

// Atomically increments the sender's count for this hour; true if still within limit.
export async function tryConsumeHourlySlot(
  senderId: string,
  hourlyLimit: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const key = hourWindowKey(senderId, now);

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3700);
  }

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
