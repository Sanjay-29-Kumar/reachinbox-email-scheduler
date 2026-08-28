import { Router } from 'express';
import { scheduleEmailHandler, getEmailsHandler } from '../controllers/email.controller';

const router = Router();

router.post('/schedule', scheduleEmailHandler);
router.get('/', getEmailsHandler);

export default router;
