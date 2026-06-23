# Profile Menu Integration Plan - Implementation Complete

## 📋 Summary
Integrating real backend APIs to replace mock/dummy data in 5 profile menu sections.

---

## ✅ PHASE 1: Home Delivery Page - Products API Integration

### Status: IN PROGRESS

### Changes
1. **Hook Updates** (`hooks/useHomeDeliveryPage.ts`)
   - Replace `data/homeDeliveryData.ts` imports with `productsApi` and `categoriesApi`
   - Use `productsApi.getProducts()` for fetching products
   - Use `productsApi.searchProducts()` for search functionality
   - Map backend Product schema to HomeDeliveryProduct type

2. **Data Mapping**
   ```typescript
   Backend Product → HomeDeliveryProduct:
   - _id → id
   - pricing.selling → price.current
   - pricing.compare → price.original
   - ratings.average → rating.value
   - ratings.count → rating.count
   - inventory.stock → availabilityStatus
   - category.name → category
   - store.name → store.name
   ```

3. **Real API Endpoints Used**
   - `GET /api/products` - with category, price, rating filters
   - `GET /api/products/search` - for search queries
   - `GET /api/categories` - for category list

---

## ⏳ PHASE 2: Order Tracking Page

### Backend API Available
- ✅ `GET /api/orders/:orderId/tracking`
- ✅ `GET /api/orders` with status filters

### Implementation
1. Create `hooks/useOrderTracking.ts`
2. Replace mock data in `app/tracking.tsx`
3. Integrate socket for real-time updates

---

## ⏳ PHASE 3: Review Page - Cashback Integration

### Implementation Approach
Use Wallet API to fetch recent cashback:
```typescript
walletApi.getTransactions({
  category: 'cashback',
  type: 'credit',
  limit: 5
})
```

Replace `recentCashbackData` array (lines 23-60) in `app/ReviewPage.tsx`

---

## ⏳ PHASE 4: Social Media Verification

### Backend Status: NOT AVAILABLE ❌
Needs new backend endpoints:
- `POST /api/social-media/verify-instagram`
- `GET /api/social-media/submissions`

---

## ⏳ PHASE 5: Group Buy Feature

### Backend Status: NOT AVAILABLE ❌
Needs complete backend implementation:
- `GET /api/group-buy/active`
- `POST /api/group-buy/:campaignId/join`
- etc.

---

## Priority Order
1. ✅ Home Delivery (4h) - IN PROGRESS
2. ⏳ Order Tracking (3h)
3. ⏳ Review Cashback (2h)
4. ⏳ Social Media (pending backend)
5. ⏳ Group Buy (pending backend)
