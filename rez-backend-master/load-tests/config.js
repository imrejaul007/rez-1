// Shared configuration for all load tests
// Usage: k6 run -e BASE_URL=http://your-server:5001/api -e AUTH_TOKEN=your_jwt_token smoke-test.js

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001/api';
export const HEALTH_URL = __ENV.HEALTH_URL || 'http://localhost:5001/health';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Default thresholds applied to all tests (can be overridden per test)
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed: ['rate<0.01'],
};

// Stricter thresholds for stress tests
export const STRESS_THRESHOLDS = {
  http_req_duration: ['p(95)<1000', 'p(99)<3000'],
  http_req_failed: ['rate<0.05'],
};

// Spike test thresholds (more lenient during spike)
export const SPIKE_THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<5000'],
  http_req_failed: ['rate<0.10'],
};

// Headers for unauthenticated requests
export function defaultHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

// Headers for authenticated requests
export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

// Sample test data
export const TEST_DATA = {
  // Sample phone number for OTP flow (use a test number)
  testPhone: __ENV.TEST_PHONE || '+919999999999',
  // Sample store slugs/IDs to use in requests (replace with actual values from your DB)
  storeSlugs: ['test-store', 'sample-restaurant', 'demo-cafe'],
  // Sample category slugs
  categorySlugs: ['restaurants', 'cafes', 'grocery'],
  // Sample search queries
  searchQueries: ['pizza', 'coffee', 'burger', 'biryani', 'sushi', 'cake'],
  // Sample video categories
  videoCategories: ['trending_me', 'trending_her', 'featured', 'review'],
  // Sample location (New Delhi)
  location: {
    latitude: 28.7041,
    longitude: 77.1025,
  },
};

// Utility: pick a random item from an array
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Utility: generate a random duration between min and max seconds
// Usage: sleep(randomDuration(1, 3)) - must import sleep from 'k6' in test file
export function randomDuration(min, max) {
  return min + Math.random() * (max - min);
}
