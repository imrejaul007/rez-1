import express from 'express';
import {
  globalSearch,
  clearSearchCache,
  getAutocomplete,
  searchProductsGrouped,
  aiSearch,
  saveSearchHistory,
  getSearchHistory,
  getPopularSearches,
  getRecentSearches,
  markSearchAsClicked,
  deleteSearchHistory,
  clearSearchHistory,
  getSearchAnalytics,
  getDidYouMean,
} from '../controllers/searchController';
import { protect, optionalAuth } from '../middleware/auth';
import { searchLimiter, aiSearchLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// ============================================
// GLOBAL SEARCH ROUTES
// ============================================

/**
 * @route   GET /api/search/global
 * @desc    Global search across products, stores, and articles
 * @access  Public
 * @query   q - Search query (required)
 * @query   types - Comma-separated list: products,stores,articles (optional, default: all)
 * @query   limit - Results per type (optional, default: 10, max: 50)
 *
 * @example
 * GET /api/search/global?q=pizza
 * GET /api/search/global?q=pizza&types=products,stores
 * GET /api/search/global?q=pizza&types=products&limit=20
 */
router.get('/global', searchLimiter, globalSearch);

/**
 * @route   POST /api/search/cache/clear
 * @desc    Clear search cache (admin only)
 * @access  Protected
 */
router.post('/cache/clear', protect, clearSearchCache);

/**
 * @route   GET /api/search/autocomplete
 * @desc    Enhanced autocomplete with products, stores, categories, and brands
 * @access  Public
 * @query   q - Search query (min 2 characters, required)
 *
 * @example
 * GET /api/search/autocomplete?q=pi
 * 
 * @response
 * {
 *   "success": true,
 *   "data": {
 *     "products": [{ "_id": "...", "name": "...", "price": 999, "image": "...", "store": { "name": "..." } }],
 *     "stores": [{ "_id": "...", "name": "...", "logo": "..." }],
 *     "categories": [{ "_id": "...", "name": "..." }],
 *     "brands": ["Nike", "Adidas"]
 *   }
 * }
 */
router.get('/autocomplete', searchLimiter, getAutocomplete);

/**
 * @route   GET /api/search/products-grouped
 * @desc    Search products grouped by name with seller comparison
 * @access  Public
 * @query   q - Search query (required)
 * @query   limit - Maximum products to return (optional, default: 20, max: 50)
 * @query   lat - User latitude for distance calculation (optional)
 * @query   lon - User longitude for distance calculation (optional)
 *
 * @example
 * GET /api/search/products-grouped?q=iphone%2014
 * GET /api/search/products-grouped?q=iphone%2014&limit=10&lat=12.9716&lon=77.5946
 */
router.get('/products-grouped', searchLimiter, searchProductsGrouped);

/**
 * @route   GET /api/search/ai-search
 * @desc    AI-powered natural language search
 * @access  Public
 * @query   q - Natural language search query (required)
 */
router.get('/ai-search', aiSearchLimiter, aiSearch);

/**
 * @route   GET /api/search/did-you-mean
 * @desc    Typo correction suggestions based on popular search terms
 * @access  Public
 * @query   q - Misspelled search query (min 3 chars)
 *
 * @example
 * GET /api/search/did-you-mean?q=shamppo
 */
router.get('/did-you-mean', searchLimiter, getDidYouMean);

// ============================================
// SEARCH HISTORY ROUTES
// ============================================

/**
 * @route   POST /api/search/history
 * @desc    Save search query to history
 * @access  Protected
 * @body    query - Search query (required)
 * @body    type - Search type: product, store, general (optional, default: general)
 * @body    resultCount - Number of results returned (optional)
 * @body    filters - Search filters applied (optional)
 *
 * @example
 * POST /api/search/history
 * { "query": "pizza", "type": "product", "resultCount": 15 }
 */
router.post('/history', protect, saveSearchHistory);

/**
 * @route   GET /api/search/history
 * @desc    Get user's search history
 * @access  Protected
 * @query   type - Filter by search type: product, store, general (optional)
 * @query   page - Page number (optional, default: 1)
 * @query   limit - Results per page (optional, default: 20, max: 100)
 * @query   includeClicked - Include clicked searches (optional, default: true)
 *
 * @example
 * GET /api/search/history?type=product&limit=10
 */
router.get('/history', protect, getSearchHistory);

/**
 * @route   GET /api/search/history/popular
 * @desc    Get popular/frequent searches for autocomplete (works with or without auth)
 * @access  Public (optional auth for personalized results)
 * @query   limit - Maximum results (optional, default: 10, max: 20)
 * @query   type - Filter by type (optional)
 *
 * @example
 * GET /api/search/history/popular?limit=5
 */
router.get('/history/popular', optionalAuth, getPopularSearches);

/**
 * @route   GET /api/search/history/recent
 * @desc    Get recent unique searches for autocomplete
 * @access  Protected
 * @query   limit - Maximum results (optional, default: 5, max: 10)
 * @query   type - Filter by type (optional)
 *
 * @example
 * GET /api/search/history/recent?limit=5
 */
router.get('/history/recent', protect, getRecentSearches);

/**
 * @route   GET /api/search/history/analytics
 * @desc    Get search analytics for user
 * @access  Protected
 *
 * @example
 * GET /api/search/history/analytics
 */
router.get('/history/analytics', protect, getSearchAnalytics);

/**
 * @route   PATCH /api/search/history/:id/click
 * @desc    Mark search as clicked
 * @access  Protected
 * @params  id - Search history ID
 * @body    itemId - Clicked item ID (required)
 * @body    itemType - Item type: product or store (required)
 *
 * @example
 * PATCH /api/search/history/507f1f77bcf86cd799439011/click
 * { "itemId": "507f191e810c19729de860ea", "itemType": "product" }
 */
router.patch('/history/:id/click', protect, markSearchAsClicked);

/**
 * @route   DELETE /api/search/history/:id
 * @desc    Delete specific search history entry
 * @access  Protected
 * @params  id - Search history ID
 *
 * @example
 * DELETE /api/search/history/507f1f77bcf86cd799439011
 */
router.delete('/history/:id', protect, deleteSearchHistory);

/**
 * @route   DELETE /api/search/history
 * @desc    Clear all search history for user
 * @access  Protected
 * @query   type - Filter by type to clear only specific type (optional)
 *
 * @example
 * DELETE /api/search/history
 * DELETE /api/search/history?type=product
 */
router.delete('/history', protect, clearSearchHistory);

export default router;
