import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';
import { prisma } from '../prisma';
import { env } from '../env';
import { redis } from '../redis';

export const MAX_SENDERS_PER_USER = 10;

const ETHEREAL_TIMEOUT_MS = 5000;
const PROVISION_LOCK_TTL_S = 15;

export class SenderLimitError extends Error {}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Ethereal account creation timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function toSenderDto(sender: Sender) {
  return { id: sender.id, name: sender.name, email: sender.smtpUser, hourlyLimit: sender.hourlyLimit };
}

// Senders are Ethereal test mailboxes, so users never supply SMTP hosts or passwords.
export async function provisionSender(ownerId: string, name?: string): Promise<Sender> {
  const lockKey = `sender-provision:${ownerId}`;
  if ((await redis.set(lockKey, '1', 'EX', PROVISION_LOCK_TTL_S, 'NX')) !== 'OK') {
    throw new SenderLimitError('Sender creation already in progress');
  }

  try {
    if ((await prisma.sender.count({ where: { ownerId } })) >= MAX_SENDERS_PER_USER) {
      throw new SenderLimitError(`At most ${MAX_SENDERS_PER_USER} senders per user`);
    }

    const account = await withTimeout(nodemailer.createTestAccount(), ETHEREAL_TIMEOUT_MS);
    return await prisma.sender.create({
      data: {
        ownerId,
        name: name ?? account.user,
        smtpHost: account.smtp.host,
        smtpPort: account.smtp.port,
        smtpUser: account.user,
        smtpPass: account.pass,
        hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
      },
    });
  } finally {
    await redis.del(lockKey);
  }
}
