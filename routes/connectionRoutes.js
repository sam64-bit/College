import express from 'express';
import {
  getSuggestions,
  sendConnectionRequest,
  getConnectionRequests,
  respondToRequest,
  getConnections,
  searchUsers
} from '../controllers/connectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/suggestions', authenticate, getSuggestions);
router.post('/request', authenticate, sendConnectionRequest);
router.get('/requests', authenticate, getConnectionRequests);
router.post('/respond', authenticate, respondToRequest);
router.get('/list', authenticate, getConnections);
router.get('/search', authenticate, searchUsers);

export default router;
