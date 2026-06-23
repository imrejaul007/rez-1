/**
 * Order Controller — barrel re-export file.
 *
 * The actual handler implementations live in focused sub-controllers:
 *   - orderCreateController.ts   — order creation, validation, placement
 *   - orderQueryController.ts    — get order(s), search, filter, list, stats, financial
 *   - orderUpdateController.ts   — status updates, rating
 *   - orderCancelController.ts   — cancellation, refund flows
 *   - orderTrackingController.ts — tracking / delivery status
 *   - orderReorderController.ts  — reorder, frequently ordered, suggestions
 *
 * This file re-exports everything so that existing route imports
 *   `from '../controllers/orderController'`
 * continue to work without modification.
 */

// ─── Order Creation ─────────────────────────────────────────────────────────
export { createOrder } from './orderCreateController';

// Shared helpers also exported for use in other controllers (e.g. orderUpdateController)
export {
  VALID_CATEGORY_SLUGS,
  getCategoryRootMap,
  getStoreCategorySlug,
} from './orderCreateController';

// ─── Order Queries ──────────────────────────────────────────────────────────
export {
  getUserOrders,
  getOrderCounts,
  getOrderById,
  getOrderStats,
  getOrderFinancialDetails,
} from './orderQueryController';

// ─── Order Status Updates & Rating ──────────────────────────────────────────
export {
  updateOrderStatus,
  rateOrder,
} from './orderUpdateController';

// ─── Order Cancellation & Refunds ───────────────────────────────────────────
export {
  cancelOrder,
  requestRefund,
  getUserRefunds,
  getRefundDetails,
} from './orderCancelController';

// ─── Order Tracking ─────────────────────────────────────────────────────────
export { getOrderTracking } from './orderTrackingController';

// ─── Reorder ────────────────────────────────────────────────────────────────
export {
  reorderFullOrder,
  reorderItems,
  validateReorder,
  getFrequentlyOrdered,
  getReorderSuggestions,
} from './orderReorderController';
