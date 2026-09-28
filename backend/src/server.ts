import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
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

const app = express();
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/emails', requireAuth, emailsRouter);
app.use('/senders', requireAuth, sendersRouter);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(env.BULLBOARD_PATH);
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use(env.BULLBOARD_PATH, bullBoardAuth, serverAdapter.getRouter());

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

ensureIndex().catch((err) => console.error('failed to ensure ES index:', err.message));

app.listen(env.PORT, () => {
  console.log(`Courier API listening on :${env.PORT}`);
});
