# REZ Backend Load Testing Suite

Comprehensive load testing suite for the REZ backend API using [k6](https://k6.io/).

## Prerequisites

### Install k6

**Windows (Chocolatey):**
```bash
choco install k6
```

**Windows (winget):**
```bash
winget install k6 --source winget
```

**macOS (Homebrew):**
```bash
brew install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

For other installation methods, see: https://k6.io/docs/get-started/installation/

## Test Files

| File | Purpose | VUs | Duration |
|------|---------|-----|----------|
| `smoke-test.js` | Verify nothing is broken | 2 | 30s |
| `load-test.js` | Standard load with user journeys | 50-100 | 8 min |
| `stress-test.js` | Push beyond normal capacity | 100-300 | 11 min |
| `spike-test.js` | Sudden traffic spike & recovery | 10-500 | ~3 min |
| `auth-flow.js` | Authenticated user journeys | 20 | 2 min |

## Running Tests

### Basic Usage

Make sure the backend server is running before executing tests.

```bash
# Run from the load-tests directory
cd rez-backend/load-tests

# Smoke test (run first to verify setup)
k6 run smoke-test.js

# Standard load test
k6 run load-test.js

# Stress test
k6 run stress-test.js

# Spike test
k6 run spike-test.js

# Authenticated flow test
k6 run auth-flow.js
```

### Passing Environment Variables

Use `-e` flags to override defaults:

```bash
# Custom base URL (e.g., staging server)
k6 run -e BASE_URL=https://api.staging.rez.com/api smoke-test.js

# With authentication token
k6 run -e AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs... auth-flow.js

# Custom health endpoint URL
k6 run -e HEALTH_URL=https://api.staging.rez.com/health smoke-test.js

# Authenticated flow with test phone + OTP
k6 run -e TEST_PHONE=+919999999999 -e TEST_OTP=123456 auth-flow.js

# Combined: staging + auth
k6 run -e BASE_URL=https://api.staging.rez.com/api -e AUTH_TOKEN=your_token load-test.js
```

### Docker Usage

```bash
# Mount the load-tests directory and run
docker run --rm -i \
  -v $(pwd):/scripts \
  -e BASE_URL=http://host.docker.internal:5001/api \
  grafana/k6 run /scripts/smoke-test.js

# With auth token
docker run --rm -i \
  -v $(pwd):/scripts \
  -e BASE_URL=http://host.docker.internal:5001/api \
  -e AUTH_TOKEN=your_token \
  grafana/k6 run /scripts/auth-flow.js
```

### Output Formats

```bash
# JSON output for analysis
k6 run --out json=results.json smoke-test.js

# CSV output
k6 run --out csv=results.csv load-test.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# Prometheus Remote Write
k6 run --out experimental-prometheus-rw load-test.js
```

## Test Descriptions

### Smoke Test (`smoke-test.js`)
Minimal load to verify the API is functional. Runs 2 virtual users for 30 seconds hitting core endpoints:
- `GET /health`
- `GET /api/explore/live-stats`
- `GET /api/explore/stats-summary`
- `GET /api/categories` (root, featured)
- `GET /api/stores/trending`
- `GET /api/videos/trending`
- `GET /api/homepage`

**When to run:** After deployments, as a CI/CD gate, or before heavier tests.

### Load Test (`load-test.js`)
Simulates standard production traffic with realistic user journeys:
- **Browse & Discover** (35%): homepage, categories, trending stores/videos, explore
- **Search** (25%): autocomplete, global search, store search, video search
- **Store Detail** (20%): store list, store detail, products, reviews
- **Category Exploration** (20%): category tree, stores by category, featured products

Ramp profile: 0 -> 50 VUs (1m), hold 50 (3m), ramp to 100 (1m), hold 100 (2m), ramp down (1m).

**When to run:** Regularly to establish baseline performance metrics.

### Stress Test (`stress-test.js`)
Pushes the system beyond normal capacity to find breaking points:
- Same endpoint coverage as load test, with more aggressive patterns
- Additional endpoints: top-cashback, cuisine-counts, verified-reviews, stores-by-tag
- Includes slow response counter (>1s)

Ramp profile: 0 -> 100 (2m), hold (3m), ramp to 200 (1m), hold (2m), ramp to 300 (1m), ramp down (2m).

**When to run:** Before major releases or infrastructure changes.

### Spike Test (`spike-test.js`)
Tests system behavior under sudden extreme load and recovery:
- Simulates a viral event or flash sale traffic pattern
- Three user flow types: quick browse (50%), browse+search (30%), full explore (20%)
- Tracks recovery response times separately

Ramp profile: 10 VUs (1m), spike to 500 (10s), hold (30s), drop to 10 (30s), recover (1m).

**When to run:** To validate auto-scaling and circuit breaker configurations.

### Auth Flow (`auth-flow.js`)
Tests authenticated user journeys end-to-end:
- OTP login flow (send-otp + verify-otp) in setup phase
- Profile retrieval, homepage browsing
- Store browsing and detail views
- Wallet balance, order history, user statistics
- Cart, notifications, homepage user-context

20 VUs for 2 minutes. Shared token obtained in setup.

**When to run:** To validate auth-gated endpoint performance.

## Thresholds

### Default Thresholds (Smoke & Load)
| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration p(95)` | < 500ms | 95th percentile response time |
| `http_req_duration p(99)` | < 1500ms | 99th percentile response time |
| `http_req_failed` | < 1% | HTTP failure rate |

### Stress Thresholds
| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration p(95)` | < 1000ms | Relaxed for high load |
| `http_req_duration p(99)` | < 3000ms | Relaxed for high load |
| `http_req_failed` | < 5% | Allows some failures under stress |

### Spike Thresholds
| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration p(95)` | < 2000ms | Lenient during spike |
| `http_req_duration p(99)` | < 5000ms | Lenient during spike |
| `http_req_failed` | < 10% | Accepts higher failure rate during spike |

## API Endpoints Tested

### Public (No Auth Required)
- `GET /health` - Health check
- `GET /api/homepage` - Homepage data
- `GET /api/homepage/sections` - Available homepage sections
- `GET /api/explore/live-stats` - Explore live statistics
- `GET /api/explore/stats-summary` - Explore summary
- `GET /api/explore/verified-reviews` - Verified reviews
- `GET /api/explore/featured-comparison` - Featured comparison
- `GET /api/categories` - All categories
- `GET /api/categories/root` - Root categories
- `GET /api/categories/featured` - Featured categories
- `GET /api/categories/tree` - Category tree
- `GET /api/categories/:slug` - Category by slug
- `GET /api/stores` - Store listing with filters
- `GET /api/stores/trending` - Trending stores
- `GET /api/stores/featured` - Featured stores
- `GET /api/stores/new` - New stores
- `GET /api/stores/top-cashback` - Top cashback stores
- `GET /api/stores/search` - Store search
- `GET /api/stores/search/advanced` - Advanced store search
- `GET /api/stores/by-category-slug/:slug` - Stores by category
- `GET /api/stores/by-tag/:tag` - Stores by tag
- `GET /api/stores/cuisine-counts` - Cuisine counts
- `GET /api/stores/:storeId` - Store detail
- `GET /api/stores/:storeId/products` - Store products
- `GET /api/stores/:storeId/reviews` - Store reviews
- `GET /api/stores/:storeId/status` - Store operating status
- `GET /api/stores/:storeId/followers/count` - Store follower count
- `GET /api/stores/:storeId/recent-earnings` - Recent store earnings
- `GET /api/videos/trending` - Trending videos
- `GET /api/videos/search` - Video search
- `GET /api/videos/category/:category` - Videos by category
- `GET /api/products/featured` - Featured products
- `GET /api/search/global` - Global search
- `GET /api/search/autocomplete` - Search autocomplete
- `GET /api/search/history/popular` - Popular searches

### Authenticated (Auth Token Required)
- `POST /api/user/auth/send-otp` - Send OTP
- `POST /api/user/auth/verify-otp` - Verify OTP
- `POST /api/user/auth/logout` - Logout
- `GET /api/user/auth/me` - Current user profile
- `GET /api/user/auth/statistics` - User statistics
- `GET /api/wallet/balance` - Wallet balance
- `GET /api/orders` - User orders
- `GET /api/orders/stats` - Order statistics
- `GET /api/notifications` - User notifications
- `GET /api/cart` - User cart
- `GET /api/homepage/user-context` - Homepage user context

## Customizing Test Data

Edit the `TEST_DATA` object in `config.js` to match your database:

```javascript
export const TEST_DATA = {
  testPhone: '+919999999999',           // Test phone number for OTP
  storeSlugs: ['your-store-slug'],       // Real store slugs from your DB
  categorySlugs: ['restaurants'],        // Real category slugs
  searchQueries: ['pizza', 'coffee'],    // Common search terms
  videoCategories: ['trending_me'],      // Valid video categories
  location: { latitude: 28.7041, longitude: 77.1025 }, // Test location
};
```

## Recommended Test Sequence

1. **Smoke test** - Verify API is up and endpoints respond
2. **Load test** - Establish baseline metrics
3. **Stress test** - Find breaking points
4. **Spike test** - Validate recovery behavior
5. **Auth flow** - Test authenticated paths

## Troubleshooting

**Connection refused:**
Ensure the backend server is running on the expected port (default: 5001).

**All requests fail with 404:**
Check that `BASE_URL` points to the correct API prefix (e.g., `http://localhost:5001/api`).

**Auth flow fails:**
- Ensure `TEST_PHONE` is a valid test number in your system
- Ensure `TEST_OTP` matches what your dev server expects (default: `123456`)
- Or provide a pre-generated `AUTH_TOKEN` via environment variable

**CORS errors:**
k6 makes requests without browser CORS restrictions, so CORS should not be an issue. If you see CORS-related 403s, check if the server blocks requests without an `Origin` header.
