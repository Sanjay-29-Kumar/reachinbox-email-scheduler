import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../lib/prisma';
import { validateEnvironment } from '../lib/envValidation';

async function runTests() {
  console.log('=== STARTING MODULE 10 PRODUCTION HARDENING & HEALTH TESTS ===');

  // 1. Validate Environment
  const envResult = validateEnvironment();
  console.log(`[Test 1] Environment startup validation result: ${envResult.isValid ? 'VALID' : 'INVALID'}`);
  if (!envResult.isValid) {
    throw new Error(`Environment validation failed for variables: ${envResult.missingVariables.join(', ')}`);
  }

  // 2. Start Temporary HTTP Server for Testing
  const testServer = http.createServer(app);
  const testPort = 5099;
  await new Promise<void>((resolve) => testServer.listen(testPort, resolve));
  console.log(`[Test 2] Test HTTP server listening on port ${testPort}`);

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 3. Test GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = (await healthRes.json()) as any;
    console.log(`[Test 3] GET /health response (HTTP ${healthRes.status}):`, JSON.stringify(healthData));
    if (!healthData.status || !healthData.database || !healthData.redis || !healthData.elasticsearch) {
      throw new Error('GET /health response missing required dependency fields');
    }

    // 4. Test GET /api/health
    const apiHealthRes = await fetch(`${baseUrl}/api/health`);
    const apiHealthData = (await apiHealthRes.json()) as any;
    console.log(`[Test 4] GET /api/health response (HTTP ${apiHealthRes.status}):`, JSON.stringify(apiHealthData));
    if (!apiHealthData.status) {
      throw new Error('GET /api/health response invalid');
    }

    // 5. Test GET /metrics
    const metricsRes = await fetch(`${baseUrl}/metrics`);
    const metricsText = await metricsRes.text();
    console.log(`[Test 5] GET /metrics response status: HTTP ${metricsRes.status} (${metricsText.length} bytes)`);
    if (metricsRes.status !== 200 || !metricsText.includes('emails_scheduled_total')) {
      throw new Error('GET /metrics failed to return Prometheus metrics');
    }

    // 6. Test 404 Unknown Route Handling
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent-route-12345`);
    const notFoundData = (await notFoundRes.json()) as any;
    console.log(`[Test 6] 404 handler response (HTTP ${notFoundRes.status}):`, JSON.stringify(notFoundData));
    if (notFoundRes.status !== 404 || notFoundData.success !== false) {
      throw new Error('Unknown route did not return HTTP 404 JSON response');
    }

    // 7. Test Schedule API Validation (Missing Body fields)
    const badScheduleRes = await fetch(`${baseUrl}/api/emails/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_test_123',
        recipientEmail: 'invalid-email',
      }),
    });
    const badScheduleData = (await badScheduleRes.json()) as any;
    console.log(`[Test 7] Validation rejection for missing idempotencyKey (HTTP ${badScheduleRes.status}):`, JSON.stringify(badScheduleData));
    if (badScheduleRes.status !== 400 || badScheduleData.success !== false) {
      throw new Error('Invalid schedule payload was not rejected with HTTP 400');
    }

    // 8. Test Schedule API Validation (Past Date)
    const pastScheduleRes = await fetch(`${baseUrl}/api/emails/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: `key-past-date-${Date.now()}`,
        userId: 'usr_test_123',
        senderId: 'test-sender-id',
        recipientEmail: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        scheduledAt: new Date(Date.now() - 100000).toISOString(),
      }),
    });
    const pastScheduleData = (await pastScheduleRes.json()) as any;
    console.log(`[Test 8] Validation rejection for past scheduledAt (HTTP ${pastScheduleRes.status}):`, JSON.stringify(pastScheduleData));
    if (pastScheduleRes.status !== 400 || pastScheduleData.success !== false) {
      throw new Error('Past scheduledAt date was not rejected with HTTP 400');
    }

    // 9. Test Search API Validation (Missing q param)
    const badSearchRes = await fetch(`${baseUrl}/api/emails/search`);
    const badSearchData = (await badSearchRes.json()) as any;
    console.log(`[Test 9] Validation rejection for missing query q (HTTP ${badSearchRes.status}):`, JSON.stringify(badSearchData));
    if (badSearchRes.status !== 400 || badSearchData.success !== false) {
      throw new Error('Missing query q was not rejected with HTTP 400');
    }

    // 10. Test Search API Validation (Invalid status filter)
    const invalidStatusSearchRes = await fetch(`${baseUrl}/api/emails/search?q=test&status=UNKNOWN_STATUS_99`);
    const invalidStatusData = (await invalidStatusSearchRes.json()) as any;
    console.log(`[Test 10] Validation rejection for invalid status filter (HTTP ${invalidStatusSearchRes.status}):`, JSON.stringify(invalidStatusData));
    if (invalidStatusSearchRes.status !== 400 || invalidStatusData.success !== false) {
      throw new Error('Invalid status filter was not rejected with HTTP 400');
    }

    console.log('\n=== ALL MODULE 10 HEALTH & HARDENING TESTS PASSED SUCCESSFULLY ===');
  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Health test script failed:', err);
  process.exit(1);
});
