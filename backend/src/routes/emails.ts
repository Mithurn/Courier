import { Router } from 'express';
import { prisma } from '../prisma';
import { scheduleEmail, scheduleEmailSchema, SenderNotOwnedError } from '../services/schedule-email.service';
import { searchEmails } from '../es';

export const emailsRouter = Router();

emailsRouter.post('/schedule', async (req, res) => {
  const parsed = scheduleEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const email = await scheduleEmail(parsed.data, req.userId!);
    res.status(201).json(email);
  } catch (err) {
    if (err instanceof SenderNotOwnedError) return res.sendStatus(404);
    throw err;
  }
});

emailsRouter.get('/scheduled', async (req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: 'scheduled', sender: { ownerId: req.userId } },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(emails);
});

emailsRouter.get('/sent', async (req, res) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: { status: { in: ['sent', 'failed'] }, sender: { ownerId: req.userId } },
    orderBy: { sentAt: 'desc' },
  });
  res.json(emails);
});

emailsRouter.get('/search', async (req, res) => {
  const senders = await prisma.sender.findMany({ where: { ownerId: req.userId }, select: { id: true } });
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const results = await searchEmails(senders.map((s) => s.id), q);
  res.json(results);
});
