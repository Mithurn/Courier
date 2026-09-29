import { request } from './client';
import {
  DEV_COUNTS,
  DEV_DETAIL,
  DEV_SCHEDULE_RESULT,
  DEV_SCHEDULED,
  DEV_SENDERS,
  DEV_SENT,
  DEV_USER,
  devPage,
} from './devFixtures';
import type { Counts, EmailDetail, EmailLabel, EmailListItem, Page, ScheduleInput, ScheduleResult, Sender, User } from '../types';
import { isDevFixtures } from '../lib/env';

const mock = isDevFixtures;

function filterByLabelAndStatus(items: EmailListItem[], status: string | undefined, label: EmailLabel | undefined) {
  return items
    .filter((e) => !status || e.status === status)
    .filter((e) => (label ? e[label] : !e.archived && !e.trashed));
}

export const api = {
  me: () => (mock ? Promise.resolve(DEV_USER) : request<User>('/auth/me')),
  logout: () => (mock ? Promise.resolve({ ok: true as const }) : request<{ ok: true }>('/auth/logout', { method: 'POST' })),
  slackStatus: () =>
    mock ? Promise.resolve({ connected: false, teamName: null }) : request<{ connected: boolean; teamName: string | null }>('/auth/slack/status'),
  slackDisconnect: () => (mock ? Promise.resolve({ ok: true as const }) : request<{ ok: true }>('/auth/slack/disconnect', { method: 'POST' })),
  senders: () => (mock ? Promise.resolve(DEV_SENDERS) : request<Sender[]>('/senders')),
  createSender: () => (mock ? Promise.resolve(DEV_SENDERS[0]) : request<Sender>('/senders', { method: 'POST', body: '{}' })),
  counts: () => (mock ? Promise.resolve(DEV_COUNTS) : request<Counts>('/emails/counts')),
  scheduled: (page: number, status?: 'scheduled' | 'sending', label?: EmailLabel) =>
    mock
      ? Promise.resolve(devPage(filterByLabelAndStatus(DEV_SCHEDULED, status, label)))
      : request<Page<EmailListItem>>(
          `/emails/scheduled?page=${page}&pageSize=10${status ? `&status=${status}` : ''}${label ? `&label=${label}` : ''}`,
        ),
  sent: (page: number, status?: 'sent' | 'failed', label?: EmailLabel) =>
    mock
      ? Promise.resolve(devPage(filterByLabelAndStatus(DEV_SENT, status, label)))
      : request<Page<EmailListItem>>(
          `/emails/sent?page=${page}&pageSize=10${status ? `&status=${status}` : ''}${label ? `&label=${label}` : ''}`,
        ),
  search: (q: string, page: number) =>
    mock
      ? Promise.resolve(devPage([...DEV_SCHEDULED, ...DEV_SENT].filter((e) => e.subject.toLowerCase().includes(q.toLowerCase()))))
      : request<Page<EmailListItem>>(`/emails/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`),
  detail: (id: string) => (mock ? Promise.resolve({ ...DEV_DETAIL, id }) : request<EmailDetail>(`/emails/${id}`)),
  updateFlags: (id: string, flags: Partial<Record<EmailLabel, boolean>>) =>
    mock
      ? Promise.resolve({ ...DEV_DETAIL, id, ...flags })
      : request<EmailListItem>(`/emails/${id}`, { method: 'PATCH', body: JSON.stringify(flags) }),
  schedule: (input: ScheduleInput) =>
    mock
      ? new Promise<ScheduleResult>((resolve) =>
          setTimeout(
            () =>
              resolve({
                ...DEV_SCHEDULE_RESULT,
                count: input.recipients.length,
                hourlyLimit: input.hourlyLimit ?? DEV_SCHEDULE_RESULT.hourlyLimit,
              }),
            600,
          ),
        )
      : request<ScheduleResult>('/emails/schedule', {
          method: 'POST',
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify(input),
        }),
};
