import prisma from '../lib/prisma';
import { checkElasticsearchHealth } from '../lib/elasticsearch';
import { initElasticsearchIndex, indexEmailJob } from '../services/elasticsearch.service';

async function main() {
  console.log('=== ELASTICSEARCH INDEX INITIALIZATION & REINDEX SCRIPT ===');

  const healthy = await checkElasticsearchHealth();
  if (!healthy) {
    console.error('Error: Elasticsearch cluster is unreachable or unhealthy. Aborting initialization.');
    process.exit(1);
  }

  await initElasticsearchIndex();

  const emailJobs = await prisma.emailJob.findMany();
  console.log(`Found ${emailJobs.length} existing EmailJob record(s) in PostgreSQL. Reindexing to Elasticsearch...`);

  let indexedCount = 0;
  for (const job of emailJobs) {
    await indexEmailJob(job);
    indexedCount++;
  }

  console.log(`Successfully reindexed ${indexedCount} EmailJob record(s) into Elasticsearch index.`);
}

main()
  .catch((err) => {
    console.error('Reindex error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
