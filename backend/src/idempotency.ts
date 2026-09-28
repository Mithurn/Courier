import { redis } from './redis';

const TTL_SECONDS = 24 * 60 * 60;

function keyFor(userId: string, key: string): string {
  return `idem:${userId}:${key}`;
}

export async function claimIdempotencyKey(userId: string, key: string): Promise<boolean> {
  return (await redis.set(keyFor(userId, key), '1', 'EX', TTL_SECONDS, 'NX')) === 'OK';
}

export async function releaseIdempotencyKey(userId: string, key: string): Promise<void> {
  await redis.del(keyFor(userId, key));
}
