import { z } from 'zod';
import { prisma } from '../prisma';
import { emailQueue, EmailJob } from '../queues/email-queue';
import { env } from '../env';
import { indexEmail } from '../es';

export const scheduleEmailSchema = z.object({
  senderId: z.string().min(1),
  toEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.coerce.date(),
  delayBetweenSendsMs: z.coerce.number().int().positive().optional(),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

export class SenderNotOwnedError extends Error {}

export async function scheduleEmail(input: ScheduleEmailInput, ownerId: string) {
  const sender = await prisma.sender.findFirst({ where: { id: input.senderId, ownerId } });
  if (!sender) throw new SenderNotOwnedError('Sender not found for this user');

  const email = await prisma.scheduledEmail.create({
    data: {
      senderId: input.senderId,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      scheduledAt: input.scheduledAt,
      delayMs: input.delayBetweenSendsMs ?? env.MIN_DELAY_BETWEEN_SENDS_MS,
    },
  });

  const delay = Math.max(0, input.scheduledAt.getTime() - Date.now());

  try {
    await emailQueue.add(EmailJob.SEND, { emailId: email.id }, {
      jobId: email.id,
      delay,
    });
  } catch (err) {
    // Enqueue failed after the row was created; roll it back so it doesn't
    // sit stuck as "scheduled" with no job behind it.
    await prisma.scheduledEmail.delete({ where: { id: email.id } });
    throw err;
  }

  indexEmail(email).catch((err) => console.error('ES index failed:', err.message));

  return email;
}
