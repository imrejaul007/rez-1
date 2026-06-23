import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, HEALTH_URL, THRESHOLDS, defaultHeaders } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_check_duration');
const exploreDuration = new Trend('explore_duration');
const categoryDuration = new Trend('category_duration');

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    ...THRESHOLDS,
    errors: ['rate<0.01'],
    health_check_duration: ['p(95)<200'],
    explore_duration: ['p(95)<500'],
    category_duration: ['p(95)<500'],
  },
};

export default function () {
  const headers = defaultHeaders();

  // ----- Health Check -----
  group('Health Check', () => {
    const res = http.get(HEALTH_URL, { headers, tags: { name: 'GET /health' } });
    healthDuration.add(res.timings.duration);
    const passed = check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: body contains status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok' || body.status === 'degraded';
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!passed);
  });

  sleep(1);

  // ----- Explore Endpoints -----
  group('Explore - Live Stats', () => {
    const res = http.get(`${BASE_URL}/explore/live-stats`, {
      headers,
      tags: { name: 'GET /api/explore/live-stats' },
    });
    exploreDuration.add(res.timings.duration);
    const passed = check(res, {
      'explore live-stats: status is 200': (r) => r.status === 200,
      'explore live-stats: has body': (r) => r.body && r.body.length > 0,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  group('Explore - Stats Summary', () => {
    const res = http.get(`${BASE_URL}/explore/stats-summary`, {
      headers,
      tags: { name: 'GET /api/explore/stats-summary' },
    });
    exploreDuration.add(res.timings.duration);
    const passed = check(res, {
      'explore stats-summary: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  // ----- Categories -----
  group('Categories - List All', () => {
    const res = http.get(`${BASE_URL}/categories`, {
      headers,
      tags: { name: 'GET /api/categories' },
    });
    categoryDuration.add(res.timings.duration);
    const passed = check(res, {
      'categories: status is 200': (r) => r.status === 200,
      'categories: has body': (r) => r.body && r.body.length > 0,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  group('Categories - Featured', () => {
    const res = http.get(`${BASE_URL}/categories/featured`, {
      headers,
      tags: { name: 'GET /api/categories/featured' },
    });
    categoryDuration.add(res.timings.duration);
    const passed = check(res, {
      'categories featured: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  group('Categories - Root', () => {
    const res = http.get(`${BASE_URL}/categories/root`, {
      headers,
      tags: { name: 'GET /api/categories/root' },
    });
    categoryDuration.add(res.timings.duration);
    const passed = check(res, {
      'categories root: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  // ----- Stores - Trending -----
  group('Stores - Trending', () => {
    const res = http.get(`${BASE_URL}/stores/trending`, {
      headers,
      tags: { name: 'GET /api/stores/trending' },
    });
    const passed = check(res, {
      'stores trending: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(0.5);

  // ----- Videos - Trending -----
  group('Videos - Trending', () => {
    const res = http.get(`${BASE_URL}/videos/trending`, {
      headers,
      tags: { name: 'GET /api/videos/trending' },
    });
    const passed = check(res, {
      'videos trending: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(1);

  // ----- Homepage -----
  group('Homepage', () => {
    const res = http.get(`${BASE_URL}/homepage`, {
      headers,
      tags: { name: 'GET /api/homepage' },
    });
    const passed = check(res, {
      'homepage: status is 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
  });

  sleep(1);
}
