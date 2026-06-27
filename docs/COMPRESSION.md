# HTTP Response Compression Configuration

This document describes the HTTP response compression strategy for the REZ backend infrastructure.

## Overview

HTTP compression reduces bandwidth usage and improves response times for API responses. The REZ backend uses a **two-layer compression strategy**:

1. **Nginx Layer** (Primary) - Handles compression at the edge
2. **Express Layer** (Disabled) - Previously compressed, now disabled to avoid double-compression

## Compression Strategy

### Algorithm Priority

| Priority | Algorithm | Compression Ratio | CPU Cost | Browser Support |
|----------|----------|------------------|----------|----------------|
| 1 (Preferred) | **Brotli** | 15-25% better than gzip | Moderate | Modern browsers (96%+ coverage) |
| 2 (Fallback) | **Gzip** | Good | Low | Universal |

### Content Types Compressed

```
text/plain
text/css
text/xml
application/json
application/javascript
application/xml
application/xml+rss
text/javascript
application/x-javascript
image/svg+xml
```

### Minimum Response Size

Responses smaller than **1 KB (1000 bytes)** are NOT compressed. This prevents:
- Wasted CPU cycles on trivially small payloads
- Overhead from compression headers

### Content NOT Compressed

The following are intentionally excluded from compression:

| Content Type | Reason |
|--------------|--------|
| Images (JPEG, PNG, GIF, WebP) | Already compressed |
| Video/Audio | Already compressed |
| PDFs | Already compressed |
| ZIP files | Already compressed |
| Binary streams | No benefit from compression |

### Security: BREACH Protection

Authenticated requests (those with `Authorization: Bearer ...` header) are **NOT compressed** at the nginx layer to prevent BREACH attacks. This is a known vulnerability where compression can leak sensitive information via response size analysis.

**Mitigation:**
- Compression is skipped for authenticated responses
- Authenticated responses are NOT cached at nginx level
- Express backends don't re-add compression (to prevent bypass)

## Infrastructure

### Layer 1: API Gateway (Nginx)

**File:** `rez-api-gateway/nginx.conf`

The API Gateway handles all incoming requests and compresses responses before sending to clients.

```nginx
# Brotli (preferred)
brotli on;
brotli_vary on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript ...;
brotli_min_length 1000;

# Gzip (fallback)
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript ...;
gzip_min_length 1000;
```

### Layer 2: Backend Nginx

**File:** `rez-backend-master/nginx/nginx.conf`

Similar configuration for the backend nginx (SSL termination).

### Layer 3: Express Backends (Disabled)

**Files:**
- `rez-backend-master/src/config/middleware.ts`
- `rez-auth-service/src/index.ts`

Compression is **disabled** at the Express level to prevent double-compression:

```typescript
// Compression is disabled - handled at nginx layer to avoid double-compression
// If deploying WITHOUT nginx, re-enable:
// app.use(compression({ threshold: 1024, level: 6 }));
```

## Deployment Requirements

### Nginx Modules Required

| Module | Purpose | Available In |
|--------|---------|--------------|
| `ngx_http_brotli_filter_module` | Brotli compression | nginx:1.27 (Debian) |
| `ngx_http_gzip_static_module` | Gzip compression | Standard nginx builds |

**Note:** The `nginx:alpine` images do NOT include Brotli. Use `nginx:1.27` (Debian-based).

### Docker Configuration

**API Gateway Dockerfile:**

```dockerfile
FROM nginx:1.27  # Use Debian-based image for Brotli support

# The official nginx:1.27 image includes ngx_http_brotli_filter_module
# No additional installation required
```

## Client Compatibility

### React Native

The React Native `fetch()` API **automatically** handles:
- Sending `Accept-Encoding: br, gzip` header
- Decompressing responses based on `Content-Encoding` header

No client-side changes required.

### iOS (NSURLSession)

NSURLSession **automatically**:
- Handles `Accept-Encoding` negotiation
- Decompresses gzip responses
- **Note:** Brotli decompression may require iOS 11+

### Android

OkHttp (used by most Android networking libraries) **automatically**:
- Handles compression negotiation
- Decompresses gzip responses
- **Note:** Brotli support requires OkHttp 3.x+

### Web Browsers

All modern browsers support both gzip and Brotli natively.

## Verification

### Automated Testing

Run the compression verification script:

```bash
cd rez-backend-master
npx ts-node -r tsconfig-paths/register src/scripts/verifyCompression.ts
```

### Manual Testing with curl

**Test Brotli support:**
```bash
curl -I -H "Accept-Encoding: br" https://api.example.com/api/version
```

Expected response headers:
```
Content-Encoding: br
Vary: Accept-Encoding
```

**Test Gzip fallback:**
```bash
curl -I -H "Accept-Encoding: gzip" https://api.example.com/api/version
```

Expected response headers:
```
Content-Encoding: gzip
Vary: Accept-Encoding
```

**Test no compression (small response):**
```bash
curl -I -H "Accept-Encoding: identity" https://api.example.com/health
```

Expected: No `Content-Encoding` header (below threshold).

### Load Testing

The Artillery load tests in `artillery-tests/` can verify compression under load:

```bash
npm run load:basic
```

Monitor:
- Response sizes should be significantly smaller than raw payloads
- CPU usage should remain stable (no double-compression)
- Response times should improve for larger payloads

## Performance Metrics

### Expected Compression Ratios

| Response Type | Original Size | Compressed (Brotli) | Reduction |
|---------------|---------------|---------------------|-----------|
| Small JSON (<1KB) | ~500 B | Not compressed | 0% |
| Medium JSON | ~10 KB | ~2 KB | ~80% |
| Large JSON | ~100 KB | ~20 KB | ~80% |
| HTML | ~50 KB | ~10 KB | ~80% |
| CSS/JS | ~30 KB | ~8 KB | ~73% |

### Typical Bandwidth Savings

For a typical mobile app session:
- **Before compression:** ~5-10 MB transferred
- **After compression:** ~1-2 MB transferred
- **Savings:** 70-80% bandwidth reduction

## Troubleshooting

### Compression Not Working

1. **Check nginx configuration is loaded:**
   ```bash
   nginx -t
   ```

2. **Verify Brotli module is available:**
   ```bash
   nginx -V 2>&1 | grep brotli
   ```

3. **Check response headers:**
   ```bash
   curl -I https://api.example.com/api/version
   ```
   Should show `Content-Encoding: br` or `Content-Encoding: gzip`

4. **Verify Express compression is disabled:**
   Check logs for "Compression is disabled" message

### Double Compression

If you see high CPU usage and no additional bandwidth savings:

1. Check Express middleware is not compressing
2. Check nginx is the only compression point
3. Verify no CDN is adding additional compression

### Mobile Clients Not Decompressing

1. **React Native:** Should work automatically with built-in fetch
2. **OkHttp:** Ensure using version 3.x+
3. **iOS:** Consider enabling Brotli via `NSURLSession`

## Configuration Reference

### Nginx Variables

| Variable | Purpose |
|----------|---------|
| `$skip_compression` | Set to 1 for authenticated requests |
| `brotli_comp_level` | Compression level (1-11, default 6) |
| `gzip_comp_level` | Compression level (1-9, default 6) |
| `brotli_min_length` | Minimum response size for compression |
| `gzip_min_length` | Minimum response size for compression |

### Compression Levels

| Level | Speed | Compression Ratio | Use Case |
|-------|-------|------------------|----------|
| 1 | Fastest | Lowest | High-traffic, CPU-constrained |
| 6 | Balanced | Good | Default for most uses |
| 9 | Slowest | Highest | Offline processing, static assets |

## Security Considerations

### BREACH Attack Prevention

The BREACH attack exploits HTTP compression to leak secrets. Mitigation:

1. **Disable compression for authenticated requests** - Done via `$skip_compression` map
2. **Disable caching for authenticated responses** - Prevents cached compressed responses
3. **CSRF tokens as opaque values** - Don't reflect user input in responses

### Information Disclosure

Compression headers (`Vary: Accept-Encoding`) ensure clients receive the correct compressed variant, preventing:
- Wrong content type being served from cache
- Mixed compressed/uncompressed responses

## Future Enhancements

Potential improvements for future consideration:

1. **Dynamic compression level** - Lower level during peak traffic
2. **Brotli preload** - Pre-compress static assets
3. **CDN-level Brotli** - Enable at Cloudflare/CDN layer
4. **Streaming compression** - For SSE/large responses
5. **Metrics dashboard** - Real-time compression ratio monitoring
