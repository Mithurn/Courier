import { prisma } from '../prisma';

const NOTIFY_TIMEOUT_MS = 5000;

// Never throws: a Slack failure must not fail or retry the email job.
export async function notifyRateLimitHit(userId: string, message: string): Promise<void> {
  try {
    const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
    if (!integration) return;

    const res = await fetch(integration.incomingWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
    });
    if (!res.ok) console.error(`Slack notify failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error('Slack notify failed:', (err as Error).message);
  }
}
