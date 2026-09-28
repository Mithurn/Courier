import { prisma } from '../prisma';

// No-op if Slack isn't connected; never throws, so a notify failure can't fail a job.
export async function notifyRateLimitHit(userId: string, message: string): Promise<void> {
  const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
  if (!integration) return;

  try {
    await fetch(integration.incomingWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Slack notify failed:', (err as Error).message);
  }
}
