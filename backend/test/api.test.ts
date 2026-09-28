import './env';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/prisma';
import { emailQueue } from '../src/queues/email-queue';
import { esClient } from '../src/es';
import { env } from '../src/env';
import { closeAll, createSender, createUser, resetState, startApi, waitFor } from './helpers';

type Api = Awaited<ReturnType<typeof startApi>>;
let api: Api;
let a: Awaited<ReturnType<typeof createUser>>;
let b: Awaited<ReturnType<typeof createUser>>;
let senderA: Awaited<ReturnType<typeof createSender>>;

const FAR = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const batch = (senderId: string, recipients: string[], extra: object = {}) => ({
  senderId,
  subject: 'Subject',
  body: '<p>Hello <b>there</b></p>',
  recipients,
  startAt: FAR(),
  ...extra,
});
const addrs = (tag: string, n: number) => Array.from({ length: n }, (_, i) => `${tag}${i}@example.com`);

before(async () => {
  await resetState();
  api = await startApi();
  a = await createUser('a');
  b = await createUser('b');
  senderA = await createSender(a.user.id, 2525, 5);
});

after(async () => {
  await api.close();
  await closeAll();
});

describe('access control', () => {
  it('rejects unauthenticated and forged requests', async () => {
    assert.equal((await api.call(null, 'GET', '/emails/counts')).status, 401);
    assert.equal((await api.call(null, 'GET', '/senders')).status, 401);
    assert.equal((await api.call('courier_session=garbage', 'GET', '/emails/counts')).status, 401);
    assert.equal((await api.call(null, 'GET', '/health')).status, 200);
  });

  it('protects Bull Board with basic auth', async () => {
    assert.equal((await api.call(null, 'GET', env.BULLBOARD_PATH)).status, 401);
    const auth = Buffer.from(`${env.BULLBOARD_USER}:${env.BULLBOARD_PASSWORD}`).toString('base64');
    assert.equal((await api.call(null, 'GET', env.BULLBOARD_PATH, undefined, { Authorization: `Basic ${auth}` })).status, 200);
  });

  it('lists senders without SMTP secrets', async () => {
    const res = await api.call(a.cookie, 'GET', '/senders');
    assert.equal(res.status, 200);
    assert.equal(res.json.length, 1);
    assert.deepEqual(Object.keys(res.json[0]).sort(), ['email', 'hourlyLimit', 'id', 'name']);
    assert.deepEqual((await api.call(b.cookie, 'GET', '/senders')).json, []);
  });
});

describe('request validation', () => {
  it('answers 4xx, not 500, for bad input', async () => {
    assert.equal((await api.call(a.cookie, 'POST', '/emails/schedule', '{bad json')).status, 400);
    assert.equal((await api.call(a.cookie, 'POST', '/emails/schedule', { x: 'y'.repeat(1_100_000) })).status, 413);
    assert.equal((await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, ['nope']))).status, 400);
    assert.equal((await api.call(a.cookie, 'GET', '/emails/scheduled?pageSize=1000')).status, 400);
    assert.equal((await api.call(a.cookie, 'GET', '/emails/search?page=600&pageSize=20')).status, 400);
  });
});

describe('batch scheduling', () => {
  it('creates one row and one delayed job per unique recipient, spaced by the minimum delay', async () => {
    const recipients = [...addrs('batch', 3), 'BATCH0@example.com'];
    const res = await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, recipients, { delayBetweenSendsMs: 0 }));
    assert.equal(res.status, 201);
    assert.equal(res.json.count, 3);

    const rows = await prisma.scheduledEmail.findMany({ where: { toEmail: { startsWith: 'batch' } }, orderBy: { scheduledAt: 'asc' } });
    assert.equal(rows.length, 3);
    assert.equal(rows[1].scheduledAt.getTime() - rows[0].scheduledAt.getTime(), env.MIN_DELAY_BETWEEN_SENDS_MS);
    for (const row of rows) {
      assert.equal(row.status, 'scheduled');
      assert.ok(await emailQueue.getJob(row.id), 'delayed job exists with jobId = row id');
    }
  });

  it('never lets a request raise the hourly limit above the sender cap', async () => {
    const raised = await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, addrs('raise', 1), { hourlyLimit: 1_000_000_000 }));
    assert.equal(raised.json.hourlyLimit, senderA.hourlyLimit);
    const lowered = await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, addrs('lower', 1), { hourlyLimit: 2 }));
    assert.equal(lowered.json.hourlyLimit, 2);
  });

  it('rejects a duplicate Idempotency-Key and frees the key when scheduling fails', async () => {
    const headers = { 'Idempotency-Key': 'idem-key-12345' };
    const first = await api.call(a.cookie, 'POST', '/emails/schedule', batch('missing-sender', addrs('idem', 1)), headers);
    assert.equal(first.status, 404);
    const retry = await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, addrs('idem', 1)), headers);
    assert.equal(retry.status, 201);
    const dup = await api.call(a.cookie, 'POST', '/emails/schedule', batch(senderA.id, addrs('idem', 1)), headers);
    assert.equal(dup.status, 409);
  });

  it('enforces the daily quota per user', async () => {
    const before = await api.call(b.cookie, 'GET', '/emails/counts');
    assert.equal(before.status, 200);
    const senderB = await createSender(b.user.id, 2525);
    assert.equal((await api.call(b.cookie, 'POST', '/emails/schedule', batch(senderB.id, addrs('qa', 15)))).status, 201);
    assert.equal((await api.call(b.cookie, 'POST', '/emails/schedule', batch(senderB.id, addrs('qb', 6)))).status, 429);
    assert.equal((await api.call(b.cookie, 'POST', '/emails/schedule', batch(senderB.id, addrs('qc', 5)))).status, 201);
  });
});

describe('tenant isolation and reads', () => {
  it('scopes lists, counts, detail and sender use to the owner', async () => {
    const mine = await api.call(a.cookie, 'GET', '/emails/scheduled?pageSize=2&page=1');
    assert.equal(mine.status, 200);
    assert.equal(mine.json.items.length, 2);
    assert.ok(mine.json.total > 2);
    assert.equal(mine.json.items[0].from, senderA.smtpUser);

    const detail = await api.call(a.cookie, 'GET', `/emails/${mine.json.items[0].id}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.json.body.includes('<b>there</b>'));
    assert.equal((await api.call(b.cookie, 'GET', `/emails/${mine.json.items[0].id}`)).status, 404);

    const sentByB = await api.call(b.cookie, 'GET', '/emails/sent');
    assert.equal(sentByB.json.total, 0);
    const countsA = await api.call(a.cookie, 'GET', '/emails/counts');
    assert.equal(countsA.json.scheduled, mine.json.total);

    const stolen = await api.call(b.cookie, 'POST', '/emails/schedule', batch(senderA.id, addrs('steal', 1)));
    assert.equal(stolen.status, 404);
  });

  it('finds scheduled emails through Elasticsearch, only for their owner', async () => {
    await esClient.indices.refresh({ index: env.ELASTICSEARCH_INDEX });
    const found = await waitFor(async () => {
      await esClient.indices.refresh({ index: env.ELASTICSEARCH_INDEX });
      const res = await api.call(a.cookie, 'GET', '/emails/search?q=batch0');
      return res.json.total >= 1 ? res : false;
    });
    assert.ok(found.json.items.every((item: { toEmail: string }) => item.toEmail.includes('batch0')));
    assert.equal((await api.call(b.cookie, 'GET', '/emails/search?q=batch0')).json.total, 0);
  });
});
