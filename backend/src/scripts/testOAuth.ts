import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import {
  getGoogleAuthUrl,
  generateAuthToken,
  verifyAuthToken,
  upsertGoogleUser,
} from '../services/auth.service';

async function runTests() {
  console.log('=== STARTING MODULE 11 GOOGLE OAUTH TESTS ===');

  // 1. Test Google Auth URL Generation with mock credentials
  process.env.GOOGLE_CLIENT_ID = 'test_google_client_id_mock_123.apps.googleusercontent.com';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';

  const authUrl = getGoogleAuthUrl();
  console.log(`[Test 1] Generated Google OAuth URL: ${authUrl.substring(0, 70)}...`);
  if (!authUrl.includes('accounts.google.com') || !authUrl.includes('test_google_client_id_mock_123')) {
    throw new Error('Google OAuth URL generation failed');
  }

  // 2. Test Missing Configuration Error Handling
  delete process.env.GOOGLE_CLIENT_ID;
  let configErrorCaught = false;
  try {
    getGoogleAuthUrl();
  } catch (err: any) {
    configErrorCaught = true;
    console.log(`[Test 2] Missing GOOGLE_CLIENT_ID threw correctly: "${err.message}"`);
  }
  if (!configErrorCaught) throw new Error('Expected missing GOOGLE_CLIENT_ID to throw error');

  // Restore client ID
  process.env.GOOGLE_CLIENT_ID = 'test_google_client_id_mock_123.apps.googleusercontent.com';

  // 3. Test Database User Upsert
  const mockProfile = {
    id: `google_uid_${Date.now()}`,
    email: `oauth_test_${Date.now()}@example.com`,
    name: 'OAuth Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  const user = await upsertGoogleUser(mockProfile);
  console.log(`[Test 3] User upserted in PostgreSQL: User ID=${user.id}, Email=${user.email}`);
  if (!user.id || user.email !== mockProfile.email) {
    throw new Error('upsertGoogleUser failed to store user in database');
  }

  // 4. Test JWT Token Generation and Verification
  const token = generateAuthToken(user);
  console.log(`[Test 4] Generated JWT Token: ${token.substring(0, 30)}...`);
  if (!token || typeof token !== 'string') {
    throw new Error('JWT generation failed');
  }

  const decoded = verifyAuthToken(token);
  console.log(`[Test 5] Decoded JWT Payload: userId=${decoded.userId}, email=${decoded.email}`);
  if (decoded.userId !== user.id || decoded.email !== user.email) {
    throw new Error('JWT token verification payload mismatch');
  }

  console.log('\n=== ALL GOOGLE OAUTH TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .catch((err) => {
    console.error('OAuth test script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
