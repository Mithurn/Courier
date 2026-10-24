import './env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../src/env';
import { signSession, verifySession } from '../src/auth/session';
import { bullBoardAuth } from '../src/bullboard-auth';

describe('session tokens', () => {
  it('round-trips the user id and expires in 7 days', () => {
    const payload = verifySession(signSession({ userId: 'u1' })) as { userId: string; iat: number; exp: number };
    assert.equal(payload.userId, 'u1');
    assert.equal(payload.exp - payload.iat, 7 * 24 * 3600);
  });

  it('rejects garbage, a tampered payload and a token signed with another secret', () => {
    assert.equal(verifySession('not-a-token'), null);
    assert.equal(verifySession(''), null);

    const [header, , signature] = signSession({ userId: 'u1' }).split('.');
    const forgedBody = Buffer.from(JSON.stringify({ userId: 'admin' })).toString('base64url');
    assert.equal(verifySession(`${header}.${forgedBody}.${signature}`), null);

    assert.equal(verifySession(jwt.sign({ userId: 'u1' }, 'x'.repeat(40))), null);
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'u1' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
    assert.equal(verifySession(expired), null);
  });

  it('rejects unsigned and non-HS256 tokens (algorithm confusion)', () => {
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"userId":"u1"}').toString('base64url')}.`;
    assert.equal(verifySession(none), null);
    const hs512 = jwt.sign({ userId: 'u1' }, env.JWT_SECRET, { algorithm: 'HS512' });
    assert.equal(verifySession(hs512), null);
  });
});

describe('bullBoardAuth', () => {
  function run(authorization?: string) {
    const calls = { next: 0, status: undefined as number | undefined, headers: {} as Record<string, string> };
    const req = { get: (name: string) => (name === 'authorization' ? authorization : undefined) } as unknown as Request;
    const res = {
      setHeader: (k: string, v: string) => {
        calls.headers[k] = v;
      },
      sendStatus: (code: number) => {
        calls.status = code;
        return res;
      },
    } as unknown as Response;
    bullBoardAuth(req, res, (() => {
      calls.next += 1;
    }) as NextFunction);
    return calls;
  }

  const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

  it('lets valid credentials through', () => {
    const calls = run(basic(env.BULLBOARD_USER, env.BULLBOARD_PASSWORD));
    assert.equal(calls.next, 1);
    assert.equal(calls.status, undefined);
  });

  it('answers 401 with a Basic challenge when the header is missing', () => {
    const calls = run(undefined);
    assert.equal(calls.next, 0);
    assert.equal(calls.status, 401);
    assert.equal(calls.headers['WWW-Authenticate'], 'Basic realm="Courier"');
  });

  it('rejects a wrong password, a wrong user and a same-length wrong password', () => {
    assert.equal(run(basic(env.BULLBOARD_USER, 'wrong')).status, 401);
    assert.equal(run(basic('nobody', env.BULLBOARD_PASSWORD)).status, 401);
    assert.equal(run(basic(env.BULLBOARD_USER, 'x'.repeat(env.BULLBOARD_PASSWORD.length))).status, 401);
  });

  it('rejects a non-Basic scheme', () => {
    assert.equal(run('Bearer abc').status, 401);
  });
});
