# Follow Store Feature - Quick Reference

## Overview
Stores now automatically track their follower count when users add/remove them from wishlists.

## API Usage

### Check Store Followers Count
```typescript
GET /api/stores/:storeId

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Store Name",
    "analytics": {
      "followersCount": 42,  // ← New field
      "totalOrders": 100,
      ...
    },
    ...
  }
}
```

### Follow a Store (Add to Wishlist)
```typescript
POST /api/wishlist/:wishlistId/items

Body:
{
  "itemType": "store",  // or "Store"
  "itemId": "507f1f77bcf86cd799439011"
}

// Automatically increments store's followersCount by 1
```

### Unfollow a Store (Remove from Wishlist)
```typescript
// Method 1: Remove by wishlist and item ID
DELETE /api/wishlist/:wishlistId/items/:itemId

// Method 2: Remove by type and ID
DELETE /api/wishlist/items
Body: {
  "itemType": "store",
  "itemId": "507f1f77bcf86cd799439011"
}

// Both methods automatically decrement store's followersCount by 1
```

## Service Functions

### Using the Store Follow Service

```typescript
import * as storeFollowService from '../services/storeFollowService';

// Increment followers (when user follows)
await storeFollowService.incrementFollowers(storeId);

// Decrement followers (when user unfollows)
await storeFollowService.decrementFollowers(storeId);

// Get current count
const count = await storeFollowService.getFollowersCount(storeId);

// Recalculate from wishlists (fix discrepancies)
const actualCount = await storeFollowService.recalculateFollowers(storeId);
```

## Database Schema

### Store Model - Analytics Section
```typescript
{
  analytics: {
    totalOrders: Number,
    totalRevenue: Number,
    avgOrderValue: Number,
    repeatCustomers: Number,
    followersCount: Number,  // ← NEW: Defaults to 0, min: 0
    ...
  }
}
```

## File Locations

- **Store Model**: `user-backend/src/models/Store.ts`
- **Follow Service**: `user-backend/src/services/storeFollowService.ts`
- **Wishlist Controller**: `user-backend/src/controllers/wishlistController.ts`

## Logging

All operations log with `[StoreFollowService]` prefix:

```
[StoreFollowService] Incrementing followers count for store: <storeId>
[StoreFollowService] Store <storeId> followers count incremented to: <count>
[StoreFollowService] Decrementing followers count for store: <storeId>
[StoreFollowService] Store <storeId> followers count decremented to: <count>
[WishlistController] Failed to increment/decrement store followers: <error>
```

## Error Handling

- Follower count updates are **non-blocking**
- Wishlist operations succeed even if follower count update fails
- Errors are logged but don't throw
- Count never goes below 0

## Common Tasks

### Get Top Followed Stores
```typescript
const topStores = await Store.find({ isActive: true })
  .sort({ 'analytics.followersCount': -1 })
  .limit(10)
  .select('name logo analytics.followersCount');
```

### Get Store's Follower List
```typescript
const followers = await Wishlist.find({
  'items.itemType': 'Store',
  'items.itemId': storeId
})
.populate('user', 'profile.firstName profile.lastName')
.select('user');
```

### Recalculate All Stores (Migration Script)
```typescript
const stores = await Store.find({});

for (const store of stores) {
  await storeFollowService.recalculateFollowers(store._id.toString());
}
```

## Frontend Integration Example

```typescript
// Check if user follows this store
const { inWishlist } = await checkWishlistStatus('store', storeId);

// Follow store
if (!inWishlist) {
  await addToWishlist(wishlistId, {
    itemType: 'store',
    itemId: storeId
  });
  // Backend automatically increments followersCount
}

// Unfollow store
if (inWishlist) {
  await removeFromWishlist(wishlistId, itemId);
  // Backend automatically decrements followersCount
}

// Display followers count
<Text>{store.analytics.followersCount} followers</Text>
```

## Testing Checklist

- [ ] Add store to wishlist → count increments
- [ ] Remove store from wishlist → count decrements
- [ ] Remove via different endpoints → both work
- [ ] Count never goes below 0
- [ ] Multiple users can follow same store
- [ ] Unfollowing when count is 0 doesn't break
- [ ] Store API returns followersCount
- [ ] Logs appear in console
- [ ] Errors don't break wishlist operations

## Performance Notes

- Uses atomic `$inc` operations for thread-safety
- Minimal database queries (1 per follow/unfollow)
- No N+1 query problems
- Counts are cached in Store document (no need to count wishlists on every request)

---

**Status**: ✅ Implemented
**Version**: Phase 1
**Last Updated**: 2025-11-27
