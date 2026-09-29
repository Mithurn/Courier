import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
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
import { apiLimiter } from './middleware/rate-limit';
import { openapiSpec } from './openapi';

export const app = express();
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
app.use(
  '/docs',
  // Swagger UI's bootstrap page needs inline script/style; helmet's default CSP blocks both.
  ((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';");
    next();
  }) as RequestHandler,
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec),
);

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
