import './env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { msUntilNextHour, orderOffsetMs } from '../src/rate-limit';
import { scheduleEmailSchema, MAX_RECIPIENTS } from '../src/services/schedule-email.service';

const valid = { senderId: 's1', subject: 'Hi', body: '<p>x</p>', recipients: ['a@example.com'] };

describe('msUntilNextHour', () => {
  it('counts to the next UTC hour boundary', () => {
    assert.equal(msUntilNextHour(new Date('2026-09-29T10:10:00.000Z')), 50 * 60 * 1000);
  });

  it('waits a full hour when exactly on the boundary', () => {
    assert.equal(msUntilNextHour(new Date('2026-09-29T10:00:00.000Z')), 60 * 60 * 1000);
  });
});

describe('orderOffsetMs', () => {
  const now = new Date('2026-09-29T10:30:00.000Z');

  it('grows with the original due time inside the window', () => {
    const early = orderOffsetMs(now, new Date('2026-09-29T10:00:05.000Z'));
    const late = orderOffsetMs(now, new Date('2026-09-29T10:20:00.000Z'));
    assert.ok(early < late);
  });

  it('stays within 3.6s and is zero for jobs due before the window', () => {
    assert.equal(orderOffsetMs(now, new Date('2026-09-29T08:00:00.000Z')), 0);
    assert.ok(orderOffsetMs(now, new Date('2026-09-29T10:59:59.000Z')) <= 3599);
  });
});

describe('scheduleEmailSchema', () => {
  it('lowercases and trims recipients', () => {
    const parsed = scheduleEmailSchema.parse({ ...valid, recipients: ['  A@Example.COM '] });
    assert.deepEqual(parsed.recipients, ['a@example.com']);
  });

  it('rejects invalid addresses, empty lists and oversized batches', () => {
    assert.equal(scheduleEmailSchema.safeParse({ ...valid, recipients: ['nope'] }).success, false);
    assert.equal(scheduleEmailSchema.safeParse({ ...valid, recipients: [] }).success, false);
    const tooMany = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => `u${i}@example.com`);
    assert.equal(scheduleEmailSchema.safeParse({ ...valid, recipients: tooMany }).success, false);
  });

  it('rejects a start time more than a year away and non-positive limits', () => {
    const farFuture = new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString();
    assert.equal(scheduleEmailSchema.safeParse({ ...valid, startAt: farFuture }).success, false);
    assert.equal(scheduleEmailSchema.safeParse({ ...valid, hourlyLimit: 0 }).success, false);
  });
});
