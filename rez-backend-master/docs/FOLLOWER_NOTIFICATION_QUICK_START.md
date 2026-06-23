# Follower Notification System - Quick Start Guide

## 🚀 Quick Overview

The Follower Notification System allows merchants to notify all users who follow their stores about new offers, products, and announcements.

## 📁 Files Modified/Created

### Created:
- `src/services/followerNotificationService.ts` - Core notification service

### Modified:
- `src/controllers/storeController.ts` - Added 5 new endpoints
- `src/routes/storeRoutes.ts` - Added follower notification routes

## 🔗 API Endpoints

### Public Endpoints

#### Get Follower Count
```
GET /api/stores/:storeId/followers/count
```

### Protected Endpoints (Require Authentication)

#### Get Followers List
```
GET /api/stores/:storeId/followers
Authorization: Bearer <token>
```

#### Send Custom Notification
```
POST /api/stores/:storeId/notify-followers
Authorization: Bearer <token>

Body:
{
  "title": "Announcement Title",
  "message": "Announcement message",
  "imageUrl": "https://...", // optional
  "deepLink": "/stores/..." // optional
}
```

#### Notify About New Offer
```
POST /api/stores/:storeId/notify-offer
Authorization: Bearer <token>

Body:
{
  "offerId": "60d5ec49f1b2c8a1d8e4f456",
  "title": "Offer Title",
  "description": "Offer details", // optional
  "discount": 50, // optional
  "imageUrl": "https://..." // optional
}
```

#### Notify About New Product
```
POST /api/stores/:storeId/notify-product
Authorization: Bearer <token>

Body:
{
  "productId": "60d5ec49f1b2c8a1d8e4f789"
}
```

## 🔧 Usage in Code

### Import the Service
```typescript
import followerNotificationService from '../services/followerNotificationService';
```

### Send Notification to Followers
```typescript
// Get follower count
const count = await followerNotificationService.getStoreFollowerCount(storeId);

// Get follower IDs
const followers = await followerNotificationService.getStoreFollowers(storeId);

// Notify about new offer
const result = await followerNotificationService.notifyNewOffer(storeId, {
  _id: offerId,
  title: "50% Off Sale",
  discount: 50
});

// Notify about new product
const result = await followerNotificationService.notifyNewProduct(storeId, {
  _id: productId,
  name: "New Product",
  pricing: { selling: 999 },
  images: [{ url: "https://..." }],
  slug: "new-product"
});

// Send custom announcement
const result = await followerNotificationService.notifyStoreUpdate(storeId, {
  title: "Store Opening",
  message: "Visit our new location!",
  imageUrl: "https://..."
});
```

### Result Format
```typescript
{
  sent: 123,        // Successfully sent
  failed: 2,        // Failed to send
  totalFollowers: 125  // Total followers
}
```

## 🔐 Authorization

All protected endpoints verify:
1. ✅ User is authenticated (valid JWT token)
2. ✅ User owns the store (merchantId matches userId) OR user is admin
3. ✅ Store exists and is active

## 📝 Validation Rules

### Custom Notification
- **title**: 3-100 characters (required)
- **message**: 10-500 characters (required)
- **imageUrl**: Valid URI (optional)
- **deepLink**: String (optional)

### Offer Notification
- **offerId**: Valid ObjectId (required)
- **title**: 3-100 characters (required)
- **description**: Max 500 characters (optional)
- **discount**: 0-100 (optional)
- **imageUrl**: Valid URI (optional)

### Product Notification
- **productId**: Valid ObjectId (required)

## 🎯 Notification Types

The service supports these notification types:
- `new_offer` - New offer announcement
- `new_product` - New product arrival
- `price_drop` - Price reduction alert
- `back_in_stock` - Product availability
- `new_menu_item` - New menu item (restaurants)
- `store_update` - General announcements

## 📊 How It Works

### 1. User Follows Store
Users follow stores by adding them to wishlist:
```typescript
{
  itemType: 'Store',
  itemId: storeId
}
```

### 2. Merchant Sends Notification
Merchant calls API endpoint to send notification

### 3. System Processes
- Retrieves all followers from Wishlist
- Checks user notification preferences
- Creates notifications using NotificationService
- Emits real-time via Socket.IO

### 4. Users Receive
- In-app notifications
- Push notifications (if enabled)
- Real-time Socket.IO events

## ✅ Testing

### Test Follower Count
```bash
curl http://localhost:5000/api/stores/STORE_ID/followers/count
```

### Test Send Notification (requires auth token)
```bash
curl -X POST http://localhost:5000/api/stores/STORE_ID/notify-followers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "Testing follower notifications"
  }'
```

## 🐛 Troubleshooting

### No followers found?
- Check if store has followers in wishlist
- Verify `itemType: 'Store'` in wishlist items
- Ensure storeId is correct

### Notifications not sending?
- Check user notification preferences
- Verify Socket.IO connection
- Check backend logs for errors

### Authorization errors?
- Verify JWT token is valid
- Check merchantId matches store owner
- Ensure user has proper permissions

## 📌 Important Notes

1. **No Database Changes Required** - Uses existing Wishlist and Notification models
2. **Respects User Preferences** - Checks UserSettings before sending
3. **Real-time Updates** - Integrates with Socket.IO
4. **Error Handling** - Returns detailed sent/failed counts
5. **Logging** - Comprehensive logging for debugging

## 🔄 Integration Examples

### Auto-notify on Product Creation
```typescript
// In product controller
const product = await Product.create(productData);

// Auto-notify followers
if (product.store) {
  await followerNotificationService.notifyNewProduct(
    product.store,
    product
  );
}
```

### Auto-notify on Price Drop
```typescript
// In product update controller
if (updates.pricing && updates.pricing.selling < oldPrice) {
  await followerNotificationService.notifyPriceDrop(
    product.store,
    product,
    oldPrice,
    updates.pricing.selling
  );
}
```

## 📚 Additional Features

The service also includes:
- `notifyPriceDrop()` - Price reduction alerts
- `notifyBackInStock()` - Stock availability
- `notifyNewMenuItem()` - Restaurant menu updates
- `notifyMultipleStoreFollowers()` - Bulk operations

## 🎉 Ready to Use!

The system is fully implemented and ready for production. Simply:
1. Merchants authenticate
2. Call appropriate endpoint
3. Followers receive notifications instantly

No server restart needed - the implementation is complete!
