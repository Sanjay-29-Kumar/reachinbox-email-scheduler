import dotenv from 'dotenv';
dotenv.config();

import {
  sendSlackNotification,
  notifyEmailScheduled,
  notifyEmailSent,
  notifyEmailFailed,
  notifyEmailCancelled,
  notifyEmailRateLimited,
} from '../services/slack.service';

async function runTests() {
  console.log('=== STARTING MODULE 11 SLACK INTEGRATION UNIT TESTS ===');

  // 1. Test Slack Service Existence
  if (
    typeof sendSlackNotification !== 'function' ||
    typeof notifyEmailScheduled !== 'function' ||
    typeof notifyEmailSent !== 'function' ||
    typeof notifyEmailFailed !== 'function' ||
    typeof notifyEmailCancelled !== 'function' ||
    typeof notifyEmailRateLimited !== 'function'
  ) {
    throw new Error('Slack notification functions are not properly exported');
  }
  console.log('[Test 1] Slack notification service functions exist and are properly defined.');

  // 2. Test Missing Webhook URL (Must not crash, return false safely)
  const savedWebhook = process.env.SLACK_WEBHOOK_URL;
  delete process.env.SLACK_WEBHOOK_URL;

  const noWebhookResult = await sendSlackNotification('Test message without webhook');
  console.log(`[Test 2] Missing SLACK_WEBHOOK_URL handled safely: returned ${noWebhookResult}`);
  if (noWebhookResult !== false) {
    throw new Error('Expected sendSlackNotification to return false when SLACK_WEBHOOK_URL is not set');
  }

  // 3. Setup Mocked fetch() for Lifecycle Function Testing
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/MOCK/SLACK/WEBHOOK';
  const originalFetch = globalThis.fetch;

  let capturedPayloads: any[] = [];

  try {
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      if (options?.body) {
        capturedPayloads.push(JSON.parse(options.body as string));
      }
      return {
        ok: true,
        status: 200,
        text: async () => 'ok',
      } as Response;
    }) as typeof fetch;

    // Test notifyEmailScheduled
    const scheduledRes = await notifyEmailScheduled({
      recipientEmail: 'scheduled@example.com',
      subject: 'Welcome to ReachInbox',
      scheduledAt: new Date('2026-08-29T16:00:00.000Z'),
      emailJobId: 'job_sched_001',
    });
    console.log(`[Test 3] notifyEmailScheduled returned: ${scheduledRes}`);
    if (!scheduledRes) throw new Error('notifyEmailScheduled failed');

    // Test notifyEmailSent
    const sentRes = await notifyEmailSent({
      recipientEmail: 'sent@example.com',
      subject: 'Newsletter Issue #1',
      emailJobId: 'job_sent_002',
      provider: 'resend',
    });
    console.log(`[Test 4] notifyEmailSent returned: ${sentRes}`);
    if (!sentRes) throw new Error('notifyEmailSent failed');

    // Test notifyEmailFailed
    const failedRes = await notifyEmailFailed({
      recipientEmail: 'failed@example.com',
      subject: 'Order Confirmation',
      emailJobId: 'job_failed_003',
      failureReason: 'Invalid recipient MX records',
      attempts: 3,
    });
    console.log(`[Test 5] notifyEmailFailed returned: ${failedRes}`);
    if (!failedRes) throw new Error('notifyEmailFailed failed');

    // Test notifyEmailCancelled
    const cancelledRes = await notifyEmailCancelled({
      recipientEmail: 'cancel@example.com',
      subject: 'Cancelled Notification',
      emailJobId: 'job_cancel_004',
    });
    console.log(`[Test 6] notifyEmailCancelled returned: ${cancelledRes}`);
    if (!cancelledRes) throw new Error('notifyEmailCancelled failed');

    // Test notifyEmailRateLimited
    const rateLimitedRes = await notifyEmailRateLimited({
      recipientEmail: 'ratelimit@example.com',
      subject: 'Campaign Email',
      emailJobId: 'job_rate_005',
      rateLimitInfo: 'Max 10 emails/hour exceeded. Rescheduled for next hour.',
    });
    console.log(`[Test 7] notifyEmailRateLimited returned: ${rateLimitedRes}`);
    if (!rateLimitedRes) throw new Error('notifyEmailRateLimited failed');

    // Verify Captured Payloads
    console.log(`[Test 8] Verified ${capturedPayloads.length} payloads captured with correct structure.`);
    if (capturedPayloads.length !== 5) {
      throw new Error(`Expected 5 payloads, got ${capturedPayloads.length}`);
    }

    if (!capturedPayloads[0].text.includes('Email Scheduled') || !capturedPayloads[0].text.includes('scheduled@example.com')) {
      throw new Error('Scheduled payload text mismatch');
    }
    if (!capturedPayloads[1].text.includes('Email Sent') || !capturedPayloads[1].text.includes('resend')) {
      throw new Error('Sent payload text mismatch');
    }
    if (!capturedPayloads[2].text.includes('Email Failed') || !capturedPayloads[2].text.includes('Invalid recipient MX records')) {
      throw new Error('Failed payload text mismatch');
    }
    if (!capturedPayloads[3].text.includes('Email Cancelled')) {
      throw new Error('Cancelled payload text mismatch');
    }
    if (!capturedPayloads[4].text.includes('Rate Limited') || !capturedPayloads[4].text.includes('Max 10 emails/hour exceeded')) {
      throw new Error('Rate limited payload text mismatch');
    }

    // 4. Test HTTP Error Response Handling (500 Internal Server Error)
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      return {
        ok: false,
        status: 500,
        text: async () => 'Slack Internal Server Error',
      } as Response;
    }) as typeof fetch;

    const httpErrorResult = await sendSlackNotification('This should return false on 500');
    console.log(`[Test 9] HTTP 500 status handled safely: returned ${httpErrorResult}`);
    if (httpErrorResult !== false) {
      throw new Error('Expected sendSlackNotification to return false on HTTP 500 error');
    }

    // 5. Test Network Exception Isolation (Throwing fetch must not throw to caller)
    globalThis.fetch = (async () => {
      throw new Error('Network socket timeout');
    }) as typeof fetch;

    const exceptionResult = await notifyEmailSent({
      recipientEmail: 'test@example.com',
      subject: 'Test',
      emailJobId: 'job_test',
      provider: 'mock',
    });
    console.log(`[Test 10] Network exception caught and isolated: returned ${exceptionResult}`);
    if (exceptionResult !== false) {
      throw new Error('Expected notifyEmailSent to safely catch network exceptions and return false');
    }

  } finally {
    globalThis.fetch = originalFetch;
    if (savedWebhook) {
      process.env.SLACK_WEBHOOK_URL = savedWebhook;
    } else {
      delete process.env.SLACK_WEBHOOK_URL;
    }
  }

  console.log('\n=== ALL SLACK INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Slack unit test failed:', err);
  process.exit(1);
});
