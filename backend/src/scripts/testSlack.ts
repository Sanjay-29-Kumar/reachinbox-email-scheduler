import dotenv from 'dotenv';
dotenv.config();

import { notifySlack } from '../services/slack.service';

async function runTests() {
  console.log('=== STARTING MODULE 11 SLACK INTEGRATION TESTS ===');

  // 1. Test Slack Disabled / Missing Webhook Behavior (Must safely no-op)
  delete process.env.SLACK_WEBHOOK_URL;
  const noWebhookResult = await notifySlack('Test notification when Slack is disabled');
  console.log(`[Test 1] Slack with no webhook URL returned: ${noWebhookResult} (Safely no-op, no error)`);
  if (noWebhookResult !== false) {
    throw new Error('Expected notifySlack to return false when SLACK_WEBHOOK_URL is not set');
  }

  // 2. Test Slack with Mocked HTTP fetch Success (200 OK)
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/MOCK/SLACK/WEBHOOK';
  const originalFetch = globalThis.fetch;

  let capturedPayload: any = null;

  try {
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      if (options?.body) {
        capturedPayload = JSON.parse(options.body as string);
      }
      return {
        ok: true,
        status: 200,
        text: async () => 'ok',
      } as Response;
    }) as typeof fetch;

    const successResult = await notifySlack({
      event: 'SENT',
      recipientEmail: 'slack-test@example.com',
      subject: 'Slack Integration Test',
      emailJobId: 'job_slack_test_123',
      extraDetails: 'Delivered via Resend HTTP API',
    });

    console.log(`[Test 2] Slack notification successful: ${successResult}`);
    console.log(`[Test 3] Captured Slack message content:\n${capturedPayload?.text}`);

    if (!successResult || !capturedPayload?.text.includes('Email SENT') || !capturedPayload?.text.includes('slack-test@example.com')) {
      throw new Error('Slack notification payload formatting or delivery check failed');
    }

    // 3. Test Slack with Mocked HTTP fetch Failure (HTTP 500 / Network Error) - Must not throw!
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      return {
        ok: false,
        status: 500,
        text: async () => 'Internal Slack Webhook Error',
      } as Response;
    }) as typeof fetch;

    const failureResult = await notifySlack({
      event: 'FAILED',
      recipientEmail: 'failed-user@example.com',
      subject: 'Failed Email Alert',
      emailJobId: 'job_failed_123',
    });

    console.log(`[Test 4] Slack failure handled safely without throwing: returned ${failureResult}`);
    if (failureResult !== false) {
      throw new Error('Expected notifySlack to return false on HTTP 500 error');
    }

    // 4. Test Slack with Network Error (Throwing in fetch) - Must catch and not crash
    globalThis.fetch = (async () => {
      throw new Error('Network timeout connecting to Slack');
    }) as typeof fetch;

    const networkErrorResult = await notifySlack({
      event: 'CANCELLED',
      recipientEmail: 'cancelled@example.com',
      subject: 'Cancelled Email Alert',
      emailJobId: 'job_cancel_123',
    });

    console.log(`[Test 5] Slack network exception caught safely: returned ${networkErrorResult}`);
    if (networkErrorResult !== false) {
      throw new Error('Expected notifySlack to safely catch network exceptions and return false');
    }

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SLACK_WEBHOOK_URL;
  }

  console.log('\n=== ALL SLACK INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Slack test script failed:', err);
  process.exit(1);
});
