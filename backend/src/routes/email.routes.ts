import { Router } from 'express';
import { scheduleEmailHandler, getEmailsHandler, cancelEmailHandler } from '../controllers/email.controller';

const router = Router();

router.post('/schedule', scheduleEmailHandler);
router.get('/', getEmailsHandler);
router.delete('/:id', cancelEmailHandler);

export default router;
