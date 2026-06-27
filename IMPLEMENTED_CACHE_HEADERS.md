# Cache Headers Implementation

## Summary
Added cache headers to 5 endpoints in `offerController.ts` for production environment.

## Endpoints Updated

| Endpoint | File | Line | Cache Header |
|----------|------|------|--------------|
| GET /offers/featured | offerController.ts | ~255 | `public, max-age=300` |
| GET /offers/trending | offerController.ts | ~277 | `public, max-age=300` |
| GET /offers/mega | offerController.ts | ~963 | `public, max-age=300` |
| GET /offers/students | offerController.ts | ~978 | `public, max-age=300` |
| GET /offers/new-arrivals | offerController.ts | ~991 | `public, max-age=300` |

## Implementation Pattern

```typescript
if (process.env.NODE_ENV === 'production') {
  res.setHeader('Cache-Control', 'public, max-age=300');
}
```

The cache headers are only set in production (`NODE_ENV === 'production'`) to allow easier debugging in development environments.

## Cache Behavior

- **public**: Response can be cached by browsers and CDNs
- **max-age=300**: Cache for 5 minutes (300 seconds)
