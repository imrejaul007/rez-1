import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  THRESHOLDS,
  defaultHeaders,
  authHeaders,
  AUTH_TOKEN,
  TEST_DATA,
  randomItem,
} from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_flow_duration');
const browseDuration = new Trend('authenticated_browse_duration');
const orderDuration = new Trend('order_flow_duration');
const apiCalls = new Counter('api_calls');

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    ...THRESHOLDS,
    errors: ['rate<0.05'],
    auth_flow_duration: ['p(95)<1000'],
    authenticated_browse_duration: ['p(95)<800'],
    order_flow_duration: ['p(95)<1500'],
  },
};

// Setup function: runs once to get a shared auth token
// If AUTH_TOKEN is provided via env var, skip OTP flow
export function setup() {
  if (AUTH_TOKEN) {
    console.log('Using pre-configured AUTH_TOKEN from environment');
    return { token: AUTH_TOKEN };
  }

  // Attempt OTP-based login
  console.log('Attempting OTP login flow...');
  const headers = defaultHeaders();

  // Step 1: Send OTP
  const sendOtpRes = http.post(
    `${BASE_URL}/user/auth/send-otp`,
    JSON.stringify({ phone: TEST_DATA.testPhone }),
    { headers, tags: { name: 'POST /api/user/auth/send-otp' } }
  );

  const otpSent = check(sendOtpRes, {
    'send-otp: status 200': (r) => r.status === 200,
  });

  if (!otpSent) {
    console.warn('Could not send OTP. Tests will run without authentication.');
    console.warn(`Response: ${sendOtpRes.status} - ${sendOtpRes.body}`);
    return { token: null };
  }

  // Step 2: Verify OTP
  // In test/dev environment, use the default test OTP (usually 123456)
  const testOtp = __ENV.TEST_OTP || '123456';
  const verifyRes = http.post(
    `${BASE_URL}/user/auth/verify-otp`,
    JSON.stringify({ phone: TEST_DATA.testPhone, otp: testOtp }),
    { headers, tags: { name: 'POST /api/user/auth/verify-otp' } }
  );

  const otpVerified = check(verifyRes, {
    'verify-otp: status 200': (r) => r.status === 200,
  });

  if (!otpVerified) {
    console.warn('Could not verify OTP. Tests will run without authentication.');
    console.warn(`Response: ${verifyRes.status} - ${verifyRes.body}`);
    return { token: null };
  }

  try {
    const body = JSON.parse(verifyRes.body);
    const token = body.data?.accessToken || body.data?.token || body.accessToken || body.token;
    if (token) {
      console.log('Authentication successful. Token obtained.');
      return { token };
    }
  } catch (e) {
    console.warn('Could not parse auth response');
  }

  return { token: null };
}

export default function (data) {
  const token = data.token;
  const headers = token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : defaultHeaders();
  const isAuthenticated = !!token;

  // ----- Phase 1: Authentication Check -----
  group('Auth: Profile Check', () => {
    if (isAuthenticated) {
      const res = http.get(`${BASE_URL}/user/auth/me`, {
        headers,
        tags: { name: 'GET /api/user/auth/me' },
      });
      authDuration.add(res.timings.duration);
      apiCalls.add(1);
      const passed = check(res, {
        'auth/me: status 200': (r) => r.status === 200,
        'auth/me: has user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && (body.data.user || body.data._id || body.data.phone);
          } catch {
            return false;
          }
        },
      });
      errorRate.add(!passed);
    }
  });

  sleep(1 + Math.random());

  // ----- Phase 2: Authenticated Browse -----
  group('Auth: Browse Homepage', () => {
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

  sleep(1 + Math.random());

  group('Auth: Browse Explore', () => {
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

  sleep(0.5 + Math.random());

  // ----- Phase 3: Authenticated Store Browsing -----
  group('Auth: Browse Stores', () => {
    // Trending stores
    let res = http.get(`${BASE_URL}/stores/trending?limit=20`, {
      headers,
      tags: { name: 'GET /api/stores/trending' },
    });
    browseDuration.add(res.timings.duration);
    apiCalls.add(1);
    check(res, {
      'stores trending: status 200': (r) => r.status === 200,
    });

    sleep(1 + Math.random());

    // Featured stores
    res = http.get(`${BASE_URL}/stores/featured?limit=10`, {
      headers,
      tags: { name: 'GET /api/stores/featured' },
    });
    browseDuration.add(res.timings.duration);
    apiCalls.add(1);
    check(res, {
      'stores featured: status 200': (r) => r.status === 200,
    });
  });

  sleep(1 + Math.random());

  // ----- Phase 4: View Store Detail + Products -----
  group('Auth: Store Detail', () => {
    // Get stores list
    const listRes = http.get(`${BASE_URL}/stores?limit=5&sortBy=rating`, {
      headers,
      tags: { name: 'GET /api/stores' },
    });
    apiCalls.add(1);

    let storeId = null;
    try {
      const body = JSON.parse(listRes.body);
      const stores = body.data?.stores || body.data || [];
      if (stores.length > 0) {
        storeId = (randomItem(stores))._id || (randomItem(stores)).id;
      }
    } catch (e) {
      // skip
    }

    if (storeId) {
      sleep(1 + Math.random());

      // View store
      const detailRes = http.get(`${BASE_URL}/stores/${storeId}`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId' },
      });
      browseDuration.add(detailRes.timings.duration);
      apiCalls.add(1);
      check(detailRes, {
        'store detail: status 200': (r) => r.status === 200,
      });

      sleep(1 + Math.random());

      // View store products
      const productsRes = http.get(`${BASE_URL}/stores/${storeId}/products?limit=20`, {
        headers,
        tags: { name: 'GET /api/stores/:storeId/products' },
      });
      apiCalls.add(1);
      check(productsRes, {
        'store products: status OK': (r) => r.status >= 200 && r.status < 500,
      });
    }
  });

  sleep(1 + Math.random());

  // ----- Phase 5: Authenticated-Only Features -----
  if (isAuthenticated) {
    group('Auth: Wallet Balance', () => {
      const res = http.get(`${BASE_URL}/wallet/balance`, {
        headers,
        tags: { name: 'GET /api/wallet/balance' },
      });
      apiCalls.add(1);
      const passed = check(res, {
        'wallet balance: status 200': (r) => r.status === 200,
      });
      errorRate.add(!passed);
    });

    sleep(0.5 + Math.random());

    group('Auth: User Statistics', () => {
      const res = http.get(`${BASE_URL}/user/auth/statistics`, {
        headers,
        tags: { name: 'GET /api/user/auth/statistics' },
      });
      apiCalls.add(1);
      check(res, {
        'user statistics: status 200': (r) => r.status === 200,
      });
    });

    sleep(0.5 + Math.random());

    group('Auth: Orders List', () => {
      const res = http.get(`${BASE_URL}/orders?limit=10`, {
        headers,
        tags: { name: 'GET /api/orders' },
      });
      orderDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'orders list: status 200': (r) => r.status === 200,
      });
    });

    sleep(0.5 + Math.random());

    group('Auth: Order Stats', () => {
      const res = http.get(`${BASE_URL}/orders/stats`, {
        headers,
        tags: { name: 'GET /api/orders/stats' },
      });
      orderDuration.add(res.timings.duration);
      apiCalls.add(1);
      check(res, {
        'order stats: status 200': (r) => r.status === 200,
      });
    });

    sleep(0.5 + Math.random());

    group('Auth: Notifications', () => {
      const res = http.get(`${BASE_URL}/notifications`, {
        headers,
        tags: { name: 'GET /api/notifications' },
      });
      apiCalls.add(1);
      check(res, {
        'notifications: status 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });

    sleep(0.5 + Math.random());

    group('Auth: Cart', () => {
      const res = http.get(`${BASE_URL}/cart`, {
        headers,
        tags: { name: 'GET /api/cart' },
      });
      apiCalls.add(1);
      check(res, {
        'cart: status 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });

    sleep(0.5 + Math.random());

    group('Auth: Homepage User Context', () => {
      const res = http.get(`${BASE_URL}/homepage/user-context`, {
        headers,
        tags: { name: 'GET /api/homepage/user-context' },
      });
      apiCalls.add(1);
      check(res, {
        'user context: status 200': (r) => r.status === 200,
      });
    });
  }

  sleep(1);
}

export function teardown(data) {
  if (data.token && !AUTH_TOKEN) {
    // Log out if we authenticated during setup
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    };
    http.post(`${BASE_URL}/user/auth/logout`, null, {
      headers,
      tags: { name: 'POST /api/user/auth/logout' },
    });
    console.log('Logged out successfully.');
  }
}
