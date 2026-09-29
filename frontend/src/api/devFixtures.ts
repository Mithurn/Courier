import type { Counts, EmailDetail, EmailListItem, Page, ScheduleResult, Sender, User } from '../types';

export const DEV_USER: User = { id: 'dev', email: 'dev@example.com', name: 'Dev User', avatarUrl: null };

export const DEV_SENDERS: Sender[] = [{ id: 'dev-sender', name: 'Dev', email: 'sender@example.com', hourlyLimit: 100 }];

export const DEV_COUNTS: Counts = { scheduled: 2, sent: 3 };

const scheduledAt = new Date(Date.now() + 86_400_000).toISOString();
const sentAt = new Date(Date.now() - 3_600_000).toISOString();

export const DEV_SCHEDULED: EmailListItem[] = [
  {
    id: 'dev-scheduled-1',
    from: 'sender@example.com',
    toEmail: 'alice@example.com',
    subject: 'Welcome sequence',
    preview: 'Hi Alice, thanks for signing up…',
    status: 'scheduled',
    scheduledAt,
    sentAt: null,
    failReason: null,
  },
  {
    id: 'dev-scheduled-2',
    from: 'sender@example.com',
    toEmail: 'bob@example.com',
    subject: 'Product update',
    preview: 'We shipped a few improvements this week…',
    status: 'scheduled',
    scheduledAt,
    sentAt: null,
    failReason: null,
  },
];

export const DEV_SENT: EmailListItem[] = [
  {
    id: 'dev-sent-1',
    from: 'sender@example.com',
    toEmail: 'carol@example.com',
    subject: 'Invoice reminder',
    preview: 'Just a quick reminder about your invoice…',
    status: 'sent',
    scheduledAt: sentAt,
    sentAt,
    failReason: null,
  },
  {
    id: 'dev-sent-2',
    from: 'sender@example.com',
    toEmail: 'dave@example.com',
    subject: 'Meeting follow-up',
    preview: 'Great chatting today. Here are the next steps…',
    status: 'sent',
    scheduledAt: sentAt,
    sentAt,
    failReason: null,
  },
  {
    id: 'dev-sent-3',
    from: 'sender@example.com',
    toEmail: 'eve@example.com',
    subject: 'Delivery failed',
    preview: 'We could not deliver this message…',
    status: 'failed',
    scheduledAt: sentAt,
    sentAt: null,
    failReason: 'Mailbox unavailable',
  },
];

export const DEV_DETAIL: EmailDetail = {
  ...DEV_SCHEDULED[0],
  subject: 'Oliver, hello there! | MJWYT44 BM#52W01',
  from: 'sender@example.com',
  toEmail: 'dev@example.com',
  sentAt: '2025-11-03T10:23:00.000Z',
  status: 'sent',
  body: `<p>Hey Oliver,</p>
<p>You've just <strong>RECEIVED</strong> something</p>
<div style="background:#FEFCE8;border-left:4px solid #FDC700;padding:16px 16px 16px 20px;margin:0 0 16px;">
<p style="margin:0 0 8px;">⚡ <strong>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</strong> ⚡</p>
<p style="margin:0;">⚡ To explore securing your private transformation, simply reply right now with <strong>"FLY OUT FIX"</strong>.</p>
</div>
<p>Your coach for world-class performance,<br/>Grant</p>
<p><em>P.S. Always remember that you can develop world class technique! 🚀</em></p>
<img src="https://images.unsplash.com/photo-1595435934249-5df7f325bbad?w=420&h=234&fit=crop" alt="Tennis_Coach_Profile.png" />
<img src="https://images.unsplash.com/photo-1622163642999-958049106b47?w=420&h=234&fit=crop" alt="Tennis_Coach_Profile2.png" />`,
};

export function devPage<T>(items: T[]): Page<T> {
  return { items, total: items.length };
}

export const DEV_SCHEDULE_RESULT: ScheduleResult = {
  count: 1,
  hourlyLimit: 100,
  firstScheduledAt: scheduledAt,
  lastScheduledAt: scheduledAt,
};
