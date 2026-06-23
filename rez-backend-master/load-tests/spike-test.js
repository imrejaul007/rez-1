import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  HEALTH_URL,
  SPIKE_THRESHOLDS,
  defaultHeaders,
  TEST_DATA,
  randomItem,
} from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const apiCalls = new Counter('api_calls');
const timeouts = new Counter('timeouts');
const recoveryTime = new Trend('recovery_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up with 10 VUs
    { duration: '10s', target: 500 },  // Spike! Jump to 500 VUs in 10s
    { duration: '30s', target: 500 },  // Hold at 500 VUs
    { duration: '30s', target: 10 },   // Drop back to 10 VUs
    { duration: '1m', target: 10 },    // Recovery period - hold at 10 VUs
  ],
  thresholds: {
    ...SPIKE_THRESHOLDS,
    errors: ['rate<0.15'],
    timeouts: ['count<100'],
  },
};

function trackResponse(res, label) {
  responseTime.add(res.timings.duration);
  apiCalls.add(1);

  if (res.timings.duration > 5000) {
    timeouts.add(1);
  }

  const passed = check(res, {
    [`${label}: not server error`]: (r) => r.status < 500,
    [`${label}: responded`]: (r) => r.status !== 0,
  });
  errorRate.add(!passed);
  return passed;
}

// Light user flow: simulates what most users do in a quick session
function quickBrowse() {
  const headers = defaultHeaders();

  group('Spike: Quick Browse', () => {
    // Health check
    const healthRes = http.get(HEALTH_URL, {
      headers,
      tags: { name: 'GET /health' },
      timeout: '10s',
    });
    trackResponse(healthRes, 'health');
    sleep(0.2);

    // Homepage
    const homeRes = http.get(`${BASE_URL}/homepage`, {
      headers,
      tags: { name: 'GET /api/homepage' },
      timeout: '10s',
    });
    trackResponse(homeRes, 'homepage');
    sleep(0.5 + Math.random());

    // Categories
    const catRes = http.get(`${BASE_URL}/categories/featured`, {
      headers,
      tags: { name: 'GET /api/categories/featured' },
      timeout: '10s',
    });
    trackResponse(catRes, 'categories featured');
    sleep(0.5 + Math.random());

    // Trending
    const trendRes = http.get(`${BASE_URL}/stores/trending?limit=10`, {
      headers,
      tags: { name: 'GET /api/stores/trending' },
      timeout: '10s',
    });
    trackResponse(trendRes, 'stores trending');
    sleep(0.5);
  });
}

// Medium user flow: browse + search
function browseAndSearch() {
  const headers = defaultHeaders();

  group('Spike: Browse and Search', () => {
    // Homepage
    let res = http.get(`${BASE_URL}/homepage`, {
      headers,
      tags: { name: 'GET /api/homepage' },
      timeout: '10s',
    });
    trackResponse(res, 'homepage');
    sleep(0.3 + Math.random() * 0.5);

    // Explore stats
    res = http.get(`${BASE_URL}/explore/live-stats`, {
      headers,
      tags: { name: 'GET /api/explore/live-stats' },
      timeout: '10s',
    });
    trackResponse(res, 'explore live-stats');
    sleep(0.3 + Math.random() * 0.5);

    // Search
    const query = randomItem(TEST_DATA.searchQueries);
    res = http.get(`${BASE_URL}/search/global?q=${encodeURIComponent(query)}`, {
      headers,
      tags: { name: 'GET /api/search/global' },
      timeout: '10s',
    });
    trackResponse(res, 'global search');
    sleep(0.3 + Math.random() * 0.5);

    // Trending videos
    res = http.get(`${BASE_URL}/videos/trending?limit=10`, {
      headers,
      tags: { name: 'GET /api/videos/trending' },
      timeout: '10s',
    });
    trackResponse(res, 'videos trending');
    sleep(0.3 + Math.random() * 0.5);

    // Stores
    res = http.get(`${BASE_URL}/stores?limit=10&sortBy=rating`, {
      headers,
      tags: { name: 'GET /api/stores' },
      timeout: '10s',
    });
    trackResponse(res, 'stores list');
    sleep(0.3);
  });
}

// Heavy user flow: full explore + store detail
function fullExplore() {
  const headers = defaultHeaders();

  group('Spike: Full Explore', () => {
    // Homepage batch
    let res = http.get(`${BASE_URL}/homepage`, {
      headers,
      tags: { name: 'GET /api/homepage' },
      timeout: '10s',
    });
    trackResponse(res, 'homepage');
    sleep(0.3 + Math.random() * 0.5);

    // All explore endpoints
    res = http.get(`${BASE_URL}/explore/live-stats`, {
      headers,
      tags: { name: 'GET /api/explore/live-stats' },
      timeout: '10s',
    });
    trackResponse(res, 'explore live-stats');

    res = http.get(`${BASE_URL}/explore/stats-summary`, {
      headers,
      tags: { name: 'GET /api/explore/stats-summary' },
      timeout: '10s',
    });
    trackResponse(res, 'explore stats-summary');

    res = http.get(`${BASE_URL}/explore/verified-reviews?limit=5`, {
      headers,
      tags: { name: 'GET /api/explore/verified-reviews' },
      timeout: '10s',
    });
    trackResponse(res, 'explore verified-reviews');
    sleep(0.3 + Math.random() * 0.5);

    // Browse stores
    res = http.get(`${BASE_URL}/stores/trending?limit=20`, {
      headers,
      tags: { name: 'GET /api/stores/trending' },
      timeout: '10s',
    });
    trackResponse(res, 'stores trending');
    sleep(0.3 + Math.random() * 0.5);

    // Category exploration
    const slug = randomItem(TEST_DATA.categorySlugs);
    res = http.get(`${BASE_URL}/categories/${slug}`, {
      headers,
      tags: { name: 'GET /api/categories/:slug' },
      timeout: '10s',
    });
    trackResponse(res, 'category by slug');
    sleep(0.3 + Math.random() * 0.5);

    // Featured products
    res = http.get(`${BASE_URL}/products/featured?limit=10`, {
      headers,
      tags: { name: 'GET /api/products/featured' },
      timeout: '10s',
    });
    trackResponse(res, 'featured products');
    sleep(0.3);
  });
}

// Main: distribute users across flows
export default function () {
  const selector = Math.random();

  if (selector < 0.5) {
    quickBrowse();       // 50% do quick browse (lightest)
  } else if (selector < 0.8) {
    browseAndSearch();   // 30% do browse + search
  } else {
    fullExplore();       // 20% do full explore
  }
}
