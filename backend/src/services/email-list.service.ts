import type { EmailStatus, ScheduledEmail, Sender } from '@prisma/client';
import { prisma } from '../prisma';
import { searchEmailIds } from '../es';

const PREVIEW_LENGTH = 120;
const PENDING: EmailStatus[] = ['scheduled', 'sending'];
const FINISHED: EmailStatus[] = ['sent', 'failed'];

export type Label = 'starred' | 'archived' | 'trashed';

/** Default views hide archived/trashed emails; a label filter shows exactly that bucket instead. */
function labelWhere(label?: Label) {
  return label ? { [label]: true } : { archived: false, trashed: false };
}

type EmailWithSender = ScheduledEmail & { sender: Pick<Sender, 'smtpUser'> };

const withSender = { sender: { select: { smtpUser: true } } } as const;

export type Page = { page: number; pageSize: number };

function toPreview(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_LENGTH);
}

function toListItem(email: EmailWithSender) {
  return {
    id: email.id,
    from: email.sender.smtpUser,
    toEmail: email.toEmail,
    subject: email.subject,
    preview: toPreview(email.body),
    status: email.status,
    scheduledAt: email.scheduledAt,
    sentAt: email.sentAt,
    failReason: email.failReason,
    starred: email.starred,
    archived: email.archived,
    trashed: email.trashed,
  };
}

export async function listScheduled(ownerId: string, { page, pageSize }: Page, status?: 'scheduled' | 'sending', label?: Label) {
  const where = { status: status ? status : { in: PENDING }, sender: { ownerId }, ...labelWhere(label) };
  const [rows, total] = await Promise.all([
    prisma.scheduledEmail.findMany({
      where,
      include: withSender,
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.scheduledEmail.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function listSent(ownerId: string, { page, pageSize }: Page, status?: 'sent' | 'failed', label?: Label) {
  const where = { status: status ? status : { in: FINISHED }, sender: { ownerId }, ...labelWhere(label) };
  const [rows, total] = await Promise.all([
    prisma.scheduledEmail.findMany({
      where,
      include: withSender,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.scheduledEmail.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function countByTab(ownerId: string) {
  const [scheduled, sent] = await Promise.all([
    prisma.scheduledEmail.count({ where: { status: { in: PENDING }, sender: { ownerId }, ...labelWhere() } }),
    prisma.scheduledEmail.count({ where: { status: { in: FINISHED }, sender: { ownerId }, ...labelWhere() } }),
  ]);
  return { scheduled, sent };
}

export async function setEmailFlags(
  ownerId: string,
  id: string,
  flags: Partial<Record<Label, boolean>>,
): Promise<ReturnType<typeof toListItem> | null> {
  const existing = await prisma.scheduledEmail.findFirst({ where: { id, sender: { ownerId } } });
  if (!existing) return null;
  const email = await prisma.scheduledEmail.update({ where: { id }, data: flags, include: withSender });
  return toListItem(email);
}

export async function getEmail(ownerId: string, id: string) {
  const email = await prisma.scheduledEmail.findFirst({
    where: { id, sender: { ownerId } },
    include: withSender,
  });
  return email ? { ...toListItem(email), body: email.body } : null;
}

// Elasticsearch decides which emails match; MySQL stays the source of truth for what is returned.
export async function searchEmails(ownerId: string, query: string, { page, pageSize }: Page) {
  const senders = await prisma.sender.findMany({ where: { ownerId }, select: { id: true } });
  const { ids, total } = await searchEmailIds(
    senders.map((s) => s.id),
    query,
    page,
    pageSize,
  );

  const rows = await prisma.scheduledEmail.findMany({
    where: { id: { in: ids }, sender: { ownerId } },
    include: withSender,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = ids.flatMap((id) => (byId.has(id) ? [toListItem(byId.get(id)!)] : []));
  return { items, total };
}
