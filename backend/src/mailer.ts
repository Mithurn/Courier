import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';

export function transporterFor(sender: Sender) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });
}
