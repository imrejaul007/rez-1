import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  HEALTH_URL,
  STRESS_THRESHOLDS,
  defaultHeaders,
  TEST_DATA,
  randomItem,
} from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const apiCalls = new Counter('api_calls');
const slowResponses = new Counter('slow_responses');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp to 100 VUs
    { duration: '3m', target: 100 },  // Hold at 100 VUs
    { duration: '1m', target: 200 },  // Ramp to 200 VUs
    { duration: '2m', target: 200 },  // Hold at 200 VUs
    { duration: '1m', target: 300 },  // Ramp to 300 VUs (stress)
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...STRESS_THRESHOLDS,
    errors: ['rate<0.10'],
    response_time: ['p(95)<1000'],
    slow_responses: ['count<500'],
  },
};

// Track response and flag slow ones (>1s)
function trackResponse(res, checkName) {
  responseTime.add(res.timings.duration);
  apiCalls.add(1);
  if (res.timings.duration > 1000) {
    slowResponses.add(1);
  }
  const passed = check(res, {
    [`${checkName}: status OK`]: (r) => r.status >= 200 && r.status < 500,
  });
  errorRate.add(!passed);
  return passed;
}

// ----- Scenario: Heavy Browse -----
function heavyBrowse() {
  const headers = defaultHeaders();

  group('Stress: Heavy Browse', () => {
    // Homepage
    let res = http.get(`${BASE_URL}/homepage`, {
      headers,
      tags: { name: 'GET /api/homepage' },
    });
    trackResponse(res, 'homepage');
    sleep(0.5 + Math.random());

    // Categories
    res = http.get(`${BASE_URL}/categories/featured`, {
      headers,
      tags: { name: 'GET /api/categories/featured' },
    });
    trackResponse(res, 'categories featured');
    sleep(0.5 + Math.random());

    // Root categories
    res = http.get(`${BASE_URL}/categories/root`, {
      headers,
      tags: { name: 'GET /api/categories/root' },
    });
    trackResponse(res, 'categories root');
    sleep(0.5 + Math.random());

    // Trending stores
    res = http.get(`${BASE_URL}/stores/trending?limit=20`, {
      headers,
      tags: { name: 'GET /api/stores/trending' },
    });
    trackResponse(res, 'stores trending');
    sleep(0.5 + Math.random());

    // Featured stores
    res = http.get(`${BASE_URL}/stores/featured?limit=10`, {
      headers,
      tags: { name: 'GET /api/stores/featured' },
    });
    trackResponse(res, 'stores featured');
    sleep(0.5 + Math.random());

    // Top cashback stores
    res = http.get(`${BASE_URL}/stores/top-cashback?limit=10`, {
      headers,
      tags: { name: 'GET /api/stores/top-cashback' },
    });
    trackResponse(res, 'stores top-cashback');
    sleep(0.5 + Math.random());

    // New stores
    res = http.get(`${BASE_URL}/stores/new?limit=4`, {
      headers,
      tags: { name: 'GET /api/stores/new' },
    });
    trackResponse(res, 'stores new');
    sleep(0.5 + Math.random());

    // Trending videos
    res = http.get(`${BASE_URL}/videos/trending?limit=20`, {
      headers,
      tags: { name: 'GET /api/videos/trending' },
    });
    trackResponse(res, 'videos trending');
    sleep(0.5 + Math.random());

    // Videos by category
    const videoCategory = randomItem(TEST_DATA.videoCategories);
    res = http.get(`${BASE_URL}/videos/category/${videoCategory}?limit=20`, {
      headers,
      tags: { name: 'GET /api/videos/category/:category' },
    });
    trackResponse(res, `videos category ${videoCategory}`);
    sleep(0.5 + Math.random());

    // Explore stats
    res = http.get(`${BASE_URL}/explore/live-stats`, {
      headers,
      tags: { name: 'GET /api/explore/live-stats' },
    });
    trackResponse(res, 'explore live-stats');
    sleep(0.5 + Math.random());

    // Explore stats summary
    res = http.get(`${BASE_URL}/explore/stats-summary`, {
      headers,
      tags: { name: 'GET /api/explore/stats-summary' },
    });
    trackResponse(res, 'explore stats-summary');
    sleep(0.5);
  });
}

// ----- Scenario: Heavy Search -----
function heavySearch() {
  const headers = defaultHeaders();

  group('Stress: Heavy Search', () => {
    const query = randomItem(TEST_DATA.searchQueries);

    // Autocomplete
    let res = http.get(`${BASE_URL}/search/autocomplete?q=${encodeURIComponent(query.substring(0, 2))}`, {
      headers,
      tags: { name: 'GET /api/search/autocomplete' },
    });
    trackResponse(res, 'autocomplete partial');
    sleep(0.3);

    res = http.get(`${BASE_URL}/search/autocomplete?q=${encodeURIComponent(query)}`, {
      headers,
      tags: { name: 'GET /api/search/autocomplete' },
    });
    trackResponse(res, 'autocomplete full');
    sleep(0.5 + Math.random());

    // Global search
    res = http.get(`${BASE_URL}/search/global?q=${encodeURIComponent(query)}`, {
      headers,
      tags: { name: 'GET /api/search/global' },
    });
    trackResponse(res, 'global search');
    sleep(0.5 + Math.random());

    // Store search
    res = http.get(`${BASE_URL}/stores/search?q=${encodeURIComponent(query)}`, {
      headers,
      tags: { name: 'GET /api/stores/search' },
    });
    trackResponse(res, 'store search');
    sleep(0.5 + Math.random());

    // Video search
    res = http.get(`${BASE_URL}/videos/search?q=${encodeURIComponent(query)}`, {
      headers,
      tags: { name: 'GET /api/videos/search' },
    });
    trackResponse(res, 'video search');
    sleep(0.5 + Math.random());

    // Advanced store search
    res = http.get(`${BASE_URL}/stores/search/advanced?search=${encodeURIComponent(query)}&sortBy=rating`, {
      headers,
      tags: { name: 'GET /api/stores/search/advanced' },
    });
    trackResponse(res, 'advanced store search');
    sleep(0.5);
  });
}

// ----- Scenario: Heavy Store Detail -----
function heavyStoreDetail() {
  const headers = defaultHeaders();

  group('Stress: Heavy Store Detail', () => {
    // List stores and pick one to drill into
    const listRes = http.get(`${BASE_URL}/stores?limit=10&sortBy=rating`, {
      headers,
      tags: { name: 'GET /api/stores' },
    });
    trackResponse(listRes, 'stores list');

    let storeId = null;
    try {
      const body = JSON.parse(listRes.body);
      const stores = body.data?.stores || body.data || [];
      if (stores.length > 0) {
        storeId = (randomItem(stores))._id || (randomItem(stores)).id;
      }
    } catch (e) {
      // fallback to slug-based
    }

    sleep(0.5 + Math.random());

    if (storeId) {
      // Store detail
      let res = http.get(`${BASE_URL}/stores/${storeId}`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId' },
      });
      trackResponse(res, 'store detail');
      sleep(0.5 + Math.random());

      // Store products
      res = http.get(`${BASE_URL}/stores/${storeId}/products?limit=20`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/products' },
      });
      trackResponse(res, 'store products');
      sleep(0.5 + Math.random());

      // Store reviews
      res = http.get(`${BASE_URL}/stores/${storeId}/reviews?limit=10`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/reviews' },
      });
      trackResponse(res, 'store reviews');
      sleep(0.5 + Math.random());

      // Store status
      res = http.get(`${BASE_URL}/stores/${storeId}/status`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/status' },
      });
      trackResponse(res, 'store status');
      sleep(0.5 + Math.random());

      // Store followers count
      res = http.get(`${BASE_URL}/stores/${storeId}/followers/count`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/followers/count' },
      });
      trackResponse(res, 'store followers count');
      sleep(0.5 + Math.random());

      // Store recent earnings
      res = http.get(`${BASE_URL}/stores/${storeId}/recent-earnings?limit=5`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/recent-earnings' },
      });
      trackResponse(res, 'store recent earnings');
    } else {
      // Fallback: browse categories
      const slug = randomItem(TEST_DATA.categorySlugs);
      const res = http.get(`${BASE_URL}/stores/by-category-slug/${slug}`, {
        headers,
        tags: { name: 'GET /api/stores/by-category-slug/:slug' },
      });
      trackResponse(res, 'stores by category slug');
    }

    sleep(0.5);
  });
}

// ----- Scenario: Explore Page Intensive -----
function exploreIntensive() {
  const headers = defaultHeaders();

  group('Stress: Explore Intensive', () => {
    // Live stats
    let res = http.get(`${BASE_URL}/explore/live-stats`, {
      headers,
      tags: { name: 'GET /api/explore/live-stats' },
    });
    trackResponse(res, 'explore live-stats');
    sleep(0.3 + Math.random() * 0.5);

    // Stats summary
    res = http.get(`${BASE_URL}/explore/stats-summary`, {
      headers,
      tags: { name: 'GET /api/explore/stats-summary' },
    });
    trackResponse(res, 'explore stats-summary');
    sleep(0.3 + Math.random() * 0.5);

    // Verified reviews
    res = http.get(`${BASE_URL}/explore/verified-reviews?limit=5`, {
      headers,
      tags: { name: 'GET /api/explore/verified-reviews' },
    });
    trackResponse(res, 'explore verified-reviews');
    sleep(0.3 + Math.random() * 0.5);

    // Featured comparison
    res = http.get(`${BASE_URL}/explore/featured-comparison`, {
      headers,
      tags: { name: 'GET /api/explore/featured-comparison' },
    });
    trackResponse(res, 'explore featured-comparison');
    sleep(0.3 + Math.random() * 0.5);

    // Popular searches
    res = http.get(`${BASE_URL}/search/history/popular?limit=10`, {
      headers,
      tags: { name: 'GET /api/search/history/popular' },
    });
    trackResponse(res, 'popular searches');
    sleep(0.3 + Math.random() * 0.5);

    // Cuisine counts
    res = http.get(`${BASE_URL}/stores/cuisine-counts`, {
      headers,
      tags: { name: 'GET /api/stores/cuisine-counts' },
    });
    trackResponse(res, 'cuisine counts');
    sleep(0.3 + Math.random() * 0.5);

    // Stores by tag
    const tags = ['halal', 'vegan', 'vegetarian'];
    const tag = randomItem(tags);
    res = http.get(`${BASE_URL}/stores/by-tag/${tag}?limit=20`, {
      headers,
      tags: { name: 'GET /api/stores/by-tag/:tag' },
    });
    trackResponse(res, `stores by tag: ${tag}`);
    sleep(0.5);
  });
}

// Main: distribute VUs across scenarios
export default function () {
  const selector = Math.random();

  if (selector < 0.3) {
    heavyBrowse();
  } else if (selector < 0.5) {
    heavySearch();
  } else if (selector < 0.7) {
    heavyStoreDetail();
  } else {
    exploreIntensive();
  }
}
