import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from '../../controllers/specialProgramController';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(controller.adminListPrograms));
router.get('/stats', asyncHandler(controller.adminGetStats));
router.post('/', asyncHandler(controller.adminCreateProgram));
router.get('/:slug', asyncHandler(controller.adminGetProgram));
router.put('/:slug', asyncHandler(controller.adminUpdateProgram));
router.patch('/:slug/toggle', asyncHandler(controller.adminToggleProgram));
router.get('/:slug/members', asyncHandler(controller.adminGetMembers));
router.patch('/:slug/members/:userId', asyncHandler(controller.adminUpdateMember));

export default router;
