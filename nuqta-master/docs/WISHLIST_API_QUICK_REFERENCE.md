# Wishlist API - Quick Reference Guide

## Import

```typescript
import wishlistService from '@/services/wishlistApi';
```

---

## Phase 1: Critical CRUD Operations

### 1. Get Wishlists
```typescript
const response = await wishlistService.getWishlists(page, limit);

// Parameters:
// - page: number (default: 1, min: 1)
// - limit: number (default: 20, min: 1, max: 100)

// Returns:
// { wishlists: Wishlist[], pagination: {...} }
```

### 2. Add to Wishlist
```typescript
const response = await wishlistService.addToWishlist({
  itemType: 'product',  // 'product' | 'video' | 'store' | 'project'
  itemId: '123',
  wishlistId: 'optional-wishlist-id', // Creates default if not provided
  priority: 'high',     // 'low' | 'medium' | 'high' (default: 'medium')
  notes: 'My notes',    // optional
  tags: ['tag1', 'tag2'] // optional
});

// Auto-creates default wishlist if needed
// Supports optimistic updates
```

### 3. Remove from Wishlist
```typescript
const response = await wishlistService.removeFromWishlist(itemId);

// Supports optimistic updates
```

### 4. Clear Wishlist
```typescript
const response = await wishlistService.clearWishlist(wishlistId);

// Returns: { message: string, count: number }
```

### 5. Check if in Wishlist
```typescript
const response = await wishlistService.isInWishlist('product', productId);

// Returns:
// {
//   inWishlist: boolean,
//   wishlistItemId?: string,
//   wishlistId?: string,
//   addedAt?: string
// }

// Alias: checkWishlistStatus()
```

### 6. Get Wishlist Count
```typescript
const response = await wishlistService.getWishlistCount(); // All wishlists
const response = await wishlistService.getWishlistCount(wishlistId); // Specific wishlist

// Returns: { count: number }
```

---

## Phase 2: Advanced Features

### Wishlist Management

#### Get Wishlist by ID
```typescript
const response = await wishlistService.getWishlistById(wishlistId);
```

#### Get Default Wishlist
```typescript
const response = await wishlistService.getDefaultWishlist();
```

#### Create Wishlist
```typescript
const response = await wishlistService.createWishlist({
  name: 'My Wishlist',        // required, max 100 chars
  description: 'Description', // optional
  isPublic: false,           // optional
  tags: ['tag1']             // optional
});
```

#### Update Wishlist
```typescript
const response = await wishlistService.updateWishlist(wishlistId, {
  name: 'New Name',
  description: 'New Description',
  isPublic: true
});
```

#### Delete Wishlist
```typescript
const response = await wishlistService.deleteWishlist(wishlistId);
```

#### Duplicate Wishlist
```typescript
const response = await wishlistService.duplicateWishlist(
  sourceWishlistId,
  'New Wishlist Name'
);
```

#### Merge Wishlists
```typescript
const response = await wishlistService.mergeWishlists(
  sourceWishlistId,
  targetWishlistId,
  deleteSource // boolean, default: false
);

// Returns: { message: string, merged: number, duplicates: number }
```

---

### Item Management

#### Get Wishlist Items
```typescript
const response = await wishlistService.getWishlistItems(wishlistId, {
  page: 1,
  limit: 20,
  itemType: 'product',
  category: 'electronics',
  search: 'laptop',
  tags: ['wishlist', 'high-priority'],
  priority: 'high',
  availability: 'available',
  sort: 'newest', // 'newest' | 'oldest' | 'name' | 'price_high' | 'price_low' | 'priority'
  order: 'desc',  // 'asc' | 'desc'
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31'
});

// Returns: { items: WishlistItem[], pagination: {...}, summary: {...}, filters: {...} }
```

#### Update Wishlist Item
```typescript
const response = await wishlistService.updateWishlistItem(itemId, {
  notes: 'Updated notes',
  priority: 'high',
  tags: ['new-tag'],
  category: 'electronics'
});
```

#### Move Item to Cart
```typescript
const response = await wishlistService.moveToCart(itemId);
```

#### Move Item Between Wishlists
```typescript
const response = await wishlistService.moveItem(itemId, targetWishlistId);
```

---

### Bulk Operations

#### Bulk Add to Wishlist
```typescript
const response = await wishlistService.bulkAddToWishlist([
  { itemType: 'product', itemId: '1' },
  { itemType: 'video', itemId: '2' },
  { itemType: 'store', itemId: '3' }
]);

// Returns: { added: number, failed: number, items: WishlistItem[] }
```

#### Bulk Remove from Wishlist
```typescript
const response = await wishlistService.bulkRemoveFromWishlist([
  'itemId1',
  'itemId2',
  'itemId3'
]);

// Returns: { removed: number, failed: number }
```

#### Bulk Move Items
```typescript
const response = await wishlistService.bulkMoveItems(
  ['itemId1', 'itemId2'],
  targetWishlistId
);

// Returns: { moved: number, failed: number }
```

---

### Social & Sharing

#### Share Wishlist
```typescript
const response = await wishlistService.shareWishlist(wishlistId, [
  { userId: 'user1', permissions: 'view' },
  { userId: 'user2', permissions: 'edit' }
]);

// permissions: 'view' | 'edit'
```

#### Get Shared Wishlists
```typescript
const response = await wishlistService.getSharedWishlists(page, limit);
```

#### Unshare Wishlist
```typescript
// Unshare with all
const response = await wishlistService.unshareWishlist(wishlistId);

// Unshare with specific user
const response = await wishlistService.unshareWishlist(wishlistId, userId);
```

#### Get Public Wishlists
```typescript
const response = await wishlistService.getPublicWishlists({
  page: 1,
  limit: 20,
  search: 'tech',
  userId: 'user123',
  tags: ['electronics'],
  sort: 'popular' // 'newest' | 'popular' | 'most_items' | 'highest_value'
});
```

#### Follow Wishlist
```typescript
const response = await wishlistService.followWishlist(wishlistId);
```

#### Unfollow Wishlist
```typescript
const response = await wishlistService.unfollowWishlist(wishlistId);
```

#### Get Followed Wishlists
```typescript
const response = await wishlistService.getFollowedWishlists(page, limit);
```

---

### Import/Export

#### Export Wishlist
```typescript
const response = await wishlistService.exportWishlist(
  wishlistId,
  'pdf' // 'pdf' | 'csv' | 'json'
);

// Returns: { downloadUrl: string, filename: string, expiresAt: string }
```

#### Import Wishlist
```typescript
const file = event.target.files[0];
const response = await wishlistService.importWishlist(
  file,
  wishlistId // optional - creates new if not provided
);

// Returns: { imported: number, failed: number, wishlistId: string, errors?: [...] }
```

---

### Price Tracking

#### Get Price Alerts
```typescript
const response = await wishlistService.getPriceAlerts(); // All wishlists
const response = await wishlistService.getPriceAlerts(wishlistId); // Specific wishlist
```

#### Set Price Alert
```typescript
const response = await wishlistService.setPriceAlert(itemId, 99.99);

// alertPrice must be > 0
```

#### Remove Price Alert
```typescript
const response = await wishlistService.removePriceAlert(itemId);
```

---

### Analytics & Insights

#### Get Wishlist Analytics
```typescript
const response = await wishlistService.getWishlistAnalytics(); // All wishlists
const response = await wishlistService.getWishlistAnalytics(
  wishlistId,
  { from: '2025-01-01', to: '2025-12-31' } // optional date range
);

// Returns: WishlistAnalytics (overview, trends, behavior, insights)
```

#### Get Similar Items
```typescript
const response = await wishlistService.getSimilarItems(itemId, 5);

// limit: 1-20, default: 5
```

#### Get Recommendations
```typescript
const response = await wishlistService.getRecommendations(); // All wishlists
const response = await wishlistService.getRecommendations(wishlistId, 10);

// limit: 1-50, default: 10
```

---

### Offline Support

#### Sync Wishlist
```typescript
const response = await wishlistService.syncWishlist(wishlistId, [
  { action: 'add', data: { itemType: 'product', itemId: '123' } },
  { action: 'remove', itemId: '456' },
  { action: 'update', itemId: '789', data: { priority: 'high' } }
]);

// Returns: Wishlist (synced version)
```

---

## Error Handling

### Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;      // Technical error message
  message?: string;    // User-friendly message
  errors?: Record<string, string[]>;
  timestamp?: string;
}
```

### Example Usage
```typescript
const response = await wishlistService.addToWishlist({ itemType: 'product', itemId: '123' });

if (response.success && response.data) {
  // Success
  console.log('Item added:', response.data);
  showToast('Added to wishlist!');
} else {
  // Error
  console.error('Error:', response.error); // Technical details
  showToast(response.message); // User-friendly message
}
```

### Common Error Messages

#### Input Validation Errors:
- "Item type is required"
- "Invalid item type" (must be product/video/store/project)
- "Item ID is required"
- "Invalid priority" (must be low/medium/high)
- "Page number must be at least 1"
- "Limit must be between 1 and 100"
- "Wishlist name is required"
- "Wishlist name must be 100 characters or less"

#### Server Errors:
- "Failed to load wishlists. Please try again."
- "Failed to add item to wishlist. Please try again."
- "Failed to remove item from wishlist. Please try again."
- "Failed to create default wishlist"

---

## Optimistic Updates Pattern

```typescript
// 1. Update UI optimistically
dispatch({ type: 'ADD_TO_WISHLIST_OPTIMISTIC', payload: item });

// 2. Make API call
const response = await wishlistService.addToWishlist({
  itemType: 'product',
  itemId: item.id,
  priority: 'high'
});

// 3. Confirm or revert
if (response.success) {
  // Success - update with server data
  dispatch({ type: 'ADD_TO_WISHLIST_SUCCESS', payload: response.data });
} else {
  // Failed - revert optimistic update
  dispatch({ type: 'ADD_TO_WISHLIST_FAILED', payload: item });
  showToast(response.message);
}
```

---

## Retry Logic

All methods automatically retry on network failures:
- **Max retries:** 2 (except file uploads: 1)
- **Retry on:** 408, 429, 500, 502, 503, 504 status codes
- **Backoff:** Exponential (1s, 2s, 4s...)
- **No retry on:** 4xx client errors (except 408, 429)

---

## Logging

All methods log requests and responses automatically:

```
[API REQUEST] POST /wishlist
  Timestamp: 2025-01-15T10:30:00.000Z
  Data: { name: 'My Wishlist' }

[API RESPONSE] POST /wishlist (324ms)
  Timestamp: 2025-01-15T10:30:00.324Z
  Success: true
  Data: { id: '...', name: 'My Wishlist', ... }
```

To enable/disable logging, modify the `logApiRequest()` and `logApiResponse()` functions in `utils/apiUtils.ts`.

---

## TypeScript Types

```typescript
import {
  Wishlist,
  WishlistItem,
  WishlistsQuery,
  WishlistsResponse,
  CreateWishlistRequest,
  AddToWishlistRequest,
  WishlistAnalytics
} from '@/services/wishlistApi';
```

---

## Best Practices

### ✅ DO:
- Check `response.success` before accessing `response.data`
- Display `response.message` to users (user-friendly)
- Log `response.error` for debugging (technical details)
- Use optimistic updates for better UX
- Validate input before calling API methods
- Handle loading states in UI

### ❌ DON'T:
- Don't assume `response.data` exists
- Don't display `response.error` to users (technical)
- Don't ignore error responses
- Don't call API methods without checking authentication
- Don't make rapid sequential calls (use bulk operations)

---

## Performance Tips

1. **Use pagination** - Always use `page` and `limit` parameters
2. **Use bulk operations** - For multiple items, use `bulkAddToWishlist()` instead of multiple `addToWishlist()` calls
3. **Cache results** - Cache wishlist data in your state management
4. **Debounce updates** - Debounce rapid wishlist updates
5. **Optimistic updates** - Update UI immediately, sync later

---

## Examples

### Complete Add to Wishlist Flow
```typescript
import { useState } from 'react';
import wishlistService from '@/services/wishlistApi';

function ProductCard({ product }) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleWishlistToggle = async () => {
    setLoading(true);

    if (isInWishlist) {
      // Remove from wishlist
      const response = await wishlistService.removeFromWishlist(product.wishlistItemId);

      if (response.success) {
        setIsInWishlist(false);
        showToast('Removed from wishlist');
      } else {
        showToast(response.message);
      }
    } else {
      // Add to wishlist
      const response = await wishlistService.addToWishlist({
        itemType: 'product',
        itemId: product.id,
        priority: 'medium'
      });

      if (response.success && response.data) {
        setIsInWishlist(true);
        product.wishlistItemId = response.data.id;
        showToast('Added to wishlist');
      } else {
        showToast(response.message);
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleWishlistToggle} disabled={loading}>
        {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
      </button>
    </div>
  );
}
```

### Check Wishlist Status on Mount
```typescript
useEffect(() => {
  const checkWishlistStatus = async () => {
    const response = await wishlistService.isInWishlist('product', product.id);

    if (response.success && response.data) {
      setIsInWishlist(response.data.inWishlist);
      if (response.data.wishlistItemId) {
        product.wishlistItemId = response.data.wishlistItemId;
      }
    }
  };

  checkWishlistStatus();
}, [product.id]);
```

### Bulk Add Products
```typescript
const handleAddMultiple = async (products) => {
  const items = products.map(p => ({
    itemType: 'product' as const,
    itemId: p.id,
    priority: 'medium' as const
  }));

  const response = await wishlistService.bulkAddToWishlist(items);

  if (response.success && response.data) {
    showToast(`Added ${response.data.added} items to wishlist`);
    if (response.data.failed > 0) {
      showToast(`Failed to add ${response.data.failed} items`, 'warning');
    }
  } else {
    showToast(response.message);
  }
};
```

---

## Quick Troubleshooting

### "Item type is required" error
✅ Make sure you're passing `itemType` in the request

### "Failed to create default wishlist" error
✅ Check if user is authenticated
✅ Check backend wishlist creation endpoint

### Items not appearing in wishlist
✅ Check if `response.success` is true
✅ Verify item was added successfully (check `response.data`)
✅ Refresh wishlist data

### Validation errors on server response
✅ Check if backend response matches expected structure
✅ Review validation functions in `wishlistApi.ts`
✅ Check browser console for detailed validation errors

---

**For more details, see: `WISHLIST_API_ENHANCEMENT_REPORT.md`**
