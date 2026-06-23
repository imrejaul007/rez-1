/**
 * B-feature namespace router — REZ-vs-NUQTA migration (Phase 0)
 *
 * All endpoints ported from project B (REZ) into project A (NUQTA) live under
 * the `/api/b/*` prefix to keep them isolated from existing routes. This router
 * is mounted in src/config/routes.ts as:
 *
 *     app.use('/api/b', bRoutes);
 *
 * Every handler in this namespace MUST return the canonical Nuqta response
 * shape — use the helpers in `src/utils/bResponse.ts`:
 *
 *     { success: true, data: <payload>, message?: string }
 *     { success: false, error: <message>, ...details }
 *
 * Future B-feature routers should be sub-mounted here (e.g. `router.use('/foo', fooRoutes)`).
 */
import { Router } from 'express';
import { generalLimiter } from '../../middleware/rateLimiter';
import savingsBRoutes from './savings';
import nearbyBRoutes from './nearby';
import khataBRoutes from './khata';
import nearuBRoutes from './nearu';
import foryouBRoutes from './foryou';
import checkinBRoutes from './checkin';
import notifPrefsBRoutes from './notifPrefs';
import aiBRoutes from './ai';
import karmaBRoutes from './karma';
import tryBRoutes from './try';
import habixoBRoutes from './habixo';
import travelBRoutes from './travel';
import salonInfluencerBRoutes from './salonInfluencer';

const router = Router();

// Apply the standard rate limiter to every B-feature endpoint.
router.use(generalLimiter);

// Lightweight liveness probe used by the migration smoke test and by ops
// dashboards to verify the namespaced router is mounted and responsive.
router.get('/healthcheck', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      ok: true,
      timestamp: new Date().toISOString(),
      namespace: 'b',
      version: '0.1.0',
    },
  });
});

// TODO(migration): sub-mount future B-feature routers here, e.g.
//   router.use('/merchants', merchantBRoutes);
//   router.use('/offers', offerBRoutes);

// Savings Dashboard (Phase 0 port from REZ)
router.use('/savings', savingsBRoutes);

// Nearby Stores (Phase 1.5 — Map View)
router.use('/nearby', nearbyBRoutes);

// Khata / Split-Bill Ledger (Phase 2.4)
router.use('/khata', khataBRoutes);

// Near-U Discovery (Phase 2.3 — Hyperlocal verticals)
router.use('/nearu', nearuBRoutes);

// For-You-Today (Phase 3.3 — AI-curated daily feed)
router.use('/foryou', foryouBRoutes);

// Daily Check-In (Phase 3.1 — Tap-to-claim daily coin reward)
router.use('/checkin', checkinBRoutes);

// Notification Preferences (Phase 3.5 — Per-channel × per-category matrix)
router.use('/notif-prefs', notifPrefsBRoutes);

// AI Assistant (Phase 4.1 — Chat-only surface with keyword-mocked replies)
router.use('/ai', aiBRoutes);

// Karma (Phase 4.2 — Civic-impact: profile, missions, leaderboard, communities)
router.use('/karma', karmaBRoutes);

// Try module (Phase 4.3 — Trial purchases: products, bundles, bookings)
router.use('/try', tryBRoutes);

// Habixo (Phase 4.5 — Rental marketplace: stays, hourly, property, rent, match)
router.use('/habixo', habixoBRoutes);

// Travel (Phase 4.4 — Flights / hotels / trains / cabs / buses aggregation)
router.use('/travel', travelBRoutes);

// Salon + Influencer (Phase 4.6 + 4.7 — same sub-router serves both prefixes)
router.use('/salon', salonInfluencerBRoutes);
router.use('/influencer', salonInfluencerBRoutes);

export default router;