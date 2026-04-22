import express from 'express';
import {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', authenticate, sendMessage);
router.get('/conversations', authenticate, getConversations);
router.get('/conversation/:userId', authenticate, getConversation);
router.put('/read/:senderId', authenticate, markAsRead);
router.get('/unread-count', authenticate, getUnreadCount);

export default router;
