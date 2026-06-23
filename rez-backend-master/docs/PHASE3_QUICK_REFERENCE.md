# Phase 3: Quick Reference Card

## Exclusive Follower Offers - Quick Start

### Create Exclusive Offer
```typescript
// Offer with follower exclusivity
{
  title: "VIP Discount for Followers",
  isFollowerExclusive: true,          // ← Make it exclusive
  exclusiveUntil: "2025-12-31",       // ← Optional: expiry date
  visibleTo: "followers",             // ← all | followers | premium
  store: { id: "storeId" },
  cashbackPercentage: 25
}
```

### Check if User Follows Store
```typescript
import { isFollowingStore } from '../middleware/exclusiveOfferMiddleware';

const isFollowing = await isFollowingStore(userId, storeId);
// Returns: true or false
```

### Filter Offers by Follow Status
```typescript
import { filterExclusiveOffers } from '../middleware/exclusiveOfferMiddleware';

const visibleOffers = await filterExclusiveOffers(
  offers,           // Array of offers
  userId,           // User ID (optional)
  followedStores    // Array of store IDs (optional)
);
// Returns: Filtered array of offers user can see
```

---

## Follower Analytics - Quick Start

### Record Events
```typescript
import {
  recordNewFollow,
  recordUnfollow,
  recordFollowerOrder,
  recordExclusiveOfferView,
  recordExclusiveOfferRedemption
} from '../services/followerAnalyticsService';

// When user follows store
await recordNewFollow(storeId);

// When user unfollows store
await recordUnfollow(storeId);

// When follower places order
await recordFollowerOrder(storeId, orderAmount);

// When follower views exclusive offer
await recordExclusiveOfferView(storeId);

// When follower redeems exclusive offer
await recordExclusiveOfferRedemption(storeId);
```

### Get Analytics
```typescript
import {
  getCurrentFollowerCount,
  getGrowthMetrics,
  getDetailedAnalytics
} from '../services/followerAnalyticsService';

// Get current follower count
const count = await getCurrentFollowerCount(storeId);

// Get weekly/monthly growth
const growth = await getGrowthMetrics(storeId);

// Get detailed analytics with date range
const analytics = await getDetailedAnalytics(
  storeId,
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

---

## API Endpoints

### Exclusive Offers
```bash
# List offers (automatically filtered by follow status)
GET /api/offers?category=mega

# Get single offer (403 if exclusive and not following)
GET /api/offers/:offerId

# Redeem offer (tracks analytics if exclusive)
POST /api/offers/:offerId/redeem
```

### Follower Analytics
```bash
# Get quick summary
GET /api/stores/:storeId/followers/analytics/summary
Authorization: Bearer <token>

# Get detailed analytics
GET /api/stores/:storeId/followers/analytics/detailed?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <token>

# Get growth metrics
GET /api/stores/:storeId/followers/analytics/growth
Authorization: Bearer <token>

# Get follower count (public)
GET /api/stores/:storeId/followers/count
```

---

## Frontend Integration

### Check Exclusive Offer Access
```typescript
try {
  const response = await fetch(`/api/offers/${offerId}`);
  const data = await response.json();

  if (response.status === 403 && data.requiresFollow) {
    // Show "Follow to unlock" modal
    showFollowPrompt(data.storeId);
  } else {
    // Show offer details
    displayOffer(data.data);
  }
} catch (error) {
  console.error('Error fetching offer:', error);
}
```

### Display Follower Count
```typescript
const response = await fetch(`/api/stores/${storeId}/followers/count`);
const { count } = await response.json();

// Display: "1.2K followers" or "1,234 followers"
```

### Show Analytics Dashboard
```typescript
const response = await fetch(
  `/api/stores/${storeId}/followers/analytics/summary`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);

const analytics = await response.json();

// Display:
// - Current followers: analytics.currentFollowers
// - Weekly growth: analytics.weeklyGrowth.net (+37)
// - Weekly orders: analytics.engagement.weeklyOrders (89)
// - Conversion rate: analytics.exclusiveOffers.conversionRate (28.63%)
```

---

## Database Queries

### Find All Exclusive Offers for a Store
```typescript
const offers = await Offer.find({
  'store.id': storeId,
  isFollowerExclusive: true,
  'validity.isActive': true
});
```

### Get Today's Analytics for a Store
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const analytics = await FollowerAnalytics.findOne({
  store: storeId,
  date: today
});
```

### Get Follower Count Trend
```typescript
const trend = await FollowerAnalytics.find({
  store: storeId,
  date: { $gte: new Date('2025-01-01') }
})
.sort({ date: 1 })
.select('date followersCount')
.lean();
```

---

## Common Patterns

### Pattern 1: Protected Offer Route
```typescript
router.get('/offers/:id',
  authenticate,                    // Check if user is logged in
  checkExclusiveOfferAccess,      // Check follower access
  getOfferById
);
```

### Pattern 2: Analytics Recording (Fire-and-Forget)
```typescript
// Don't await - let it run in background
recordNewFollow(storeId).catch(err =>
  console.error('Analytics error:', err)
);

// User request continues immediately
return res.json({ success: true });
```

### Pattern 3: Conditional Filtering
```typescript
// Get user's followed stores
const followedStores = req.user
  ? await getUserFollowedStores(req.user.id)
  : [];

// Filter offers
const filteredOffers = await filterExclusiveOffers(
  offers,
  req.user?.id,
  followedStores
);
```

---

## Response Examples

### Successful Offer Access
```json
{
  "success": true,
  "message": "Offer fetched successfully",
  "data": {
    "_id": "offer123",
    "title": "Exclusive 30% Off",
    "isFollowerExclusive": true,
    "exclusiveUntil": "2025-12-31T23:59:59Z",
    "visibleTo": "followers",
    "cashbackPercentage": 30
  }
}
```

### Access Denied (Not Following)
```json
{
  "success": false,
  "message": "This is a follower-exclusive offer. Please follow the store to access it.",
  "errors": {
    "requiresFollow": true,
    "storeId": "store123"
  }
}
```

### Analytics Summary
```json
{
  "success": true,
  "data": {
    "currentFollowers": 1234,
    "weeklyGrowth": {
      "new": 45,
      "lost": 8,
      "net": 37,
      "rate": "82.22"
    },
    "engagement": {
      "weeklyOrders": 89,
      "weeklyRevenue": 45678,
      "weeklyClicks": 456
    },
    "exclusiveOffers": {
      "weeklyViews": 234,
      "weeklyRedemptions": 67,
      "conversionRate": "28.63"
    }
  }
}
```

---

## Testing Commands

### Test Flow
```bash
# 1. Create exclusive offer
POST /api/admin/offers
{ "isFollowerExclusive": true, "visibleTo": "followers" }

# 2. Try to access as non-follower
GET /api/offers/:offerId
# Should return 403

# 3. Follow the store
POST /api/wishlists/:wishlistId/items
{ "itemType": "Store", "itemId": "storeId" }

# 4. Try to access again
GET /api/offers/:offerId
# Should return 200 with offer

# 5. Check analytics
GET /api/stores/:storeId/followers/analytics/summary
# Should show +1 new follower
```

---

## Troubleshooting

### Issue: Exclusive offer visible to everyone
✓ Check `isFollowerExclusive` is `true`
✓ Check `visibleTo` is set to `"followers"`
✓ Check `exclusiveUntil` hasn't expired
✓ Verify filtering is applied in controller

### Issue: Analytics not recording
✓ Check if event recording functions are called
✓ Look for error logs
✓ Verify MongoDB connection
✓ Check if indexes are created

### Issue: Wrong follower count
✓ Run daily snapshot manually: `POST /api/stores/:storeId/followers/analytics/snapshot`
✓ Check if follow/unfollow events are recorded
✓ Verify Wishlist has Store items

### Issue: 403 error even when following
✓ Check `getUserFollowedStores()` returns correct stores
✓ Verify Wishlist itemType is "Store" (capitalized)
✓ Check store ID matches in offer and wishlist

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/models/Offer.ts` | Offer schema with exclusive fields |
| `src/models/FollowerAnalytics.ts` | Analytics data schema |
| `src/services/followerAnalyticsService.ts` | Analytics business logic |
| `src/controllers/followerAnalyticsController.ts` | Analytics API handlers |
| `src/middleware/exclusiveOfferMiddleware.ts` | Access control middleware |
| `src/controllers/offerController.ts` | Offer endpoints (modified) |
| `src/controllers/wishlistController.ts` | Follow tracking (modified) |

---

## Cron Job Example

```typescript
import cron from 'node-cron';
import { recordDailySnapshot } from './services/followerAnalyticsService';
import { Store } from './models/Store';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  const stores = await Store.find({ isActive: true });

  for (const store of stores) {
    await recordDailySnapshot(store._id);
  }

  console.log('✓ Daily snapshots complete');
});
```

---

## Environment Variables

No new environment variables required for Phase 3.

---

## Quick Wins

1. **Boost Follower Growth:** Create time-limited exclusive offers
2. **Track Performance:** Check which stores have best follower engagement
3. **Reward Loyalty:** Give followers early access to sales
4. **Measure ROI:** Compare revenue from followers vs non-followers
5. **Optimize Timing:** Use analytics to find best times for exclusive offers

---

**For More Details:** See `PHASE3_EXCLUSIVE_OFFERS_AND_ANALYTICS.md`
