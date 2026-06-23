// @ts-nocheck
/**
 * Persona Routes
 *
 * GET  /api/persona/me             — resolve the current user's persona
 * GET  /api/persona/feed-config    — get feed configuration for the current user
 * PUT  /api/persona/anchor-locations — update anchor locations (college / office / home)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendBadRequest, sendInternalError } from '../utils/response';
import personaResolverService from '../services/personaResolverService';
import PersonaProfile from '../models/PersonaProfile';
import { Types } from 'mongoose';
import { logger } from '../config/logger';

const router = Router();

// ============================================================================
// GET /api/persona/me
// Resolve the calling user's full persona snapshot.
// ============================================================================
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId || (req as any).user?._id?.toString();

    if (!userId) {
      return sendBadRequest(res, 'User ID could not be determined');
    }

    const persona = await personaResolverService.resolvePersona(userId);

    return sendSuccess(res, { persona }, 'Persona resolved successfully');
  }),
);

// ============================================================================
// GET /api/persona/feed-config
// Return only the feed configuration slice (lighter payload for the feed).
// ============================================================================
router.get(
  '/feed-config',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId || (req as any).user?._id?.toString();

    if (!userId) {
      return sendBadRequest(res, 'User ID could not be determined');
    }

    const persona = await personaResolverService.resolvePersona(userId);

    return sendSuccess(
      res,
      {
        personaId: persona.personaId,
        feedConfig: persona.feedConfig,
        rankingProfile: persona.rankingProfile,
      },
      'Feed configuration retrieved',
    );
  }),
);

// ============================================================================
// PUT /api/persona/anchor-locations
// Update a user's saved anchor locations (college / office / home).
// Body: { anchorLocations: [{ type, lat, lng, radius, label }] }
// ============================================================================
router.put(
  '/anchor-locations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId || (req as any).user?._id?.toString();

    if (!userId) {
      return sendBadRequest(res, 'User ID could not be determined');
    }

    const { anchorLocations } = req.body as {
      anchorLocations?: Array<{
        type: 'campus' | 'office' | 'home';
        lat: number;
        lng: number;
        radius: number;
        label?: string;
      }>;
    };

    if (!Array.isArray(anchorLocations)) {
      return sendBadRequest(res, 'anchorLocations must be an array');
    }

    const ALLOWED_TYPES = ['campus', 'office', 'home'];
    for (const loc of anchorLocations) {
      if (!ALLOWED_TYPES.includes(loc.type)) {
        return sendBadRequest(
          res,
          `Invalid anchor location type "${loc.type}". Must be one of: ${ALLOWED_TYPES.join(', ')}`,
        );
      }
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        return sendBadRequest(res, 'Each anchor location must have numeric lat and lng');
      }
      if (typeof loc.radius !== 'number' || loc.radius < 50 || loc.radius > 50000) {
        return sendBadRequest(res, 'radius must be a number between 50 and 50000 metres');
      }
    }

    try {
      await PersonaProfile.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: { anchorLocations },
          $setOnInsert: {
            primaryPersona: 'general',
            personaConfidence: 50,
            personaSource: 'default',
            lastResolvedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      // Invalidate persona cache so next request picks up new anchor locations
      await personaResolverService.invalidate(userId);

      logger.info('[PersonaRoutes] Anchor locations updated', {
        userId,
        count: anchorLocations.length,
      });

      return sendSuccess(res, { anchorLocations }, 'Anchor locations updated successfully');
    } catch (error) {
      logger.error('[PersonaRoutes] Failed to update anchor locations', { error });
      return sendInternalError(res, 'Failed to update anchor locations');
    }
  }),
);

export default router;
