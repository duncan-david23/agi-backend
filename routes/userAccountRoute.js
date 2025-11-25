import express from 'express';
import { createUserProfile, getUserProfile, getAllUserProfiles  } from '../controllers/userAccountController.js';





const router = express.Router();

router.post('/create-profile', createUserProfile);
router.get('/profile', getUserProfile);
// ADMIN ONLY
router.get('/all-profiles', getAllUserProfiles);

export default router;