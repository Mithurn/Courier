import { redis } from './redis';

function lastSentKey(senderId: string): string {
  return `last-sent:${senderId}`;
}

// Ms to wait before this sender can send again, 0 if clear now.
export async function msUntilNextAllowedSend(
  senderId: string,
  minDelayMs: number,
): Promise<number> {
  const lastSent = await redis.get(lastSentKey(senderId));
  if (!lastSent) return 0;

  const elapsed = Date.now() - Number(lastSent);
  return Math.max(0, minDelayMs - elapsed);
}

export async function markSent(senderId: string): Promise<void> {
  await redis.set(lastSentKey(senderId), Date.now());
}
