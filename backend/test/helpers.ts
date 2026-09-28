import { spawn, type ChildProcess } from 'child_process';
import http from 'http';
import type { AddressInfo } from 'net';
import { SMTPServer } from 'smtp-server';
import { prisma } from '../src/prisma';
import { redis } from '../src/redis';
import { esClient, ensureIndex } from '../src/es';
import { env } from '../src/env';
import { signSession, SESSION_COOKIE } from '../src/auth/session';
import { app } from '../src/app';
import { emailQueue } from '../src/queues/email-queue';

export async function resetState(): Promise<void> {
  await prisma.scheduledEmail.deleteMany();
  await prisma.slackIntegration.deleteMany();
  await prisma.sender.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
  await esClient.indices.delete({ index: env.ELASTICSEARCH_INDEX, ignore_unavailable: true });
  await ensureIndex();
}

export async function closeAll(): Promise<void> {
  await emailQueue.close();
  await prisma.$disconnect();
  await esClient.close();
  await redis.quit();
}

export async function waitFor<T>(check: () => Promise<T | false | undefined>, timeoutMs = 15000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export type FakeSmtp = {
  port: number;
  received: string[];
  rejectAll: boolean;
  close: () => Promise<void>;
};

export async function startFakeSmtp(): Promise<FakeSmtp> {
  const state = { received: [] as string[], rejectAll: false };
  const server = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ['STARTTLS'],
    onAuth: (_auth, _session, cb) => cb(null, { user: 'test' }),
    onRcptTo: (address, _session, cb) => {
      if (state.rejectAll) return cb(Object.assign(new Error('550 rejected'), { responseCode: 550 }));
      state.received.push(address.address);
      cb();
    },
    onData: (stream, _session, cb) => {
      stream.resume();
      stream.on('end', () => cb());
    },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: (server.server.address() as AddressInfo).port,
    received: state.received,
    get rejectAll() {
      return state.rejectAll;
    },
    set rejectAll(value: boolean) {
      state.rejectAll = value;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export async function startWebhook(): Promise<{ url: string; bodies: string[]; close: () => Promise<void> }> {
  const bodies: string[] = [];
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      bodies.push(data);
      res.end('ok');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/hook`,
    bodies,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export async function createUser(tag: string) {
  const user = await prisma.user.create({
    data: { googleId: `g-${tag}`, email: `${tag}@test.local`, name: `User ${tag}` },
  });
  return { user, cookie: `${SESSION_COOKIE}=${signSession({ userId: user.id })}` };
}

export function createSender(ownerId: string, smtpPort: number, hourlyLimit = 50) {
  return prisma.sender.create({
    data: {
      ownerId,
      name: 'test sender',
      smtpHost: '127.0.0.1',
      smtpPort,
      smtpUser: `sender-${Math.random().toString(36).slice(2, 8)}@test.local`,
      smtpPass: 'pw',
      hourlyLimit,
    },
  });
}

export async function startApi() {
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function call(cookie: string | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json };
  }

  return { call, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

export type WorkerProcess = { stop: () => Promise<void> };

export function startWorker(): WorkerProcess {
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/worker.ts'], {
    env: process.env,
    stdio: 'ignore',
  });
  return {
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
      }),
  };
}
