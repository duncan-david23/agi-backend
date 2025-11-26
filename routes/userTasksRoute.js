import express from 'express';
import { fetchTasks, addUserTasks, sellAllTasks, updateCommission} from '../controllers/userTasksController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';





const router = express.Router();

router.get('/tasks',authMiddleware, fetchTasks);
router.post('/add-tasks', addUserTasks);
router.delete('/sell-all-tasks', sellAllTasks);
// router.get('/user-tasks', fetchUserTasks);
router.put('/update-commission', updateCommission);

export default router;