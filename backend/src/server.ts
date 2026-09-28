import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from './env';
import { emailQueue } from './queues/email-queue';
import { bullBoardAuth } from './bullboard-auth';
import { emailsRouter } from './routes/emails';
import { sendersRouter } from './routes/senders';
import { authRouter } from './auth/routes';
import { requireAuth } from './auth/middleware';
import { ensureIndex } from './es';
import { apiLimiter } from './middleware/rate-limit';
import { prisma } from './prisma';
import { redis } from './redis';

const app = express();
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/emails', requireAuth, apiLimiter, emailsRouter);
app.use('/senders', requireAuth, apiLimiter, sendersRouter);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(env.BULLBOARD_PATH);
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use(env.BULLBOARD_PATH, bullBoardAuth, serverAdapter.getRouter());

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  const status = Number(err.status ?? err.statusCode);
  if (status >= 400 && status < 500) return res.status(status).json({ error: err.message });

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

ensureIndex().catch((err) => console.error('failed to ensure ES index:', err.message));

const server = app.listen(env.PORT, () => {
  console.log(`Courier API listening on :${env.PORT}`);
});

async function shutdown() {
  await new Promise((resolve) => server.close(resolve));
  await Promise.allSettled([emailQueue.close(), prisma.$disconnect()]);
  await redis.quit().catch(() => undefined);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
