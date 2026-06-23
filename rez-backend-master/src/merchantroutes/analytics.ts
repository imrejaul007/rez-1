/**
 * Analytics Routes (Phase 6.3 — split from monolithic analytics.ts)
 *
 * Composes analytics endpoints from 3 sub-routers. All routes are mounted at
 * `/api/merchant/analytics` by config/routes.ts.
 *
 * Sections:
 * - analyticsCore.ts — sales, products, customers, inventory, payments, forecast, trends, cache
 * - analyticsOverview.ts — overview, products/performance, revenue, comparison, realtime
 * - analyticsExport.ts — export, customers/segments, offers/top, customers/list
 *
 * Shared helpers (calculateTrend, calculateGrowth, getStoreId, parseDateRange)
 * live in analyticsHelpers.ts.
 */

import { Router } from 'express';
import analyticsCoreRoutes from './analyticsCore';
import analyticsOverviewRoutes from './analyticsOverview';
import analyticsExportRoutes from './analyticsExport';

const router = Router();

// All routes require authentication (already applied per-sub-router)
router.use(analyticsCoreRoutes);
router.use(analyticsOverviewRoutes);
router.use(analyticsExportRoutes);

export default router;