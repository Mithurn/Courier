import { request } from './client';
import type { Counts, EmailDetail, EmailListItem, Page, ScheduleInput, ScheduleResult, Sender, User } from '../types';

export const api = {
  me: () => request<User>('/auth/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  slackStatus: () => request<{ connected: boolean; teamName: string | null }>('/auth/slack/status'),
  slackDisconnect: () => request<{ ok: true }>('/auth/slack/disconnect', { method: 'POST' }),
  senders: () => request<Sender[]>('/senders'),
  createSender: () => request<Sender>('/senders', { method: 'POST', body: '{}' }),
  counts: () => request<Counts>('/emails/counts'),
  scheduled: (page: number) => request<Page<EmailListItem>>(`/emails/scheduled?page=${page}&pageSize=10`),
  sent: (page: number) => request<Page<EmailListItem>>(`/emails/sent?page=${page}&pageSize=10`),
  search: (q: string, page: number) =>
    request<Page<EmailListItem>>(`/emails/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`),
  detail: (id: string) => request<EmailDetail>(`/emails/${id}`),
  schedule: (input: ScheduleInput) =>
    request<ScheduleResult>('/emails/schedule', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(input),
    }),
};
