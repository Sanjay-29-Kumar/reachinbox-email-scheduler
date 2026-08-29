import { Client } from '@elastic/elasticsearch';

const esNode = process.env.ELASTICSEARCH_NODE || process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: esNode,
});

export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health({});
    console.log(`[Elasticsearch Info] Cluster status: ${health.status}`);
    return health.status === 'green' || health.status === 'yellow';
  } catch (error) {
    console.warn('[Elasticsearch Warning] Failed to connect to Elasticsearch cluster:', error instanceof Error ? error.message : error);
    return false;
  }
}
