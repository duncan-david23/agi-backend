import express from 'express';
import { createUserProfile, getUserProfile, getAllUserProfiles, topUpUserWallet  } from '../controllers/userAccountController.js';





const router = express.Router();

router.post('/create-profile', createUserProfile);
router.get('/profile', getUserProfile);
// ADMIN ONLY
router.get('/all-profiles', getAllUserProfiles);
router.put('/top-up-wallet', topUpUserWallet);

export default router;