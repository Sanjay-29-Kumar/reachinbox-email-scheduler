import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, AuthTokenPayload } from '../services/auth.service';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required (Authorization: Bearer <token>)',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAuthToken(token);
    req.user = payload;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
  }
}
