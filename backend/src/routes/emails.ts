import { Router } from 'express';
import { z } from 'zod';
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
    console.error('Schedule failed:', err);
    res.status(500).json({ error: 'Internal server error' });
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

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

emailsRouter.get('/search', async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const senders = await prisma.sender.findMany({ where: { ownerId: req.userId }, select: { id: true } });
  const { q, page, pageSize } = parsed.data;
  res.json(await searchEmails(senders.map((s) => s.id), q, page, pageSize));
});
