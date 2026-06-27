/**
 * copilotRoutes.ts - Stub file for Copilot service routes
 *
 * This is a placeholder for the AI Copilot service integration.
 * Currently not implemented - to be added in future.
 */

import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'copilot' });
});

// Copilot service not implemented - returning 501 Not Implemented
router.use((req, res, next) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'AI Copilot service is not yet available',
    service: 'copilot'
  });
});

export default router;
