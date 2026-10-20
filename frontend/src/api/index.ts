import { request } from './client';
import { demoApi } from '../demo/api';
import { isDemo } from '../demo/mode';
import type { Counts, EmailDetail, EmailLabel, EmailListItem, Page, ScheduleInput, ScheduleResult, Sender, User } from '../types';

const liveApi = {
  me: () => request<User>('/auth/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  slackStatus: () => request<{ connected: boolean; teamName: string | null }>('/auth/slack/status'),
  slackDisconnect: () => request<{ ok: true }>('/auth/slack/disconnect', { method: 'POST' }),
  senders: () => request<Sender[]>('/senders'),
  createSender: () => request<Sender>('/senders', { method: 'POST', body: '{}' }),
  counts: () => request<Counts>('/emails/counts'),
  scheduled: (page: number, status?: 'scheduled' | 'sending', label?: EmailLabel) =>
    request<Page<EmailListItem>>(
      `/emails/scheduled?page=${page}&pageSize=10${status ? `&status=${status}` : ''}${label ? `&label=${label}` : ''}`,
    ),
  sent: (page: number, status?: 'sent' | 'failed', label?: EmailLabel) =>
    request<Page<EmailListItem>>(
      `/emails/sent?page=${page}&pageSize=10${status ? `&status=${status}` : ''}${label ? `&label=${label}` : ''}`,
    ),
  search: (q: string, page: number) =>
    request<Page<EmailListItem>>(`/emails/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`),
  detail: (id: string) => request<EmailDetail>(`/emails/${id}`),
  updateFlags: (id: string, flags: Partial<Record<EmailLabel, boolean>>) =>
    request<EmailListItem>(`/emails/${id}`, { method: 'PATCH', body: JSON.stringify(flags) }),
  schedule: (input: ScheduleInput) =>
    request<ScheduleResult>('/emails/schedule', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(input),
    }),
};

export const api: typeof liveApi = isDemo() ? (demoApi as typeof liveApi) : liveApi;
