import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  HEALTH_URL,
  THRESHOLDS,
  defaultHeaders,
  authHeaders,
  AUTH_TOKEN,
  TEST_DATA,
  randomItem,
} from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const browseDuration = new Trend('browse_journey_duration');
const searchDuration = new Trend('search_journey_duration');
const storeDetailDuration = new Trend('store_detail_duration');
const apiCalls = new Counter('api_calls');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 VUs
    { duration: '3m', target: 50 },   // Hold at 50 VUs
    { duration: '1m', target: 100 },  // Ramp up to 100 VUs
    { duration: '2m', target: 100 },  // Hold at 100 VUs
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    ...THRESHOLDS,
    errors: ['rate<0.05'],
    browse_journey_duration: ['p(95)<800'],
    search_journey_duration: ['p(95)<1000'],
    store_detail_duration: ['p(95)<600'],
  },
};

// ----- User Journey 1: Browse & Discover -----
function browseJourney() {
  const headers = defaultHeaders();

  group('Journey: Browse & Discover', () => {
    // Step 1: Load homepage
    group('Load Homepage', () => {
      const res = http.get(`${BASE_URL}/homepage`, {
        headers,
        tags: { name: 'GET /api/homepage' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'homepage: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2); // Think time 1-3s

    // Step 2: Browse categories
    group('Browse Categories', () => {
      const res = http.get(`${BASE_URL}/categories/featured`, {
        headers,
        tags: { name: 'GET /api/categories/featured' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'categories featured: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 3: View trending stores
    group('View Trending Stores', () => {
      const res = http.get(`${BASE_URL}/stores/trending?limit=20`, {
        headers,
        tags: { name: 'GET /api/stores/trending' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'stores trending: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 4: View featured stores
    group('View Featured Stores', () => {
      const res = http.get(`${BASE_URL}/stores/featured?limit=10`, {
        headers,
        tags: { name: 'GET /api/stores/featured' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'stores featured: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 5: View new stores
    group('View New Stores', () => {
      const res = http.get(`${BASE_URL}/stores/new?limit=4`, {
        headers,
        tags: { name: 'GET /api/stores/new' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'stores new: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 6: View trending videos
    group('View Trending Videos', () => {
      const res = http.get(`${BASE_URL}/videos/trending?limit=20`, {
        headers,
        tags: { name: 'GET /api/videos/trending' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'videos trending: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 7: Explore live stats
    group('Explore Live Stats', () => {
      const res = http.get(`${BASE_URL}/explore/live-stats`, {
        headers,
        tags: { name: 'GET /api/explore/live-stats' },
      });
      browseDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'explore live-stats: status 200': (r) => r.status === 200,
      });
    });

    sleep(1);
  });
}

// ----- User Journey 2: Search -----
function searchJourney() {
  const headers = defaultHeaders();

  group('Journey: Search', () => {
    const query = randomItem(TEST_DATA.searchQueries);

    // Step 1: Autocomplete as user types
    group('Autocomplete', () => {
      // Simulate typing - send first 2 chars, then full query
      const partial = query.substring(0, 2);
      const res1 = http.get(`${BASE_URL}/search/autocomplete?q=${encodeURIComponent(partial)}`, {
        headers,
        tags: { name: 'GET /api/search/autocomplete' },
      });
      searchDuration.add(res1.timings.duration);
      apiCalls.add(1);
      check(res1, {
        'autocomplete partial: status 200': (r) => r.status === 200,
      });

      sleep(0.5);

      const res2 = http.get(`${BASE_URL}/search/autocomplete?q=${encodeURIComponent(query)}`, {
        headers,
        tags: { name: 'GET /api/search/autocomplete' },
      });
      searchDuration.add(res2.timings.duration);
      apiCalls.add(1);
      check(res2, {
        'autocomplete full: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random());

    // Step 2: Global search
    group('Global Search', () => {
      const res = http.get(`${BASE_URL}/search/global?q=${encodeURIComponent(query)}`, {
        headers,
        tags: { name: 'GET /api/search/global' },
      });
      searchDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'global search: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random());

    // Step 3: Search stores specifically
    group('Search Stores', () => {
      const res = http.get(`${BASE_URL}/stores/search?q=${encodeURIComponent(query)}`, {
        headers,
        tags: { name: 'GET /api/stores/search' },
      });
      searchDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'store search: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random());

    // Step 4: Search videos
    group('Search Videos', () => {
      const res = http.get(`${BASE_URL}/videos/search?q=${encodeURIComponent(query)}`, {
        headers,
        tags: { name: 'GET /api/videos/search' },
      });
      searchDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'video search: status 200': (r) => r.status === 200,
      });
    });

    sleep(1);
  });
}

// ----- User Journey 3: Store Detail -----
function storeDetailJourney() {
  const headers = defaultHeaders();

  group('Journey: Store Detail', () => {
    // Step 1: List stores
    group('List Stores', () => {
      const res = http.get(`${BASE_URL}/stores?limit=20&sortBy=rating`, {
        headers,
        tags: { name: 'GET /api/stores' },
      });
      apiCalls.add(1);

      const passed = check(res, {
        'stores list: status 200': (r) => r.status === 200,
      });

      // Try to extract a store ID for detail view
      if (passed) {
        try {
          const body = JSON.parse(res.body);
          const stores = body.data?.stores || body.data || [];
          if (stores.length > 0) {
            const store = randomItem(stores);
            const storeId = store._id || store.id;

            if (storeId) {
              sleep(1 + Math.random() * 2);

              // Step 2: View store detail
              group('View Store Detail', () => {
                const detailRes = http.get(`${BASE_URL}/stores/${storeId}`, {
                  headers,
                  tags: { name: 'GET /api/stores/:storeId' },
                });
                storeDetailDuration.add(detailRes.timings.duration);
                apiCalls.add(1);
                check(detailRes, {
                  'store detail: status 200': (r) => r.status === 200,
                });
              });

              sleep(1 + Math.random());

              // Step 3: View store products
              group('View Store Products', () => {
                const productsRes = http.get(`${BASE_URL}/stores/${storeId}/products?limit=20`, {
                  headers,
                  tags: { name: 'GET /api/stores/:storeId/products' },
                });
                storeDetailDuration.add(productsRes.timings.duration);
                apiCalls.add(1);
                check(productsRes, {
                  'store products: status 200 or 400': (r) => r.status === 200 || r.status === 400,
                });
              });

              sleep(1 + Math.random());

              // Step 4: View store reviews
              group('View Store Reviews', () => {
                const reviewsRes = http.get(`${BASE_URL}/stores/${storeId}/reviews?limit=10`, {
                  headers,
                  tags: { name: 'GET /api/stores/:storeId/reviews' },
                });
                storeDetailDuration.add(reviewsRes.timings.duration);
                apiCalls.add(1);
                check(reviewsRes, {
                  'store reviews: status 200 or 400': (r) => r.status === 200 || r.status === 400,
                });
              });
            }
          }
        } catch (e) {
          // Could not parse store list, skip detail steps
        }
      }
    });

    sleep(1);
  });
}

// ----- User Journey 4: Category Exploration -----
function categoryExplorationJourney() {
  const headers = defaultHeaders();

  group('Journey: Category Exploration', () => {
    // Step 1: Get category tree
    group('Category Tree', () => {
      const res = http.get(`${BASE_URL}/categories/tree`, {
        headers,
        tags: { name: 'GET /api/categories/tree' },
      });
      apiCalls.add(1);
      check(res, {
        'category tree: status 200': (r) => r.status === 200,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 2: Browse a specific category slug
    group('Category By Slug', () => {
      const slug = randomItem(TEST_DATA.categorySlugs);
      const res = http.get(`${BASE_URL}/categories/${slug}`, {
        headers,
        tags: { name: 'GET /api/categories/:slug' },
      });
      apiCalls.add(1);
      check(res, {
        'category by slug: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 3: Get stores by category slug
    group('Stores By Category Slug', () => {
      const slug = randomItem(TEST_DATA.categorySlugs);
      const res = http.get(`${BASE_URL}/stores/by-category-slug/${slug}?limit=20`, {
        headers,
        tags: { name: 'GET /api/stores/by-category-slug/:slug' },
      });
      apiCalls.add(1);
      check(res, {
        'stores by category: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(1 + Math.random() * 2);

    // Step 4: View products
    group('Featured Products', () => {
      const res = http.get(`${BASE_URL}/products/featured?limit=10`, {
        headers,
        tags: { name: 'GET /api/products/featured' },
      });
      apiCalls.add(1);
      check(res, {
        'featured products: status 200': (r) => r.status === 200,
      });
    });

    sleep(1);
  });
}

// Main function: distribute VUs across journeys
export default function () {
  const journeySelector = Math.random();

  if (journeySelector < 0.35) {
    browseJourney();
  } else if (journeySelector < 0.6) {
    searchJourney();
  } else if (journeySelector < 0.8) {
    storeDetailJourney();
  } else {
    categoryExplorationJourney();
  }
}
