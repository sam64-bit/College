import express from 'express';
import {
  createPost,
  getPosts,
  toggleLike,
  deletePost,
  getAnnouncements,
  createAnnouncement
} from '../controllers/feedController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/posts', authenticate, createPost);
router.get('/posts', authenticate, getPosts);
router.post('/posts/:postId/like', authenticate, toggleLike);
router.delete('/posts/:postId', authenticate, deletePost);
router.get('/announcements', authenticate, getAnnouncements);
router.post('/announcements', authenticate, isAdmin, createAnnouncement);

export default router;
