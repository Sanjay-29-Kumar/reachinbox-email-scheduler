import { Request, Response } from 'express';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserProfile,
  upsertGoogleUser,
  generateAuthToken,
} from '../services/auth.service';

export async function googleLoginHandler(req: Request, res: Response) {
  try {
    const state = (req.query.state as string) || undefined;
    const authUrl = getGoogleAuthUrl(state);

    if (req.query.redirect === 'false' || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({ success: true, url: authUrl });
    }

    return res.redirect(authUrl);
  } catch (error: any) {
    console.error('[Google OAuth Error] Failed to generate login URL:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to initiate Google OAuth login',
    });
  }
}

export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;

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

    // 1. Exchange authorization code for Google access and refresh tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // 2. Fetch Google profile
    const profile = await getGoogleUserProfile(tokenResponse.access_token);

    // 3. Upsert User and ConnectedAccount in PostgreSQL
    const user = await upsertGoogleUser(profile, tokenResponse.refresh_token);

    // 4. Generate JWT session token
    const token = generateAuthToken(user);

    // 5. If browser redirect requested, redirect to frontend callback
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}&userId=${user.id}`);
    }

    // Return clean user information without sensitive Google tokens
    return res.status(200).json({
      success: true,
      message: 'Google authentication and Gmail connection successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('[Google OAuth Error] Callback error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Google OAuth callback failed',
    });
  }
}
