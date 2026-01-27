import { Router } from 'express';
import { nlbController } from './nlb.controller';
import { authenticate, authorize } from '../../middleware/auth';
import {
  createNLBValidation,
  updateNLBValidation,
  queryValidation,
  idValidation,
  toggleEnabledValidation,
} from './dto/nlb.dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/nlb
 * @desc    Get all NLBs with pagination and filters
 * @access  Private (viewer+)
 */
router.get('/', queryValidation, nlbController.getNLBs.bind(nlbController));

/**
 * @route   GET /api/nlb/stats
 * @desc    Get NLB statistics
 * @access  Private (viewer+)
 */
router.get('/stats', nlbController.getStats.bind(nlbController));

/**
 * @route   GET /api/nlb/:id
 * @desc    Get NLB by ID
 * @access  Private (viewer+)
 */
router.get('/:id', idValidation, nlbController.getNLBById.bind(nlbController));

/**
 * @route   POST /api/nlb
 * @desc    Create new NLB
 * @access  Private (moderator+)
 */
router.post(
  '/',
  authorize('admin', 'moderator'),
  createNLBValidation,
  nlbController.createNLB.bind(nlbController)
);

/**
 * @route   PUT /api/nlb/:id
 * @desc    Update NLB
 * @access  Private (moderator+)
 */
router.put(
  '/:id',
  authorize('admin', 'moderator'),
  idValidation,
  updateNLBValidation,
  nlbController.updateNLB.bind(nlbController)
);

/**
 * @route   DELETE /api/nlb/:id
 * @desc    Delete NLB
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  authorize('admin'),
  idValidation,
  nlbController.deleteNLB.bind(nlbController)
);

/**
 * @route   POST /api/nlb/:id/toggle
 * @desc    Toggle NLB enabled status
 * @access  Private (moderator+)
 */
router.post(
  '/:id/toggle',
  authorize('admin', 'moderator'),
  idValidation,
  toggleEnabledValidation,
  nlbController.toggleNLB.bind(nlbController)
);

/**
 * @route   POST /api/nlb/:id/health-check
 * @desc    Perform health check on NLB upstreams
 * @access  Private (moderator+)
 */
router.post(
  '/:id/health-check',
  authorize('admin', 'moderator'),
  idValidation,
  nlbController.performHealthCheck.bind(nlbController)
);

export default router;
