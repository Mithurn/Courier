export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';

export type User = { id: string; email: string; name: string; avatarUrl: string | null };

export type Sender = { id: string; name: string; email: string; hourlyLimit: number };

export type EmailListItem = {
  id: string;
  from: string;
  toEmail: string;
  subject: string;
  preview: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failReason: string | null;
};

export type EmailDetail = EmailListItem & { body: string };

export type Page<T> = { items: T[]; total: number };

export type Counts = { scheduled: number; sent: number };

export type ScheduleInput = {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt?: string;
  delayBetweenSendsMs?: number;
  hourlyLimit?: number;
};

export type ScheduleResult = { count: number; hourlyLimit: number; firstScheduledAt: string; lastScheduledAt: string };
