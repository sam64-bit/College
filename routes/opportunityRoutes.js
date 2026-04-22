import express from 'express';
import {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  applyToOpportunity,
  getApplications,
  updateApplicationStatus,
  getMyApplications
} from '../controllers/opportunityController.js';
import { authenticate, isAlumni } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authenticate, isAlumni, createOpportunity);
router.get('/list', authenticate, getOpportunities);
router.get('/my-applications', authenticate, getMyApplications);
router.get('/:id', authenticate, getOpportunityById);
router.put('/:id', authenticate, updateOpportunity);
router.delete('/:id', authenticate, deleteOpportunity);
router.post('/:opportunityId/apply', authenticate, applyToOpportunity);
router.get('/:opportunityId/applications', authenticate, getApplications);
router.put('/application/:applicationId', authenticate, updateApplicationStatus);

export default router;
