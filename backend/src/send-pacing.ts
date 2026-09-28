import { redis } from './redis';

function lastSentKey(senderId: string): string {
  return `last-sent:${senderId}`;
}

// Atomically claims the pacing slot for a sender (SET NX so concurrent workers
// can't both pass). Returns 0 if claimed now, or ms still left to wait.
export async function tryClaimSendSlot(senderId: string, minDelayMs: number): Promise<number> {
  const key = lastSentKey(senderId);
  const claimed = await redis.set(key, Date.now(), 'PX', minDelayMs, 'NX');
  if (claimed === 'OK') return 0;

  const ttl = await redis.pttl(key);
  return Math.max(0, ttl);
}
