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

export async function searchEmails(senderIds: string[], query: string) {
  if (senderIds.length === 0) return [];

  const result = await esClient.search({
    index: env.ELASTICSEARCH_INDEX,
    query: {
      bool: {
        filter: { terms: { senderId: senderIds } },
        must: query
          ? { multi_match: { query, fields: ['subject', 'toEmail', 'body'] } }
          : { match_all: {} },
      },
    },
  });
  return result.hits.hits.map((hit) => ({ id: hit._id, ...(hit._source as object) }));
}

// Indexing failures never block a send; caller is expected to catch.
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
