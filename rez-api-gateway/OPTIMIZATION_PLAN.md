# API Gateway Optimization Plan

**Status:** Planning Phase  
**Current Deployment:** https://rez-api-gateway.onrender.com  
**Date:** April 7, 2026

---

## Current State Analysis

### Strengths ✅
- Strangler fig pattern for gradual service migration
- CORS configuration for cross-origin requests
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting (global + per-merchant + per-endpoint)
- Gzip compression enabled
- Detailed logging with upstream timing
- DNS resolution support for dynamic IPs

### Optimization Gaps

| Area | Current | Gap | Impact |
|------|---------|-----|--------|
| **Connection Pooling** | Not optimized | No keepalive to upstreams | High latency from connection overhead |
| **Response Caching** | None | Could cache GET requests | 40-60% latency reduction for repeat requests |
| **Health Checks** | No active checks | Upstreams can be down without detection | Traffic sent to dead upstreams (errors) |
| **Load Balancing** | Round-robin (implicit) | Could use least-conn or health-weighted | Uneven load distribution |
| **Service Discovery** | Hardcoded URLs | No dynamic discovery | Manual updates needed when services move |
| **Metrics** | Access logs only | No Prometheus metrics | Limited visibility for observability |
| **Circuit Breaking** | Not implemented | Could detect failing services | Cascading failures on upstream timeout |
| **Request Validation** | Minimal | No schema validation at gateway | Invalid requests reach backends |
| **API Versioning** | Not supported | No version routing | Can't support multiple API versions |
| **Tracing** | Correlation ID only | No distributed tracing integration | Hard to debug request flows |

---

## Phase 6: API Gateway Optimization Roadmap

### 6.1: Connection & Performance Optimization (Week 1)

**Upstream Connection Pooling**
- Add keepalive connections to all upstreams (30s timeout)
- Enable HTTP/1.1 for backends
- Set proxy buffer sizes for large responses
- Implement connection limits per upstream

**Response Caching**
- Add nginx caching for GET requests (5min default)
- Cache headers: Cache-Control, ETag, Last-Modified
- Skip caching for authenticated endpoints
- Add cache status headers (X-Cache: HIT/MISS)

**Performance Tuning**
- Increase worker_processes based on CPU cores
- Optimize buffer sizes for typical request/response
- Add request deduplication for duplicate simultaneous requests
- Enable TCP fast open (TFO)

### 6.2: Resilience & Health (Week 2)

**Health Checks**
- Add active health checks for all upstreams
- Detect failing services and remove from rotation
- Automatic recovery when services come back
- Health check dashboard in monitoring

**Circuit Breaker Pattern**
- Implement circuit breaking at gateway level
- Detect service degradation (high error rate, timeouts)
- Return graceful error responses when services fail
- Log circuit state changes for debugging

**Load Balancing**
- Implement least-conn balancing for better distribution
- Add health-weighted balancing (prefer healthier servers)
- Session affinity for stateful services
- Graceful handling of service restarts

### 6.3: Observability & Monitoring (Week 3)

**Metrics Collection**
- Export Prometheus metrics from nginx (via lua script or exporter)
- Track: request rate, latency (p50/p95/p99), error rates
- Per-service metrics breakdown
- Circuit breaker state metrics

**Distributed Tracing**
- Add X-Trace-ID generation and propagation
- Integration with Jaeger/Zipkin
- Trace all backend requests
- Request context propagation across services

**Logging Enhancements**
- Structured JSON logging for easy parsing
- Add request body sampling (first 1KB for debugging)
- Error response logging (status >= 400)
- Slow request detection and logging

### 6.4: API Management (Week 4)

**Request Validation**
- JSON schema validation for known endpoints
- Rate limit by endpoint (not just IP)
- API key validation at gateway
- Request/response size limits per endpoint

**API Versioning**
- Support multiple API versions (v1, v2, etc.)
- Route based on Accept-Version header or path
- Gradual migration from old to new API
- Version deprecation timeline

**Request Transformation**
- Legacy endpoint adapters (translate old paths to new)
- Default parameter injection (region, timezone, locale)
- Request normalization (lowercase query params, etc.)
- Automatic retry logic for idempotent operations

### 6.5: Advanced Features (Week 5+)

**Service Mesh Integration**
- Consul service discovery integration
- Istio-compatible sidecar support
- mTLS between services
- Advanced traffic policies

**API Analytics**
- Track endpoint popularity
- Monitor deprecated endpoint usage
- Identify slow endpoints
- Client SDK usage statistics

**Security Enhancements**
- Request signature validation
- JWT validation at gateway
- API key rotation detection
- DDoS protection beyond rate limiting

---

## Implementation Priority

### Phase 6.1: Connection & Performance (HIGH)
- **Effort:** Medium (1-2 days)
- **Impact:** HIGH (30-50% latency reduction)
- **Dependencies:** None
- **Order:** First (blocking for other improvements)

### Phase 6.2: Resilience & Health (HIGH)
- **Effort:** Medium (2-3 days)
- **Impact:** HIGH (prevents cascading failures)
- **Dependencies:** Phase 6.1
- **Order:** Second (critical for stability)

### Phase 6.3: Observability & Monitoring (MEDIUM)
- **Effort:** Medium (2 days)
- **Impact:** MEDIUM (enables debugging)
- **Dependencies:** Phase 6.1
- **Order:** Third (essential for ops)

### Phase 6.4: API Management (MEDIUM)
- **Effort:** High (3-4 days)
- **Impact:** MEDIUM (improves API quality)
- **Dependencies:** Phase 6.1
- **Order:** Fourth (nice-to-have for now)

### Phase 6.5: Advanced Features (LOW)
- **Effort:** High (4+ days)
- **Impact:** LOW (nice-to-have)
- **Dependencies:** Phase 6.1, 6.2, 6.3
- **Order:** Future phases

---

## Expected Outcomes

### After Phase 6.1
- ✅ 30-50% latency reduction
- ✅ Reduced connection overhead
- ✅ Better cache hit rates for repeated requests

### After Phase 6.2
- ✅ Automatic failover to healthy services
- ✅ Circuit breaker prevents cascading failures
- ✅ Better load distribution

### After Phase 6.3
- ✅ Full request tracing end-to-end
- ✅ Structured logs for easy debugging
- ✅ Prometheus metrics for dashboards

### After Phase 6.4
- ✅ Input validation at gateway (catches errors early)
- ✅ Multiple API versions supported
- ✅ Better error responses for invalid requests

---

## Success Metrics

| Metric | Target | Current | Goal |
|--------|--------|---------|------|
| P50 Latency | <100ms | ~200ms | 50% reduction |
| P99 Latency | <500ms | ~1000ms | 50% reduction |
| Error Rate | <0.1% | ~0.5% | 80% reduction |
| Cache Hit Rate | >50% | 0% | Significant gain |
| Service Uptime | 99.99% | ~99% | 100x improvement |

---

## Files to Modify

1. `nginx.conf` — Main configuration
   - Upstream keepalive settings
   - Caching directives
   - Health check configuration
   - Circuit breaker logic (via lua)

2. `start.sh` — Startup script
   - Environment variable validation
   - Service health pre-checks

3. `Dockerfile` — Docker image
   - Add nginx lua module (if needed)
   - Add Prometheus export module

4. `render.yaml` — Render deployment
   - Health check configuration
   - Startup timeout settings
   - Environment variables for caching

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Caching stale data | Medium | Medium | ETag validation, short TTL |
| Health checks overload | Low | Low | Stagger check intervals |
| Circuit breaker too aggressive | Medium | High | Gradual threshold increase |
| Performance regression | Low | High | Load test before deploy |

---

## Rollback Plan

Each optimization has a feature flag:
```nginx
# Example: Disable caching
set $cache_enabled "true";  # Change to "false" to disable
```

Rollback steps:
1. Disable in-progress feature flag
2. Clear nginx cache (if applicable)
3. Redeploy previous version
4. Monitor metrics for recovery

---

**Next Step:** Implement Phase 6.1 (Connection & Performance Optimization)
