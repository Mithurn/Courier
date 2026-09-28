import { Router } from 'express';
import { randomBytes } from 'crypto';
import { env } from '../env';
import { prisma } from '../prisma';
import { googleAuthorizeUrl, exchangeCodeForProfile } from './google';
import { slackAuthorizeUrl, exchangeCodeForSlackInstall } from './slack';
import { signSession, SESSION_COOKIE } from './session';
import { requireAuth } from './middleware';
import { oauthLimiter } from '../middleware/rate-limit';

export const authRouter = Router();

const STATE_COOKIE = 'oauth_state';
// Lax requires the frontend and API to be same-site (e.g. frontend proxies /api to the backend).
const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: env.GOOGLE_CALLBACK_URL.startsWith('https') };

authRouter.get('/google', oauthLimiter, (_req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
  res.redirect(googleAuthorizeUrl(state));
});

authRouter.get('/google/callback', oauthLimiter, async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, cookieOpts);

  if (!code || typeof code !== 'string' || !state || state !== expectedState) {
    return res.status(400).send('Invalid OAuth state or missing code');
  }

  try {
    const profile = await exchangeCodeForProfile(code);
    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      update: { name: profile.name, avatarUrl: profile.picture },
      create: {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      },
    });

    res.cookie(SESSION_COOKIE, signSession({ userId: user.id }), { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('Google login failed:', err);
    res.redirect(`${env.FRONTEND_URL}/login?error=google`);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.sendStatus(401);
  res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOpts);
  res.json({ ok: true });
});

authRouter.get('/slack', oauthLimiter, requireAuth, (_req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
  res.redirect(slackAuthorizeUrl(state));
});

authRouter.get('/slack/callback', oauthLimiter, requireAuth, async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, cookieOpts);

  if (!code || typeof code !== 'string' || !state || state !== expectedState) {
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }

  try {
    const install = await exchangeCodeForSlackInstall(code);
    await prisma.slackIntegration.upsert({
      where: { userId: req.userId! },
      update: install,
      create: { userId: req.userId!, ...install },
    });
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    console.error('Slack install failed:', err);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }
});

authRouter.get('/slack/status', requireAuth, async (req, res) => {
  const integration = await prisma.slackIntegration.findUnique({ where: { userId: req.userId } });
  res.json({ connected: !!integration, teamName: integration?.teamName ?? null });
});

authRouter.post('/slack/disconnect', requireAuth, async (req, res) => {
  await prisma.slackIntegration.deleteMany({ where: { userId: req.userId } });
  res.json({ ok: true });
});
