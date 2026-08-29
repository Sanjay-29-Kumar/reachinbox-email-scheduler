import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../lib/prisma';
import {
  getGoogleAuthUrl,
  upsertGoogleUser,
  generateAuthToken,
  verifyAuthToken,
} from '../services/auth.service';
import { GmailEmailProvider } from '../providers/gmailProvider';
import { getEmailProvider } from '../providers/emailProvider.factory';

async function runTests() {
  console.log('=== STARTING MODULE 12 GOOGLE OAUTH & GMAIL API TESTS ===');

  // 1. Test OAuth URL generation with Gmail sending scope
  process.env.GOOGLE_CLIENT_ID = 'test_google_client_id_mock_123.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'test_google_client_secret_mock_123';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';

  const testState = 'secure_random_state_nonce_12345';
  const authUrl = getGoogleAuthUrl(testState);
  console.log(`[Test 1] Generated Google OAuth URL with state: ${authUrl.substring(0, 80)}...`);
  if (
    !authUrl.includes('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send') &&
    !authUrl.includes('https://www.googleapis.com/auth/gmail.send')
  ) {
    throw new Error('Google OAuth URL does not contain required gmail.send scope');
  }
  if (!authUrl.includes(testState)) {
    throw new Error('Google OAuth URL missing CSRF state parameter');
  }

  // 2. Test User and ConnectedAccount Upsert in PostgreSQL
  const mockEmail = `gmail_test_${Date.now()}@example.com`;
  const mockRefreshToken = 'mock_google_refresh_token_1234567890';
  const mockProfile = {
    id: `google_acc_${Date.now()}`,
    email: mockEmail,
    name: 'Gmail Connected User',
    picture: 'https://example.com/avatar.jpg',
  };

  const user = await upsertGoogleUser(mockProfile, mockRefreshToken);
  console.log(`[Test 2] Upserted User: ID=${user.id}, Email=${user.email}`);

  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: { userId: user.id, email: mockEmail },
  });
  console.log(`[Test 3] ConnectedAccount stored in PostgreSQL with ID: ${connectedAccount?.id}`);
  if (!connectedAccount || connectedAccount.refreshToken !== mockRefreshToken) {
    throw new Error('ConnectedAccount refresh token persistence failed');
  }

  // 3. Test HTTP Server Endpoints: GET /api/accounts and DELETE /api/accounts/:id
  const testServer = http.createServer(app);
  const testPort = 5098;
  await new Promise<void>((resolve) => testServer.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}`;

  try {
    // Test GET /api/accounts
    const accountsRes = await fetch(`${baseUrl}/api/accounts`);
    const accountsData = (await accountsRes.json()) as any;
    console.log(`[Test 4] GET /api/accounts response: count=${accountsData.count}`);
    if (accountsRes.status !== 200 || !Array.isArray(accountsData.data)) {
      throw new Error('GET /api/accounts failed');
    }

    // Verify NO refresh token or secrets in response
    const firstAcc = accountsData.data[0];
    if (firstAcc && (firstAcc.refreshToken || firstAcc.accessToken || firstAcc.clientSecret)) {
      throw new Error('SECURITY VIOLATION: OAuth tokens or secrets exposed in /api/accounts response');
    }
    console.log('[Test 5] Verified: No tokens/secrets exposed in /api/accounts response.');

    // 4. Test GmailEmailProvider with Mocked Google Token & Gmail API
    const originalFetch = globalThis.fetch;
    let gmailApiCalled = false;
    let capturedRawMime = '';

    try {
      globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
        const urlStr = url.toString();

        // Mock Google OAuth token refresh
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock_fresh_access_token_9988' }),
          } as Response;
        }

        // Mock Gmail REST API messages.send
        if (urlStr.includes('gmail.googleapis.com/gmail/v1/users/me/messages/send')) {
          gmailApiCalled = true;
          if (options?.body) {
            const parsed = JSON.parse(options.body as string);
            capturedRawMime = Buffer.from(parsed.raw, 'base64url').toString('utf8');
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'gmail_msg_id_112233', threadId: 'thread_112233' }),
          } as Response;
        }

        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }) as typeof fetch;

      const gmailProvider = new GmailEmailProvider();
      const sendResult = await gmailProvider.send({
        from: mockEmail,
        to: 'recipient-gmail@example.com',
        subject: 'Testing Gmail Provider',
        text: 'This is a test email sent via Gmail API.',
      });

      console.log(`[Test 6] Gmail provider send result: MsgID=${sendResult.messageId}, Provider=${sendResult.provider}`);
      if (!gmailApiCalled || sendResult.messageId !== 'gmail_msg_id_112233' || sendResult.provider !== 'gmail') {
        throw new Error('Gmail provider API send failed');
      }

      console.log(`[Test 7] Captured MIME message verification: Has To and Subject headers -> ${capturedRawMime.includes('To: recipient-gmail@example.com')}`);
      if (!capturedRawMime.includes('recipient-gmail@example.com')) {
        throw new Error('Constructed MIME email content invalid');
      }

      // 5. Test Gmail API Non-2xx Error Handling
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock_token' }),
          } as Response;
        }
        return {
          ok: false,
          status: 403,
          text: async () => 'Quota exceeded for Gmail send API',
        } as Response;
      }) as typeof fetch;

      let caughtGmailError = false;
      try {
        await gmailProvider.send({
          from: mockEmail,
          to: 'error@example.com',
          subject: 'Error Test',
          text: 'Error text',
        });
      } catch (err: any) {
        caughtGmailError = true;
        console.log(`[Test 8] Caught Gmail HTTP 403 error correctly: "${err.message}"`);
      }
      if (!caughtGmailError) throw new Error('Expected Gmail API error to throw for BullMQ retries');

    } finally {
      globalThis.fetch = originalFetch;
    }

    // 6. Test DELETE /api/accounts/:id
    if (connectedAccount) {
      const deleteRes = await fetch(`${baseUrl}/api/accounts/${connectedAccount.id}`, {
        method: 'DELETE',
      });
      const deleteData = (await deleteRes.json()) as any;
      console.log(`[Test 9] DELETE /api/accounts/${connectedAccount.id} response:`, deleteData.message);
      if (deleteRes.status !== 200 || deleteData.success !== true) {
        throw new Error('DELETE /api/accounts/:id failed');
      }
    }

    // 7. Test Provider Factory selection with EMAIL_PROVIDER=gmail
    process.env.EMAIL_PROVIDER = 'gmail';
    const factoryProvider = getEmailProvider();
    console.log(`[Test 10] Provider factory selected provider: "${factoryProvider.name}"`);
    if (factoryProvider.name !== 'gmail') {
      throw new Error(`Expected factory provider "gmail", got "${factoryProvider.name}"`);
    }

  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log('\n=== ALL GOOGLE OAUTH & GMAIL API TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Google OAuth test script failed:', err);
  process.exit(1);
});
