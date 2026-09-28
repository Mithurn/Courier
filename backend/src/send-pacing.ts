import { redis } from './redis';

function lastSentKey(senderId: string): string {
  return `last-sent:${senderId}`;
}

/**
 * Enforces the configured minimum gap between sends for a sender.
 * Returns ms to wait if called too soon, 0 if clear to send now.
 */
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
