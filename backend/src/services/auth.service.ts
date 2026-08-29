import jwt from 'jsonwebtoken';
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

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'reachinbox_jwt_default_secret_key';

export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables');
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{ access_token: string; id_token?: string }> {
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

  return (await response.json()) as { access_token: string; id_token?: string };
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

export async function upsertGoogleUser(profile: GoogleUserProfile) {
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

  // Ensure default Sender exists for this user
  const existingSender = await prisma.sender.findFirst({
    where: { userId: user.id },
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
