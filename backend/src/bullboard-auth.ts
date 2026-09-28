import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from './env';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function bullBoardAuth(req: Request, res: Response, next: NextFunction) {
  const expected = Buffer.from(`${env.BULLBOARD_USER}:${env.BULLBOARD_PASSWORD}`).toString('base64');
  const provided = req.get('authorization')?.split('Basic ')[1] ?? '';

  if (!provided || !safeEqual(provided, expected)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Courier"');
    return res.sendStatus(401);
  }
  next();
}
