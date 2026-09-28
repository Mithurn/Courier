import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { env } from '../env';

export const sendersRouter = Router();

const createSenderSchema = z.object({
  name: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().positive(),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  hourlyLimit: z.coerce.number().int().positive().optional(),
});

sendersRouter.post('/', async (req, res) => {
  const parsed = createSenderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const sender = await prisma.sender.create({
    data: {
      ...parsed.data,
      ownerId: req.userId!,
      hourlyLimit: parsed.data.hourlyLimit ?? env.DEFAULT_SENDER_HOURLY_LIMIT,
    },
  });
  const { smtpPass, ...safeSender } = sender;
  res.status(201).json(safeSender);
});

sendersRouter.get('/', async (req, res) => {
  const senders = await prisma.sender.findMany({ where: { ownerId: req.userId } });
  res.json(senders.map(({ smtpPass, ...rest }) => rest));
});
