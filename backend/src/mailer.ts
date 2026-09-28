import nodemailer from 'nodemailer';
import type { Sender } from '@prisma/client';

export function transporterFor(sender: Sender) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465, // implicit TLS; other ports negotiate STARTTLS
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });
}
