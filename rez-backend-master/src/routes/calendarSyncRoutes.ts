// @ts-nocheck
import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSyncStatus,
  saveCalendarToken,
  disconnectCalendar,
  toggleSync,
  triggerSync,
} from '../controllers/calendarSyncController';

const router = Router();

// Type assertion helper for authenticated routes
const asHandler = (fn: unknown): RequestHandler => fn as RequestHandler;

// GET  /api/calendar-sync/status
router.get('/status', authenticate, asHandler(getSyncStatus));

// POST /api/calendar-sync/connect
router.post('/connect', authenticate, asHandler(saveCalendarToken));

// POST /api/calendar-sync/sync
router.post('/sync', authenticate, asHandler(triggerSync));

// PATCH /api/calendar-sync/:provider/toggle
router.patch('/:provider/toggle', authenticate, asHandler(toggleSync));

// DELETE /api/calendar-sync/:provider
router.delete('/:provider', authenticate, asHandler(disconnectCalendar));

export default router;
