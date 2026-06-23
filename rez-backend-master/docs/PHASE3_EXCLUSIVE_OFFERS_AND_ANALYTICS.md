# Phase 3: Exclusive Follower Offers & Follower Analytics

## Overview
This phase implements two major features:
1. **Exclusive Follower Offers** - Store-specific offers that are only visible/accessible to store followers
2. **Follower Analytics** - Comprehensive analytics tracking for store followers, engagement, and exclusive offer performance

---

## Part 1: Exclusive Follower Offers

### Database Changes

#### Offer Model Updates
Three new fields added to the `Offer` model:

```typescript
{
  isFollowerExclusive: Boolean,    // Is this offer exclusive to followers?
  exclusiveUntil: Date,             // When does exclusivity end?
  visibleTo: 'all' | 'followers' | 'premium'  // Who can see this offer?
}
```

**Indexes Added:**
- `{ 'store.id': 1, isFollowerExclusive: 1, 'validity.isActive': 1 }`
- `{ isFollowerExclusive: 1, visibleTo: 1, 'validity.isActive': 1 }`

### Middleware

#### `exclusiveOfferMiddleware.ts`
Location: `src/middleware/exclusiveOfferMiddleware.ts`

**Functions:**
- `isFollowingStore(userId, storeId)` - Check if user follows a store
- `getUserFollowedStores(userId)` - Get all stores a user follows
- `addFollowerContext(req, res, next)` - Middleware to add followed stores to request
- `filterExclusiveOffers(offers, userId, followedStores)` - Filter offers based on follow status
- `checkExclusiveOfferAccess(req, res, next)` - Middleware for single offer access control

**Usage Example:**
```typescript
// In routes
router.get('/offers', addFollowerContext, getOffers);
router.get('/offers/:id', checkExclusiveOfferAccess, getOfferById);
```

### API Changes

#### Updated Endpoints

**GET /api/offers**
- Now filters out follower-exclusive offers for non-followers
- Returns only offers user has access to

**GET /api/offers/:id**
- Returns 403 if offer is follower-exclusive and user doesn't follow the store
- Response includes `requiresFollow` and `storeId` in error case

**POST /api/offers/:id/redeem**
- Tracks analytics when exclusive offer is redeemed
- Records `exclusiveOffersRedeemed` metric

**GET /api/offers/store/:storeId**
- Automatically filters exclusive offers based on user follow status

### Frontend Integration

```typescript
// Check if user can access an offer
const response = await fetch(`/api/offers/${offerId}`);

if (response.status === 403) {
  const error = await response.json();
  if (error.requiresFollow) {
    // Show "Follow store to unlock" UI
    showFollowPrompt(error.storeId);
  }
}
```

---

## Part 2: Follower Analytics

### Database Schema

#### FollowerAnalytics Model
Location: `src/models/FollowerAnalytics.ts`

```typescript
{
  store: ObjectId,                  // Reference to Store
  date: Date,                       // Analytics date (day-level)
  followersCount: Number,           // Total followers on this date
  newFollowers: Number,             // New follows on this date
  unfollows: Number,                // Unfollows on this date
  clicksFromFollowers: Number,      // Clicks from followers
  ordersFromFollowers: Number,      // Orders placed by followers
  revenueFromFollowers: Number,     // Revenue from follower orders
  exclusiveOffersViewed: Number,    // Views of exclusive offers
  exclusiveOffersRedeemed: Number,  // Redemptions of exclusive offers
  avgEngagementRate: Number,        // Average engagement percentage
  topFollowerLocation: String       // Most common follower location
}
```

**Indexes:**
- `{ store: 1, date: -1 }` - For time series queries
- `{ store: 1, date: 1 }` - Unique constraint to prevent duplicates

### Service Layer

#### `followerAnalyticsService.ts`
Location: `src/services/followerAnalyticsService.ts`

**Key Functions:**

**Recording Events:**
- `recordDailySnapshot(storeId)` - Daily snapshot of follower count
- `recordNewFollow(storeId)` - Track new follow event
- `recordUnfollow(storeId)` - Track unfollow event
- `recordFollowerClick(storeId)` - Track clicks from followers
- `recordFollowerOrder(storeId, amount)` - Track orders from followers
- `recordExclusiveOfferView(storeId)` - Track exclusive offer views
- `recordExclusiveOfferRedemption(storeId)` - Track exclusive offer redemptions

**Retrieving Analytics:**
- `getAnalytics(storeId, startDate, endDate)` - Get time series data
- `getGrowthMetrics(storeId)` - Get weekly and monthly growth metrics
- `getDetailedAnalytics(storeId, startDate, endDate)` - Comprehensive analytics summary
- `getCurrentFollowerCount(storeId)` - Real-time follower count

### API Endpoints

#### Analytics Routes
Location: `src/routes/followerAnalyticsRoutes.ts`

**GET /api/stores/:storeId/followers/analytics/detailed**
Get detailed follower analytics with time series data
- Query params: `startDate`, `endDate` (optional, defaults to last 30 days)
- Requires authentication
- Returns:
  ```json
  {
    "timeSeries": [...],  // Daily analytics records
    "growth": {
      "weekly": {...},    // Weekly growth metrics
      "monthly": {...}    // Monthly growth metrics
    },
    "summary": {
      "totalFollowers": 1234,
      "totalNewFollowers": 56,
      "totalUnfollows": 12,
      "totalOrders": 89,
      "totalRevenue": 45678,
      "avgOrderValue": "513.46",
      "exclusiveConversionRate": "23.45"
    }
  }
  ```

**GET /api/stores/:storeId/followers/analytics/growth**
Get follower growth metrics (weekly & monthly)
- Requires authentication
- Returns:
  ```json
  {
    "weekly": {
      "newFollowers": 15,
      "unfollows": 3,
      "netGrowth": 12,
      "growthRate": "80.00",
      "totalOrders": 25,
      "totalRevenue": 12500
    },
    "monthly": {...}
  }
  ```

**GET /api/stores/:storeId/followers/analytics/summary**
Get quick analytics summary
- Requires authentication
- Returns:
  ```json
  {
    "currentFollowers": 1234,
    "weeklyGrowth": {
      "new": 15,
      "lost": 3,
      "net": 12,
      "rate": "80.00"
    },
    "engagement": {
      "weeklyOrders": 25,
      "weeklyRevenue": 12500,
      "weeklyClicks": 345
    },
    "exclusiveOffers": {
      "weeklyViews": 120,
      "weeklyRedemptions": 28,
      "conversionRate": "23.33"
    }
  }
  ```

**GET /api/stores/:storeId/followers/count**
Get current follower count
- Public endpoint (no auth required)
- Returns:
  ```json
  {
    "count": 1234,
    "storeId": "store123"
  }
  ```

**POST /api/stores/:storeId/followers/analytics/snapshot**
Manually trigger daily analytics snapshot
- Admin only
- Use for testing or manual sync

### Integration Points

#### Wishlist Controller Integration
Location: `src/controllers/wishlistController.ts`

When users follow/unfollow stores (add/remove store from wishlist):
- Automatically records `recordNewFollow()` or `recordUnfollow()`
- Updates real-time follower count
- Tracks analytics for dashboard

#### Offer Controller Integration
Location: `src/controllers/offerController.ts`

When users interact with exclusive offers:
- View: Records `recordExclusiveOfferView()`
- Redeem: Records `recordExclusiveOfferRedemption()`
- Filters offers based on follow status

---

## Setup & Configuration

### 1. Database Migration
No migration needed - Mongoose will create collections automatically on first use.

The new indexes will be created on model initialization.

### 2. Cron Jobs (Recommended)
Set up a daily cron job to record snapshots:

```typescript
// In your cron job file
import { recordDailySnapshot } from './services/followerAnalyticsService';
import { Store } from './models/Store';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  const stores = await Store.find({ isActive: true }).select('_id');

  for (const store of stores) {
    try {
      await recordDailySnapshot(store._id);
    } catch (error) {
      console.error(`Failed to record snapshot for ${store._id}:`, error);
    }
  }
});
```

### 3. Route Registration
Add to your main app file:

```typescript
import followerAnalyticsRoutes from './routes/followerAnalyticsRoutes';

// Register routes
app.use('/api/stores', followerAnalyticsRoutes);
```

---

## Testing

### Test Exclusive Offers

1. **Create a follower-exclusive offer:**
```bash
POST /api/admin/offers
{
  "title": "Exclusive Discount",
  "store": { "id": "store123" },
  "isFollowerExclusive": true,
  "exclusiveUntil": "2025-12-31T23:59:59Z",
  "visibleTo": "followers",
  "cashbackPercentage": 20
}
```

2. **Try accessing without following:**
```bash
GET /api/offers/offer123
# Should return 403 with requiresFollow: true
```

3. **Follow the store:**
```bash
POST /api/wishlists/wishlist123/items
{
  "itemType": "Store",
  "itemId": "store123"
}
```

4. **Access offer again:**
```bash
GET /api/offers/offer123
# Should now return the offer
```

### Test Analytics

1. **Check follower count:**
```bash
GET /api/stores/store123/followers/count
```

2. **Get analytics summary:**
```bash
GET /api/stores/store123/followers/analytics/summary
```

3. **Get detailed analytics:**
```bash
GET /api/stores/store123/followers/analytics/detailed?startDate=2025-01-01&endDate=2025-01-31
```

---

## Performance Considerations

1. **Caching:**
   - Consider caching follower counts for high-traffic stores
   - Cache analytics summaries with 1-hour TTL

2. **Indexes:**
   - All necessary indexes are created automatically
   - Monitor query performance on analytics aggregations

3. **Async Operations:**
   - Analytics recording is done asynchronously (fire-and-forget)
   - Won't block user-facing operations

---

## Security Considerations

1. **Access Control:**
   - Analytics endpoints require authentication
   - Only store owners/admins should access their analytics
   - Public follower count is safe to expose

2. **Data Privacy:**
   - Don't expose individual follower information
   - Aggregate metrics only

3. **Rate Limiting:**
   - Apply rate limiting to analytics endpoints
   - Prevent abuse of exclusive offer checking

---

## Monitoring

### Key Metrics to Monitor

1. **Exclusive Offers:**
   - Conversion rate (views → redemptions)
   - Follower growth rate after exclusive offer launch
   - Average order value from exclusive offers

2. **Follower Analytics:**
   - Daily follower growth/decline
   - Engagement rates (orders/followers)
   - Revenue from followers vs non-followers

### Logs to Watch

```typescript
// Key log patterns
'➕ New follow recorded for store'
'➖ Unfollow recorded for store'
'🎟️ Exclusive offer redeemed for store'
'💰 Follower order recorded for store'
'📊 Daily snapshot recorded for store'
```

---

## Future Enhancements

1. **Follower Segmentation:**
   - Segment followers by engagement level
   - Target specific follower groups with offers

2. **Predictive Analytics:**
   - Predict follower churn
   - Recommend optimal times for exclusive offers

3. **Follower Communication:**
   - Push notifications for exclusive offers
   - Email campaigns for followers

4. **A/B Testing:**
   - Test exclusive vs regular offers
   - Optimize exclusive offer timing

---

## Files Created/Modified

### New Files
- `src/models/FollowerAnalytics.ts` - Analytics data model
- `src/services/followerAnalyticsService.ts` - Analytics business logic
- `src/controllers/followerAnalyticsController.ts` - API endpoints
- `src/middleware/exclusiveOfferMiddleware.ts` - Access control middleware
- `src/routes/followerAnalyticsRoutes.ts` - Route definitions

### Modified Files
- `src/models/Offer.ts` - Added exclusive offer fields
- `src/controllers/offerController.ts` - Integrated filtering and analytics
- `src/controllers/wishlistController.ts` - Track follow/unfollow events
- `src/utils/response.ts` - Support additional error data

---

## Quick Reference

### Check if User Follows Store
```typescript
import { isFollowingStore } from '../middleware/exclusiveOfferMiddleware';

const isFollowing = await isFollowingStore(userId, storeId);
```

### Record Analytics Event
```typescript
import { recordNewFollow } from '../services/followerAnalyticsService';

await recordNewFollow(storeId);
```

### Filter Exclusive Offers
```typescript
import { filterExclusiveOffers } from '../middleware/exclusiveOfferMiddleware';

const visibleOffers = await filterExclusiveOffers(offers, userId, followedStores);
```

---

## Support

For questions or issues with this implementation:
1. Check the logs for error messages
2. Verify indexes are created: `db.followeranalytics.getIndexes()`
3. Test with curl/Postman before integrating frontend
4. Monitor MongoDB performance on analytics queries

---

**Implementation Date:** 2025-01-27
**Version:** 1.0.0
**Status:** ✅ Complete and Production Ready
