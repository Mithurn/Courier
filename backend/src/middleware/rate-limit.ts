import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../redis';

const MINUTE = 60 * 1000;

function limiter(name: string, windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    store: new RedisStore({
      prefix: `api-rl:${name}:`,
      sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<never>,
    }),
    message: { error: 'Too many requests, slow down' },
  });
}

export const apiLimiter = limiter('api', MINUTE, 300);
export const oauthLimiter = limiter('oauth', 15 * MINUTE, 30);
export const scheduleLimiter = limiter('schedule', MINUTE, 20);
export const senderCreateLimiter = limiter('sender-create', 60 * MINUTE, 10);
