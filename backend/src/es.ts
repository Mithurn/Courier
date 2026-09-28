import { Client, errors } from '@elastic/elasticsearch';
import type { EmailStatus, ScheduledEmail } from '@prisma/client';
import { env } from './env';

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

type EmailDoc = {
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  senderId: string;
};

// Explicit mapping: senderId is the tenant filter, so it must be an exact-match keyword.
export async function ensureIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: env.ELASTICSEARCH_INDEX });
  if (exists) return;
  try {
    await esClient.indices.create({
      index: env.ELASTICSEARCH_INDEX,
      mappings: {
        properties: {
          toEmail: { type: 'text' },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
          senderId: { type: 'keyword' },
        },
      },
    });
  } catch (err) {
    const alreadyCreated =
      err instanceof errors.ResponseError && err.body?.error?.type === 'resource_already_exists_exception';
    if (!alreadyCreated) throw err;
  }
}

export async function searchEmails(senderIds: string[], query: string, page: number, pageSize: number) {
  if (senderIds.length === 0) return { items: [], total: 0 };

  const result = await esClient.search<EmailDoc>({
    index: env.ELASTICSEARCH_INDEX,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    query: {
      bool: {
        filter: { terms: { senderId: senderIds } },
        must: query
          ? { multi_match: { query, fields: ['subject', 'toEmail', 'body'] } }
          : { match_all: {} },
      },
    },
    sort: query ? undefined : [{ scheduledAt: 'desc' }],
  });

  const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
  return { items: result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source })), total };
}

// Indexing failures never block a send; caller is expected to catch.
export async function indexEmail(email: ScheduledEmail): Promise<void> {
  const document: EmailDoc = {
    toEmail: email.toEmail,
    subject: email.subject,
    body: email.body,
    status: email.status,
    scheduledAt: email.scheduledAt,
    sentAt: email.sentAt,
    senderId: email.senderId,
  };
  await esClient.index({ index: env.ELASTICSEARCH_INDEX, id: email.id, document });
}
