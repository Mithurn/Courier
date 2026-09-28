import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';
import { prisma } from '../prisma';
import { env } from '../env';

export const MAX_SENDERS_PER_USER = 10;

export class SenderLimitError extends Error {}

export function toSenderDto(sender: Sender) {
  return { id: sender.id, name: sender.name, email: sender.smtpUser, hourlyLimit: sender.hourlyLimit };
}

// Senders are Ethereal test mailboxes, so users never supply SMTP hosts or passwords.
export async function provisionSender(ownerId: string, name?: string): Promise<Sender> {
  if ((await prisma.sender.count({ where: { ownerId } })) >= MAX_SENDERS_PER_USER) {
    throw new SenderLimitError(`At most ${MAX_SENDERS_PER_USER} senders per user`);
  }

  const account = await nodemailer.createTestAccount();
  return prisma.sender.create({
    data: {
      ownerId,
      name: name ?? account.user,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass,
      hourlyLimit: env.DEFAULT_SENDER_HOURLY_LIMIT,
    },
  });
}
