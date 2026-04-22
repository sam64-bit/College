import express from 'express';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  blockUser,
  unblockUser,
  getAllUsers,
  convertStudentToAlumni,
  deleteUser,
  getStats,
  exportUsers
} from '../controllers/adminController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, isAdmin);

router.get('/pending-users', getPendingUsers);
router.post('/approve/:userId', approveUser);
router.post('/reject/:userId', rejectUser);
router.post('/block/:userId', blockUser);
router.post('/unblock/:userId', unblockUser);
router.get('/users', getAllUsers);
router.post('/convert-students', convertStudentToAlumni);
router.delete('/user/:userId', deleteUser);
router.get('/stats', getStats);
router.get('/export-users', exportUsers);

export default router;
