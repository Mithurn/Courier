import { Router } from 'express';
import { z } from 'zod';
import { scheduleLimiter } from '../middleware/rate-limit';
import {
  DailyQuotaExceededError,
  scheduleEmails,
  scheduleEmailSchema,
  SenderNotOwnedError,
} from '../services/schedule-email.service';
import { countByTab, getEmail, listScheduled, listSent, searchEmails } from '../services/email-list.service';

export const emailsRouter = Router();

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const sentQuerySchema = pageSchema.extend({ status: z.enum(['sent', 'failed']).optional() });
const searchQuerySchema = pageSchema.extend({ q: z.string().trim().max(200).default('') });

emailsRouter.post('/schedule', scheduleLimiter, async (req, res) => {
  const parsed = scheduleEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    res.status(201).json(await scheduleEmails(parsed.data, req.userId!));
  } catch (err) {
    if (err instanceof SenderNotOwnedError) return res.sendStatus(404);
    if (err instanceof DailyQuotaExceededError) return res.status(429).json({ error: err.message });
    throw err;
  }
});

emailsRouter.get('/scheduled', async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(await listScheduled(req.userId!, parsed.data));
});

emailsRouter.get('/sent', async (req, res) => {
  const parsed = sentQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { status, ...page } = parsed.data;
  res.json(await listSent(req.userId!, page, status));
});

emailsRouter.get('/counts', async (req, res) => {
  res.json(await countByTab(req.userId!));
});

emailsRouter.get('/search', async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, ...page } = parsed.data;
  res.json(await searchEmails(req.userId!, q, page));
});

emailsRouter.get('/:id', async (req, res) => {
  const email = await getEmail(req.userId!, req.params.id);
  if (!email) return res.sendStatus(404);
  res.json(email);
});
