// @ts-nocheck
/**
 * personaHomepageRoutes.ts
 *
 * Persona-specific homepage data endpoints.
 *
 * Mount point: /api/homepage  (alongside existing homepageRoutes)
 *
 * Student endpoints:
 *   GET /api/homepage/campus-trending   — trending merchants near campus (24h student bookings)
 *   GET /api/homepage/student-utility   — utility services near campus (stationery/xerox/laundry/PG)
 *   GET /api/homepage/student-packs     — micro prepaid packs (₹49 / ₹79 / ₹99)
 *
 * Employee endpoints:
 *   GET /api/homepage/lunch-deals       — lunch deals (11 AM–2 PM window filter)
 *   GET /api/homepage/after-work        — after-work dining/social options
 *   GET /api/homepage/value-packs       — premium packs (₹999 / ₹1500 / ₹1999)
 *
 * All routes:
 *   • Require authentication (authenticate middleware)
 *   • Use geo queries with persona-appropriate radius
 *   • Filter by relevant categories
 *   • Sort by persona ranking weights
 *   • Return max 20 items per section
 *
 * Dependency: personaResolverService is created by Agent 1.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
// Dependency: personaResolverService is created by Agent 1
import personaResolverService from '../services/personaResolverService';

const router = Router();

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RESULTS = 20;

// Student persona
const STUDENT_CAMPUS_RADIUS_METERS = 3000; // 3 km
const STUDENT_UTILITY_CATEGORIES = [
  'stationery',
  'xerox',
  'laundry',
  'pg-mess',
  'student-utility',
  'photocopy',
  'tiffin',
];

// Employee persona
const EMPLOYEE_OFFICE_RADIUS_METERS = 5000; // 5 km
const LUNCH_HOURS_START = 11; // IST
const LUNCH_HOURS_END = 14; // IST
const EMPLOYEE_LUNCH_CATEGORIES = ['restaurant', 'cafe', 'lunch-deals', 'food', 'dining', 'canteen'];
const EMPLOYEE_AFTER_WORK_CATEGORIES = [
  'after-work-dining',
  'bar',
  'cafe',
  'fitness',
  'wellness',
  'spa',
  'social',
  'entertainment',
  'pub',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the current IST hour (0–23). */
function currentISTHour(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % (24 * 60);
  return Math.floor(istMinutes / 60);
}

/** Parse lat/lng from request query, returns undefined on invalid input. */
function parseLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | undefined {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return undefined;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return undefined;
  return { lat: latNum, lng: lngNum };
}

/** Build a standard $nearSphere geo query against Store.location.coordinates. */
function buildNearSphereQuery(lng: number, lat: number, maxDistanceMeters: number): Record<string, unknown> {
  return {
    $nearSphere: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: maxDistanceMeters,
    },
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/homepage/campus-trending
 * Trending merchants near campus, sorted by student bookings in last 24h.
 *
 * Query params:
 *   campusId (optional) — campus object ID for campus-anchor geo lookup
 *   lat, lng            — user/campus location (required if campusId not supplied)
 */
router.get(
  '/campus-trending',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { campusId, lat, lng } = req.query;

    // Resolve persona — only students should access this, but we don't hard-block others
    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch (err) {
      logger.warn('[PersonaHomepage] campus-trending: persona resolution failed', {
        userId,
        error: (err as Error).message,
      });
    }

    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return sendBadRequest(res, 'Valid lat and lng query parameters are required');
    }

    try {
      const Store = mongoose.model('Store');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Trending = isActive stores near campus with highest student booking count in last 24h.
      // studentBookings24h is a denormalised counter updated by the bookings service.
      const stores = await Store.find({
        isActive: true,
        'location.coordinates': buildNearSphereQuery(coords.lng, coords.lat, STUDENT_CAMPUS_RADIUS_METERS),
        // Prefer stores with recent student activity
        $or: [{ studentBookings24h: { $gt: 0 } }, { activeOffersCount: { $gt: 0 } }],
      })
        .select('_id name slug logo description location ratings activeOffersCount studentBookings24h tags category')
        .sort({ studentBookings24h: -1, 'ratings.average': -1 })
        .limit(MAX_RESULTS)
        .lean();

      logger.info('[PersonaHomepage] campus-trending', {
        userId,
        personaId,
        campusId: campusId || 'none',
        resultsCount: stores.length,
      });

      return sendSuccess(
        res,
        {
          section: 'campus-trending',
          persona: personaId,
          items: stores,
          total: stores.length,
        },
        'Campus trending merchants fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] campus-trending error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch campus trending merchants', 500);
    }
  }),
);

/**
 * GET /api/homepage/student-utility
 * Utility services near campus (stationery, xerox, laundry, PG mess, etc.)
 *
 * Query params: lat, lng (required)
 */
router.get(
  '/student-utility',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { lat, lng } = req.query;
    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return sendBadRequest(res, 'Valid lat and lng query parameters are required');
    }

    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch {
      /* non-fatal */
    }

    try {
      const Store = mongoose.model('Store');

      const stores = await Store.find({
        isActive: true,
        'location.coordinates': buildNearSphereQuery(coords.lng, coords.lat, STUDENT_CAMPUS_RADIUS_METERS),
        tags: { $in: STUDENT_UTILITY_CATEGORIES },
      })
        .select('_id name slug logo description location ratings activeOffersCount tags category')
        .sort({ 'ratings.average': -1, activeOffersCount: -1 })
        .limit(MAX_RESULTS)
        .lean();

      logger.info('[PersonaHomepage] student-utility', {
        userId,
        personaId,
        resultsCount: stores.length,
      });

      return sendSuccess(
        res,
        {
          section: 'student-utility',
          persona: personaId,
          items: stores,
          total: stores.length,
        },
        'Student utility services fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] student-utility error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch student utility services', 500);
    }
  }),
);

/**
 * GET /api/homepage/student-packs
 * Micro prepaid packs (₹49 / ₹79 / ₹99) available to students.
 */
router.get(
  '/student-packs',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch {
      /* non-fatal */
    }

    try {
      // Student micro packs are stored in the Pack / Subscription model.
      // We query dynamically so pack definitions can be managed via admin.
      let Pack: mongoose.Model<any> | null = null;
      try {
        Pack = mongoose.model('Pack');
      } catch {
        // Model not yet registered in this context — return empty
      }

      const STUDENT_PACK_PRICES = [49, 79, 99];
      let packs: any[] = [];

      if (Pack) {
        packs = await Pack.find({
          isActive: true,
          targetPersona: { $in: ['student', 'all'] },
          price: { $in: STUDENT_PACK_PRICES },
        })
          .select('_id name description price benefits targetPersona validityDays')
          .sort({ price: 1 })
          .limit(MAX_RESULTS)
          .lean();
      }

      // Fallback: return static pack definitions when model is unavailable
      if (packs.length === 0) {
        packs = STUDENT_PACK_PRICES.map((price) => ({
          id: `student-pack-${price}`,
          name: `Student Starter Pack — ₹${price}`,
          description: `Essential savings for students at just ₹${price}`,
          price,
          targetPersona: 'student',
          benefits: ['Cashback on 5 transactions', 'Priority student offers'],
          validityDays: 30,
          isStatic: true,
        }));
      }

      logger.info('[PersonaHomepage] student-packs', { userId, personaId, packsCount: packs.length });

      return sendSuccess(
        res,
        {
          section: 'student-packs',
          persona: personaId,
          items: packs,
          total: packs.length,
        },
        'Student packs fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] student-packs error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch student packs', 500);
    }
  }),
);

/**
 * GET /api/homepage/lunch-deals
 * Lunch deals near office, filtered by 11 AM–2 PM IST time window.
 *
 * Query params: lat, lng (required)
 */
router.get(
  '/lunch-deals',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { lat, lng } = req.query;
    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return sendBadRequest(res, 'Valid lat and lng query parameters are required');
    }

    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch {
      /* non-fatal */
    }

    const istHour = currentISTHour();
    const isLunchWindow = istHour >= LUNCH_HOURS_START && istHour < LUNCH_HOURS_END;

    try {
      const Store = mongoose.model('Store');

      // Return lunch deals regardless of current time so the section can pre-populate.
      // Callers can use the `isLunchWindowActive` flag to show/hide the section in the app.
      const stores = await Store.find({
        isActive: true,
        'location.coordinates': buildNearSphereQuery(coords.lng, coords.lat, EMPLOYEE_OFFICE_RADIUS_METERS),
        tags: { $in: EMPLOYEE_LUNCH_CATEGORIES },
        activeOffersCount: { $gt: 0 },
      })
        .select('_id name slug logo description location ratings activeOffersCount bestOfferAmount tags category')
        .sort({ bestOfferAmount: -1, 'ratings.average': -1 })
        .limit(MAX_RESULTS)
        .lean();

      logger.info('[PersonaHomepage] lunch-deals', {
        userId,
        personaId,
        isLunchWindowActive: isLunchWindow,
        resultsCount: stores.length,
      });

      return sendSuccess(
        res,
        {
          section: 'lunch-deals',
          persona: personaId,
          isLunchWindowActive: isLunchWindow,
          items: stores,
          total: stores.length,
        },
        'Lunch deals fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] lunch-deals error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch lunch deals', 500);
    }
  }),
);

/**
 * GET /api/homepage/after-work
 * After-work dining/social options near office.
 *
 * Query params: lat, lng (required)
 */
router.get(
  '/after-work',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { lat, lng } = req.query;
    const coords = parseLatLng(lat, lng);
    if (!coords) {
      return sendBadRequest(res, 'Valid lat and lng query parameters are required');
    }

    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch {
      /* non-fatal */
    }

    try {
      const Store = mongoose.model('Store');

      const stores = await Store.find({
        isActive: true,
        'location.coordinates': buildNearSphereQuery(coords.lng, coords.lat, EMPLOYEE_OFFICE_RADIUS_METERS),
        tags: { $in: EMPLOYEE_AFTER_WORK_CATEGORIES },
      })
        .select('_id name slug logo description location ratings activeOffersCount tags category')
        .sort({ 'ratings.average': -1, activeOffersCount: -1 })
        .limit(MAX_RESULTS)
        .lean();

      logger.info('[PersonaHomepage] after-work', {
        userId,
        personaId,
        resultsCount: stores.length,
      });

      return sendSuccess(
        res,
        {
          section: 'after-work',
          persona: personaId,
          items: stores,
          total: stores.length,
        },
        'After-work options fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] after-work error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch after-work options', 500);
    }
  }),
);

/**
 * GET /api/homepage/value-packs
 * Employee premium packs (₹999 / ₹1500 / ₹1999).
 */
router.get(
  '/value-packs',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString() || (req as any).userId;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    let personaId: 'student' | 'employee' | 'general' = 'general';
    try {
      const persona = await personaResolverService.resolvePersona(userId);
      personaId = persona.personaId;
    } catch {
      /* non-fatal */
    }

    try {
      let Pack: mongoose.Model<any> | null = null;
      try {
        Pack = mongoose.model('Pack');
      } catch {
        // Model not yet registered
      }

      const EMPLOYEE_PACK_PRICES = [999, 1500, 1999];
      let packs: any[] = [];

      if (Pack) {
        packs = await Pack.find({
          isActive: true,
          targetPersona: { $in: ['employee', 'corporate', 'all'] },
          price: { $in: EMPLOYEE_PACK_PRICES },
        })
          .select('_id name description price benefits targetPersona validityDays')
          .sort({ price: 1 })
          .limit(MAX_RESULTS)
          .lean();
      }

      // Fallback: return static pack definitions when model is unavailable
      if (packs.length === 0) {
        const packDetails: Record<number, { name: string; description: string; benefits: string[] }> = {
          999: {
            name: 'Value Pack — ₹999',
            description: 'Great savings for busy professionals',
            benefits: ['10% cashback on dining', '₹200 wellness voucher', 'Priority booking'],
          },
          1500: {
            name: 'Premium Pack — ₹1500',
            description: 'Premium perks for the discerning professional',
            benefits: ['15% cashback on dining', '₹500 wellness voucher', 'Lounge access x2'],
          },
          1999: {
            name: 'Elite Pack — ₹1999',
            description: 'Elite benefits for top earners',
            benefits: ['20% cashback on dining', '₹1000 wellness voucher', 'Concierge service'],
          },
        };

        packs = EMPLOYEE_PACK_PRICES.map((price) => ({
          id: `employee-pack-${price}`,
          ...packDetails[price],
          price,
          targetPersona: 'employee',
          validityDays: 30,
          isStatic: true,
        }));
      }

      logger.info('[PersonaHomepage] value-packs', { userId, personaId, packsCount: packs.length });

      return sendSuccess(
        res,
        {
          section: 'value-packs',
          persona: personaId,
          items: packs,
          total: packs.length,
        },
        'Value packs fetched successfully',
      );
    } catch (err) {
      logger.error('[PersonaHomepage] value-packs error', { error: (err as Error).message });
      return sendError(res, 'Failed to fetch value packs', 500);
    }
  }),
);

export default router;
