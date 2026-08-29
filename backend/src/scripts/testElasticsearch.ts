import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { checkElasticsearchHealth } from '../lib/elasticsearch';
import { initElasticsearchIndex, indexEmailJob, searchEmailJobs } from '../services/elasticsearch.service';

async function runTests() {
  console.log('=== STARTING MODULE 7 ELASTICSEARCH INTEGRATION & SEARCH TESTS ===');

  // 1. Check ES Cluster Health
  const healthy = await checkElasticsearchHealth();
  console.log(`[Test 1] Elasticsearch cluster health status: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  if (!healthy) throw new Error('Elasticsearch cluster is not healthy');

  // 2. Initialize Index
  await initElasticsearchIndex();
  console.log('[Test 2] Elasticsearch index "email-jobs" initialized successfully');

  // 3. Test Direct Document Indexing & Search
  const testId = `test-es-doc-${Date.now()}`;
  const mockJob = {
    id: testId,
    userId: 'usr_test_123',
    senderId: 'test-sender-id',
    recipientEmail: 'unittest_es@example.com',
    subject: 'Unique Unit Search Target Subject',
    body: 'Unique Unit Search Target Body text for verification',
    scheduledAt: new Date(),
    sentAt: new Date(),
    status: 'SENT',
    attempts: 1,
    lastError: null,
    idempotencyKey: `key-unit-es-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await indexEmailJob(mockJob);
  console.log(`[Test 3] Indexed test document ${testId}`);

  // 4. Test Search by Subject
  const searchSubjectRes = await searchEmailJobs({ query: 'Unique Unit Search Target Subject' });
  console.log(`[Test 4] Subject search results count: ${searchSubjectRes.results.length}`);
  if (searchSubjectRes.results.length === 0) throw new Error('Failed to find document by subject query');

  // 5. Test Search by Body
  const searchBodyRes = await searchEmailJobs({ query: 'verification' });
  console.log(`[Test 5] Body search results count: ${searchBodyRes.results.length}`);
  if (searchBodyRes.results.length === 0) throw new Error('Failed to find document by body query');

  // 6. Test Search by Recipient
  const searchRecipientRes = await searchEmailJobs({ query: 'unittest_es@example.com' });
  console.log(`[Test 6] Recipient search results count: ${searchRecipientRes.results.length}`);
  if (searchRecipientRes.results.length === 0) throw new Error('Failed to find document by recipient query');

  // 7. Test Search with Status Filter
  const searchStatusRes = await searchEmailJobs({ query: 'Unique Unit', status: 'SENT' });
  console.log(`[Test 7] Status filtered search results count: ${searchStatusRes.results.length}`);
  if (searchStatusRes.results.length === 0) throw new Error('Failed to find document by status filter');

  // 8. Test No-result query
  const searchNoResultRes = await searchEmailJobs({ query: 'NonexistentSearchQueryXYZ999' });
  console.log(`[Test 8] No-result search results count: ${searchNoResultRes.results.length}`);
  if (searchNoResultRes.results.length !== 0) throw new Error('Expected 0 results for non-matching query');

  console.log('\n=== ALL ELASTICSEARCH UNIT & SEARCH CHECKS PASSED SUCCESSFULLY ===');
}

runTests()
  .catch((err) => {
    console.error('Elasticsearch test script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
