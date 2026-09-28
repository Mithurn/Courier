import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from './env';
import { emailQueue } from './queues/email-queue';
import { bullBoardAuth } from './bullboard-auth';
import { emailsRouter } from './routes/emails';
import { sendersRouter } from './routes/senders';
import { ensureIndex } from './es';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/emails', emailsRouter);
app.use('/senders', sendersRouter);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(env.BULLBOARD_PATH);
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use(env.BULLBOARD_PATH, bullBoardAuth, serverAdapter.getRouter());

ensureIndex().catch((err) => console.error('failed to ensure ES index:', err.message));

app.listen(env.PORT, () => {
  console.log(`Courier API listening on :${env.PORT}`);
});
