/**
 * Product Routes (Phase 6.3 — split from monolithic products.ts)
 *
 * Composes merchant product endpoints from 3 sub-routers. All routes are mounted
 * at `/api/merchant/products` by config/routes.ts.
 *
 * Sections:
 * - productsReadRoutes.ts — GET /, GET /validate-sku, GET /categories, GET /:id, GET /:id/variants, GET /:id/reviews
 * - productsWriteRoutes.ts — POST /, PUT /:id, DELETE /:id, POST/PUT/DELETE /:id/variants
 * - productsBulkRoutes.ts — POST /bulk, POST /bulk-action, user-side product sync
 *
 * Shared Joi schemas and generateSKU helper live in productsHelpers.ts.
 */

import { Router } from 'express';
import productsReadRoutes from './productsReadRoutes';
import productsWriteRoutes from './productsWriteRoutes';
import productsBulkRoutes from './productsBulkRoutes';

const router = Router();

// All routes require authentication (already applied per-sub-router)
router.use(productsReadRoutes);
router.use(productsWriteRoutes);
router.use(productsBulkRoutes);

export default router;