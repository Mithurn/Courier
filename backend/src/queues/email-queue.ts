import { Queue } from 'bullmq';
import { redis } from '../redis';
import { env } from '../env';

export const QUEUE_NAME = 'email-send';

export enum EmailJob {
  SEND = 'send',
}

export type EmailJobData = {
  emailId: string;
};

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: env.JOB_RETRY_ATTEMPTS,
    backoff: { type: 'exponential', delay: env.JOB_RETRY_BACKOFF_MS },
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});
