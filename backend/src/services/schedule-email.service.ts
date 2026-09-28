import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { emailQueue, EmailJob } from '../queues/email-queue';
import { env } from '../env';
import { indexEmails, type IndexableEmail } from '../es';

export const MAX_RECIPIENTS = 5000;
const MAX_START_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

export const scheduleEmailSchema = z.object({
  senderId: z.string().min(1),
  subject: z.string().trim().min(1).max(191),
  body: z.string().min(1).max(50_000),
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

export async function scheduleEmails(input: ScheduleEmailInput, ownerId: string) {
  const sender = await prisma.sender.findFirst({ where: { id: input.senderId, ownerId } });
  if (!sender) throw new SenderNotOwnedError('Sender not found for this user');

  const recipients = [...new Set(input.recipients)];
  const delayMs = Math.max(input.delayBetweenSendsMs ?? 0, env.MIN_DELAY_BETWEEN_SENDS_MS);
  const startMs = (input.startAt ?? new Date()).getTime();

  const rows = recipients.map((toEmail, i) => ({
    id: randomUUID(),
    senderId: sender.id,
    toEmail,
    subject: input.subject,
    body: input.body,
    scheduledAt: new Date(startMs + i * delayMs),
    delayMs,
    hourlyLimit: input.hourlyLimit ?? null,
    status: 'scheduled' as const,
    sentAt: null,
  }));

  await prisma.scheduledEmail.createMany({ data: rows });

  const now = Date.now();
  try {
    await emailQueue.addBulk(
      rows.map((row) => ({
        name: EmailJob.SEND,
        data: { emailId: row.id },
        opts: { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - now) },
      })),
    );
  } catch (err) {
    await prisma.scheduledEmail.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    throw err;
  }

  const indexable: IndexableEmail[] = rows;
  indexEmails(indexable).catch((err) => console.error('ES bulk index failed:', err.message));

  return {
    count: rows.length,
    firstScheduledAt: rows[0].scheduledAt,
    lastScheduledAt: rows[rows.length - 1].scheduledAt,
  };
}
