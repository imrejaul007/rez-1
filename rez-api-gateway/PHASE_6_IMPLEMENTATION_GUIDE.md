# Phase 6: API Gateway Optimization - Implementation Guide

**Phase:** 6.1 Connection & Performance Optimization  
**Status:** Ready for Deployment  
**Date:** April 7, 2026

---

## Overview

This guide walks through deploying Phase 6.1 optimizations to the REZ API Gateway. These optimizations focus on:

1. **Connection Pooling** — Keep-alive connections to upstreams
2. **Response Caching** — 5-15 minute cache for GET requests
3. **Buffer Optimization** — Tuned for API response sizes
4. **Performance Tuning** — Worker processes, timeouts, TCP optimization

---

## Pre-Deployment Checklist

- [ ] Review changes in `nginx.optimized.conf`
- [ ] Back up current `nginx.conf`
- [ ] Run nginx syntax check
- [ ] Test in staging environment
- [ ] Establish baseline metrics
- [ ] Prepare rollback plan
- [ ] Schedule deployment window (low-traffic time)

---

## Key Changes Summary

### 1. Upstream Connection Pooling

**Before:**
```nginx
proxy_pass $search_backend;  # Creates new connection each time
```

**After:**
```nginx
upstream search_service {
    server ${SEARCH_SERVICE_URL} max_fails=3 fail_timeout=30s;
    keepalive 32;      # Reuse up to 32 connections
    keepalive_timeout 60s;
}

location /api/search {
    proxy_pass http://search_service;
    proxy_http_version 1.1;  # Required for keep-alive
    proxy_set_header Connection "";
}
```

**Impact:** 20-30% latency reduction from connection reuse

---

### 2. Response Caching

**Configuration:**
```nginx
# Cache zone: 50MB shared cache with 5min inactive timeout
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:50m max_size=100m inactive=5m;

# In location block:
proxy_cache api_cache;
proxy_cache_key "$request_method$request_uri";
proxy_cache_valid 200 5m;  # Cache 200 responses for 5 minutes
proxy_cache_use_stale error timeout;  # Use stale cache on upstream failure
```

**Caching Strategy:**
- **Search/Catalog:** 5-10 minutes (static data, high reuse)
- **Analytics:** 15 minutes (aggregated data)
- **Orders/Payment:** No caching (real-time data)
- **Authenticated requests:** No caching by default (security)

**Cache Hit Rates Expected:**
- Public endpoints: 40-60% hit rate
- Authenticated endpoints: 10-20% hit rate
- Overall: 30-40% hit rate

---

### 3. Buffer Optimization

**Before:**
```nginx
# Default nginx buffers (too small for large responses)
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

**After:**
```nginx
proxy_buffer_size 8k;      # First 8KB of response
proxy_buffers 16 8k;       # Total 128KB buffer pool
proxy_busy_buffers_size 16k;  # Send 16KB to client while backend is slow
```

**Impact:**
- Prevents "upstream sent too many large headers" errors
- Better handling of large JSON responses
- Faster client response times with buffering

---

### 4. Performance Tuning

**Worker Processes:**
```nginx
worker_processes auto;  # Auto-detect CPU cores
```

**Event Model:**
```nginx
events {
    worker_connections 8192;  # Doubled from 4096
    use epoll;  # Better event model on Linux
}
```

**TCP Optimization:**
```nginx
fastopen 256;  # Enable TCP Fast Open
```

**Impact:**
- Fully utilizes multi-core CPU
- Better handling of concurrent connections
- Faster connection establishment (TFO)

---

## Deployment Steps

### Step 1: Backup Current Configuration

```bash
cd rez-api-gateway
cp nginx.conf nginx.conf.backup.$(date +%s)
git status
```

### Step 2: Review Changes

```bash
diff -u nginx.conf nginx.optimized.conf
```

Key differences to verify:
- [ ] Upstream blocks with keepalive settings
- [ ] Caching directives
- [ ] Buffer size increases
- [ ] Worker process optimization
- [ ] Cache-Control header addition

### Step 3: Validate Syntax

```bash
# Syntax check with new config (after deployment)
docker exec rez-api-gateway nginx -t
```

### Step 4: Update Configuration

**Option A: Gradual Migration (Recommended)**

1. Deploy to staging first
2. Monitor metrics for 1-2 hours
3. Verify no cache-related issues
4. Gradually roll out to 10% → 50% → 100%

**Option B: Direct Replacement**

```bash
# Backup current
cp nginx.conf nginx.conf.old

# Use optimized version
cp nginx.optimized.conf nginx.conf

# Commit to git
git add nginx.conf
git commit -m "feat: Phase 6.1 - API Gateway Performance Optimization"
git push origin main
```

### Step 5: Monitor Metrics

After deployment, monitor for 30-60 minutes:

```bash
# Watch access logs
tail -f /var/log/nginx/access.log | grep -E 'cache=(HIT|MISS|EXPIRED)'

# Check error logs
tail -f /var/log/nginx/error.log

# Monitor cache usage (if available)
du -sh /var/cache/nginx/
```

**Expected Metrics:**
- Cache hit rate: 30-40% (increase over time)
- Latency: 30-50% reduction
- Upstream response time: 20-30% reduction
- Errors: Same or lower

---

## Cache Invalidation Strategy

### Automatic Cache Invalidation

Cache is automatically invalidated after:
- **GET endpoints:** 5-15 minutes (depending on endpoint)
- **POST/PUT/DELETE:** Always refresh (no caching)
- **Upstream failure:** Use stale cache, refresh when recovered

### Manual Cache Invalidation

To bypass cache for testing:
```bash
# Add ?nocache parameter to request
curl "https://api.rez.money/api/search/products?query=pizza&nocache"

# Or use X-Cache-Control header (if backend supports it)
curl -H "Cache-Control: no-cache" "https://api.rez.money/api/search/products?query=pizza"
```

---

## Performance Testing

### Before Optimization

```bash
# Baseline metrics
wrk -c 100 -t 4 -d 30s https://rez-api-gateway.onrender.com/api/search/products

# Expected: ~1000ms latency, 100 req/s
```

### After Optimization

```bash
# Performance test
wrk -c 100 -t 4 -d 30s https://rez-api-gateway.onrender.com/api/search/products

# Expected: ~200-500ms latency, 200-300 req/s
# Cache hit rate: 40-60%
```

### Load Test with Cache Warming

```bash
# Warm up cache
for i in {1..100}; do
  curl -s https://api.rez.money/api/search/products?query=pizza > /dev/null
done

# Measure cache hit rate
ab -n 1000 -c 100 https://api.rez.money/api/search/products
```

---

## Troubleshooting

### Issue: High Cache Miss Rate

**Symptom:** Cache hit rate < 20%

**Causes:**
1. Query parameters vary (different results)
2. Authorization header causes skip (authenticated requests)
3. Cache TTL too short (5 minutes)

**Solutions:**
- Increase cache TTL for stable endpoints
- Skip authorization check for public endpoints
- Use cache key without query params for simple searches

### Issue: Stale Cache Data

**Symptom:** Clients seeing outdated data for 5-10 minutes

**Causes:**
1. Cache TTL too long
2. Upstream update not propagating

**Solutions:**
- Reduce cache TTL (use 3 minutes for frequently updated data)
- Implement cache purge on upstream update
- Add cache version header to cache key

### Issue: High Memory Usage

**Symptom:** `/var/cache/nginx/` growing >100MB

**Causes:**
1. Cache max_size too large
2. Cache inactive timeout too high

**Solutions:**
- Reduce `max_size` in proxy_cache_path (start with 50m)
- Reduce `inactive` timeout (default 5m is OK)
- Monitor cache hit vs miss ratio

### Issue: Connection Pool Exhaustion

**Symptom:** "Connection refused" errors to upstream

**Causes:**
1. keepalive 32 not enough concurrent connections
2. Upstream not respecting keep-alive timeout

**Solutions:**
- Increase keepalive to 64
- Check upstream server configuration
- Monitor upstream connection pool

---

## Rollback Plan

If issues occur:

### Quick Rollback (1 minute)

```bash
cd rez-api-gateway

# Restore previous config
cp nginx.conf.old nginx.conf

# Reload (no restart needed)
docker exec rez-api-gateway nginx -s reload

# Verify
curl https://rez-api-gateway.onrender.com/health
```

### Full Rollback (5 minutes)

```bash
# Revert git commit
git revert HEAD
git push origin main

# Render will automatically redeploy from the previous version
# Wait 3-5 minutes for deployment
curl https://rez-api-gateway.onrender.com/health
```

---

## Success Criteria

✅ **Phase 6.1 is successful if:**

1. **Performance**
   - P50 latency: < 200ms (down from ~300ms)
   - P99 latency: < 500ms (down from ~1000ms)
   - Cache hit rate: > 30% on public endpoints

2. **Reliability**
   - No increase in error rate
   - All endpoints responding correctly
   - No timeouts or connection issues

3. **Resource Usage**
   - CPU usage: Same or lower
   - Memory usage: Stable (<500MB)
   - Cache disk usage: < 100MB

4. **Observability**
   - Access logs showing cache status
   - No error logs about buffers or connections
   - Metrics dashboard updated

---

## Next Steps After Phase 6.1

Once Phase 6.1 is stable:

1. **Phase 6.2: Resilience** (Health checks, circuit breakers)
2. **Phase 6.3: Observability** (Metrics, tracing, monitoring)
3. **Phase 6.4: API Management** (Validation, versioning)

---

## Files Modified

| File | Changes |
|------|---------|
| `nginx.optimized.conf` | New optimized configuration |
| `OPTIMIZATION_PLAN.md` | Phase 6 roadmap |
| `PHASE_6_IMPLEMENTATION_GUIDE.md` | This file |

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Preparation & Testing | 1-2 hours | Ready |
| Staging Deployment | 1-2 hours | Ready |
| Production Canary (10%) | 1-2 hours | Ready |
| Production Full (100%) | Immediate | Ready |
| Monitoring & Tuning | 24 hours | TBD |

---

**Ready to deploy Phase 6.1 API Gateway optimization!**

Questions? Review the nginx.conf comments or check Render deployment logs.

---

**Deployment Date:** To be scheduled  
**Prepared By:** REZ Development Team  
**Target Environment:** rez-api-gateway.onrender.com
