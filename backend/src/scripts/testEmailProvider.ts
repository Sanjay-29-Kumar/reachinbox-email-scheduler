import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { getEmailProvider, setTestEmailProvider } from '../providers/emailProvider.factory';
import { MockEmailProvider } from '../providers/mockProvider';
import { ResendEmailProvider } from '../providers/resendProvider';

async function runTests() {
  console.log('=== STARTING MODULE 9A RESEND EMAIL PROVIDER & MOCK TESTS ===');

  // 1. Factory Pattern Initialization Check (Default should be Resend)
  setTestEmailProvider(null);
  const defaultProvider = getEmailProvider();
  console.log(`[Test 1] Default Email Provider initialized: "${defaultProvider.name}"`);
  if (defaultProvider.name !== 'resend') throw new Error(`Expected default provider "resend", got "${defaultProvider.name}"`);

  // 2. Mock Provider Delivery Test
  const mockProvider = new MockEmailProvider();
  setTestEmailProvider(mockProvider);

  const payload = {
    to: 'provider-test@example.com',
    subject: 'Module 9A Provider Test',
    text: 'Testing Resend & Mock EmailProvider abstraction layer',
  };

  const result = await mockProvider.send(payload);
  console.log(`[Test 2] Delivered email via "${result.provider}" (MsgID: ${result.messageId})`);
  if (!result.messageId || result.provider !== 'mock') {
    throw new Error('Mock provider delivery response format invalid');
  }

  // 3. Mock Provider Error Handling Test
  mockProvider.shouldFail = true;
  let caughtError = false;
  try {
    await mockProvider.send(payload);
  } catch (err: any) {
    caughtError = true;
    console.log(`[Test 3] Caught controlled provider error correctly: "${err.message}"`);
  }
  if (!caughtError) throw new Error('Expected provider failure to throw controlled error for worker retry');

  // 4. Resend Provider Test (Without API key fallback mode)
  setTestEmailProvider(null);
  delete process.env.RESEND_API_KEY;
  const resendProvider = new ResendEmailProvider();
  const resendSimResult = await resendProvider.send(payload);
  console.log(`[Test 4] Resend fallback mode output: MsgID=${resendSimResult.messageId}, Simulated=${resendSimResult.rawResponse?.simulated}`);
  if (!resendSimResult.messageId || resendSimResult.provider !== 'resend') {
    throw new Error('Resend provider fallback response format invalid');
  }

  // 5. Resend Provider Test with Mocked fetch HTTP 200 response
  process.env.RESEND_API_KEY = 'test_resend_api_key_mock_123';
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_msg_mock_9988' }),
        text: async () => JSON.stringify({ id: 'resend_msg_mock_9988' }),
      } as Response;
    }) as typeof fetch;

    const resendMockedResult = await resendProvider.send(payload);
    console.log(`[Test 5] Resend mocked HTTP API output: MsgID=${resendMockedResult.messageId}`);
    if (resendMockedResult.messageId !== 'resend_msg_mock_9988') {
      throw new Error('Resend provider failed to parse HTTP 200 JSON messageId');
    }

    // 6. Resend Provider Test with Mocked fetch HTTP 400 error response
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      return {
        ok: false,
        status: 400,
        text: async () => 'Invalid recipient domain',
      } as Response;
    }) as typeof fetch;

    let resendErrorCaught = false;
    try {
      await resendProvider.send(payload);
    } catch (resErr: any) {
      resendErrorCaught = true;
      console.log(`[Test 6] Resend HTTP 400 error caught correctly: "${resErr.message}"`);
    }
    if (!resendErrorCaught) throw new Error('Expected Resend HTTP 400 error to throw controlled exception');

  } finally {
    globalThis.fetch = originalFetch;
    setTestEmailProvider(null);
  }

  console.log('\n=== ALL RESEND & MOCK EMAIL PROVIDER TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .catch((err) => {
    console.error('Email provider test script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
