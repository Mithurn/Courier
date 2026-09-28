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

export type IndexableEmail = Pick<
  ScheduledEmail,
  'id' | 'toEmail' | 'subject' | 'body' | 'status' | 'scheduledAt' | 'sentAt' | 'senderId'
>;

function toDoc({ id: _id, ...doc }: IndexableEmail): EmailDoc {
  return doc;
}

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

export async function searchEmailIds(senderIds: string[], query: string, page: number, pageSize: number) {
  if (senderIds.length === 0) return { ids: [], total: 0 };

  const result = await esClient.search({
    index: env.ELASTICSEARCH_INDEX,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    _source: false,
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
  return { ids: result.hits.hits.map((hit) => hit._id as string), total };
}

// Indexing failures never block a send; caller is expected to catch.
export async function indexEmail(email: IndexableEmail): Promise<void> {
  await esClient.index({ index: env.ELASTICSEARCH_INDEX, id: email.id, document: toDoc(email) });
}

const BULK_CHUNK = 500;

export async function indexEmails(emails: IndexableEmail[]): Promise<void> {
  for (let i = 0; i < emails.length; i += BULK_CHUNK) {
    const operations = emails
      .slice(i, i + BULK_CHUNK)
      .flatMap((email) => [{ index: { _index: env.ELASTICSEARCH_INDEX, _id: email.id } }, toDoc(email)]);
    const res = await esClient.bulk({ operations });
    if (res.errors) throw new Error('ES bulk index reported item errors');
  }
}
