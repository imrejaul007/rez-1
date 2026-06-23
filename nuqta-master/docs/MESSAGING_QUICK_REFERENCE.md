# Store Messaging - Quick Reference Guide

## 📁 File Structure

```
frontend/
├── types/
│   └── messaging.types.ts          # All messaging type definitions
├── services/
│   └── storeMessagingApi.ts        # API service for messaging
├── hooks/
│   └── useStoreMessaging.ts        # Custom hook for messaging
├── components/
│   ├── store/
│   │   ├── ContactStoreModal.tsx   # Contact options modal
│   │   └── StoreAvailabilityBadge.tsx  # Store status badge
│   └── messages/
│       ├── MessageBubble.tsx       # Individual message display
│       ├── MessageInput.tsx        # Message input component
│       └── ConversationList.tsx    # List of conversations
└── app/
    ├── store/[id]/
    │   └── chat.tsx                # Store chat screen
    ├── messages/
    │   └── index.tsx               # All conversations screen
    └── tracking/[orderId].tsx      # Updated with contact modal
```

---

## 🚀 Quick Start

### 1. Open Contact Modal

```typescript
import ContactStoreModal from '@/components/store/ContactStoreModal';

const [showContactModal, setShowContactModal] = useState(false);

<ContactStoreModal
  visible={showContactModal}
  onClose={() => setShowContactModal(false)}
  storeId="store-123"
  storeName="Best Store"
  storePhone="+91-1234567890"
  storeEmail="store@example.com"
  orderId="order-456"
  orderNumber="ORD-123456"
/>
```

### 2. Navigate to Chat

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

router.push({
  pathname: '/store/[id]/chat',
  params: {
    id: storeId,
    storeName: 'Store Name',
    orderId: orderId,
    prefilledMessage: 'Hello!',
  },
});
```

### 3. Use Messaging Hook

```typescript
import { useStoreMessaging } from '@/hooks/useStoreMessaging';

const {
  conversation,
  messages,
  loading,
  sending,
  error,
  typingUsers,
  isStoreOnline,
  sendMessage,
  loadMoreMessages,
  markAsRead,
} = useStoreMessaging({
  conversationId: 'conv-123',
  storeId: 'store-456',
  orderId: 'order-789',
  autoLoad: true,
});

// Send a message
sendMessage('Hello, store!');

// Load more messages
loadMoreMessages();

// Mark as read
markAsRead();
```

### 4. Display Conversation List

```typescript
import ConversationList from '@/components/messages/ConversationList';

<ConversationList
  conversations={conversations}
  loading={loading}
  onRefresh={handleRefresh}
  refreshing={refreshing}
  onLoadMore={handleLoadMore}
  ListEmptyComponent={<EmptyState />}
/>
```

### 5. Show Store Availability

```typescript
import StoreAvailabilityBadge from '@/components/store/StoreAvailabilityBadge';

<StoreAvailabilityBadge
  isOnline={true}
  isOpen={true}
  responseTime="Usually replies in 5 minutes"
  size="medium"
  showResponseTime={true}
/>
```

---

## 🔌 Socket Events

### Listen for Events

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { MessagingSocketEvents } from '@/types/messaging.types';

const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;

  // Message received
  socket.on(MessagingSocketEvents.MESSAGE_RECEIVED, (payload) => {
    console.log('New message:', payload.message);
  });

  // Typing indicator
  socket.on(MessagingSocketEvents.TYPING_START, (payload) => {
    console.log(`${payload.userName} is typing...`);
  });

  // Store online/offline
  socket.on(MessagingSocketEvents.STORE_ONLINE, (payload) => {
    console.log(`Store ${payload.storeId} is now ${payload.isOnline ? 'online' : 'offline'}`);
  });

  return () => {
    socket.off(MessagingSocketEvents.MESSAGE_RECEIVED);
    socket.off(MessagingSocketEvents.TYPING_START);
    socket.off(MessagingSocketEvents.STORE_ONLINE);
  };
}, [socket]);
```

### Emit Events

```typescript
// Join conversation room
socket.emit(MessagingSocketEvents.JOIN_CONVERSATION, {
  conversationId: 'conv-123'
});

// Start typing
socket.emit(MessagingSocketEvents.TYPING_START, {
  conversationId: 'conv-123'
});

// Stop typing
socket.emit(MessagingSocketEvents.TYPING_STOP, {
  conversationId: 'conv-123'
});

// Leave conversation room
socket.emit(MessagingSocketEvents.LEAVE_CONVERSATION, {
  conversationId: 'conv-123'
});
```

---

## 📡 API Calls

### Get Conversations

```typescript
import storeMessagingService from '@/services/storeMessagingApi';

const response = await storeMessagingService.getConversations({
  page: 1,
  limit: 20,
  status: 'active',
  search: 'query',
});

if (response.success) {
  console.log('Conversations:', response.data.conversations);
  console.log('Unread count:', response.data.summary.unreadCount);
}
```

### Get Messages

```typescript
const response = await storeMessagingService.getMessages(
  conversationId,
  1, // page
  50  // limit
);

if (response.success) {
  console.log('Messages:', response.data.messages);
}
```

### Send Message

```typescript
const response = await storeMessagingService.sendMessage({
  conversationId: 'conv-123',
  storeId: 'store-456',
  content: 'Hello!',
  type: 'text',
  orderId: 'order-789',
});

if (response.success) {
  console.log('Message sent:', response.data);
}
```

### Send with Attachments

```typescript
const attachments = [file1, file2]; // File objects

const response = await storeMessagingService.sendMessageWithAttachments(
  conversationId,
  'Check out these images',
  attachments
);
```

### Mark as Read

```typescript
// Mark specific message
await storeMessagingService.markMessageAsRead(conversationId, messageId);

// Mark entire conversation
await storeMessagingService.markConversationAsRead(conversationId);
```

### Archive Conversation

```typescript
await storeMessagingService.archiveConversation(conversationId);
```

### Get Store Availability

```typescript
const response = await storeMessagingService.getStoreAvailability(storeId);

if (response.success) {
  console.log('Is online:', response.data.isOnline);
  console.log('Is open:', response.data.isOpen);
  console.log('Response time:', response.data.averageResponseTime);
}
```

---

## 📝 Type Definitions

### Message

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'store' | 'support' | 'system';
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'location' | 'order' | 'product' | 'system';
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: MessageAttachment[];
  orderReference?: MessageOrderReference;
  productReference?: MessageProductReference;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  deliveredAt?: string;
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  storeId: string;
  storeName: string;
  storeAvatar?: string;
  customerId: string;
  customerName: string;
  status: 'active' | 'archived' | 'closed';
  lastMessage?: Message;
  unreadCount: number;
  isStoreOnline: boolean;
  storeResponseTime?: string;
  orderContext?: {
    orderId: string;
    orderNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 UI Components

### MessageBubble

```typescript
<MessageBubble
  message={message}
  isOwnMessage={message.senderType === 'customer'}
  showAvatar={true}
  showTimestamp={true}
  onLongPress={() => console.log('Long pressed')}
  onImagePress={(url) => console.log('Image pressed:', url)}
/>
```

### MessageInput

```typescript
<MessageInput
  onSend={(message) => sendMessage(message)}
  onTyping={() => startTyping()}
  onStopTyping={() => stopTyping()}
  onAttachImage={() => handleAttachImage()}
  onAttachFile={() => handleAttachFile()}
  placeholder="Type a message..."
  disabled={sending}
  prefilledMessage="Hello!"
/>
```

---

## 🔄 Common Patterns

### Loading States

```typescript
if (loading && !messages.length) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={PROFILE_COLORS.primary} />
      <ThemedText>Loading messages...</ThemedText>
    </View>
  );
}
```

### Error States

```typescript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
      <ThemedText>{error}</ThemedText>
      <TouchableOpacity onPress={refresh}>
        <ThemedText>Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );
}
```

### Empty States

```typescript
if (!loading && messages.length === 0) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <ThemedText>No messages yet</ThemedText>
      <ThemedText>Start a conversation with {storeName}</ThemedText>
    </View>
  );
}
```

### Optimistic Updates

```typescript
// Add message optimistically
const tempMessage = {
  id: `temp-${Date.now()}`,
  content: message,
  status: 'sending',
  // ... other fields
};

setMessages(prev => [...prev, tempMessage]);

// Send to server
const response = await sendMessage(message);

// Replace temp message with real one
if (response.success) {
  setMessages(prev =>
    prev.map(m => m.id === tempMessage.id ? response.data : m)
  );
}
```

---

## 🎯 Quick Actions Templates

```typescript
import { QUICK_MESSAGE_TEMPLATES } from '@/types/messaging.types';

// Get templates for order-related queries
const orderTemplates = QUICK_MESSAGE_TEMPLATES.filter(
  t => t.category === 'order_status' || t.category === 'delivery'
);

// Use template
const template = QUICK_MESSAGE_TEMPLATES[0];
const message = template.content.replace('{orderNumber}', orderNumber);
sendMessage(message);
```

### Available Templates

1. Where is my order?
2. Modify my order
3. Report an issue
4. Request refund
5. Add delivery instructions
6. Product inquiry

---

## 🐛 Debugging

### Enable Logs

```typescript
// In storeMessagingApi.ts and useStoreMessaging.ts
console.log('💬 [MESSAGING]', ...args);
```

### Check Socket Connection

```typescript
const { socket, state } = useSocket();

console.log('Socket connected:', state.connected);
console.log('Socket reconnecting:', state.reconnecting);
console.log('Socket error:', state.error);
```

### Monitor Messages

```typescript
useEffect(() => {
  console.log('Messages updated:', messages.length);
  console.log('Latest message:', messages[messages.length - 1]);
}, [messages]);
```

---

## ⚠️ Important Notes

1. **Backend Required**: All features require backend API implementation
2. **Socket Connection**: Ensure Socket.IO server is running
3. **Permissions**: Request camera/storage permissions for attachments
4. **Error Handling**: Always handle API errors gracefully
5. **Loading States**: Show loading indicators for better UX
6. **Optimistic Updates**: Use for better perceived performance
7. **Memory Management**: Cleanup socket listeners on unmount
8. **Message Limits**: Implement pagination for large conversations

---

## 🔗 Related Files

- `types/socket.types.ts` - Socket event definitions
- `contexts/SocketContext.tsx` - Socket provider
- `services/apiClient.ts` - Base API client
- `hooks/useOrderTracking.ts` - Order tracking hook
- `app/tracking/[orderId].tsx` - Order tracking page

---

## 📚 Additional Resources

- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo Document Picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [React Navigation](https://reactnavigation.org/)

---

## 💡 Tips & Tricks

1. **Performance**: Use `FlatList` for message lists
2. **Memory**: Limit loaded messages to 100-200 at a time
3. **UX**: Auto-scroll to bottom on new messages
4. **Typing**: Debounce typing indicators
5. **Images**: Compress before upload
6. **Errors**: Show user-friendly error messages
7. **Offline**: Queue messages when offline
8. **Notifications**: Show badge count for unread
9. **Testing**: Mock socket events for testing
10. **Analytics**: Track message send/receive rates

---

## ✅ Checklist

Before going to production:

- [ ] Backend API endpoints implemented
- [ ] Socket.IO server configured
- [ ] Push notifications set up
- [ ] Image upload working
- [ ] File upload working
- [ ] Typing indicators working
- [ ] Read receipts working
- [ ] Online/offline status working
- [ ] Error handling tested
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Permissions requested
- [ ] Analytics integrated
- [ ] Performance tested
- [ ] Cross-platform tested
- [ ] Accessibility checked
