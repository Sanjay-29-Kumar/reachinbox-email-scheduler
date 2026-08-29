import { esClient } from '../lib/elasticsearch';

export const ES_EMAIL_JOBS_INDEX = process.env.ELASTICSEARCH_INDEX || 'email-jobs';

export async function initElasticsearchIndex() {
  try {
    const exists = await esClient.indices.exists({ index: ES_EMAIL_JOBS_INDEX });
    if (!exists) {
      console.log(`[Elasticsearch Info] Creating index "${ES_EMAIL_JOBS_INDEX}" with explicit mappings...`);
      await esClient.indices.create({
        index: ES_EMAIL_JOBS_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            recipientEmail: {
              type: 'keyword',
              fields: {
                text: { type: 'text' },
              },
            },
            subject: { type: 'text' },
            body: { type: 'text' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            status: { type: 'keyword' },
            attempts: { type: 'integer' },
            lastError: { type: 'text' },
            idempotencyKey: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch Info] Index "${ES_EMAIL_JOBS_INDEX}" created successfully.`);
    }
  } catch (error: any) {
    console.error(`[Elasticsearch Error] Failed to initialize index "${ES_EMAIL_JOBS_INDEX}":`, error?.message || error);
  }
}

export async function indexEmailJob(emailJob: any) {
  try {
    const document = {
      id: emailJob.id,
      userId: emailJob.userId,
      senderId: emailJob.senderId,
      recipientEmail: emailJob.recipientEmail,
      subject: emailJob.subject,
      body: emailJob.body,
      scheduledAt: emailJob.scheduledAt ? new Date(emailJob.scheduledAt).toISOString() : null,
      sentAt: emailJob.sentAt ? new Date(emailJob.sentAt).toISOString() : null,
      status: emailJob.status,
      attempts: emailJob.attempts || 0,
      lastError: emailJob.lastError || null,
      idempotencyKey: emailJob.idempotencyKey,
      createdAt: emailJob.createdAt ? new Date(emailJob.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: emailJob.updatedAt ? new Date(emailJob.updatedAt).toISOString() : new Date().toISOString(),
    };

    await esClient.index({
      index: ES_EMAIL_JOBS_INDEX,
      id: emailJob.id,
      document,
      refresh: 'wait_for',
    });
  } catch (error: any) {
    console.error(`[Elasticsearch Error] Failed to index EmailJob ${emailJob?.id}:`, error?.message || error);
  }
}

export async function updateEmailJobInElasticsearch(id: string, partialData: Record<string, any>) {
  try {
    const updateDoc: Record<string, any> = { ...partialData, updatedAt: new Date().toISOString() };
    if (updateDoc.sentAt) updateDoc.sentAt = new Date(updateDoc.sentAt).toISOString();
    if (updateDoc.scheduledAt) updateDoc.scheduledAt = new Date(updateDoc.scheduledAt).toISOString();

    await esClient.update({
      index: ES_EMAIL_JOBS_INDEX,
      id,
      doc: updateDoc,
      doc_as_upsert: true,
      refresh: 'wait_for',
    });
  } catch (error: any) {
    console.error(`[Elasticsearch Error] Failed to update EmailJob ${id} in index:`, error?.message || error);
  }
}

export interface SearchEmailOptions {
  query: string;
  status?: string;
}

export async function searchEmailJobs(options: SearchEmailOptions) {
  const { query, status } = options;

  const must: any[] = [];
  const filter: any[] = [];

  if (query && query.trim() !== '') {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['subject^3', 'body', 'recipientEmail.text'],
        fuzziness: 'AUTO',
      },
    });
  }

  if (status && status.trim() !== '') {
    filter.push({
      term: {
        status: status.trim().toUpperCase(),
      },
    });
  }

  const searchResponse = await esClient.search({
    index: ES_EMAIL_JOBS_INDEX,
    query: {
      bool: {
        must,
        filter,
      },
    },
  });

  const hits = searchResponse.hits.hits.map((hit: any) => hit._source);
  const total = typeof searchResponse.hits.total === 'number' ? searchResponse.hits.total : searchResponse.hits.total?.value || hits.length;

  return {
    total,
    results: hits,
  };
}
