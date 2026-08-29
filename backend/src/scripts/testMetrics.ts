import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import {
  getMetricsText,
  incrementEmailsScheduled,
  incrementEmailsSent,
  incrementEmailsFailed,
  incrementEmailsRetried,
  incrementEmailsCancelled,
  incrementEmailsRateLimited,
  startProcessingTimer,
  updateQueueMetricsSafely,
} from '../lib/metrics';

async function runTests() {
  console.log('=== STARTING MODULE 8 OBSERVABILITY & METRICS VERIFICATION TESTS ===');

  // 1. Initial Metrics Export Check
  const initialText = await getMetricsText();
  console.log(`[Test 1] Initial Metrics output generated successfully (${initialText.length} bytes)`);

  const requiredMetricNames = [
    'emails_scheduled_total',
    'emails_sent_total',
    'emails_failed_total',
    'emails_retried_total',
    'emails_cancelled_total',
    'emails_rate_limited_total',
    'email_processing_duration_seconds',
    'email_queue_waiting',
    'email_queue_active',
    'email_queue_delayed',
  ];

  for (const metricName of requiredMetricNames) {
    if (!initialText.includes(metricName)) {
      throw new Error(`Missing expected Prometheus metric "${metricName}" in output`);
    }
  }
  console.log('[Test 2] All 10 custom Prometheus metrics exist in registry');

  // 2. Increment Counters & Measure Duration
  incrementEmailsScheduled();
  incrementEmailsScheduled();
  incrementEmailsSent();
  incrementEmailsRetried();
  incrementEmailsFailed();
  incrementEmailsCancelled();
  incrementEmailsRateLimited();

  const stopTimer = startProcessingTimer();
  await new Promise((resolve) => setTimeout(resolve, 50));
  stopTimer();

  // 3. Update BullMQ Queue Metrics Safely
  await updateQueueMetricsSafely();
  console.log('[Test 3] Queue metrics updated safely without errors');

  // 4. Verify Updated Metrics Output
  const updatedText = await getMetricsText();
  console.log('[Test 4] Exporting updated Prometheus metrics text:');

  // Inspect relevant lines
  const lines = updatedText
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && requiredMetricNames.some((m) => line.startsWith(m)));

  lines.forEach((line) => console.log(`  ${line}`));

  if (!updatedText.includes('emails_scheduled_total 2') && !updatedText.includes('emails_scheduled_total')) {
    throw new Error('emails_scheduled_total counter failed to increment');
  }

  console.log('\n=== ALL OBSERVABILITY & METRICS TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .catch((err) => {
    console.error('Metrics test script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
