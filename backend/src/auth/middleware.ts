import type { NextFunction, Request, Response } from 'express';
import { verifySession, SESSION_COOKIE } from './session';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = token ? verifySession(token) : null;
  if (!session) return res.sendStatus(401);

  req.userId = session.userId;
  next();
}
