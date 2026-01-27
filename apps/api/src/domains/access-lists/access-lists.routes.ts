import { Router, Request, Response } from 'express';
import { accessListsController } from './access-lists.controller';
import { authenticate, authorize } from '../../middleware/auth';
import {
  createAccessListValidation,
  updateAccessListValidation,
  getAccessListsValidation,
  getAccessListValidation,
  deleteAccessListValidation,
  applyToDomainValidation,
  removeFromDomainValidation,
} from './dto/access-lists.dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/access-lists
 * @desc    Get all access lists
 * @access  Private (all roles)
 */
router.get(
  '/',
  getAccessListsValidation,
  (req: Request, res: Response) => accessListsController.getAccessLists(req, res)
);

/**
 * @route   GET /api/access-lists/stats
 * @desc    Get access lists statistics
 * @access  Private (all roles)
 */
router.get(
  '/stats',
  (req: Request, res: Response) => accessListsController.getStats(req, res)
);

/**
 * @route   GET /api/access-lists/:id
 * @desc    Get single access list
 * @access  Private (all roles)
 */
router.get(
  '/:id',
  getAccessListValidation,
  (req: Request, res: Response) => accessListsController.getAccessList(req, res)
);

/**
 * @route   POST /api/access-lists
 * @desc    Create new access list
 * @access  Private (admin, moderator)
 */
router.post(
  '/',
  authorize('admin', 'moderator'),
  createAccessListValidation,
  (req: Request, res: Response) => accessListsController.createAccessList(req, res)
);

/**
 * @route   PUT /api/access-lists/:id
 * @desc    Update access list
 * @access  Private (admin, moderator)
 */
router.put(
  '/:id',
  authorize('admin', 'moderator'),
  updateAccessListValidation,
  (req: Request, res: Response) => accessListsController.updateAccessList(req, res)
);

/**
 * @route   DELETE /api/access-lists/:id
 * @desc    Delete access list
 * @access  Private (admin, moderator)
 */
router.delete(
  '/:id',
  authorize('admin', 'moderator'),
  deleteAccessListValidation,
  (req: Request, res: Response) => accessListsController.deleteAccessList(req, res)
);

/**
 * @route   PATCH /api/access-lists/:id/toggle
 * @desc    Toggle access list enabled status
 * @access  Private (admin, moderator)
 */
router.patch(
  '/:id/toggle',
  authorize('admin', 'moderator'),
  (req: Request, res: Response) => accessListsController.toggleAccessList(req, res)
);

/**
 * @route   POST /api/access-lists/apply
 * @desc    Apply access list to domain
 * @access  Private (admin, moderator)
 */
router.post(
  '/apply',
  authorize('admin', 'moderator'),
  applyToDomainValidation,
  (req: Request, res: Response) => accessListsController.applyToDomain(req, res)
);

/**
 * @route   DELETE /api/access-lists/:accessListId/domains/:domainId
 * @desc    Remove access list from domain
 * @access  Private (admin, moderator)
 */
router.delete(
  '/:accessListId/domains/:domainId',
  authorize('admin', 'moderator'),
  removeFromDomainValidation,
  (req: Request, res: Response) => accessListsController.removeFromDomain(req, res)
);

/**
 * @route   GET /api/access-lists/domains/:domainId
 * @desc    Get access lists by domain
 * @access  Private (all roles)
 */
router.get(
  '/domains/:domainId',
  (req: Request, res: Response) => accessListsController.getByDomain(req, res)
);

export default router;
