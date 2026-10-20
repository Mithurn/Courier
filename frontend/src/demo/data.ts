import type { EmailDetail, Sender, User } from '../types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const DEMO_USER: User = { id: 'demo-user', email: 'demo@courier.app', name: 'Demo User', avatarUrl: null };

export const DEMO_SENDERS: Sender[] = [{ id: 'demo-sender', name: 'Demo User', email: 'demo@courier.app', hourlyLimit: 50 }];

type Seed = {
  to: string;
  subject: string;
  body: string;
  status: EmailDetail['status'];
  offsetMs: number;
  failReason?: string;
  starred?: boolean;
};

const SEEDS: Seed[] = [
  { to: 'priya@northwind.io', subject: 'Welcome to the Northwind pilot', body: 'Hi Priya,<br/><br/>Your pilot workspace is ready. Here is the onboarding checklist and the first week agenda.<br/><br/>Best,<br/>Demo', status: 'sending', offsetMs: 20_000 },
  { to: 'marcus@bluepeak.co', subject: 'Follow-up: pricing proposal', body: 'Hi Marcus,<br/><br/>Following up on the proposal we sent on Monday. Happy to walk through the numbers on a quick call.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 12 * MINUTE_MS, starred: true },
  { to: 'ana@lumenlabs.dev', subject: 'Invitation: product review on Friday', body: 'Hi Ana,<br/><br/>We would love your feedback on the new release. The review is Friday at 3pm.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 47 * MINUTE_MS },
  { to: 'tom@harborgroup.com', subject: 'Your invoice for October', body: 'Hi Tom,<br/><br/>Attached is the October invoice. Let us know if anything looks off.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 2 * HOUR_MS + 15 * MINUTE_MS },
  { to: 'sofia@kitebio.org', subject: 'Reminder: contract renewal', body: 'Hi Sofia,<br/><br/>A quick reminder that your contract renews at the end of the month.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 5 * HOUR_MS },
  { to: 'daniel@oakridge.net', subject: 'Webinar tomorrow: scaling outreach', body: 'Hi Daniel,<br/><br/>Tomorrow at 11am we are running a short session on scaling outbound without burning your domain.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 19 * HOUR_MS },
  { to: 'mei@cloudnine.ai', subject: 'Thanks for the demo call', body: 'Hi Mei,<br/><br/>Thanks for your time today. Notes and next steps are below.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 1 * DAY_MS + 3 * HOUR_MS },
  { to: 'liam@vertex-sys.com', subject: 'Quarterly business review agenda', body: 'Hi Liam,<br/><br/>Here is the agenda for next week\'s quarterly review.<br/><br/>Best,<br/>Demo', status: 'scheduled', offsetMs: 2 * DAY_MS },
  { to: 'ava@brightpath.io', subject: 'Quick intro from Demo', body: 'Hi Ava,<br/><br/>I am reaching out because your team recently launched a new onboarding flow. Would you be open to a short chat?<br/><br/>Best,<br/>Demo', status: 'sent', offsetMs: -8 * MINUTE_MS, starred: true },
  { to: 'noah@pinecrest.co', subject: 'Your trial ends in 3 days', body: 'Hi Noah,<br/><br/>Your trial wraps up on Friday. Reply here if you want an extension.<br/><br/>Best,<br/>Demo', status: 'sent', offsetMs: -41 * MINUTE_MS },
  { to: 'zoe@maplestreet.dev', subject: 'Feedback request', body: 'Hi Zoe,<br/><br/>Would you mind sharing two minutes of feedback on the beta?<br/><br/>Best,<br/>Demo', status: 'sent', offsetMs: -3 * HOUR_MS },
  { to: 'ethan@ironwood.io', subject: 'Case study draft for review', body: 'Hi Ethan,<br/><br/>The draft case study is attached. Please flag anything you would like changed.<br/><br/>Best,<br/>Demo', status: 'failed', offsetMs: -5 * HOUR_MS, failReason: 'Recipient mailbox unavailable (550 5.1.1)' },
  { to: 'isla@sparkforge.com', subject: 'Partnership opportunity', body: 'Hi Isla,<br/><br/>We think our teams could do great things together. Open to a call next week?<br/><br/>Best,<br/>Demo', status: 'sent', offsetMs: -1 * DAY_MS },
  { to: 'omar@tidewater.co', subject: 'Meeting notes and action items', body: 'Hi Omar,<br/><br/>Thanks for joining. Action items are listed below.<br/><br/>Best,<br/>Demo', status: 'sent', offsetMs: -2 * DAY_MS },
];

export function buildDemoEmails(now = Date.now()): EmailDetail[] {
  return SEEDS.map((seed, index) => {
    const at = new Date(now + seed.offsetMs).toISOString();
    const isDone = seed.status === 'sent' || seed.status === 'failed';
    return {
      id: `demo-${index + 1}`,
      from: DEMO_USER.email,
      toEmail: seed.to,
      subject: seed.subject,
      preview: seed.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90),
      body: seed.body,
      status: seed.status,
      scheduledAt: at,
      sentAt: isDone ? at : null,
      failReason: seed.failReason ?? null,
      starred: seed.starred ?? false,
      archived: false,
      trashed: false,
    };
  });
}
