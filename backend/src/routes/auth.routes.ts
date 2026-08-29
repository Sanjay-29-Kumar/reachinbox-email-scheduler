import { Router } from 'express';
import {
  googleLoginHandler,
  googleCallbackHandler,
} from '../controllers/googleAuth.controller';
import {
  getMeHandler,
  logoutHandler,
} from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Public OAuth routes
router.get('/google', googleLoginHandler);
router.get('/google/callback', googleCallbackHandler);
router.post('/logout', logoutHandler);

// Protected routes
router.get('/me', authenticateUser, getMeHandler);

export default router;
