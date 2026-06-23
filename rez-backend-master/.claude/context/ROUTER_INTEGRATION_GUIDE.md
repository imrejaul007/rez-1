# Router Integration Guide - Phase 3B

## Quick Integration Steps

### Step 1: Import New Routes

Add these imports to your main merchant router file (likely `src/routes/merchantRouter.ts` or `src/index.ts`):

```typescript
import bulkRoutes from './merchantroutes/bulk';
import reviewRoutes from './merchantroutes/reviews';
import variantRoutes from './merchantroutes/variants';
```

### Step 2: Register Routes

Add these route registrations:

```typescript
// Bulk import/export endpoints
router.use('/bulk', bulkRoutes);

// Product review endpoints (nested under products)
router.use('/products', reviewRoutes);

// Product variant endpoints (nested under products)
router.use('/products', variantRoutes);
```

### Step 3: Complete Example

Here's a complete example of how your merchant router might look:

```typescript
import express from 'express';
import authRoutes from './merchantroutes/auth';
import productsRoutes from './merchantroutes/products';
import bulkRoutes from './merchantroutes/bulk';
import reviewRoutes from './merchantroutes/reviews';
import variantRoutes from './merchantroutes/variants';

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

// Product management routes
router.use('/products', productsRoutes);

// Bulk operations routes
router.use('/bulk', bulkRoutes);

// Review management routes (nested under products)
router.use('/products', reviewRoutes);

// Variant management routes (nested under products)
router.use('/products', variantRoutes);

export default router;
```

### Step 4: Verify Routes

After integration, your API will have these new endpoints:

#### Bulk Operations
- `POST /api/merchant/bulk/products/import`
- `POST /api/merchant/bulk/products/validate`
- `GET /api/merchant/bulk/products/export`
- `GET /api/merchant/bulk/products/template`

#### Reviews
- `GET /api/merchant/products/:id/reviews`
- `GET /api/merchant/products/:id/reviews/stats`
- `POST /api/merchant/products/:id/reviews/:reviewId/response`
- `PUT /api/merchant/products/:id/reviews/:reviewId/flag`

#### Variants
- `GET /api/merchant/products/:id/variants`
- `GET /api/merchant/products/:id/variants/:variantId`
- `POST /api/merchant/products/:id/variants`
- `PUT /api/merchant/products/:id/variants/:variantId`
- `DELETE /api/merchant/products/:id/variants/:variantId`

### Step 5: Test Integration

```bash
# Test bulk template download
curl -X GET "http://localhost:3000/api/merchant/bulk/products/template?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test variant creation
curl -X POST "http://localhost:3000/api/merchant/products/PRODUCT_ID/variants" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"size","value":"M","stock":100}'

# Test review retrieval
curl -X GET "http://localhost:3000/api/merchant/products/PRODUCT_ID/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- All routes require authentication (handled by authMiddleware in each route file)
- Review and variant routes are nested under `/products/:id/` for better REST organization
- Bulk routes are separate under `/bulk/` for clarity
- No additional middleware configuration needed
- Socket.IO integration is automatic (uses global.io)

## Troubleshooting

### Routes Not Working
1. Check that imports are correct
2. Verify route registration order
3. Ensure authentication middleware is working
4. Check server restart after changes

### File Upload Issues
1. Ensure body-parser is NOT parsing multipart/form-data
2. Multer handles multipart in bulk routes
3. Check file size limits in server config

### TypeScript Errors
1. Run `npx tsc --noEmit` to check
2. All new files have zero errors
3. Pre-existing errors in other files are unrelated

## Complete!

After these steps, Phase 3B features will be fully integrated and ready for use.
