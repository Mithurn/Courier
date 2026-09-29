import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { emailQueue, EmailJob } from '../queues/email-queue';
import { env } from '../env';
import { tryReserveDailyQuota, releaseDailyQuota } from '../rate-limit';
import { indexEmails, type IndexableEmail } from '../es';

export const MAX_RECIPIENTS = 5000;
export const MAX_EMAIL_BODY_LENGTH = 1_000_000;
const MAX_START_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

export const scheduleEmailSchema = z.object({
  senderId: z.string().min(1),
  subject: z.string().trim().min(1).max(191),
  body: z.string().min(1).max(MAX_EMAIL_BODY_LENGTH),
  recipients: z.array(z.string().trim().toLowerCase().email().max(191)).min(1).max(MAX_RECIPIENTS),
  startAt: z.coerce
    .date()
    .refine((d) => d.getTime() - Date.now() < MAX_START_AHEAD_MS, 'startAt must be within a year')
    .optional(),
  delayBetweenSendsMs: z.coerce.number().int().min(0).optional(),
  hourlyLimit: z.coerce.number().int().positive().optional(),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

export class SenderNotOwnedError extends Error {}
export class DailyQuotaExceededError extends Error {}

export async function scheduleEmails(input: ScheduleEmailInput, ownerId: string) {
  const sender = await prisma.sender.findFirst({ where: { id: input.senderId, ownerId } });
  if (!sender) throw new SenderNotOwnedError('Sender not found for this user');

  const recipients = [...new Set(input.recipients)];
  if (!(await tryReserveDailyQuota(ownerId, recipients.length, env.DAILY_EMAIL_QUOTA_PER_USER))) {
    throw new DailyQuotaExceededError('Daily scheduling quota exceeded');
  }
  const delayMs = Math.max(input.delayBetweenSendsMs ?? 0, env.MIN_DELAY_BETWEEN_SENDS_MS);
  const startMs = (input.startAt ?? new Date()).getTime();

  const hourlyLimit = Math.min(input.hourlyLimit ?? sender.hourlyLimit, sender.hourlyLimit);

  const rows = recipients.map((toEmail, i) => ({
    id: randomUUID(),
    senderId: sender.id,
    toEmail,
    subject: input.subject,
    body: input.body,
    scheduledAt: new Date(startMs + i * delayMs),
    delayMs,
    hourlyLimit,
    status: 'scheduled' as const,
    sentAt: null,
  }));

  const now = Date.now();
  try {
    await prisma.scheduledEmail.createMany({ data: rows });
    await emailQueue.addBulk(
      rows.map((row) => ({
        name: EmailJob.SEND,
        data: { emailId: row.id },
        opts: { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - now) },
      })),
    );
  } catch (err) {
    await prisma.scheduledEmail.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    await releaseDailyQuota(ownerId, rows.length);
    throw err;
  }

  const indexable: IndexableEmail[] = rows;
  indexEmails(indexable).catch((err) => console.error('ES bulk index failed:', err.message));

  return {
    count: rows.length,
    hourlyLimit,
    firstScheduledAt: rows[0].scheduledAt,
    lastScheduledAt: rows[rows.length - 1].scheduledAt,
  };
}
