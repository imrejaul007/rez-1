# Merchant Notification System - Complete Documentation

## Overview

The notification system provides comprehensive real-time notification functionality for merchants with 17 endpoints supporting all CRUD operations, preferences management, and real-time Socket.IO integration.

---

## Table of Contents

1. [All 17 Endpoints](#all-17-endpoints)
2. [Models](#models)
3. [Socket.IO Events](#socketio-events)
4. [Notification Service Helper](#notification-service-helper)
5. [Sample Requests & Responses](#sample-requests--responses)
6. [Integration Guide](#integration-guide)

---

## All 17 Endpoints

### 1. GET `/api/merchant/notifications`
**Description:** Get all notifications with filtering and pagination

**Query Parameters:**
- `type` - Filter by type (info|success|warning|error|promotional)
- `status` - Filter by read status (unread|read)
- `category` - Filter by category (order|earning|general|promotional|social|security|system|reminder)
- `sortBy` - Sort field (createdAt|priority) - default: createdAt
- `order` - Sort order (desc|asc) - default: desc
- `page` - Page number - default: 1
- `limit` - Items per page (1-100) - default: 20

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  },
  "message": "Notifications retrieved successfully"
}
```

---

### 2. GET `/api/merchant/notifications/:id`
**Description:** Get single notification by ID

**Parameters:**
- `id` - Notification ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "title": "Order Shipped",
      "message": "Your order #12345 has been shipped",
      "type": "info",
      "category": "order",
      "priority": "high",
      "isRead": false,
      "createdAt": "2025-01-18T10:30:00Z",
      "data": {
        "orderId": "12345",
        "deepLink": "/orders/12345"
      }
    }
  },
  "message": "Notification retrieved successfully"
}
```

---

### 3. GET `/api/merchant/notifications/unread`
**Description:** Get unread notifications (max 50 most recent)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "count": 5
  },
  "message": "Unread notifications retrieved successfully"
}
```

**Headers:**
- `X-Unread-Count: 5`

---

### 4. GET `/api/merchant/notifications/archived`
**Description:** Get archived notifications with pagination

**Query Parameters:**
- `page` - Page number - default: 1
- `limit` - Items per page (1-100) - default: 20

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  },
  "message": "Archived notifications retrieved successfully"
}
```

---

### 5. GET `/api/merchant/notifications/stats`
**Description:** Get notification statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 150,
      "unread": 5,
      "read": 140,
      "archived": 5
    },
    "byCategory": [
      { "_id": "order", "count": 80, "unread": 2 },
      { "_id": "earning", "count": 40, "unread": 1 },
      { "_id": "system", "count": 30, "unread": 2 }
    ],
    "byPriority": [
      { "_id": "high", "count": 3 },
      { "_id": "medium", "count": 2 }
    ],
    "recentActivity": [
      { "_id": "2025-01-18", "count": 5 },
      { "_id": "2025-01-17", "count": 8 }
    ],
    "generatedAt": "2025-01-18T12:00:00Z"
  },
  "message": "Notification statistics retrieved successfully"
}
```

---

### 6. GET `/api/merchant/notifications/preferences`
**Description:** Get notification preferences

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "channels": {
      "email": true,
      "push": true,
      "sms": false,
      "inApp": true
    },
    "categories": {
      "order": { "email": true, "push": true, "sms": false, "inApp": true },
      "earning": { "email": true, "push": true, "sms": false, "inApp": true },
      "security": { "email": true, "push": true, "sms": true, "inApp": true }
    },
    "quietHours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Kolkata"
    },
    "frequency": {
      "digest": "daily",
      "maxPerDay": 50
    }
  },
  "message": "Notification preferences retrieved successfully"
}
```

---

### 7. PUT `/api/merchant/notifications/preferences`
**Description:** Update notification preferences

**Request Body:**
```json
{
  "channels": {
    "email": true,
    "push": true,
    "sms": false,
    "inApp": true
  },
  "categories": {
    "order": { "email": true, "push": true, "sms": false, "inApp": true }
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "Asia/Kolkata"
  },
  "frequency": {
    "digest": "daily",
    "maxPerDay": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated preferences */ },
  "message": "Notification preferences updated successfully"
}
```

---

### 8. POST `/api/merchant/notifications/:id/mark-read`
**Description:** Mark single notification as read

**Parameters:**
- `id` - Notification ID

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": { /* Updated notification */ },
    "unreadCount": 4
  },
  "message": "Notification marked as read"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notification:read',
  data: {
    notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
    unreadCount: 4,
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 9. POST `/api/merchant/notifications/mark-multiple-read`
**Description:** Mark multiple notifications as read

**Request Body:**
```json
{
  "notificationIds": [
    "65f1a2b3c4d5e6f7g8h9i0j1",
    "65f1a2b3c4d5e6f7g8h9i0j2"
  ]
}
```

**Validation:**
- `notificationIds` - Array of 1-100 valid MongoDB ObjectIds

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "unreadCount": 3
  },
  "message": "2 notification(s) marked as read"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notifications:bulk-read',
  data: {
    notificationIds: [...],
    updated: 2,
    unreadCount: 3,
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 10. POST `/api/merchant/notifications/mark-all-read`
**Description:** Mark all notifications as read (Not yet implemented - use mark-multiple-read)

---

### 11. DELETE `/api/merchant/notifications/:id`
**Description:** Delete single notification (soft delete)

**Parameters:**
- `id` - Notification ID

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": { /* Deleted notification */ }
  },
  "message": "Notification deleted successfully"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notification:deleted',
  data: {
    notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 12. POST `/api/merchant/notifications/delete-multiple`
**Description:** Delete multiple notifications (soft delete)

**Request Body:**
```json
{
  "notificationIds": [
    "65f1a2b3c4d5e6f7g8h9i0j1",
    "65f1a2b3c4d5e6f7g8h9i0j2"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 2
  },
  "message": "2 notification(s) deleted"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notifications:bulk-deleted',
  data: {
    notificationIds: [...],
    deleted: 2,
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 13. PUT `/api/merchant/notifications/:id/archive`
**Description:** Archive a single notification

**Parameters:**
- `id` - Notification ID

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "isArchived": true,
      "archivedAt": "2025-01-18T12:00:00Z"
    }
  },
  "message": "Notification archived successfully"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notification:archived',
  data: {
    notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 14. POST `/api/merchant/notifications/clear-all`
**Description:** Clear all notifications (soft delete)

**Query Parameters:**
- `onlyRead` - Only clear read notifications (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "cleared": 25
  },
  "message": "25 notification(s) cleared"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'notifications:cleared',
  data: {
    cleared: 25,
    onlyRead: true,
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 15. POST `/api/merchant/notifications/subscribe-email`
**Description:** Subscribe to email notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "emailEnabled": true,
    "preferences": { /* Full preferences object */ }
  },
  "message": "Successfully subscribed to email notifications"
}
```

**Socket.IO Event Emitted:**
```javascript
{
  event: 'preferences:updated',
  data: {
    type: 'email_subscribed',
    timestamp: '2025-01-18T12:00:00Z'
  }
}
```

---

### 16. POST `/api/merchant/notifications/unsubscribe-email`
**Description:** Unsubscribe from email notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "emailEnabled": false,
    "preferences": { /* Full preferences object */ }
  },
  "message": "Successfully unsubscribed from email notifications"
}
```

---

### 17. POST `/api/merchant/notifications/subscribe-sms`
**Description:** Subscribe to SMS notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "smsEnabled": true,
    "preferences": { /* Full preferences object */ }
  },
  "message": "Successfully subscribed to SMS notifications"
}
```

---

### 18. POST `/api/merchant/notifications/unsubscribe-sms`
**Description:** Unsubscribe from SMS notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "smsEnabled": false,
    "preferences": { /* Full preferences object */ }
  },
  "message": "Successfully unsubscribed from SMS notifications"
}
```

---

### 19. POST `/api/merchant/notifications/test`
**Description:** Send test notification

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "title": "Test Notification",
      "message": "This is a test notification to verify your notification settings are working correctly.",
      "type": "info",
      "category": "system"
    }
  },
  "message": "Test notification sent successfully"
}
```

---

## Models

### Notification Model

**Schema:**
```typescript
{
  user: ObjectId,                    // User receiving notification
  title: string,                     // Notification title (max 100 chars)
  message: string,                   // Notification message (max 500 chars)
  type: 'info' | 'success' | 'warning' | 'error' | 'promotional',
  category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  data: {
    orderId?: string,
    projectId?: string,
    transactionId?: string,
    storeId?: string,
    productId?: string,
    videoId?: string,
    userId?: string,
    amount?: number,
    imageUrl?: string,
    deepLink?: string,              // For app navigation
    externalLink?: string,          // For external URLs
    actionButton?: {
      text: string,
      action: 'navigate' | 'api_call' | 'external_link',
      target: string
    },
    metadata?: { [key: string]: any }
  },
  deliveryChannels: ['push', 'email', 'sms', 'in_app'],
  deliveryStatus: {
    push?: { sent, delivered, clicked, failed, failureReason },
    email?: { sent, delivered, opened, clicked, failed, failureReason },
    sms?: { sent, delivered, failed, failureReason },
    inApp: { delivered, read, readAt }
  },
  isRead: boolean,
  readAt?: Date,
  isArchived: boolean,
  archivedAt?: Date,
  deletedAt?: Date,                 // Soft delete timestamp
  expiresAt?: Date,                 // Auto-cleanup date
  scheduledAt?: Date,               // For scheduled notifications
  sentAt?: Date,
  batchId?: string,                 // For bulk notifications
  campaignId?: string,              // For campaigns
  source: 'system' | 'admin' | 'automated' | 'campaign',
  template?: string,                // Template name
  variables?: { [key: string]: any },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ user: 1, createdAt: -1 }`
- `{ user: 1, isRead: 1, createdAt: -1 }`
- `{ user: 1, category: 1, createdAt: -1 }`
- `{ user: 1, isRead: 1, isArchived: 1, deletedAt: 1, createdAt: -1 }`

---

### UserSettings Model (Notification Preferences)

**Schema:**
```typescript
{
  user: ObjectId,
  notifications: {
    push: {
      enabled: boolean,
      orderUpdates: boolean,
      promotions: boolean,
      recommendations: boolean,
      priceAlerts: boolean,
      deliveryUpdates: boolean,
      paymentUpdates: boolean,
      securityAlerts: boolean,
      chatMessages: boolean
    },
    email: {
      enabled: boolean,
      newsletters: boolean,
      orderReceipts: boolean,
      weeklyDigest: boolean,
      promotions: boolean,
      securityAlerts: boolean,
      accountUpdates: boolean
    },
    sms: {
      enabled: boolean,
      orderUpdates: boolean,
      deliveryAlerts: boolean,
      paymentConfirmations: boolean,
      securityAlerts: boolean,
      otpMessages: boolean
    },
    inApp: {
      enabled: boolean,
      showBadges: boolean,
      soundEnabled: boolean,
      vibrationEnabled: boolean,
      bannerStyle: 'BANNER' | 'ALERT' | 'SILENT'
    }
  }
}
```

---

## Socket.IO Events

### Events Emitted by Server

#### 1. `notification:new`
Emitted when a new notification is created for the user.

```javascript
{
  notification: {
    _id: '65f1a2b3c4d5e6f7g8h9i0j1',
    title: 'Order Shipped',
    message: 'Your order #12345 has been shipped',
    type: 'info',
    category: 'order',
    priority: 'high',
    isRead: false,
    createdAt: '2025-01-18T10:30:00Z',
    data: {
      orderId: '12345',
      deepLink: '/orders/12345'
    }
  },
  timestamp: '2025-01-18T10:30:00Z'
}
```

#### 2. `notification:read`
Emitted when a notification is marked as read.

```javascript
{
  notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
  unreadCount: 4,
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 3. `notifications:bulk-read`
Emitted when multiple notifications are marked as read.

```javascript
{
  notificationIds: ['id1', 'id2', 'id3'],
  updated: 3,
  unreadCount: 2,
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 4. `notification:deleted`
Emitted when a notification is deleted.

```javascript
{
  notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 5. `notifications:bulk-deleted`
Emitted when multiple notifications are deleted.

```javascript
{
  notificationIds: ['id1', 'id2'],
  deleted: 2,
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 6. `notification:archived`
Emitted when a notification is archived.

```javascript
{
  notificationId: '65f1a2b3c4d5e6f7g8h9i0j1',
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 7. `notifications:cleared`
Emitted when all notifications are cleared.

```javascript
{
  cleared: 25,
  onlyRead: true,
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 8. `notification:count`
Emitted when unread count changes.

```javascript
{
  count: 5,
  timestamp: '2025-01-18T12:00:00Z'
}
```

#### 9. `preferences:updated`
Emitted when notification preferences are updated.

```javascript
{
  type: 'email_subscribed' | 'email_unsubscribed' | 'sms_subscribed' | 'sms_unsubscribed',
  timestamp: '2025-01-18T12:00:00Z'
}
```

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for new notifications
socket.on('notification:new', (data) => {
  console.log('New notification:', data.notification);
  // Update UI, show toast, play sound, etc.
});

// Listen for unread count updates
socket.on('notification:count', (data) => {
  console.log('Unread count:', data.count);
  // Update badge count in UI
});

// Listen for notification read events
socket.on('notification:read', (data) => {
  console.log('Notification read:', data.notificationId);
  // Update notification list in UI
});
```

---

## Notification Service Helper

### Usage Examples

#### Create Order Notification
```typescript
import NotificationService from '../services/notificationService';

// When order status changes
await NotificationService.notifyOrderUpdate(
  userId,
  orderId,
  'shipped',
  orderNumber
);
```

#### Create Earning Notification
```typescript
await NotificationService.notifyEarning(
  userId,
  100,
  'Order Cashback',
  transactionId
);
```

#### Create Promotional Notification
```typescript
await NotificationService.notifyPromotion(
  userId,
  'Flash Sale!',
  '50% off on all items. Limited time offer!',
  'https://example.com/promo.jpg',
  '/offers/flash-sale'
);
```

#### Create Security Alert
```typescript
await NotificationService.notifySecurityAlert(
  userId,
  'Unusual Login Detected',
  'We detected a login from a new device. If this wasn\'t you, please secure your account.',
  true // actionRequired
);
```

#### Custom Notification
```typescript
await NotificationService.createNotification({
  userId,
  title: 'Custom Title',
  message: 'Custom message',
  type: 'info',
  category: 'general',
  priority: 'medium',
  data: {
    customField: 'value',
    deepLink: '/custom-page'
  },
  deliveryChannels: ['push', 'in_app']
});
```

#### Bulk Notifications
```typescript
const userIds = ['userId1', 'userId2', 'userId3'];

await NotificationService.createBulkNotifications(userIds, {
  title: 'System Maintenance',
  message: 'Scheduled maintenance tonight at 2 AM',
  type: 'warning',
  category: 'system',
  priority: 'high'
});
```

---

## Integration Guide

### Frontend Integration

#### 1. Setup Socket.IO Connection

```typescript
// services/socketService.ts
import io from 'socket.io-client';

class SocketService {
  private socket: any;

  connect(token: string) {
    this.socket = io(process.env.REACT_APP_API_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('notification:new', this.handleNewNotification);
    this.socket.on('notification:count', this.handleUnreadCount);
  }

  handleNewNotification(data: any) {
    // Show toast notification
    toast.success(data.notification.title);

    // Update notifications state
    store.dispatch(addNotification(data.notification));

    // Play sound if enabled
    if (settings.notificationSound) {
      new Audio('/notification.mp3').play();
    }
  }

  handleUnreadCount(data: any) {
    // Update badge count
    store.dispatch(setUnreadCount(data.count));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```

#### 2. Fetch Notifications

```typescript
// services/notificationApi.ts
import axios from 'axios';

export const notificationApi = {
  getAll: (filters) =>
    axios.get('/api/merchant/notifications', { params: filters }),

  getUnread: () =>
    axios.get('/api/merchant/notifications/unread'),

  getStats: () =>
    axios.get('/api/merchant/notifications/stats'),

  markAsRead: (id) =>
    axios.post(`/api/merchant/notifications/${id}/mark-read`),

  markMultipleAsRead: (notificationIds) =>
    axios.post('/api/merchant/notifications/mark-multiple-read', { notificationIds }),

  delete: (id) =>
    axios.delete(`/api/merchant/notifications/${id}`),

  archive: (id) =>
    axios.put(`/api/merchant/notifications/${id}/archive`),

  clearAll: (onlyRead = false) =>
    axios.post('/api/merchant/notifications/clear-all', null, {
      params: { onlyRead }
    }),

  getPreferences: () =>
    axios.get('/api/merchant/notifications/preferences'),

  updatePreferences: (preferences) =>
    axios.put('/api/merchant/notifications/preferences', preferences),

  subscribeEmail: () =>
    axios.post('/api/merchant/notifications/subscribe-email'),

  unsubscribeEmail: () =>
    axios.post('/api/merchant/notifications/unsubscribe-email'),

  subscribeSMS: () =>
    axios.post('/api/merchant/notifications/subscribe-sms'),

  unsubscribeSMS: () =>
    axios.post('/api/merchant/notifications/unsubscribe-sms')
};
```

#### 3. React Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { notificationApi } from './services/notificationApi';
import socketService from './services/socketService';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect socket
    socketService.connect(token);

    // Load initial notifications
    loadNotifications();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadNotifications = async () => {
    const { data } = await notificationApi.getUnread();
    setNotifications(data.notifications);
    setUnreadCount(data.count);
  };

  const handleMarkAsRead = async (id) => {
    await notificationApi.markAsRead(id);
    loadNotifications();
  };

  return (
    <div className="notification-bell">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}

      <div className="notification-dropdown">
        {notifications.map(notif => (
          <div key={notif._id} onClick={() => handleMarkAsRead(notif._id)}>
            <h4>{notif.title}</h4>
            <p>{notif.message}</p>
            <small>{formatTime(notif.createdAt)}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Best Practices

1. **Always handle Socket.IO errors gracefully** - Socket connections may fail
2. **Cache preferences** - Reduce database calls by caching user preferences
3. **Use appropriate priority levels** - Reserve 'urgent' for critical alerts only
4. **Implement rate limiting** - Prevent notification spam
5. **Respect user preferences** - Always check user preferences before sending
6. **Clean up old notifications** - Run periodic cleanup jobs
7. **Use deep links** - Help users navigate directly to relevant content
8. **Test with different scenarios** - Test with/without Socket.IO connection

---

## Troubleshooting

### Socket.IO Not Connecting
- Verify JWT token is valid
- Check CORS configuration
- Ensure Socket.IO server is running

### Notifications Not Appearing
- Check user preferences
- Verify deliveryChannels includes 'in_app'
- Check if notification is expired or scheduled for future

### High Database Load
- Add proper indexes (already configured)
- Implement caching for preferences
- Use bulk operations for multiple updates

---

## Performance Considerations

1. **Indexes** - All critical queries are indexed
2. **Pagination** - Always use pagination for list endpoints
3. **Bulk Operations** - Use bulk endpoints when possible
4. **Soft Delete** - Allows recovery and audit trails
5. **TTL Index** - Auto-cleanup with expiresAt field
6. **Socket.IO Rooms** - Efficient user-specific broadcasting

---

## Security

1. **Authentication Required** - All endpoints require JWT authentication
2. **User Isolation** - Users can only access their own notifications
3. **Input Validation** - All inputs validated with Joi schemas
4. **SQL Injection Protection** - MongoDB prevents SQL injection
5. **XSS Protection** - All text fields are sanitized

---

## License

This notification system is part of the merchant backend and follows the same license.
