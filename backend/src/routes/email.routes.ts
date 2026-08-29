import { Router } from 'express';
import {
  scheduleEmailHandler,
  getEmailsHandler,
  cancelEmailHandler,
  searchEmailsHandler,
} from '../controllers/email.controller';

const router = Router();

router.post('/schedule', scheduleEmailHandler);
router.get('/search', searchEmailsHandler);
router.get('/', getEmailsHandler);
router.delete('/:id', cancelEmailHandler);

export default router;
