import { prisma } from '../prisma';

const NOTIFY_TIMEOUT_MS = 5000;

export type SlackRateLimitAlert = {
  senderName: string;
  senderEmail: string;
  hourlyLimit: number;
  retryAt: number;
};

// Never throws: a Slack failure must not fail or retry the email job.
export async function notifyRateLimitHit(
  userId: string,
  alert: SlackRateLimitAlert | string,
): Promise<void> {
  try {
    const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
    if (!integration) return;

    const payload =
      typeof alert === 'string'
        ? { text: alert }
        : {
            text: `⚠️ *Courier Alert:* sender *${alert.senderName}* reached its hourly limit (${alert.hourlyLimit}/hr). Remaining emails deferred to next window.`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚨 Courier — Sender Hourly Limit Reached',
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Sender:*\n${alert.senderName} (<${alert.senderEmail}>)`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Hourly Limit:*\n\`${alert.hourlyLimit} emails / hr\``,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Rescheduled Window:*\n\`${new Date(alert.retryAt).toUTCString()}\``,
                  },
                  {
                    type: 'mrkdwn',
                    text: '*Policy:*\n`0 dropped (ordered deferral)`',
                  },
                ],
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: 'ℹ️ Redis rate limiter automatically deferred excess jobs to preserve sender reputation.',
                  },
                ],
              },
            ],
          };

    const res = await fetch(integration.incomingWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
    });
    if (!res.ok) console.error(`Slack notify failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error('Slack notify failed:', (err as Error).message);
  }
}
