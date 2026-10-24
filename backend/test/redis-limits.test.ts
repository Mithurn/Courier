import './env';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { redis } from '../src/redis';
import {
  claimRateLimitAlert,
  incrWithinWindow,
  releaseDailyQuota,
  tryConsumeHourlySlot,
  tryReserveDailyQuota,
} from '../src/rate-limit';
import { tryClaimSendSlot } from '../src/send-pacing';
import { claimIdempotencyKey, releaseIdempotencyKey } from '../src/idempotency';

// Every test uses a fresh random id, so these never collide with other suites sharing the Redis db.
const id = () => randomUUID();

after(async () => {
  await redis.quit();
});

describe('incrWithinWindow', () => {
  it('counts up from zero and sets a TTL on first use', async () => {
    const key = `test:incr:${id()}`;
    assert.equal(await incrWithinWindow(key, 1, 60), 1);
    assert.equal(await incrWithinWindow(key, 4, 60), 5);
    const ttl = await redis.ttl(key);
    assert.ok(ttl > 0 && ttl <= 60, `expected a TTL within 60s, got ${ttl}`);
    await redis.del(key);
  });
});

describe('tryConsumeHourlySlot', () => {
  it('allows up to the limit, then defers to the next UTC hour', async () => {
    const sender = id();
    const dueAt = new Date();
    assert.deepEqual(await tryConsumeHourlySlot(sender, 2, dueAt), { allowed: true, retryAt: 0 });
    assert.deepEqual(await tryConsumeHourlySlot(sender, 2, dueAt), { allowed: true, retryAt: 0 });

    const third = await tryConsumeHourlySlot(sender, 2, dueAt);
    assert.equal(third.allowed, false);
    const nextHour = (Math.floor(Date.now() / 3_600_000) + 1) * 3_600_000;
    assert.ok(third.retryAt >= nextHour, 'retry must be at or after the next hour boundary');
    assert.ok(third.retryAt <= nextHour + 3_600 + 1_000, 'retry offset stays within the ordering window');
  });

  it('counts each sender separately', async () => {
    const [a, b] = [id(), id()];
    assert.equal((await tryConsumeHourlySlot(a, 1, new Date())).allowed, true);
    assert.equal((await tryConsumeHourlySlot(a, 1, new Date())).allowed, false);
    assert.equal((await tryConsumeHourlySlot(b, 1, new Date())).allowed, true);
  });
});

describe('claimRateLimitAlert', () => {
  it('lets only the first caller in an hour raise the alert', async () => {
    const sender = id();
    assert.equal(await claimRateLimitAlert(sender), true);
    assert.equal(await claimRateLimitAlert(sender), false);
    assert.equal(await claimRateLimitAlert(id()), true);
  });
});

describe('daily quota', () => {
  it('reserves up to the limit and refuses without keeping a partial reservation', async () => {
    const user = id();
    assert.equal(await tryReserveDailyQuota(user, 3, 5), true);
    assert.equal(await tryReserveDailyQuota(user, 3, 5), false);
    // The refused request must have been rolled back, so 2 more still fit.
    assert.equal(await tryReserveDailyQuota(user, 2, 5), true);
    assert.equal(await tryReserveDailyQuota(user, 1, 5), false);
  });

  it('frees capacity when a reservation is released', async () => {
    const user = id();
    assert.equal(await tryReserveDailyQuota(user, 5, 5), true);
    assert.equal(await tryReserveDailyQuota(user, 1, 5), false);
    await releaseDailyQuota(user, 2);
    assert.equal(await tryReserveDailyQuota(user, 2, 5), true);
  });

  it('tracks users independently', async () => {
    const [a, b] = [id(), id()];
    assert.equal(await tryReserveDailyQuota(a, 1, 1), true);
    assert.equal(await tryReserveDailyQuota(b, 1, 1), true);
  });
});

describe('tryClaimSendSlot', () => {
  it('claims immediately, then reports the remaining wait while the slot is held', async () => {
    const sender = id();
    assert.equal(await tryClaimSendSlot(sender, 5_000), 0);
    const wait = await tryClaimSendSlot(sender, 5_000);
    assert.ok(wait > 0 && wait <= 5_000, `expected 0 < wait <= 5000, got ${wait}`);
  });

  it('lets exactly one of several concurrent callers claim the slot', async () => {
    const sender = id();
    const results = await Promise.all(Array.from({ length: 8 }, () => tryClaimSendSlot(sender, 5_000)));
    assert.equal(results.filter((ms) => ms === 0).length, 1);
  });

  it('frees the slot once the minimum delay has passed', async () => {
    const sender = id();
    assert.equal(await tryClaimSendSlot(sender, 50), 0);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(await tryClaimSendSlot(sender, 50), 0);
  });
});

describe('idempotency keys', () => {
  it('accepts a key once per user and rejects replays', async () => {
    const [user, key] = [id(), id()];
    assert.equal(await claimIdempotencyKey(user, key), true);
    assert.equal(await claimIdempotencyKey(user, key), false);
  });

  it('scopes keys to the user', async () => {
    const key = id();
    assert.equal(await claimIdempotencyKey(id(), key), true);
    assert.equal(await claimIdempotencyKey(id(), key), true);
  });

  it('allows a retry after the key is released', async () => {
    const [user, key] = [id(), id()];
    await claimIdempotencyKey(user, key);
    await releaseIdempotencyKey(user, key);
    assert.equal(await claimIdempotencyKey(user, key), true);
  });
});
