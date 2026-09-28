import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ELASTICSEARCH_URL: z.string().min(1),
  ELASTICSEARCH_INDEX: z.string().default('courier-emails'),
  PORT: z.coerce.number().default(4000),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_DELAY_BETWEEN_SENDS_MS: z.coerce.number().default(2000),
  DEFAULT_SENDER_HOURLY_LIMIT: z.coerce.number().default(50),
  BULLBOARD_USER: z.string().default('admin'),
  BULLBOARD_PASSWORD: z.string().min(1),
  BULLBOARD_PATH: z.string().default('/admin/queues'),
  JOB_RETRY_ATTEMPTS: z.coerce.number().default(5),
  JOB_RETRY_BACKOFF_MS: z.coerce.number().default(5000),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_REDIRECT_URI: z.string().min(1),
});

export const env = schema.parse(process.env);
