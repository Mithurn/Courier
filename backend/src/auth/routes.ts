import { Router } from 'express';
import { randomBytes } from 'crypto';
import { env } from '../env';
import { prisma } from '../prisma';
import { googleAuthorizeUrl, exchangeCodeForProfile } from './google';
import { signSession, verifySession, SESSION_COOKIE } from './session';
import { requireAuth } from './middleware';

export const authRouter = Router();

const STATE_COOKIE = 'oauth_state';
// Same-site by port/subdomain (localhost:*, *.courier.<domain>) works with Lax.
// A fully cross-site frontend domain would need SameSite: 'none' + secure + CORS credentials.
const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: env.GOOGLE_CALLBACK_URL.startsWith('https') };

authRouter.get('/google', (_req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
  res.redirect(googleAuthorizeUrl(state));
});

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);

  if (!code || typeof code !== 'string' || !state || state !== expectedState) {
    return res.status(400).send('Invalid OAuth state or missing code');
  }

  const profile = await exchangeCodeForProfile(code);

  const user = await prisma.user.upsert({
    where: { googleId: profile.id },
    update: { name: profile.name, avatarUrl: profile.picture, email: profile.email },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    },
  });

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.sendStatus(401);
  res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

// exported for reuse if a route needs to check a session without full middleware
export { verifySession };
