import express from 'express';
import { requestWithdrawal, getUserWithdrawals, adminGetAllWithdrawals, adminUpdateWithdrawalStatus } from '../controllers/withdrawalController.js';

const router = express.Router();

router.post('/withdrawal-request', requestWithdrawal);
router.get('/user-withdrawals', getUserWithdrawals);
router.get('/admin/withdrawals', adminGetAllWithdrawals);
router.put('/admin/withdrawals/approve', adminUpdateWithdrawalStatus);

export default router;
