import { Client } from '@elastic/elasticsearch';
import type { ScheduledEmail } from '@prisma/client';
import { env } from './env';

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

export async function ensureIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: env.ELASTICSEARCH_INDEX });
  if (!exists) {
    await esClient.indices.create({ index: env.ELASTICSEARCH_INDEX });
  }
}

/** Indexing failures never block a send; caller is expected to catch. */
export async function indexEmail(email: ScheduledEmail): Promise<void> {
  await esClient.index({
    index: env.ELASTICSEARCH_INDEX,
    id: email.id,
    document: {
      toEmail: email.toEmail,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      senderId: email.senderId,
    },
  });
}
