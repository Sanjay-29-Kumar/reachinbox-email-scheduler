import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
}

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'reachinbox_jwt_default_secret_key';

export function getGoogleAuthUrl(customState?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || clientId.trim() === '') {
    throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables');
  }

  const state = customState || crypto.randomBytes(16).toString('hex');
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    state,
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.send',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing in environment');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to exchange authorization code with Google: ${errorData}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials missing for token refresh');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Google access token: ${errText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to fetch Google user profile: ${errorData}`);
  }

  const data = (await response.json()) as any;
  return {
    id: data.id,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    picture: data.picture,
  };
}

export async function upsertGoogleUser(profile: GoogleUserProfile, refreshToken?: string) {
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      googleId: profile.id,
      name: profile.name,
      avatarUrl: profile.picture,
    },
    create: {
      email: profile.email,
      googleId: profile.id,
      name: profile.name,
      avatarUrl: profile.picture,
    },
  });

  // 1. Ensure default Sender exists for this user
  const existingSender = await prisma.sender.findFirst({
    where: { userId: user.id, email: user.email },
  });

  if (!existingSender) {
    await prisma.sender.create({
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  // 2. If refresh token is provided, store ConnectedAccount
  if (refreshToken && refreshToken.trim() !== '') {
    await prisma.connectedAccount.upsert({
      where: {
        userId_provider_email: {
          userId: user.id,
          provider: 'google',
          email: user.email,
        },
      },
      update: {
        googleAccountId: profile.id,
        refreshToken,
      },
      create: {
        userId: user.id,
        provider: 'google',
        email: user.email,
        googleAccountId: profile.id,
        refreshToken,
      },
    });
  }

  return user;
}

export function generateAuthToken(user: { id: string; email: string; name: string }): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
