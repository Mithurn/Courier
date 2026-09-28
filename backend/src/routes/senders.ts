import { Router } from 'express';
import { z } from 'zod';
import { senderCreateLimiter } from '../middleware/rate-limit';
import { prisma } from '../prisma';
import { provisionSender, SenderLimitError, toSenderDto } from '../services/sender.service';

export const sendersRouter = Router();

const createSenderSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

sendersRouter.get('/', async (req, res) => {
  const senders = await prisma.sender.findMany({ where: { ownerId: req.userId }, orderBy: { createdAt: 'asc' } });
  res.json(senders.map(toSenderDto));
});

sendersRouter.post('/', senderCreateLimiter, async (req, res) => {
  const parsed = createSenderSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const sender = await provisionSender(req.userId!, parsed.data.name);
    res.status(201).json(toSenderDto(sender));
  } catch (err) {
    if (err instanceof SenderLimitError) return res.status(409).json({ error: err.message });
    throw err;
  }
});
