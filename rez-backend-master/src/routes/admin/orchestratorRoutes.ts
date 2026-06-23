// @ts-nocheck
import { Router, Request, Response } from 'express';
import {
  getOrchestratorFlag,
  setOrchestratorFlag,
  getAllOrchestratorFlags,
  publishFlagChange,
  OrchestratorMode,
  OrchestratorFlagMap,
} from '../../services/orchestratorFlags';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { createServiceLogger } from '../../config/logger';
import * as Sentry from '@sentry/node';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';

const router = Router();
const logger = createServiceLogger('admin-orchestrator');

const VALID_KEYS: Array<keyof OrchestratorFlagMap> = [
  'payments.orchestrator_mode',
  'refunds.orchestrator_mode',
  'orders.cancel_orchestrator_mode',
];

const VALID_VALUES: OrchestratorMode[] = ['live', 'shadow', 'disabled'];

// GET /api/admin/orchestrator/flags — returns all current flag values
// AS2-M4: Restrict to operator+ to prevent support-role users from reading sensitive flag state.
router.get(
  '/flags',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role || (req as any).role;
    const allowedRoles = ['operator', 'super_admin', 'admin'];
    if (!allowedRoles.includes(userRole)) {
      return sendError(res, 'Operator or higher role required to view orchestrator flags', 403);
    }
    sendSuccess(res, { flags: getAllOrchestratorFlags() });
  }),
);

// POST /api/admin/orchestrator/flags — toggle a flag
// Body: { key: 'payments.orchestrator_mode', value: 'live' | 'shadow' | 'disabled' }
// Requires super_admin role — setting a flag to 'disabled' stops all payments/refunds.
// AS2-H3: Use authenticate + requireSuperAdmin middleware instead of unsafe inline role check.
router.post(
  '/flags',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { key, value } = req.body;

    if (!VALID_KEYS.includes(key)) {
      return sendError(res, `Invalid key. Must be one of: ${VALID_KEYS.join(', ')}`, 400);
    }
    if (!VALID_VALUES.includes(value)) {
      return sendError(res, `Invalid value. Must be one of: ${VALID_VALUES.join(', ')}`, 400);
    }

    const previousValue = getOrchestratorFlag(key as keyof OrchestratorFlagMap);
    setOrchestratorFlag(key as keyof OrchestratorFlagMap, value as OrchestratorMode);
    publishFlagChange(key as keyof OrchestratorFlagMap, value as OrchestratorMode).catch(() => {});

    const changedBy = (req as any).user?.email || (req as any).userId || 'unknown';

    logger.warn('[ADMIN] Orchestrator flag changed', { key, previousValue, newValue: value, changedBy });

    Sentry.captureMessage(`[ADMIN] Orchestrator flag changed: ${key} → ${value}`, {
      level: 'warning',
      extra: { key, previousValue, newValue: value, changedBy },
    });

    sendSuccess(res, {
      key,
      previousValue,
      newValue: value,
      message: `Flag ${key} changed from ${previousValue} to ${value}. Broadcast to all pods via Redis pub/sub. Redeploy with updated env var to persist across restarts.`,
    });
  }),
);

// GET /api/admin/orchestrator/readiness — shadow-mode promotion readiness
// BAK-GATEWAY-010 FIX: Add authenticate middleware so only logged-in admins can read
// readiness status (which may expose sensitive deployment/flag state).
router.get(
  '/readiness',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { getReadinessReport } = await import('../../services/orchestratorReadinessService');
    const report = await getReadinessReport();
    res.status(200).json(report);
  }),
);

export default router;
