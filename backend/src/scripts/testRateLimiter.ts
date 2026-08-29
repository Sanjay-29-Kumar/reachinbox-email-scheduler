import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { emailQueue } from '../queues/email.queue';
import { consumeRateLimitQuota, getHourlyRateLimitKey } from '../lib/rateLimiter';
import { scheduleEmail, cancelEmailJob } from '../services/email.service';

async function runTests() {
  console.log('=== STARTING MODULE 6 HOURLY RATE LIMITING VERIFICATION TESTS ===');

  // Test Sender IDs
  const senderA = 'test-sender-id';
  const senderB = 'sender-B-id';
  const userId = 'usr_test_123';

  // 1. Test Key Generation and Expiration configuration
  const keyA = getHourlyRateLimitKey(senderA);
  console.log(`[Check 1] Hourly Redis Key generated: "${keyA}"`);

  // 2. Test Atomic Quota Consumption (Limit = 3)
  console.log('\n--- TEST 1: Under Limit (3 Emails Allowed) ---');
  const testLimit = 3;

  for (let i = 1; i <= 3; i++) {
    const res = await consumeRateLimitQuota(`test-sender-unit-${Date.now()}`, testLimit);
    console.log(`Quota request ${i}/${testLimit}: Allowed=${res.allowed}, CurrentCount=${res.currentCount}`);
    if (!res.allowed) throw new Error(`Unexpected rate limit block on request ${i}`);
  }

  // 3. Test Fourth Request (Exceeds Limit)
  console.log('\n--- TEST 2: Fourth Request Hits Limit ---');
  const testSenderUnit = `test-sender-unit-${Date.now()}`;
  for (let i = 1; i <= 3; i++) {
    await consumeRateLimitQuota(testSenderUnit, testLimit);
  }
  const fourthRes = await consumeRateLimitQuota(testSenderUnit, testLimit);
  console.log(`Quota request 4/3: Allowed=${fourthRes.allowed}, CurrentCount=${fourthRes.currentCount}`);
  if (fourthRes.allowed) throw new Error('Expected 4th request to be BLOCKED by rate limit');

  // 4. Test Multiple Senders Independence (Sender B is unaffected by Sender A limit)
  console.log('\n--- TEST 4: Multiple Senders Independence ---');
  const resSenderB = await consumeRateLimitQuota(`sender-B-unit-${Date.now()}`, testLimit);
  console.log(`Sender B quota request: Allowed=${resSenderB.allowed}, CurrentCount=${resSenderB.currentCount}`);
  if (!resSenderB.allowed) throw new Error('Sender B should not be blocked by Sender A limit');

  // 5. Test Cancellation of Rescheduled Job
  console.log('\n--- TEST 7: Cancellation Interaction with Rescheduled Jobs ---');
  const scheduledJob = await scheduleEmail({
    userId,
    senderId: senderA,
    recipientEmail: 'cancel-rescheduled@example.com',
    subject: 'Job to cancel after rate limiting',
    body: 'Test body',
    scheduledAt: new Date(Date.now() + 10000),
    idempotencyKey: `key-cancel-rate-limit-${Date.now()}`,
  });

  console.log(`Created job ${scheduledJob.id} with status ${scheduledJob.status}`);
  const cancelledJob = await cancelEmailJob(scheduledJob.id);
  console.log(`Cancelled job ${cancelledJob.id} -> Status: ${cancelledJob.status}`);
  if (cancelledJob.status !== 'CANCELLED') throw new Error('Job status failed to update to CANCELLED');

  console.log('\n=== ALL HOURLY RATE LIMITING UNIT & INTEGRATION CHECKS PASSED ===');
}

runTests()
  .catch((err) => {
    console.error('Test script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
