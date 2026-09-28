import { Router } from 'express';
import { prisma } from '../prisma';
import { scheduleEmail, scheduleEmailSchema } from '../services/schedule-email.service';

export const emailsRouter = Router();

emailsRouter.post('/schedule', async (req, res) => {
  const parsed = scheduleEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const email = await scheduleEmail(parsed.data);
  res.status(201).json(email);
});

emailsRouter.get('/scheduled', async (_req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: 'scheduled' },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(emails);
});

emailsRouter.get('/sent', async (_req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: { in: ['sent', 'failed'] } },
    orderBy: { sentAt: 'desc' },
  });
  res.json(emails);
});
