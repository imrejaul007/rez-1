/**
 * storeController.ts - Re-export hub for backward compatibility
 *
 * Split into:
 *   - storeCrudController.ts    — CRUD operations (create, update, delete, get)
 *   - storeSearchController.ts  — search, filter, discovery, nearby
 *   - storeQueryController.ts   — store details, listings, followers, earnings
 */

// ── CRUD Operations ──
export {
  getStores,
  getStoreById,
  getStoreProducts,
  getStoreOperatingStatus,
  getStoresByCategory,
  getStoreCategories,
  getStoresByCategorySlug,
} from './storeCrudController';

// ── Search, Filter, Discovery ──
export {
  getNearbyStores,
  getFeaturedStores,
  searchStores,
  searchStoresByCategory,
  searchStoresByDeliveryTime,
  advancedStoreSearch,
  getTrendingStores,
  getTopCashbackStores,
  getBNPLStores,
  getStoresByTag,
  getCuisineCounts,
  getStoresByServiceType,
} from './storeSearchController';

// ── Detail / Query / Followers / Earnings ──
export {
  getStoreFollowerCount,
  getStoreFollowers,
  sendFollowerNotification,
  notifyNewOffer,
  notifyNewProduct,
  getUserStoreVisits,
  getRecentEarnings,
  getNearbyStoresForHomepage,
  getNewStores,
} from './storeQueryController';
