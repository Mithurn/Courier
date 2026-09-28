import './env';
import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/prisma';
import { redis } from '../src/redis';
import { emailQueue, EmailJob } from '../src/queues/email-queue';
import { QUEUE_NAME } from '../src/queues/email-queue';
import {
  closeAll,
  createSender,
  createUser,
  resetState,
  startApi,
  startFakeSmtp,
  startWebhook,
  startWorker,
  waitFor,
  type FakeSmtp,
  type WorkerProcess,
} from './helpers';

const HOUR_MS = 3600 * 1000;
let smtp: FakeSmtp;
let api: Awaited<ReturnType<typeof startApi>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let workers: WorkerProcess[] = [];

const startedWorker = () => {
  const worker = startWorker();
  workers.push(worker);
  return worker;
};
const statusOf = (toEmail: string) => prisma.scheduledEmail.findFirst({ where: { toEmail } }).then((row) => row?.status);
const deferredToNextHour = async () => {
  const delayed = await redis.zrange(`bull:${QUEUE_NAME}:delayed`, 0, -1, 'WITHSCORES');
  let count = 0;
  for (let i = 1; i < delayed.length; i += 2) if (Math.floor(Number(delayed[i]) / 4096) > Date.now() + 10 * 60 * 1000) count++;
  return count;
};
const soon = (ms = 300) => new Date(Date.now() + ms).toISOString();

before(async () => {
  await resetState();
  smtp = await startFakeSmtp();
  api = await startApi();
  owner = await createUser('owner');
});

afterEach(async () => {
  await Promise.all(workers.map((w) => w.stop()));
  workers = [];
  smtp.rejectAll = false;
  smtp.received.length = 0;
  await prisma.scheduledEmail.deleteMany();
  await prisma.slackIntegration.deleteMany();
  await redis.flushdb();
});

after(async () => {
  await api.close();
  await smtp.close();
  await closeAll();
});

async function schedule(senderId: string, recipients: string[], extra: object = {}) {
  const res = await api.call(owner.cookie, 'POST', '/emails/schedule', {
    senderId,
    subject: 'Hello',
    body: '<p>hi</p>',
    recipients,
    startAt: soon(),
    delayBetweenSendsMs: 0,
    ...extra,
  });
  assert.equal(res.status, 201);
}

describe('sending', { timeout: 60000 }, () => {
  it('sends every scheduled email exactly once and records it', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    const recipients = ['s1@example.com', 's2@example.com', 's3@example.com'];
    await schedule(sender.id, recipients);
    startedWorker();

    await waitFor(async () => (await prisma.scheduledEmail.count({ where: { status: 'sent' } })) === 3);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.deepEqual([...smtp.received].sort(), recipients);
    const rows = await prisma.scheduledEmail.findMany();
    assert.ok(rows.every((row) => row.sentAt !== null));
  });

  it('does not send the same email twice when the job is enqueued again', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    await schedule(sender.id, ['dup@example.com']);
    const row = await prisma.scheduledEmail.findFirstOrThrow();
    await emailQueue.add(EmailJob.SEND, { emailId: row.id }, { jobId: row.id });
    startedWorker();

    await waitFor(async () => (await statusOf('dup@example.com')) === 'sent');
    await emailQueue.add(EmailJob.SEND, { emailId: row.id }, { jobId: `${row.id}-again` });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    assert.equal(smtp.received.filter((r) => r === 'dup@example.com').length, 1);
  });

  it('marks an email failed after retries are exhausted, without sending it', async () => {
    smtp.rejectAll = true;
    const sender = await createSender(owner.user.id, smtp.port);
    await schedule(sender.id, ['bad@example.com']);
    startedWorker();

    await waitFor(async () => (await statusOf('bad@example.com')) === 'failed', 30000);
    const row = await prisma.scheduledEmail.findFirstOrThrow();
    assert.ok(row.failReason);
    assert.equal(smtp.received.length, 0);
  });
});

describe('infrastructure errors', { timeout: 60000 }, () => {
  it('marks an email failed when a job exhausts its retries before reaching SMTP', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    await prisma.scheduledEmail.create({
      data: { senderId: sender.id, toEmail: 'stuck@example.com', subject: 's', body: '<p>s</p>', scheduledAt: new Date(), delayMs: 0 },
    });
    startedWorker();

    await waitFor(async () => (await statusOf('stuck@example.com')) === 'failed', 30000);
    const row = await prisma.scheduledEmail.findFirstOrThrow();
    assert.ok(row.failReason);
    assert.equal(smtp.received.length, 0);
  });
});

describe('restart safety', { timeout: 60000 }, () => {
  it('sends jobs scheduled while no worker was running', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    await schedule(sender.id, ['offline@example.com']);
    await new Promise((resolve) => setTimeout(resolve, 800));
    assert.equal(await statusOf('offline@example.com'), 'scheduled');

    startedWorker();
    await waitFor(async () => (await statusOf('offline@example.com')) === 'sent');
    assert.deepEqual(smtp.received, ['offline@example.com']);
  });

  it('keeps a future email across a worker restart and sends it once, on time', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    const dueAt = Date.now() + 4000;
    await schedule(sender.id, ['future@example.com'], { startAt: new Date(dueAt).toISOString() });

    const first = startedWorker();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await first.stop();
    assert.equal(smtp.received.length, 0);

    startedWorker();
    await waitFor(async () => (await statusOf('future@example.com')) === 'sent');
    assert.ok(Date.now() >= dueAt, 'not sent before its scheduled time');
    assert.deepEqual(smtp.received, ['future@example.com']);
  });

  it('re-enqueues scheduled rows whose queue job was lost', async () => {
    const sender = await createSender(owner.user.id, smtp.port);
    await prisma.scheduledEmail.create({
      data: { senderId: sender.id, toEmail: 'orphan@example.com', subject: 'o', body: '<p>o</p>', scheduledAt: new Date(), delayMs: 50 },
    });
    assert.equal(await emailQueue.count(), 0);

    startedWorker();
    await waitFor(async () => (await statusOf('orphan@example.com')) === 'sent');
    assert.deepEqual(smtp.received, ['orphan@example.com']);
  });
});

describe('hourly rate limit', { timeout: 60000 }, () => {
  before(() => {
    process.env.WORKER_CONCURRENCY = '1';
  });
  after(() => {
    process.env.WORKER_CONCURRENCY = '2';
  });

  it('defers over-limit emails to the next hour in order, keeps them scheduled, and alerts Slack once', async () => {
    const webhook = await startWebhook();
    try {
      await prisma.slackIntegration.create({
        data: { userId: owner.user.id, incomingWebhookUrl: webhook.url, incomingWebhookChannel: '#alerts', teamId: 'T1', teamName: 'Team' },
      });
      const sender = await createSender(owner.user.id, smtp.port, 2);
      await schedule(sender.id, ['r0@example.com', 'r1@example.com', 'r2@example.com', 'r3@example.com', 'r4@example.com'], {
        delayBetweenSendsMs: 1000,
      });
      startedWorker();

      await waitFor(async () => (await deferredToNextHour()) === 3);
      await waitFor(async () => webhook.bodies.length >= 1);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      assert.equal(smtp.received.length, 2);
      assert.equal(new Set(smtp.received).size, 2);
      assert.equal(await prisma.scheduledEmail.count({ where: { status: 'sent' } }), 2);
      assert.equal(await prisma.scheduledEmail.count({ where: { status: 'scheduled' } }), 3);
      assert.equal(await prisma.scheduledEmail.count({ where: { status: 'failed' } }), 0);

      const delayed = await redis.zrange(`bull:${QUEUE_NAME}:delayed`, 0, -1, 'WITHSCORES');
      const ids: string[] = [];
      for (let i = 0; i < delayed.length; i += 2) {
        const runAt = Math.floor(Number(delayed[i + 1]) / 4096);
        const boundary = Math.ceil(Date.now() / HOUR_MS) * HOUR_MS;
        assert.ok(Math.abs(runAt - boundary) < 5000 || Math.abs(runAt - (boundary - HOUR_MS)) < 5000, 'rescheduled to the next hour');
        ids.push(delayed[i]);
      }
      const rows = await prisma.scheduledEmail.findMany({ where: { id: { in: ids } } });
      const deferredDueTimes = ids.map((id) => rows.find((r) => r.id === id)!.scheduledAt.getTime());
      assert.deepEqual(deferredDueTimes, [...deferredDueTimes].sort((x, y) => x - y), 'deferred jobs keep their original order');

      assert.equal(webhook.bodies.length, 1);
      assert.match(JSON.parse(webhook.bodies[0]).text, /hourly limit/);
    } finally {
      await webhook.close();
    }
  });

  it('does not crash or notify when Slack is not connected', async () => {
    const sender = await createSender(owner.user.id, smtp.port, 1);
    await schedule(sender.id, ['n0@example.com', 'n1@example.com']);
    startedWorker();

    await waitFor(async () => (await deferredToNextHour()) === 1);
    assert.deepEqual(smtp.received, ['n0@example.com']);
    assert.equal(await statusOf('n1@example.com'), 'scheduled');
  });
});
