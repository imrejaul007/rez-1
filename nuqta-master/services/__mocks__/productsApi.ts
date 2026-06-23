// Manual Jest mock for `@/services/productsApi`.
//
// When tests do `jest.mock('@/services/productsApi')` without a factory,
// Jest would normally auto-mock every method as a `jest.fn()` returning
// `undefined`. That breaks integration tests that call e.g.
// `productsApi.getProductById(id)` and then expect a real
// `{ success, data }` envelope back.
//
// To support those tests while still honoring the per-test
// `apiClient.get` / `apiClient.post` mocks (which the test file sets
// up via `jest.mock('@/services/apiClient')`), the manual mock
// delegates each public method to the matching `apiClient` call. That
// way the test-level `mockResolvedValueOnce` on `apiClient.get` flows
// through to the productsApi result.

// Use a require here so the manual mock can resolve the auto-mocked
// `apiClient` from the test's jest.mock setup.
const apiClient = require('../apiClient').default;

const productsApi = {
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response;
  },

  async getCategories() {
    return apiClient.get('/products/categories');
  },

  async getHomepageProducts() {
    return apiClient.get('/products/homepage');
  },

  async getFeaturedProducts(limit = 10) {
    return apiClient.get('/products/featured', { limit });
  },

  async searchProducts(query) {
    return apiClient.get('/products/search', query);
  },

  async getProducts(params) {
    return apiClient.get('/products', params);
  },

  async getTrendingProducts(limit = 10) {
    return apiClient.get('/products/trending', { limit });
  },

  async getRecommendations(productId, limit = 10) {
    return apiClient.get(`/products/${productId}/recommendations`, { limit });
  },

  async getRelatedProducts(productId, limit = 10) {
    return apiClient.get(`/products/${productId}/related`, { limit });
  },

  async addProductReview(productId, review) {
    return apiClient.post(`/products/${productId}/reviews`, review);
  },

  async getProductReviews(productId, params) {
    return apiClient.get(`/products/${productId}/reviews`, params);
  },

  async toggleWishlist(productId) {
    return apiClient.post(`/products/${productId}/wishlist`);
  },

  async reportProduct(productId, reason) {
    return apiClient.post(`/products/${productId}/report`, { reason });
  },

  async shareProduct(productId, channel) {
    return apiClient.post(`/products/${productId}/share`, { channel });
  },

  async getProductAvailability(productId, params) {
    return apiClient.get(`/products/${productId}/availability`, params);
  },

  async getProductVariants(productId) {
    return apiClient.get(`/products/${productId}/variants`);
  },

  async compareProducts(productIds) {
    return apiClient.post('/products/compare', { productIds });
  },
};

module.exports = productsApi;
module.exports.default = productsApi;
module.exports.productsApi = productsApi;
