# Load Testing Guide - Artillery

## Overview

Artillery is already configured for load testing. This guide explains how to run and interpret load tests.

---

## Prerequisites

1. **Backend Server Running:**
   ```bash
   npm run dev
   ```

2. **Artillery Installed:**
   ```bash
   npm install -g artillery
   # Or use local: npx artillery
   ```

---

## Available Test Scenarios

### 1. Basic Load Test (`basic-load.yml`)
**Purpose:** Validate system under normal to peak load

**Configuration:**
- Warm up: 10 req/sec for 60s
- Sustained: 50 req/sec for 180s
- Peak: 100 req/sec for 120s

**Run:**
```bash
npm run load:basic
# Or: artillery run artillery-tests/basic-load.yml --output reports/basic-load.json
```

**Expected Results:**
- P95 < 500ms
- Error rate < 1%
- Throughput: 100+ req/sec

---

### 2. Spike Test (`spike-test.yml`)
**Purpose:** Test system response to sudden traffic spikes

**Configuration:**
- Sudden spike: 500 req/sec

**Run:**
```bash
npm run load:spike
# Or: artillery run artillery-tests/spike-test.yml --output reports/spike-test.json
```

**Expected Results:**
- System should handle spike gracefully
- Response times may increase but should recover
- Error rate < 5% during spike

---

### 3. Stress Test (`stress-test.yml`)
**Purpose:** Find system breaking point

**Configuration:**
- Gradual ramp: 50 → 1000 req/sec over 11 minutes

**Run:**
```bash
npm run load:stress
# Or: artillery run artillery-tests/stress-test.yml --output reports/stress-test.json
```

**Expected Results:**
- P95 < 500ms (target)
- P99 < 1000ms (target)
- Identify bottlenecks

---

### 4. Endurance Test (`endurance-test.yml`)
**Purpose:** Test system stability over extended period

**Configuration:**
- Sustained: 200 req/sec for 30 minutes

**Run:**
```bash
npm run load:endurance
# Or: artillery run artillery-tests/endurance-test.yml --output reports/endurance-test.json
```

**Expected Results:**
- P95 < 400ms
- Error rate < 1%
- No memory leaks
- Stable performance

---

## Generating Reports

After running tests, generate HTML reports:

```bash
npm run load:report
# Or: artillery report reports/basic-load.json --output reports/basic-load.html
```

Reports include:
- Response time percentiles (p50, p95, p99)
- Error rates
- Throughput metrics
- Scenario breakdowns
- Request distribution

---

## Test Scenarios Covered

### 1. Health Check (10% weight)
- GET `/health`
- Validates basic server availability

### 2. Get Products List (30% weight)
- GET `/api/products`
- Tests product listing performance

### 3. Get Product Detail (25% weight)
- GET `/api/products/:id`
- Tests single product retrieval

### 4. Search Products (20% weight)
- GET `/api/products/search`
- Tests search functionality

### 5. Get Categories (15% weight)
- GET `/api/categories`
- Tests category listing

---

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| P50 (median) | < 100ms | < 200ms |
| P95 | < 500ms | < 1000ms |
| P99 | < 1000ms | < 2000ms |
| Error Rate | < 0.1% | < 1% |
| Throughput | 500+ req/sec | 1000+ req/sec |

---

## Monitoring During Tests

### Server Metrics to Watch:
1. **CPU Usage:** Should stay < 80%
2. **Memory Usage:** Should stay stable (no leaks)
3. **Database Connections:** Monitor connection pool
4. **Response Times:** Watch for degradation
5. **Error Rates:** Monitor for spikes

### Commands:
```bash
# Monitor server logs
tail -f logs/combined.log

# Monitor system resources (if available)
htop
# or
top
```

---

## Interpreting Results

### Good Results:
- ✅ P95 < 500ms
- ✅ Error rate < 0.1%
- ✅ Stable response times
- ✅ No memory leaks
- ✅ Consistent throughput

### Warning Signs:
- ⚠️ P95 > 500ms but < 1000ms
- ⚠️ Error rate 0.1% - 1%
- ⚠️ Response times increasing over time
- ⚠️ Memory slowly increasing

### Critical Issues:
- 🔴 P95 > 1000ms
- 🔴 Error rate > 1%
- 🔴 Response times degrading rapidly
- 🔴 Memory leaks
- 🔴 Server crashes

---

## Troubleshooting

### High Response Times
1. Check database query performance
2. Review Redis cache hit rates
3. Check for N+1 query problems
4. Review aggregation pipelines

### High Error Rates
1. Check server logs for errors
2. Review rate limiting configuration
3. Check database connection pool
4. Verify external service availability

### Memory Leaks
1. Monitor memory over time
2. Check for unclosed connections
3. Review event listeners
4. Check for circular references

---

## Best Practices

1. **Run tests in staging first**
2. **Start with basic load, then escalate**
3. **Monitor server resources during tests**
4. **Save test results for comparison**
5. **Run endurance tests before major releases**
6. **Document any issues found**

---

## Next Steps

1. ✅ Load test configurations verified
2. ⏳ Run baseline tests
3. ⏳ Document results
4. ⏳ Optimize based on findings
5. ⏳ Re-test after optimizations

---

**Status:** ✅ Artillery configured and ready
**Last Updated:** $(date)

