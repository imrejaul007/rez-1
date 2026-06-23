# Notification API - Quick Reference

## All 17 Endpoints at a Glance

### GET Endpoints (Read)
```
1. GET  /api/merchant/notifications           - List all (paginated)
2. GET  /api/merchant/notifications/:id       - Get single
3. GET  /api/merchant/notifications/unread    - Get unread (max 50)
4. GET  /api/merchant/notifications/archived  - Get archived
5. GET  /api/merchant/notifications/stats     - Get statistics
6. GET  /api/merchant/notifications/preferences - Get preferences
```

### POST Endpoints (Create/Update)
```
7.  POST /api/merchant/notifications/:id/mark-read        - Mark single as read
8.  POST /api/merchant/notifications/mark-multiple-read   - Mark multiple as read
9.  POST /api/merchant/notifications/delete-multiple      - Delete multiple
10. POST /api/merchant/notifications/clear-all            - Clear all
11. POST /api/merchant/notifications/test                 - Send test notification
12. POST /api/merchant/notifications/subscribe-email      - Subscribe to email
13. POST /api/merchant/notifications/unsubscribe-email    - Unsubscribe from email
14. POST /api/merchant/notifications/subscribe-sms        - Subscribe to SMS
15. POST /api/merchant/notifications/unsubscribe-sms      - Unsubscribe from SMS
```

### PUT Endpoints (Update)
```
16. PUT /api/merchant/notifications/preferences      - Update preferences
17. PUT /api/merchant/notifications/:id/archive      - Archive notification
```

### DELETE Endpoints
```
18. DELETE /api/merchant/notifications/:id           - Delete single
```

---

## Common Use Cases

### 1. Get Unread Notifications Badge
```javascript
GET /api/merchant/notifications/unread

// Response header includes: X-Unread-Count: 5
// Response body includes: { count: 5, notifications: [...] }
```

### 2. Mark Notification as Read
```javascript
POST /api/merchant/notifications/:id/mark-read

// Returns: { notification, unreadCount }
// Socket.IO emits: 'notification:read'
```

### 3. Mark All Notifications as Read
```javascript
// Get all unread IDs first
GET /api/merchant/notifications?status=unread

// Then mark them all
POST /api/merchant/notifications/mark-multiple-read
Body: { notificationIds: [...] }
```

### 4. Clear All Read Notifications
```javascript
POST /api/merchant/notifications/clear-all?onlyRead=true
```

### 5. Subscribe/Unsubscribe Email
```javascript
// Subscribe
POST /api/merchant/notifications/subscribe-email

// Unsubscribe
POST /api/merchant/notifications/unsubscribe-email
```

---

## Socket.IO Events

### Listen for New Notifications
```javascript
socket.on('notification:new', (data) => {
  console.log(data.notification);
});
```

### Listen for Unread Count
```javascript
socket.on('notification:count', (data) => {
  console.log(data.count);
});
```

### All Socket Events
```
- notification:new           - New notification created
- notification:read          - Single marked as read
- notifications:bulk-read    - Multiple marked as read
- notification:deleted       - Single deleted
- notifications:bulk-deleted - Multiple deleted
- notification:archived      - Single archived
- notifications:cleared      - All cleared
- notification:count         - Unread count updated
- preferences:updated        - Preferences changed
```

---

## NotificationService Helper

### Create Notifications

```typescript
import NotificationService from './services/notificationService';

// Order notification
await NotificationService.notifyOrderUpdate(userId, orderId, 'shipped', orderNumber);

// Earning notification
await NotificationService.notifyEarning(userId, 100, 'Order Cashback', transactionId);

// Promotional notification
await NotificationService.notifyPromotion(userId, title, message, imageUrl, deepLink);

// Security alert
await NotificationService.notifySecurityAlert(userId, title, message, actionRequired);

// System notification
await NotificationService.notifySystem(userId, title, message, priority);

// Reminder
await NotificationService.notifyReminder(userId, title, message, scheduledAt);

// Custom notification
await NotificationService.createNotification({
  userId,
  title: 'Custom Title',
  message: 'Custom message',
  type: 'info',
  category: 'general',
  priority: 'medium',
  data: { customField: 'value' },
  deliveryChannels: ['push', 'in_app']
});

// Bulk notifications
await NotificationService.createBulkNotifications(userIds, options);
```

### Other Helper Methods

```typescript
// Get preferences
const prefs = await NotificationService.getUserPreferences(userId);

// Update preferences
await NotificationService.updateUserPreferences(userId, preferences);

// Mark as read
await NotificationService.markAsRead(notificationId, userId);

// Delete notification
await NotificationService.deleteNotification(notificationId, userId);

// Process scheduled notifications (cron job)
const processed = await NotificationService.processScheduledNotifications();

// Cleanup old notifications (cron job)
const deleted = await NotificationService.cleanupOldNotifications(90);
```

---

## Models

### Notification
```typescript
{
  user: ObjectId,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'promotional',
  category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  data: { orderId, deepLink, actionButton, ... },
  deliveryChannels: ['push', 'email', 'sms', 'in_app'],
  isRead: boolean,
  isArchived: boolean,
  deletedAt: Date,
  expiresAt: Date,
  scheduledAt: Date,
  createdAt: Date
}
```

### UserSettings (Notifications)
```typescript
{
  user: ObjectId,
  notifications: {
    push: { enabled, orderUpdates, promotions, ... },
    email: { enabled, newsletters, orderReceipts, ... },
    sms: { enabled, orderUpdates, deliveryAlerts, ... },
    inApp: { enabled, showBadges, soundEnabled, ... }
  }
}
```

---

## Filter & Pagination

### List Notifications with Filters
```javascript
GET /api/merchant/notifications?
  type=info&
  status=unread&
  category=order&
  sortBy=createdAt&
  order=desc&
  page=1&
  limit=20
```

### Common Filters
```
type: info | success | warning | error | promotional
status: unread | read
category: order | earning | general | promotional | social | security | system | reminder
sortBy: createdAt | priority
order: desc | asc
page: 1+
limit: 1-100
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

---

## Testing

### Send Test Notification
```javascript
POST /api/merchant/notifications/test

// Creates a test notification and emits via Socket.IO
```

### Check Stats
```javascript
GET /api/merchant/notifications/stats

// Returns overview, byCategory, byPriority, recentActivity
```

---

## Frontend Integration Checklist

- [ ] Setup Socket.IO connection with JWT auth
- [ ] Listen for `notification:new` event
- [ ] Listen for `notification:count` event
- [ ] Display unread badge
- [ ] Implement notification dropdown/list
- [ ] Add mark as read functionality
- [ ] Add delete functionality
- [ ] Show toast for new notifications
- [ ] Play sound for new notifications (if enabled)
- [ ] Implement preferences page
- [ ] Handle deep links for navigation
- [ ] Add notification settings toggle
- [ ] Implement pull-to-refresh
- [ ] Add empty state for no notifications
- [ ] Show loading states
- [ ] Handle socket disconnection gracefully

---

## Cron Jobs

### Scheduled Notifications Processor
```typescript
// Run every minute
cron.schedule('* * * * *', async () => {
  const processed = await NotificationService.processScheduledNotifications();
  console.log(`Processed ${processed} scheduled notifications`);
});
```

### Cleanup Old Notifications
```typescript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const deleted = await NotificationService.cleanupOldNotifications(90);
  console.log(`Cleaned up ${deleted} old notifications`);
});
```

---

## Security Notes

- All endpoints require authentication
- Users can only access their own notifications
- Input validation with Joi schemas
- Soft delete for audit trails
- Rate limiting recommended
- Socket.IO uses JWT authentication

---

## Performance Tips

- Use pagination for large lists
- Cache user preferences (5-min TTL recommended)
- Use bulk operations when possible
- Enable indexes (already configured)
- Limit unread fetch to 50 items
- Use Socket.IO for real-time updates instead of polling

---

## Common Errors

### 401 Unauthorized
- Check JWT token validity
- Ensure Authorization header is set

### 404 Not Found
- Verify notification ID is valid
- Check if notification belongs to user

### 400 Bad Request
- Validate request body format
- Check query parameter values

### Socket Connection Failed
- Verify Socket.IO server is running
- Check CORS configuration
- Ensure token is passed in auth

---

## Support

For detailed documentation, see: `NOTIFICATION_SYSTEM_DOCUMENTATION.md`

For implementation questions:
- Check the NotificationService helper
- Review Socket.IO event handlers
- Refer to sample requests/responses in full docs
