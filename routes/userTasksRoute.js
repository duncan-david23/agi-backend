import express from 'express';
import { fetchTasks, addUserTasks, sellAllTasks, updateCommission, fetchUserTasks} from '../controllers/userTasksController.js';





const router = express.Router();

router.get('/tasks', fetchTasks);
router.post('/add-tasks', addUserTasks);
router.delete('/sell-all-tasks', sellAllTasks);
router.get('/user-tasks', fetchUserTasks);
router.put('/update-commission', updateCommission);

export default router;