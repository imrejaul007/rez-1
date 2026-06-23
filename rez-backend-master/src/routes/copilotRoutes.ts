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

// TODO: Implement copilot routes when AI Copilot service is ready
// - Chat endpoints
// - Support ticket routing
// - AI assistance

export default router;
