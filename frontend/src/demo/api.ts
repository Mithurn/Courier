import type { Counts, EmailDetail, EmailLabel, EmailListItem, Page, ScheduleInput, ScheduleResult } from '../types';
import { DEMO_SENDERS, DEMO_USER, buildDemoEmails } from './data';
import { exitDemo } from './mode';

const PAGE_SIZE = 10;
const SCHEDULE_SPACING_MS = 2000;
const NEW_EMAIL_LEAD_MS = 30_000;

type Status = 'scheduled' | 'sending' | 'sent' | 'failed';

const emails: EmailDetail[] = buildDemoEmails();

const toListItem = ({ body: _body, ...item }: EmailDetail): EmailListItem => item;

function paginate(items: EmailDetail[], page: number): Page<EmailListItem> {
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE).map(toListItem), total: items.length };
}

function filtered(group: 'scheduled' | 'sent', status?: Status, label?: EmailLabel): EmailDetail[] {
  const inGroup = group === 'scheduled' ? ['scheduled', 'sending'] : ['sent', 'failed'];
  const items = emails.filter((e) => inGroup.includes(e.status) && (!status || e.status === status));
  const byLabel = label ? items.filter((e) => e[label]) : items.filter((e) => !e.archived && !e.trashed);
  const direction = group === 'scheduled' ? 1 : -1;
  return byLabel.sort((a, b) => direction * (Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)));
}

const find = (id: string) => {
  const email = emails.find((e) => e.id === id);
  if (!email) throw new Error('Email not found');
  return email;
};

export const demoApi = {
  me: async () => DEMO_USER,
  logout: async () => {
    exitDemo();
    return { ok: true as const };
  },
  slackStatus: async () => ({ connected: false, teamName: null }),
  slackDisconnect: async () => ({ ok: true as const }),
  senders: async () => DEMO_SENDERS,
  createSender: async () => DEMO_SENDERS[0],
  counts: async (): Promise<Counts> => ({
    scheduled: filtered('scheduled').length,
    sent: filtered('sent').length,
  }),
  scheduled: async (page: number, status?: 'scheduled' | 'sending', label?: EmailLabel) =>
    paginate(filtered('scheduled', status, label), page),
  sent: async (page: number, status?: 'sent' | 'failed', label?: EmailLabel) => paginate(filtered('sent', status, label), page),
  search: async (q: string, page: number) => {
    const term = q.trim().toLowerCase();
    const hits = emails.filter(
      (e) => !e.trashed && `${e.subject} ${e.toEmail} ${e.preview}`.toLowerCase().includes(term),
    );
    return paginate(hits, page);
  },
  detail: async (id: string) => find(id),
  updateFlags: async (id: string, flags: Partial<Record<EmailLabel, boolean>>) => {
    const email = find(id);
    Object.assign(email, flags);
    return toListItem(email);
  },
  schedule: async (input: ScheduleInput): Promise<ScheduleResult> => {
    const first = input.startAt ? Date.parse(input.startAt) : Date.now() + NEW_EMAIL_LEAD_MS;
    const spacing = input.delayBetweenSendsMs ?? SCHEDULE_SPACING_MS;
    input.recipients.forEach((to, index) => {
      const at = new Date(first + index * spacing).toISOString();
      emails.push({
        id: `demo-new-${Date.now()}-${index}`,
        from: DEMO_USER.email,
        toEmail: to,
        subject: input.subject,
        preview: input.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90),
        body: input.body,
        status: 'scheduled',
        scheduledAt: at,
        sentAt: null,
        failReason: null,
        starred: false,
        archived: false,
        trashed: false,
      });
    });
    const last = first + (input.recipients.length - 1) * spacing;
    return {
      count: input.recipients.length,
      hourlyLimit: input.hourlyLimit ?? DEMO_SENDERS[0].hourlyLimit,
      firstScheduledAt: new Date(first).toISOString(),
      lastScheduledAt: new Date(last).toISOString(),
    };
  },
};
