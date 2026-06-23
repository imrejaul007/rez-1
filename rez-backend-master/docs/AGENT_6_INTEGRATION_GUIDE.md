# Agent 6: Server Integration Guide

## Required Changes to server.ts

### Step 1: Import the socket configuration

Add this import at the top of `src/server.ts` (around line 10-20):

```typescript
import { initializeSocket } from './config/socket';
```

### Step 2: Import the merchant notification routes

Add this import with other route imports (around line 113):

```typescript
import merchantNotificationRoutes from './routes/merchant/notifications';
```

### Step 3: Initialize Socket.IO instance

Find where Socket.IO is created (around line 262):

```typescript
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

**Add this line immediately after**:

```typescript
// Initialize Socket.IO instance for use in controllers
initializeSocket(io);
console.log('✅ Socket.IO instance initialized for notifications');
```

### Step 4: Mount the notification routes

Find where routes are mounted (look for `app.use` statements) and add:

```typescript
// Merchant notification routes (Agent 6)
app.use(`${API_PREFIX}/merchant/notifications`, merchantNotificationRoutes);
```

---

## Complete Integration Code Block

Here's the complete code block to add to server.ts:

```typescript
// ============================================================
// AGENT 6: NOTIFICATION ENDPOINTS INTEGRATION
// ============================================================

// 1. Import socket config (add at top with other imports)
import { initializeSocket } from './config/socket';

// 2. Import merchant notification routes (add with other route imports)
import merchantNotificationRoutes from './routes/merchant/notifications';

// 3. Initialize Socket.IO (add after Socket.IO server creation)
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Socket.IO instance for notification controllers
initializeSocket(io);
console.log('✅ Socket.IO instance initialized for notifications');

// 4. Mount routes (add with other app.use statements)
app.use(`${API_PREFIX}/merchant/notifications`, merchantNotificationRoutes);
console.log(`✅ Merchant notification routes mounted at ${API_PREFIX}/merchant/notifications`);
```

---

## Verification Steps

### 1. Start the server
```bash
npm run dev
# or
npm start
```

### 2. Check console output
You should see:
```
✅ Socket.IO instance initialized for notifications
✅ Merchant notification routes mounted at /api/merchant/notifications
```

### 3. Test health endpoint
```bash
curl http://localhost:5001/health
```

### 4. Test notification endpoints

**Get unread notifications:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/merchant/notifications/unread
```

**Send test notification:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/merchant/notifications/test
```

### 5. Test Socket.IO connection

In browser console:
```javascript
// Connect to Socket.IO
const socket = io('http://localhost:5001');

// Get your user ID from auth token
const userId = 'YOUR_USER_ID';

// Join your user room
socket.emit('join-room', `user-${userId}`);

// Listen for events
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

socket.on('notifications:bulk-read', (data) => {
  console.log('Bulk read:', data);
});
```

---

## Troubleshooting

### Error: "Socket.IO not initialized"

**Cause**: Controllers trying to use Socket.IO before initialization

**Solution**: Ensure `initializeSocket(io)` is called before mounting routes

```typescript
// ✅ CORRECT ORDER
const io = new SocketIOServer(...);
initializeSocket(io);  // Initialize first
app.use('/api/merchant/notifications', routes);  // Then mount routes

// ❌ WRONG ORDER
app.use('/api/merchant/notifications', routes);  // Routes mounted first
initializeSocket(io);  // Initialized later - will cause errors
```

### Error: 404 Not Found on notification endpoints

**Cause**: Routes not mounted correctly

**Solution**: Check the route mounting path
```typescript
// Make sure API_PREFIX is correct
console.log('API_PREFIX:', API_PREFIX);  // Should be '/api'

// Mount with correct prefix
app.use(`${API_PREFIX}/merchant/notifications`, merchantNotificationRoutes);
```

### Error: 401 Unauthorized

**Cause**: Missing or invalid JWT token

**Solution**: Ensure you're sending a valid token
```bash
# Get a token by logging in first
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "password": "your_password"}'

# Use the returned token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/merchant/notifications/unread
```

### Socket.IO not connecting

**Cause**: CORS or connection issues

**Solution**: Check Socket.IO configuration
```typescript
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",  // Or specific origin for production
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

---

## Environment Variables

Ensure these are set in your `.env` file:

```env
PORT=5001
API_PREFIX=/api
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Socket.IO initialization message appears in console
- [ ] Routes mounting message appears in console
- [ ] Health endpoint returns 200
- [ ] GET /api/merchant/notifications/unread returns data or empty array
- [ ] POST /api/merchant/notifications/test creates a notification
- [ ] Socket.IO connection works from browser
- [ ] Socket events are received in browser console
- [ ] Authentication works (401 for missing token)
- [ ] Validation works (400 for invalid data)

---

## Production Considerations

### 1. Socket.IO Configuration
```typescript
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://yourapp.com",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});
```

### 2. Rate Limiting
Uncomment rate limiting in routes:
```typescript
// In src/routes/merchant/notifications.ts
import { generalLimiter } from '../../middleware/rateLimiter';

router.get('/unread', generalLimiter, getUnreadNotifications);
```

### 3. Monitoring
Add monitoring for Socket.IO events:
```typescript
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

### 4. Error Tracking
Use Sentry or similar for error tracking:
```typescript
import * as Sentry from '@sentry/node';

// In controller
try {
  // ... notification logic
} catch (error) {
  Sentry.captureException(error);
  throw new AppError('Failed to process notification', 500);
}
```

---

## API Documentation

After integration, Swagger docs will be available at:
```
http://localhost:5001/api-docs
```

All notification endpoints will appear in the Swagger UI.

---

## Next Steps

1. ✅ Integrate code into server.ts
2. ✅ Test all endpoints
3. ✅ Test Socket.IO events
4. ✅ Update frontend to use new endpoints
5. ✅ Implement notification preferences storage (future)
6. ✅ Set up scheduled cleanup job for soft-deleted notifications (future)

---

## Support

If you encounter issues:

1. Check server logs for errors
2. Verify MongoDB connection
3. Test with curl commands first
4. Check Socket.IO connection in browser console
5. Review the full documentation in `AGENT_6_NOTIFICATION_ENDPOINTS_REPORT.md`

---

**Status**: Ready for Integration
**Version**: 1.0.0
**Date**: November 17, 2025
