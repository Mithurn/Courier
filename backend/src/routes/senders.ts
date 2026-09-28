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
      hourlyLimit: parsed.data.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    },
  });
  res.status(201).json({ ...sender, smtpPass: undefined });
});

sendersRouter.get('/', async (_req, res) => {
  const senders = await prisma.sender.findMany();
  res.json(senders.map(({ smtpPass, ...rest }) => rest));
});
