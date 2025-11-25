import express from 'express';
import { requestWithdrawal, getUserWithdrawals } from '../controllers/withdrawalController.js';

const router = express.Router();

router.post('/withdrawal-request', requestWithdrawal);
router.get('/user-withdrawals', getUserWithdrawals);

export default router;
