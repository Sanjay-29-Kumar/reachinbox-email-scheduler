import { Router } from 'express';
import { getAccountsHandler, deleteAccountHandler } from '../controllers/account.controller';

const router = Router();

// Account management routes
router.get('/', getAccountsHandler);
router.delete('/:id', deleteAccountHandler);

export default router;
