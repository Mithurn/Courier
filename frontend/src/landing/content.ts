export const FEATURES = [
  {
    title: 'Exact-time scheduling',
    body: 'Every recipient gets its own delayed job in Redis. No cron, no polling, the email leaves at the second you picked.',
  },
  {
    title: 'Survives restarts',
    body: 'Jobs live in Redis with AOF and MySQL stays the source of truth. Restart the API or the worker and nothing is lost.',
  },
  {
    title: 'Per-sender rate limits',
    body: 'Hourly caps and a minimum gap between sends. Over the limit? Mail rolls into the next window in order, never dropped.',
  },
  {
    title: 'Never sends twice',
    body: 'Deterministic job IDs, a status guard in the database and idempotency keys on the API keep every email single-send.',
  },
  {
    title: 'Instant search',
    body: 'Full-text search across subjects, recipients and bodies, powered by an Elasticsearch projection of the mailbox.',
  },
  {
    title: 'Slack alerts',
    body: 'Hit a rate limit and your Slack channel hears about it once, not once per email.',
  },
] as const;

export const STEPS = [
  { title: 'Compose', body: 'Write the message, add recipients and pick a start time.' },
  { title: 'Schedule', body: 'Courier queues one delayed job per recipient and spaces them out.' },
  { title: 'Deliver', body: 'Workers send on time, respect limits and log every result.' },
] as const;

export const STACK = ['TypeScript', 'Express 5', 'BullMQ', 'Redis', 'MySQL', 'Prisma', 'Elasticsearch', 'React', 'Tailwind'] as const;

export const SHOTS = [
  { src: '/shots/dashboard.jpg', alt: 'Scheduled emails dashboard with live countdowns', caption: 'Scheduled queue with live countdowns' },
  { src: '/shots/sent.jpg', alt: 'Sent emails with delivery status', caption: 'Sent log with delivery status' },
  { src: '/shots/compose.jpg', alt: 'Compose screen with recipients and schedule', caption: 'Compose with recipients and schedule' },
] as const;
