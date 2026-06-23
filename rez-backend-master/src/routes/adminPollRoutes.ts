// @ts-nocheck
/**
 * Admin Poll Routes — BR-C2 fix.
 *
 * Previously the same pollRoutes router instance was mounted at both
 * /api/polls (consumer) and /api/admin/polls (admin), creating a shared
 * state where any router.use() added to pollRoutes affected both endpoints.
 *
 * This file is a dedicated admin-only router with explicit requireAdmin
 * middleware on every handler, mounted only at /api/admin/polls.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createPoll, updatePoll, archivePoll, getActivePolls, getPollDetail } from '../controllers/pollController';

const adminPollRouter = Router();

// All admin poll routes require authentication and admin role
adminPollRouter.use(requireAuth, requireAdmin);

/** GET /api/admin/polls — list all polls (including archived) */
adminPollRouter.get('/', getActivePolls);

/** GET /api/admin/polls/:id — get poll detail */
adminPollRouter.get('/:id', getPollDetail);

/** POST /api/admin/polls — create a new poll */
adminPollRouter.post('/', createPoll);

/** PATCH /api/admin/polls/:id — update a poll */
adminPollRouter.patch('/:id', updatePoll);

/** DELETE /api/admin/polls/:id — archive a poll */
adminPollRouter.delete('/:id', archivePoll);

export default adminPollRouter;
