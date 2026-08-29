import { Request, Response } from 'express';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserProfile,
  upsertGoogleUser,
  generateAuthToken,
} from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

export async function googleLoginHandler(req: Request, res: Response) {
  try {
    const authUrl = getGoogleAuthUrl();
    // Support either direct redirect or returning authorization URL
    if (req.query.redirect === 'false' || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({ success: true, url: authUrl });
    }
    return res.redirect(authUrl);
  } catch (error: any) {
    console.error('[Auth Error] Google login redirect error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to initiate Google OAuth login',
    });
  }
}

export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Google authentication rejected: ${error}`,
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is missing from callback query',
      });
    }

    // 1. Exchange authorization code for Google access token
    const tokenResponse = await exchangeCodeForTokens(code);

    // 2. Fetch Google profile
    const profile = await getGoogleUserProfile(tokenResponse.access_token);

    // 3. Upsert user in PostgreSQL database
    const user = await upsertGoogleUser(profile);

    // 4. Generate JWT session token
    const token = generateAuthToken(user);

    // 5. Check if frontend redirect is requested
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(`${frontendUrl}?token=${token}&userId=${user.id}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('[Auth Error] Google OAuth callback error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Google OAuth authentication failed',
    });
  }
}

export async function getMeHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        senders: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        senders: user.senders,
      },
    });
  } catch (error: any) {
    console.error('[Auth Error] Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve authenticated user profile',
    });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
