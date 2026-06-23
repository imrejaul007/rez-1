# Real-Time Updates - Quick Start Guide

## What's Been Implemented

### 1. Enhanced Real-Time Service ✅
**Location:** `services/realTimeService.ts`

**New Features:**
- Offline message queue (stores up to 100 messages)
- Authentication token management
- Automatic queue processing on reconnection
- Additional message types for orders, chat, feed, leaderboard, and cart

### 2. Connection Status Component ✅
**Location:** `components/common/ConnectionStatus.tsx`

Shows a banner at the top when:
- Disconnected (with Connect button)
- Reconnecting (with attempt counter and pulse animation)
- Connection failed (with Retry button)
- Hidden when connected

### 3. Toast Notifications ✅
**Location:** `components/common/Toast.tsx` and `components/common/ToastManager.tsx`

Already exists and ready to use for real-time notifications.

---

## How to Use Real-Time Features

### Step 1: Add Connection Status to Your App

Edit `app/_layout.tsx`:

```typescript
import ConnectionStatus from '@/components/common/ConnectionStatus';
import ToastManager from '@/components/common/ToastManager';

export default function RootLayout() {
  return (
    <SocketProvider>
      <AuthProvider>
        <CartProvider>
          {/* ... your other providers */}

          <Stack>
            {/* ... your screens */}
          </Stack>

          {/* Add these at the end */}
          <ConnectionStatus />
          <ToastManager />
        </CartProvider>
      </AuthProvider>
    </SocketProvider>
  );
}
```

### Step 2: Update Socket Types

Add to `types/socket.types.ts` (after line 182):

```typescript
// Order tracking event payloads
export interface OrderStatusUpdatePayload {
  orderId: string;
  status: string;
  message: string;
  timestamp: string;
  estimatedDelivery?: string;
}

export interface OrderLocationUpdatePayload {
  orderId: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  distanceToDestination?: number;
  deliveryPartner?: {
    name: string;
    phone: string;
    vehicle?: string;
  };
  timestamp: string;
}

// Chat event payloads
export interface ChatMessagePayload {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface ChatTypingPayload {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// Feed event payloads
export interface FeedNewPostPayload {
  postId: string;
  userId: string;
  userName: string;
  content: string;
  images?: string[];
  timestamp: string;
}

// Leaderboard event payloads
export interface LeaderboardUpdatePayload {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: Array<{
    rank: number;
    userId: string;
    fullName: string;
    coins: number;
  }>;
  timestamp: string;
}

// Cart event payloads
export interface CartSyncPayload {
  userId: string;
  cartId: string;
  items: any[];
  totalItems: number;
  totalPrice: number;
  timestamp: string;
}

// Add event names
export const SocketEventsExtended = {
  ...SocketEvents,

  // Order events
  ORDER_STATUS_UPDATE: 'order:status_update',
  ORDER_LOCATION_UPDATE: 'order:location_update',
  SUBSCRIBE_ORDER: 'subscribe:order',
  UNSUBSCRIBE_ORDER: 'unsubscribe:order',

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  SUBSCRIBE_CHAT: 'subscribe:chat',
  UNSUBSCRIBE_CHAT: 'unsubscribe:chat',
  SEND_CHAT_MESSAGE: 'chat:send_message',

  // Feed events
  FEED_NEW_POST: 'feed:new_post',
  SUBSCRIBE_FEED: 'subscribe:feed',
  UNSUBSCRIBE_FEED: 'unsubscribe:feed',

  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboard:update',
  SUBSCRIBE_LEADERBOARD: 'subscribe:leaderboard',
  UNSUBSCRIBE_LEADERBOARD: 'unsubscribe:leaderboard',

  // Cart events
  CART_SYNC: 'cart:sync',
  SUBSCRIBE_CART: 'subscribe:cart',
  UNSUBSCRIBE_CART: 'unsubscribe:cart',
} as const;

// Callback types
export type OrderStatusUpdateCallback = (payload: OrderStatusUpdatePayload) => void;
export type OrderLocationUpdateCallback = (payload: OrderLocationUpdatePayload) => void;
export type ChatMessageCallback = (payload: ChatMessagePayload) => void;
export type ChatTypingCallback = (payload: ChatTypingPayload) => void;
export type FeedNewPostCallback = (payload: FeedNewPostPayload) => void;
export type LeaderboardUpdateCallback = (payload: LeaderboardUpdatePayload) => void;
export type CartSyncCallback = (payload: CartSyncPayload) => void;
```

### Step 3: Extend SocketContext (Optional)

If you need the new real-time features, add methods to `contexts/SocketContext.tsx`.

**Example for Chat:**

```typescript
// Add to SocketContextType interface
interface SocketContextType {
  // ... existing properties

  // Chat methods
  onChatMessage: (callback: ChatMessageCallback) => () => void;
  onChatTyping: (callback: ChatTypingCallback) => () => void;
  subscribeToChat: (chatId: string) => void;
  unsubscribeFromChat: (chatId: string) => void;
  sendChatMessage: (chatId: string, message: string) => void;
}

// Add inside SocketProvider component
const subscribedChats = useRef<Set<string>>(new Set());

const onChatMessage = useCallback((callback: ChatMessageCallback) => {
  if (!socketRef.current) return () => {};
  socketRef.current.on(SocketEventsExtended.CHAT_MESSAGE, callback);
  return () => socketRef.current?.off(SocketEventsExtended.CHAT_MESSAGE, callback);
}, []);

const onChatTyping = useCallback((callback: ChatTypingCallback) => {
  if (!socketRef.current) return () => {};
  socketRef.current.on(SocketEventsExtended.CHAT_TYPING, callback);
  return () => socketRef.current?.off(SocketEventsExtended.CHAT_TYPING, callback);
}, []);

const subscribeToChat = useCallback((chatId: string) => {
  if (!socketRef.current?.connected) return;
  socketRef.current.emit(SocketEventsExtended.SUBSCRIBE_CHAT, { chatId });
  subscribedChats.current.add(chatId);
}, []);

const unsubscribeFromChat = useCallback((chatId: string) => {
  if (!socketRef.current?.connected) return;
  socketRef.current.emit(SocketEventsExtended.UNSUBSCRIBE_CHAT, { chatId });
  subscribedChats.current.delete(chatId);
}, []);

const sendChatMessage = useCallback((chatId: string, message: string) => {
  if (!socketRef.current?.connected) return;
  socketRef.current.emit(SocketEventsExtended.SEND_CHAT_MESSAGE, {
    chatId,
    message,
    timestamp: new Date().toISOString(),
  });
}, []);

// Add to contextValue
const contextValue: SocketContextType = {
  // ... existing properties
  onChatMessage,
  onChatTyping,
  subscribeToChat,
  unsubscribeFromChat,
  sendChatMessage,
};
```

---

## Usage Examples

### Real-Time Chat

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { showToast } from '@/components/common/ToastManager';

export default function ChatPage() {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const chatId = 'chat-123';

    if (socket.state.connected) {
      socket.subscribeToChat(chatId);

      const unsubMsg = socket.onChatMessage((payload) => {
        if (payload.chatId === chatId) {
          setMessages(prev => [...prev, payload]);
        }
      });

      const unsubTyping = socket.onChatTyping((payload) => {
        if (payload.chatId === chatId) {
          setIsTyping(payload.isTyping);
        }
      });

      return () => {
        unsubMsg();
        unsubTyping();
        socket.unsubscribeFromChat(chatId);
      };
    }
  }, [socket.state.connected]);

  const sendMessage = (text: string) => {
    socket.sendChatMessage('chat-123', text);
  };

  return (
    // Your chat UI
  );
}
```

### Real-Time Order Tracking

The order tracking page (`app/tracking/[orderId].tsx`) already uses the `useOrderTracking` hook which implements real-time updates automatically!

### Real-Time Feed

```typescript
import { useSocket } from '@/contexts/SocketContext';

export default function FeedPage() {
  const socket = useSocket();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (socket.state.connected) {
      socket.subscribeToFeed();

      const unsub = socket.onFeedNewPost((payload) => {
        setPosts(prev => [payload, ...prev]);

        showToast({
          message: `${payload.userName} posted: ${payload.content}`,
          type: 'info',
          duration: 3000,
        });
      });

      return () => {
        unsub();
        socket.unsubscribeFromFeed();
      };
    }
  }, [socket.state.connected]);

  return (
    // Your feed UI
  );
}
```

### Real-Time Cart Sync

Add to `contexts/CartContext.tsx`:

```typescript
import { useSocket } from './SocketContext';

export function CartProvider({ children }: CartProviderProps) {
  const socket = useSocket();
  const { state: authState } = useAuth();

  useEffect(() => {
    if (socket.state.connected && authState.user?.id) {
      const cartId = 'cart-' + authState.user.id;
      socket.subscribeToCart(cartId);

      const unsub = socket.onCartSync((payload) => {
        if (payload.userId === authState.user?.id) {
          dispatch({ type: 'CART_LOADED', payload: payload.items });
        }
      });

      return () => {
        unsub();
        socket.unsubscribeFromCart();
      };
    }
  }, [socket.state.connected, authState.user?.id]);

  // ... rest of provider
}
```

---

## Testing Real-Time Features

### 1. Test Connection Status
- Start the app - should connect automatically
- Turn off WiFi - should show "Reconnecting..." banner
- Turn on WiFi - banner should disappear when reconnected

### 2. Test Offline Queue
```typescript
// In any component
const socket = useSocket();

// Send messages while offline
socket.send({
  type: 'test_message',
  data: { message: 'Hello' },
  timestamp: Date.now(),
});

// Messages will be queued and sent when reconnected
```

### 3. Test Toast Notifications
```typescript
import { showToast } from '@/components/common/ToastManager';

// Success toast
showToast({
  message: 'Order delivered!',
  type: 'success',
});

// Error toast
showToast({
  message: 'Failed to load',
  type: 'error',
});

// Toast with actions
showToast({
  message: 'New message received',
  type: 'info',
  actions: [
    { text: 'View', onPress: () => console.log('View') },
    { text: 'Dismiss', onPress: () => {}, style: 'cancel' },
  ],
});
```

---

## Backend Requirements

Your backend needs to implement these Socket.IO events:

### Events Backend Should Emit:
- `order:status_update` - When order status changes
- `order:location_update` - When delivery location updates
- `chat:message` - When new chat message arrives
- `chat:typing` - When user/agent is typing
- `feed:new_post` - When new post is created
- `leaderboard:update` - When leaderboard changes
- `cart:sync` - When cart needs to sync across devices

### Events Backend Should Listen For:
- `subscribe:order` - Subscribe to order updates
- `unsubscribe:order` - Unsubscribe from order
- `subscribe:chat` - Subscribe to chat
- `unsubscribe:chat` - Unsubscribe from chat
- `chat:send_message` - Send chat message
- `chat:typing` - User typing indicator
- `subscribe:feed` - Subscribe to feed
- `unsubscribe:feed` - Unsubscribe from feed
- `subscribe:leaderboard` - Subscribe to leaderboard
- `unsubscribe:leaderboard` - Unsubscribe from leaderboard
- `subscribe:cart` - Subscribe to cart
- `unsubscribe:cart` - Unsubscribe from cart

---

## FAQ

### Q: How do I show a toast for real-time events?
```typescript
import { showToast } from '@/components/common/ToastManager';

socket.onOrderStatusUpdate((payload) => {
  showToast({
    message: payload.message,
    type: 'info',
  });
});
```

### Q: How do I check connection status?
```typescript
const socket = useSocket();

if (socket.state.connected) {
  // Connected
} else if (socket.state.reconnecting) {
  // Reconnecting
} else {
  // Disconnected
}
```

### Q: How do I manually reconnect?
```typescript
const socket = useSocket();

// Disconnect
socket.disconnect();

// Reconnect
socket.connect();
```

### Q: How many messages can be queued?
Up to 100 messages. Oldest messages are removed when queue is full.

### Q: Do subscriptions persist after reconnection?
Yes! All subscriptions are automatically re-established when reconnecting.

---

## Complete Example: Real-Time Chat

See the full implementation in `REALTIME_IMPLEMENTATION_COMPLETE.md` for a complete working chat example with:
- Real-time message delivery
- Typing indicators
- Read receipts
- Agent online/offline status
- Optimistic updates
- Error handling

---

## Next Steps

1. ✅ Connection status banner added
2. ✅ Toast notifications ready
3. ✅ Offline queue implemented
4. ✅ Order tracking uses real-time (already working)
5. 📝 Add real-time to chat page
6. 📝 Add real-time to feed page
7. 📝 Add real-time to leaderboard page
8. 📝 Add cart sync
9. 📝 Implement backend Socket.IO events

For detailed implementation of each feature, see `REALTIME_IMPLEMENTATION_COMPLETE.md`.
