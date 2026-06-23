# WEBSOCKET EVENTS DOCUMENTATION

**Complete WebSocket Event Specification for REZ App**

Last Updated: 2025-10-27

---

## Overview

The REZ App uses WebSocket (Socket.IO) for real-time bidirectional communication. The WebSocket server runs on the same port as the HTTP server.

**Connection URL:**
- Development: `ws://localhost:5001`
- Production: `wss://api.rezapp.com/ws`

**Authentication:** Include JWT token as query parameter:
```
ws://localhost:5001?token=<JWT_TOKEN>
```

---

## Connection Management

### Client → Server Events

#### `connect`
Automatic event when client connects
```typescript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

#### `disconnect`
Client initiates disconnect
```typescript
socket.emit('disconnect');
```

#### `subscribe`
Subscribe to a specific channel
```typescript
socket.emit('subscribe', {
  channel: 'orders' | 'cart' | 'support_ticket_123' | 'offers'
});
```

#### `unsubscribe`
Unsubscribe from a channel
```typescript
socket.emit('unsubscribe', {
  channel: 'orders'
});
```

#### `heartbeat`
Keep-alive ping (sent every 30s by client)
```typescript
socket.emit('heartbeat', {
  timestamp: Date.now()
});
```

### Server → Client Events

#### `connected`
Server confirms connection
```typescript
socket.on('connected', (data) => {
  // data: { userId, socketId, timestamp }
});
```

#### `disconnected`
Server notifies disconnect
```typescript
socket.on('disconnected', (data) => {
  // data: { reason, timestamp }
});
```

#### `error`
Server sends error
```typescript
socket.on('error', (error) => {
  // error: { code, message, details }
});
```

#### `heartbeat_ack`
Server acknowledges heartbeat
```typescript
socket.on('heartbeat_ack', (data) => {
  // data: { timestamp }
});
```

---

## Offers & Deals

### Server → Client

#### `new_offer`
New offer available
```typescript
socket.on('new_offer', (offer) => {
  // offer: {
  //   id: string;
  //   title: string;
  //   description: string;
  //   discount: number;
  //   expiresAt: string;
  //   image: string;
  //   category: string;
  // }
});
```

#### `offer_updated`
Existing offer updated
```typescript
socket.on('offer_updated', (offer) => {
  // offer: Updated offer object
});
```

#### `offer_expired`
Offer has expired
```typescript
socket.on('offer_expired', (data) => {
  // data: { offerId: string }
});
```

#### `deal_notification`
Flash deal or time-limited offer
```typescript
socket.on('deal_notification', (deal) => {
  // deal: {
  //   id: string;
  //   title: string;
  //   originalPrice: number;
  //   salePrice: number;
  //   discount: number;
  //   timeRemaining: number;  // seconds
  //   stock: number;
  // }
});
```

---

## Orders & Tracking

### Server → Client

#### `order_status_update`
Order status changed
```typescript
socket.on('order_status_update', (data) => {
  // data: {
  //   orderId: string;
  //   orderNumber: string;
  //   status: 'placed' | 'confirmed' | 'preparing' | 'ready' |
  //           'dispatched' | 'out_for_delivery' | 'delivered';
  //   timestamp: string;
  //   message: string;
  //   estimatedDelivery?: string;
  // }
});
```

#### `order_location_update`
Delivery location update
```typescript
socket.on('order_location_update', (data) => {
  // data: {
  //   orderId: string;
  //   location: {
  //     latitude: number;
  //     longitude: number;
  //     address: string;
  //   };
  //   driverName: string;
  //   driverPhone: string;
  //   timestamp: string;
  // }
});
```

#### `order_eta_update`
Estimated time of arrival updated
```typescript
socket.on('order_eta_update', (data) => {
  // data: {
  //   orderId: string;
  //   eta: string;  // ISO timestamp
  //   minutes: number;
  // }
});
```

#### `order_delivered`
Order delivered successfully
```typescript
socket.on('order_delivered', (data) => {
  // data: {
  //   orderId: string;
  //   deliveredAt: string;
  //   signature?: string;  // Image URL if signed
  // }
});
```

#### `order_cancelled`
Order cancelled
```typescript
socket.on('order_cancelled', (data) => {
  // data: {
  //   orderId: string;
  //   reason: string;
  //   cancelledBy: 'user' | 'store' | 'admin';
  //   refundAmount: number;
  //   refundStatus: 'pending' | 'processing' | 'completed';
  // }
});
```

---

## Cart & Shopping

### Server → Client

#### `cart_sync`
Cart synchronized across devices
```typescript
socket.on('cart_sync', (cart) => {
  // cart: Complete cart object
});
```

#### `price_update`
Product price changed
```typescript
socket.on('price_update', (data) => {
  // data: {
  //   productId: string;
  //   oldPrice: number;
  //   newPrice: number;
  //   discount?: number;
  // }
});
```

#### `stock_update`
Product stock changed
```typescript
socket.on('stock_update', (data) => {
  // data: {
  //   productId: string;
  //   stock: number;
  //   isAvailable: boolean;
  // }
});
```

#### `cart_item_reserved`
Item reserved for checkout
```typescript
socket.on('cart_item_reserved', (data) => {
  // data: {
  //   productId: string;
  //   quantity: number;
  //   expiresAt: string;
  // }
});
```

#### `cart_item_released`
Item reservation expired
```typescript
socket.on('cart_item_released', (data) => {
  // data: {
  //   productId: string;
  //   reason: 'expired' | 'cancelled' | 'purchased';
  // }
});
```

---

## Support Chat

### Client → Server

#### `join_ticket`
Join support ticket room
```typescript
socket.emit('join_ticket', {
  ticketId: 'ticket_123',
  userId: 'user_456'
});
```

#### `leave_ticket`
Leave support ticket room
```typescript
socket.emit('leave_ticket', {
  ticketId: 'ticket_123',
  userId: 'user_456'
});
```

#### `user_typing_start`
User started typing
```typescript
socket.emit('user_typing_start', {
  ticketId: 'ticket_123',
  userId: 'user_456'
});
```

#### `user_typing_stop`
User stopped typing
```typescript
socket.emit('user_typing_stop', {
  ticketId: 'ticket_123',
  userId: 'user_456'
});
```

#### `message_read`
Mark message as read
```typescript
socket.emit('message_read', {
  ticketId: 'ticket_123',
  messageId: 'msg_789',
  userId: 'user_456'
});
```

### Server → Client

#### `support_message_received`
New message in ticket
```typescript
socket.on('support_message_received', (message) => {
  // message: {
  //   id: string;
  //   ticketId: string;
  //   senderId: string;
  //   senderName: string;
  //   senderAvatar?: string;
  //   type: 'text' | 'image' | 'file';
  //   content: string;
  //   attachments?: Array<{url, type, size}>;
  //   createdAt: string;
  // }
});
```

#### `support_message_delivered`
Message delivered to recipient
```typescript
socket.on('support_message_delivered', (data) => {
  // data: {
  //   messageId: string;
  //   deliveredAt: string;
  // }
});
```

#### `support_message_read`
Message read by recipient
```typescript
socket.on('support_message_read', (data) => {
  // data: {
  //   messageId: string;
  //   readBy: string;
  //   readAt: string;
  // }
});
```

#### `support_agent_assigned`
Agent assigned to ticket
```typescript
socket.on('support_agent_assigned', (data) => {
  // data: {
  //   ticketId: string;
  //   agent: {
  //     id: string;
  //     name: string;
  //     avatar?: string;
  //     department: string;
  //   };
  //   assignedAt: string;
  // }
});
```

#### `support_agent_typing_start`
Agent started typing
```typescript
socket.on('support_agent_typing_start', (data) => {
  // data: {
  //   ticketId: string;
  //   agentId: string;
  //   agentName: string;
  // }
});
```

#### `support_agent_typing_stop`
Agent stopped typing
```typescript
socket.on('support_agent_typing_stop', (data) => {
  // data: {
  //   ticketId: string;
  //   agentId: string;
  // }
});
```

#### `support_agent_status_changed`
Agent availability changed
```typescript
socket.on('support_agent_status_changed', (data) => {
  // data: {
  //   agentId: string;
  //   status: 'online' | 'busy' | 'away' | 'offline';
  //   timestamp: string;
  // }
});
```

#### `support_ticket_status_changed`
Ticket status updated
```typescript
socket.on('support_ticket_status_changed', (data) => {
  // data: {
  //   ticketId: string;
  //   status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  //   timestamp: string;
  // }
});
```

#### `support_queue_position_updated`
Position in queue changed
```typescript
socket.on('support_queue_position_updated', (data) => {
  // data: {
  //   ticketId: string;
  //   position: number;
  //   estimatedWaitTime: number;  // minutes
  // }
});
```

---

## Group Buying

### Server → Client

#### `group_member_joined`
New member joined group
```typescript
socket.on('group_member_joined', (data) => {
  // data: {
  //   groupId: string;
  //   groupCode: string;
  //   member: {
  //     userId: string;
  //     name: string;
  //     avatar?: string;
  //   };
  //   currentMembers: number;
  //   spotsRemaining: number;
  //   joinedAt: string;
  // }
});
```

#### `group_member_left`
Member left group
```typescript
socket.on('group_member_left', (data) => {
  // data: {
  //   groupId: string;
  //   userId: string;
  //   currentMembers: number;
  //   spotsRemaining: number;
  // }
});
```

#### `group_complete`
Group reached required members
```typescript
socket.on('group_complete', (data) => {
  // data: {
  //   groupId: string;
  //   groupCode: string;
  //   status: 'complete';
  //   members: Array<{userId, name, avatar}>;
  //   completedAt: string;
  // }
});
```

#### `group_message`
New message in group chat
```typescript
socket.on('group_message', (message) => {
  // message: {
  //   id: string;
  //   groupId: string;
  //   userId: string;
  //   userName: string;
  //   userAvatar?: string;
  //   message: string;
  //   createdAt: string;
  // }
});
```

#### `group_cancelled`
Group cancelled by creator
```typescript
socket.on('group_cancelled', (data) => {
  // data: {
  //   groupId: string;
  //   reason: string;
  //   cancelledAt: string;
  // }
});
```

---

## Store Messaging

### Server → Client

#### `store_message`
New message from store
```typescript
socket.on('store_message', (message) => {
  // message: {
  //   id: string;
  //   conversationId: string;
  //   storeId: string;
  //   storeName: string;
  //   content: string;
  //   type: 'text' | 'image' | 'order_update';
  //   createdAt: string;
  // }
});
```

#### `store_typing`
Store is typing
```typescript
socket.on('store_typing', (data) => {
  // data: {
  //   conversationId: string;
  //   storeId: string;
  //   storeName: string;
  // }
});
```

#### `store_online`
Store came online
```typescript
socket.on('store_online', (data) => {
  // data: {
  //   storeId: string;
  //   timestamp: string;
  // }
});
```

#### `store_offline`
Store went offline
```typescript
socket.on('store_offline', (data) => {
  // data: {
  //   storeId: string;
  //   timestamp: string;
  // }
});
```

---

## Social Features

### Server → Client

#### `feed_new_post`
New post in user's feed
```typescript
socket.on('feed_new_post', (post) => {
  // post: {
  //   id: string;
  //   userId: string;
  //   userName: string;
  //   userAvatar?: string;
  //   type: 'product_review' | 'store_visit' | 'purchase';
  //   content: string;
  //   images?: string[];
  //   product?: {id, name, image};
  //   createdAt: string;
  // }
});
```

#### `feed_post_liked`
Someone liked user's post
```typescript
socket.on('feed_post_liked', (data) => {
  // data: {
  //   postId: string;
  //   likedBy: {
  //     userId: string;
  //     userName: string;
  //     userAvatar?: string;
  //   };
  //   totalLikes: number;
  //   likedAt: string;
  // }
});
```

#### `feed_post_commented`
New comment on post
```typescript
socket.on('feed_post_commented', (comment) => {
  // comment: {
  //   id: string;
  //   postId: string;
  //   userId: string;
  //   userName: string;
  //   comment: string;
  //   createdAt: string;
  // }
});
```

#### `feed_user_followed`
New follower
```typescript
socket.on('feed_user_followed', (data) => {
  // data: {
  //   followerId: string;
  //   followerName: string;
  //   followerAvatar?: string;
  //   followedAt: string;
  // }
});
```

---

## Leaderboard & Gamification

### Server → Client

#### `leaderboard_update`
Leaderboard refreshed
```typescript
socket.on('leaderboard_update', (leaderboard) => {
  // leaderboard: {
  //   period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  //   rankings: Array<{
  //     rank: number;
  //     userId: string;
  //     userName: string;
  //     avatar?: string;
  //     points: number;
  //     change: number;  // Position change
  //   }>;
  //   updatedAt: string;
  // }
});
```

#### `leaderboard_rank_change`
User's rank changed
```typescript
socket.on('leaderboard_rank_change', (data) => {
  // data: {
  //   userId: string;
  //   oldRank: number;
  //   newRank: number;
  //   points: number;
  //   change: number;  // +5 or -3
  //   period: 'daily' | 'weekly' | 'monthly';
  // }
});
```

#### `leaderboard_achievement`
User earned achievement
```typescript
socket.on('leaderboard_achievement', (achievement) => {
  // achievement: {
  //   id: string;
  //   title: string;
  //   description: string;
  //   icon: string;
  //   points: number;
  //   earnedAt: string;
  // }
});
```

---

## System Events

### Server → Client

#### `system_maintenance`
Scheduled maintenance notification
```typescript
socket.on('system_maintenance', (data) => {
  // data: {
  //   scheduledAt: string;
  //   duration: number;  // minutes
  //   message: string;
  //   affectedServices: string[];
  // }
});
```

#### `force_update`
App update required
```typescript
socket.on('force_update', (data) => {
  // data: {
  //   version: string;
  //   updateUrl: string;
  //   message: string;
  //   isForced: boolean;
  // }
});
```

#### `session_expired`
User session expired
```typescript
socket.on('session_expired', (data) => {
  // data: {
  //   message: string;
  //   expiredAt: string;
  // }
});
```

#### `token_refresh`
JWT token refreshed
```typescript
socket.on('token_refresh', (data) => {
  // data: {
  //   newToken: string;
  //   expiresIn: number;
  // }
});
```

---

## Error Events

### Server → Client

#### `error`
General error
```typescript
socket.on('error', (error) => {
  // error: {
  //   code: string;
  //   message: string;
  //   details?: any;
  //   timestamp: string;
  // }
});
```

#### `connection_error`
Connection issue
```typescript
socket.on('connection_error', (error) => {
  // error: {
  //   reason: string;
  //   attempts: number;
  //   nextRetry: number;  // ms
  // }
});
```

---

## Room/Channel Management

### Rooms Structure

The server should organize connections into rooms for efficient broadcasting:

```typescript
// User-specific room (private)
`user:${userId}`

// Order tracking room
`order:${orderId}`

// Support ticket room
`support_ticket:${ticketId}`

// Group buying room
`group:${groupId}`

// Store conversation room
`store_conversation:${conversationId}`

// Leaderboard room (public)
`leaderboard:${period}`  // daily, weekly, monthly

// Offers room (public)
`offers:${category}`
```

### Room Management Example

```typescript
// User joins room
socket.join(`user:${userId}`);
socket.join(`order:${orderId}`);

// Broadcast to room
io.to(`order:${orderId}`).emit('order_status_update', data);

// Broadcast to multiple rooms
io.to(`user:${userId}`)
  .to(`order:${orderId}`)
  .emit('order_delivered', data);

// User leaves room
socket.leave(`order:${orderId}`);
```

---

## Authentication

### Token Verification

Server should verify JWT token on connection:

```typescript
io.use((socket, next) => {
  const token = socket.handshake.query.token || socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.join(`user:${decoded.userId}`);
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

---

## Reconnection Handling

### Client-Side Reconnection

```typescript
// Client should handle automatic reconnection
socket.on('disconnect', () => {
  console.log('Disconnected, attempting to reconnect...');
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-subscribe to channels
  socket.emit('subscribe', { channel: 'orders' });
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});
```

### Server-Side State Management

Server should:
1. Store user's active subscriptions in Redis
2. Restore subscriptions on reconnection
3. Send missed events (from last 5 minutes)
4. Implement exponential backoff for reconnections

---

## Best Practices

### 1. Event Naming
- Use past tense for completed actions: `order_delivered`
- Use present continuous for ongoing: `agent_typing_start`
- Use nouns for state changes: `stock_update`

### 2. Data Structure
- Always include timestamp
- Include relevant IDs for filtering
- Keep payloads small (<10KB)

### 3. Error Handling
- Always wrap handlers in try-catch
- Log errors with context
- Send user-friendly error messages

### 4. Performance
- Use rooms for targeted broadcasting
- Implement message throttling
- Clean up old rooms periodically

### 5. Security
- Always verify JWT tokens
- Validate user permissions for rooms
- Rate limit event emissions
- Sanitize all user input

---

## Testing WebSocket Events

### Using Socket.IO Client (Node.js)

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5001', {
  query: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected');

  // Subscribe to orders
  socket.emit('subscribe', { channel: 'orders' });
});

socket.on('order_status_update', (data) => {
  console.log('Order update:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### Using Postman

1. Create new WebSocket Request
2. URL: `ws://localhost:5001?token=YOUR_TOKEN`
3. Connect
4. Send events using the message composer
5. View received events in the response panel

---

## Implementation Checklist

- [ ] Set up Socket.IO server with authentication
- [ ] Implement room management system
- [ ] Create event handlers for all event types
- [ ] Add Redis for distributed systems (optional)
- [ ] Implement reconnection handling
- [ ] Add rate limiting for events
- [ ] Set up monitoring and logging
- [ ] Create admin dashboard for active connections
- [ ] Implement automatic room cleanup
- [ ] Add compression for large payloads
- [ ] Test with multiple concurrent connections
- [ ] Document all events for frontend team
