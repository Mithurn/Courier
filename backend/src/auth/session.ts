import jwt from 'jsonwebtoken';
import { env } from '../env';

export const SESSION_COOKIE = 'courier_session';

export type SessionPayload = {
  userId: string;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as SessionPayload;
  } catch {
    return null;
  }
}
