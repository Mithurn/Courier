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
import type { Counts, EmailDetail, EmailListItem, Page, ScheduleInput, ScheduleResult, Sender, User } from '../types';

const mock = import.meta.env.DEV && import.meta.env.VITE_DEV_FIXTURES === 'true';

export const api = {
  me: () => (mock ? Promise.resolve(DEV_USER) : request<User>('/auth/me')),
  logout: () => (mock ? Promise.resolve({ ok: true as const }) : request<{ ok: true }>('/auth/logout', { method: 'POST' })),
  slackStatus: () =>
    mock ? Promise.resolve({ connected: false, teamName: null }) : request<{ connected: boolean; teamName: string | null }>('/auth/slack/status'),
  slackDisconnect: () => (mock ? Promise.resolve({ ok: true as const }) : request<{ ok: true }>('/auth/slack/disconnect', { method: 'POST' })),
  senders: () => (mock ? Promise.resolve(DEV_SENDERS) : request<Sender[]>('/senders')),
  createSender: () => (mock ? Promise.resolve(DEV_SENDERS[0]) : request<Sender>('/senders', { method: 'POST', body: '{}' })),
  counts: () => (mock ? Promise.resolve(DEV_COUNTS) : request<Counts>('/emails/counts')),
  scheduled: (page: number, status?: 'scheduled' | 'sending') =>
    mock
      ? Promise.resolve(devPage(status ? DEV_SCHEDULED.filter((e) => e.status === status) : DEV_SCHEDULED))
      : request<Page<EmailListItem>>(`/emails/scheduled?page=${page}&pageSize=10${status ? `&status=${status}` : ''}`),
  sent: (page: number, status?: 'sent' | 'failed') =>
    mock
      ? Promise.resolve(devPage(status ? DEV_SENT.filter((e) => e.status === status) : DEV_SENT))
      : request<Page<EmailListItem>>(`/emails/sent?page=${page}&pageSize=10${status ? `&status=${status}` : ''}`),
  search: (q: string, page: number) =>
    mock
      ? Promise.resolve(devPage([...DEV_SCHEDULED, ...DEV_SENT].filter((e) => e.subject.toLowerCase().includes(q.toLowerCase()))))
      : request<Page<EmailListItem>>(`/emails/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`),
  detail: (id: string) => (mock ? Promise.resolve({ ...DEV_DETAIL, id }) : request<EmailDetail>(`/emails/${id}`)),
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
