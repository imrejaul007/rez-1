# API Versioning Strategy

This document outlines the API versioning strategy for the ReZ API Gateway.

## Overview

The ReZ API uses version negotiation to support multiple API versions simultaneously,
allowing clients to opt-in to new features and breaking changes at their own pace.

## Versioning Methods

### 1. URL Prefix Versioning (Primary)

The recommended method for new integrations.

```
/api/v1/users         # API version 1
/api/v2/users         # API version 2
/api/v3/users         # API version 3 (future)
```

- Each major version has its own URL prefix
- Allows coexistence of multiple versions
- Clear, explicit in API documentation
- Easy to deprecate old versions

### 2. Accept Header Versioning (Backward Compatible)

For clients that cannot use URL prefix versioning.

```
GET /api/users
Accept: application/vnd.rez.v1+json     # Requests v1
Accept: application/vnd.rez.v2+json     # Requests v2
```

- Custom media type format: `application/vnd.rez.{VERSION}+json`
- Falls back to v1 if no Accept header provided
- Useful for legacy clients

### 3. API Key with Version (Merchant Partners)

For API key-based authentication, version can be specified.

```
Authorization: Bearer <api-key>
X-API-Version: 2
```

- Falls back to v1 if not specified
- Used alongside OAuth for partner integrations

## Current Status

### API v1 (Stable)

- **Status**: Stable, production-ready
- **Launch Date**: 2025-01-15
- **Supported Until**: 6 months after v2 launch
- **URL Prefix**: `/api/v1/` (or no prefix for backward compatibility)

**v1 Endpoints** (Current):
- `POST /api/v1/auth/login`
- `GET /api/v1/users/:id`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- All merchant and wallet endpoints

### API v2 (Planned)

- **Status**: Planning phase
- **Planned Launch**: Q3 2026
- **URL Prefix**: `/api/v2/`

**Planned Breaking Changes**:
- [To be documented when v2 roadmap is finalized]

## Backward Compatibility

### Guaranteed Support

- **v1**: Supported for 6 months after v2 launch
- **v(N-1)**: Each old version supported for 6 months after next version launch
- **Critical Security Fixes**: Always backported to supported versions

### Deprecation Policy

1. **Announcement Phase** (3 months before sunset)
   - Blog post and email to all active API users
   - Gateway logs include deprecation warnings
   - Response includes `Deprecation: true` header

2. **Migration Period** (6 months)
   - Old API remains fully functional
   - Increased logging/warnings on deprecated endpoints
   - Support for migration questions

3. **Sunset Phase**
   - Old API endpoints return 410 Gone
   - Error message includes documentation link

## Implementation in nginx

### URL-Based Routing

```nginx
# Route to v1 microservices
location /api/v1/ {
    rewrite ^/api/v1/(.*)$ /api/$1 break;
    proxy_pass http://backend_v1;
}

# Route to v2 microservices
location /api/v2/ {
    rewrite ^/api/v2/(.*)$ /api/$1 break;
    proxy_pass http://backend_v2;
}
```

### Accept Header Handling

```nginx
map $http_accept $api_version {
    ~*vnd\.rez\.v2 "v2";
    default "v1";
}

location /api/ {
    proxy_pass http://backend_${api_version};
    proxy_set_header X-API-Version $api_version;
}
```

## Response Format

All API responses include version information:

```json
{
  "data": { /* ... */ },
  "meta": {
    "version": "v1",
    "timestamp": "2026-04-15T10:30:00Z"
  }
}
```

## Testing

### Version-Specific Testing

```bash
# Test v1
curl -H "Accept: application/vnd.rez.v1+json" https://api.rez.app/api/users

# Test v2
curl -H "Accept: application/vnd.rez.v2+json" https://api.rez.app/api/users

# URL prefix
curl https://api.rez.app/api/v1/users
curl https://api.rez.app/api/v2/users
```

### Compatibility Matrix

Maintained in `COMPATIBILITY_MATRIX.md`:
- Which clients support which API versions
- Feature availability per version
- Known incompatibilities

## Client Guidance

### New Integrations

Use URL-based versioning with `/api/v2/` as soon as v2 is released.

### Existing Integrations

**No immediate action required** on v1 launch. Migration should occur:
1. Within 3 months of v2 announcement
2. Before the 6-month support window closes
3. Earlier if you need v2-specific features

## Monitoring & Observability

### Metrics Tracked

- Request count per API version
- Error rate per version
- Latency comparison between versions
- Deprecated endpoint usage

### Alerts

- Alert when deprecated endpoints receive >10% of traffic after sunset
- Alert on unusual version distribution shifts
- Track successful migration progress

## FAQ

**Q: Do I need to migrate immediately?**
A: No. v1 will be supported for 6 months after v2 launch. Plan migration during that window.

**Q: Can I use both v1 and v2 in the same integration?**
A: Yes. You can gradually migrate endpoints from v1 to v2.

**Q: What if v2 breaks my integration?**
A: Use v1 endpoints. Report the issue, and we'll prioritize a fix if it's a regression.

**Q: How do I know when v3 is coming?**
A: We announce 3 months in advance via email and blog.

## Related Documentation

- [API Reference](../README.md) — Complete endpoint documentation
- [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md) — Feature matrix by version
- [CHANGELOG.md](../CHANGELOG.md) — Version history and breaking changes
- [Migration Guide](./MIGRATION.md) — Step-by-step upgrade instructions

## Contact

For versioning questions or migration support:
- Slack: #api-support
- Email: api-support@rez.app
- Issues: GitHub/rez-api-gateway/issues
