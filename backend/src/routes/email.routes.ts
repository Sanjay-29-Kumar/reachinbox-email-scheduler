import { Router } from 'express';
import {
  scheduleEmailHandler,
  getEmailsHandler,
  cancelEmailHandler,
  searchEmailsHandler,
  getDashboardStatsHandler,
} from '../controllers/email.controller';

const router = Router();

router.get('/stats', getDashboardStatsHandler);
router.post('/schedule', scheduleEmailHandler);
router.get('/search', searchEmailsHandler);
router.get('/', getEmailsHandler);
router.delete('/:id', cancelEmailHandler);

export default router;
