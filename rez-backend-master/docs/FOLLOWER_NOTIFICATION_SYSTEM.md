# Follower Notification System

## Overview
The Follower Notification System enables merchants to send notifications to all users who follow their stores. This system integrates with the existing notification infrastructure and uses the Wishlist model to track store followers.

## Implementation Summary

### Files Created/Modified

#### 1. New Service: `src/services/followerNotificationService.ts`
A comprehensive service that manages all follower notification functionality:

**Key Functions:**
- `getStoreFollowers(storeId)` - Get all follower user IDs for a store
- `getStoreFollowerCount(storeId)` - Get the count of followers
- `notifyFollowers(storeId, notification)` - Send notification to all followers
- `notifyNewOffer(storeId, offer)` - Notify about new offers
- `notifyNewProduct(storeId, product)` - Notify about new products
- `notifyPriceDrop(storeId, product, oldPrice, newPrice)` - Notify about price drops
- `notifyBackInStock(storeId, product)` - Notify when product is back in stock
- `notifyNewMenuItem(storeId, menuItem)` - Notify about new menu items (restaurants)
- `notifyStoreUpdate(storeId, announcement)` - Send custom announcements
- `notifyMultipleStoreFollowers(notifications)` - Bulk notifications to multiple stores

**Features:**
- ✅ Uses existing Notification model and NotificationService
- ✅ Integrates with Socket.IO for real-time notifications
- ✅ Respects user notification preferences
- ✅ Supports push notifications and in-app notifications
- ✅ Proper error handling and logging
- ✅ Returns detailed results (sent/failed/total counts)

#### 2. Modified: `src/controllers/storeController.ts`
Added new controller endpoints for follower notifications:

**New Endpoints:**
- `getStoreFollowerCount` - Get follower count (public)
- `getStoreFollowers` - Get follower list (merchant/admin only)
- `sendFollowerNotification` - Send custom notification (merchant/admin only)
- `notifyNewOffer` - Notify about new offer (merchant/admin only)
- `notifyNewProduct` - Notify about new product (merchant/admin only)

**Security:**
- ✅ Verifies merchant ownership before sending notifications
- ✅ Validates all input data
- ✅ Proper authorization checks

#### 3. Modified: `src/routes/storeRoutes.ts`
Added routes for follower notification system:

```
GET    /api/stores/:storeId/followers/count       - Get follower count (public)
GET    /api/stores/:storeId/followers             - Get followers (auth required)
POST   /api/stores/:storeId/notify-followers      - Send custom notification (auth required)
POST   /api/stores/:storeId/notify-offer          - Notify about offer (auth required)
POST   /api/stores/:storeId/notify-product        - Notify about product (auth required)
```

**Validation:**
- ✅ All routes have proper validation
- ✅ Authentication required for sensitive operations
- ✅ Input sanitization and validation with Joi

## API Documentation

### 1. Get Follower Count
```
GET /api/stores/:storeId/followers/count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 125
  },
  "message": "Follower count retrieved successfully"
}
```

### 2. Get Store Followers (Merchant/Admin Only)
```
GET /api/stores/:storeId/followers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storeId": "60d5ec49f1b2c8a1d8e4f123",
    "followerCount": 125,
    "followers": ["60d5ec49f1b2c8a1d8e4f124", "60d5ec49f1b2c8a1d8e4f125", ...]
  },
  "message": "Followers retrieved successfully"
}
```

### 3. Send Custom Notification
```
POST /api/stores/:storeId/notify-followers
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Weekend Sale!",
  "message": "Get 50% off on all items this weekend. Visit us now!",
  "imageUrl": "https://example.com/sale-banner.jpg",
  "deepLink": "/stores/my-store/offers"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 123,
    "failed": 2,
    "totalFollowers": 125
  },
  "message": "Notifications sent successfully"
}
```

### 4. Notify About New Offer
```
POST /api/stores/:storeId/notify-offer
Authorization: Bearer <token>
Content-Type: application/json

{
  "offerId": "60d5ec49f1b2c8a1d8e4f456",
  "title": "Flash Sale - 70% Off!",
  "description": "Limited time offer on selected items",
  "discount": 70,
  "imageUrl": "https://example.com/flash-sale.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 123,
    "failed": 2,
    "totalFollowers": 125
  },
  "message": "Offer notification sent to followers"
}
```

### 5. Notify About New Product
```
POST /api/stores/:storeId/notify-product
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "60d5ec49f1b2c8a1d8e4f789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 123,
    "failed": 2,
    "totalFollowers": 125
  },
  "message": "Product notification sent to followers"
}
```

## How It Works

### Following a Store
Users follow stores by adding them to their wishlist:
```javascript
// Wishlist entry with itemType: 'Store'
{
  user: userId,
  items: [
    {
      itemType: 'Store',
      itemId: storeId,
      addedAt: new Date()
    }
  ]
}
```

### Notification Flow
1. Merchant creates new offer/product or sends announcement
2. System retrieves all followers from Wishlist model
3. For each follower:
   - Check user notification preferences
   - Create notification using NotificationService
   - Emit real-time notification via Socket.IO
4. Return results with sent/failed counts

### Integration with Existing Systems

**Notification Model:**
- Uses existing `Notification` model
- Supports multiple delivery channels (push, email, SMS, in-app)
- Respects user notification preferences from `UserSettings`

**NotificationService:**
- Leverages `NotificationService.createNotification()`
- Automatic Socket.IO real-time delivery
- Proper error handling and logging

**Wishlist Model:**
- Uses existing wishlist entries where `itemType: 'Store'`
- No schema changes required

## Usage Examples

### For Merchants (Via API)

#### Send Announcement
```javascript
// Merchant sends custom announcement
fetch('/api/stores/60d5ec49f1b2c8a1d8e4f123/notify-followers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Grand Opening!',
    message: 'Visit our new branch this weekend and get exclusive offers!',
    imageUrl: 'https://example.com/opening.jpg'
  })
});
```

#### Notify New Product
```javascript
// Automatically notify when adding new product
const product = await Product.create({...});

fetch(`/api/stores/${storeId}/notify-product`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: product._id
  })
});
```

### For Backend Services

#### Automatic Notifications on Product Creation
```javascript
import followerNotificationService from './services/followerNotificationService';

// In product controller after creating product
const newProduct = await Product.create(productData);

// Auto-notify followers
await followerNotificationService.notifyNewProduct(
  storeId,
  newProduct
);
```

#### Price Drop Notifications
```javascript
// In product update controller
if (newPrice < oldPrice) {
  await followerNotificationService.notifyPriceDrop(
    storeId,
    product,
    oldPrice,
    newPrice
  );
}
```

#### Back in Stock Notifications
```javascript
// When product stock is updated
if (product.stock > 0 && wasOutOfStock) {
  await followerNotificationService.notifyBackInStock(
    storeId,
    product
  );
}
```

## Security & Authorization

### Merchant Verification
All notification endpoints verify that:
1. User is authenticated
2. User owns the store (merchantId matches userId) OR user is admin
3. Store exists and is active

### Input Validation
- All inputs validated with Joi schemas
- Title: 3-100 characters
- Message: 10-500 characters
- URLs validated for proper format
- ObjectIds validated

### Rate Limiting
Consider adding rate limiting for notification endpoints:
```javascript
// Example rate limit: 10 notifications per hour per store
import rateLimit from 'express-rate-limit';

const notificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many notifications sent, please try again later'
});
```

## Best Practices

### 1. Notification Content
- Keep titles short and engaging (max 50 chars recommended)
- Make messages clear and actionable
- Include relevant images when available
- Provide deep links for easy navigation

### 2. Timing
- Send notifications during business hours
- Avoid notification spam (max 1-2 per day per store)
- Schedule bulk notifications during off-peak hours

### 3. Monitoring
- Track delivery success rates
- Monitor failed notifications
- Log errors for debugging
- Track user engagement (clicks, conversions)

### 4. User Experience
- Respect user notification preferences
- Allow users to unfollow/mute stores
- Provide notification history
- Enable notification customization

## Testing

### Manual Testing
```bash
# 1. Get follower count
curl -X GET "http://localhost:5000/api/stores/60d5ec49f1b2c8a1d8e4f123/followers/count"

# 2. Get followers (requires auth)
curl -X GET "http://localhost:5000/api/stores/60d5ec49f1b2c8a1d8e4f123/followers" \
  -H "Authorization: Bearer <token>"

# 3. Send custom notification (requires auth)
curl -X POST "http://localhost:5000/api/stores/60d5ec49f1b2c8a1d8e4f123/notify-followers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification to all followers"
  }'

# 4. Notify new offer (requires auth)
curl -X POST "http://localhost:5000/api/stores/60d5ec49f1b2c8a1d8e4f123/notify-offer" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "offerId": "60d5ec49f1b2c8a1d8e4f456",
    "title": "50% Off Sale",
    "discount": 50
  }'

# 5. Notify new product (requires auth)
curl -X POST "http://localhost:5000/api/stores/60d5ec49f1b2c8a1d8e4f123/notify-product" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "60d5ec49f1b2c8a1d8e4f789"
  }'
```

## Future Enhancements

### Potential Features
1. **Scheduled Notifications** - Schedule notifications for future delivery
2. **Notification Templates** - Pre-built templates for common notifications
3. **Segmented Notifications** - Target specific follower segments
4. **A/B Testing** - Test different notification messages
5. **Analytics Dashboard** - Track notification performance
6. **Notification Preferences** - Granular user control
7. **Rich Notifications** - Support for actions, carousels, etc.
8. **Delivery Reports** - Detailed delivery and engagement reports

### Performance Optimization
- **Batch Processing** - Process notifications in batches
- **Queue System** - Use Redis queue for large follower lists
- **Caching** - Cache follower lists for frequently accessed stores
- **Background Jobs** - Move notification sending to background jobs

## Troubleshooting

### Common Issues

**1. Notifications not being sent**
- Check if users have notification preferences enabled
- Verify Socket.IO connection
- Check logs for errors

**2. Authorization errors**
- Verify JWT token is valid
- Check merchantId matches store owner
- Ensure user has proper permissions

**3. No followers found**
- Verify store has followers in wishlist
- Check wishlist items have `itemType: 'Store'`
- Ensure storeId is correct

### Debugging
```javascript
// Enable detailed logging
console.log('📢 [FOLLOWER SERVICE] Sending to followers:', followerIds);
console.log('✅ [FOLLOWER SERVICE] Sent:', sent, 'Failed:', failed);
```

## Conclusion

The Follower Notification System is now fully implemented and ready for use. Merchants can send notifications to their followers through multiple endpoints, with proper authorization, validation, and error handling. The system integrates seamlessly with existing notification infrastructure and respects user preferences.

### Key Benefits
- ✅ Real-time notifications via Socket.IO
- ✅ Multiple notification types (offers, products, announcements)
- ✅ Respects user preferences
- ✅ Secure and properly authorized
- ✅ Comprehensive error handling
- ✅ Easy to use API
- ✅ No database schema changes required

### Next Steps
1. Test all endpoints thoroughly
2. Consider adding rate limiting
3. Implement scheduled notifications (optional)
4. Create merchant dashboard for managing notifications
5. Add analytics and tracking
