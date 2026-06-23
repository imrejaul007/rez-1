# Agent 6: Notification Endpoints - Quick Reference

## Base URL
```
/api/merchant/notifications
```

## Authentication
All endpoints require JWT token:
```
Authorization: Bearer {token}
```

---

## Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/unread` | Get unread notifications (max 50) |
| POST | `/mark-multiple-read` | Mark multiple as read |
| POST | `/delete-multiple` | Soft delete multiple |
| PUT | `/:id/archive` | Archive single notification |
| POST | `/clear-all` | Clear all notifications |
| GET | `/archived` | Get archived notifications |
| POST | `/test` | Send test notification |
| GET | `/preferences` | Get notification preferences |
| PUT | `/preferences` | Update notification preferences |

---

## Quick Examples

### Get Unread
```bash
GET /api/merchant/notifications/unread

Response Header: X-Unread-Count: 15
```

### Mark Multiple as Read
```bash
POST /api/merchant/notifications/mark-multiple-read
Body: { "notificationIds": ["id1", "id2"] }

Response: { "updated": 2, "unreadCount": 13 }
```

### Delete Multiple
```bash
POST /api/merchant/notifications/delete-multiple
Body: { "notificationIds": ["id1", "id2"] }

Response: { "deleted": 2 }
```

### Archive One
```bash
PUT /api/merchant/notifications/{id}/archive

Response: { "notification": {...} }
```

### Clear All
```bash
POST /api/merchant/notifications/clear-all
POST /api/merchant/notifications/clear-all?onlyRead=true

Response: { "cleared": 45 }
```

### Get Archived
```bash
GET /api/merchant/notifications/archived?page=1&limit=20

Response: { "notifications": [...], "pagination": {...} }
```

### Test Notification
```bash
POST /api/merchant/notifications/test

Response: { "notification": {...} }
```

---

## Enhanced Main Endpoint

```bash
GET /api/merchant/notifications?status=unread&sortBy=priority&order=desc&page=1&limit=20
```

**Query Params**:
- `type`: order | product | team | info | success | warning | error | promotional
- `status`: unread | read
- `category`: order | earning | general | promotional | social | security | system | reminder
- `sortBy`: createdAt | priority
- `order`: desc | asc
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

---

## Socket.IO Events

```javascript
// Listen for events
socket.on('notification:new', (data) => {
  // New notification created
});

socket.on('notifications:bulk-read', (data) => {
  // Multiple marked as read
  console.log(`Updated: ${data.updated}, Unread: ${data.unreadCount}`);
});

socket.on('notifications:bulk-deleted', (data) => {
  // Multiple deleted
  console.log(`Deleted: ${data.deleted}`);
});

socket.on('notifications:cleared', (data) => {
  // All cleared
  console.log(`Cleared: ${data.cleared}`);
});

socket.on('notification:archived', (data) => {
  // Single archived
});
```

---

## Common Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

---

## Validation Limits

- `notificationIds` array: 1-100 items
- `limit` query param: 1-100
- Notification title: max 100 chars
- Notification message: max 500 chars

---

## Files Reference

| File | Location |
|------|----------|
| Routes | `src/routes/merchant/notifications.ts` |
| Controller | `src/controllers/merchantNotificationController.ts` |
| Model | `src/models/Notification.ts` |
| Socket Config | `src/config/socket.ts` |
| Socket Types | `src/types/socket.ts` |

---

## Integration Steps

1. Import socket config in `server.ts`:
```typescript
import { initializeSocket } from './config/socket';
```

2. Initialize after Socket.IO creation:
```typescript
initializeSocket(io);
```

3. Mount routes:
```typescript
app.use('/api/merchant/notifications', merchantNotificationRoutes);
```

---

## Testing Commands

```bash
# Get unread
curl -H "Authorization: Bearer {token}" \
  http://localhost:5001/api/merchant/notifications/unread

# Mark as read
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"notificationIds":["id1","id2"]}' \
  http://localhost:5001/api/merchant/notifications/mark-multiple-read

# Clear all
curl -X POST -H "Authorization: Bearer {token}" \
  http://localhost:5001/api/merchant/notifications/clear-all

# Send test
curl -X POST -H "Authorization: Bearer {token}" \
  http://localhost:5001/api/merchant/notifications/test
```

---

## Status: ✅ Complete

All 7 endpoints + 2 preference endpoints implemented and documented.
