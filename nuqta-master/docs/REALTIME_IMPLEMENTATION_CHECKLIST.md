# Real-Time Updates Implementation Checklist

Use this checklist to track your implementation progress.

---

## Phase 1: Core Setup (30 minutes)

### Step 1: Add UI Components to Layout
- [ ] Open `app/_layout.tsx`
- [ ] Import `ConnectionStatus` from `@/components/common/ConnectionStatus`
- [ ] Import `ToastManager` from `@/components/common/ToastManager`
- [ ] Add `<ConnectionStatus />` after your Stack component
- [ ] Add `<ToastManager />` after ConnectionStatus
- [ ] Test: Start app, turn off WiFi, should see reconnecting banner

### Step 2: Test Existing Real-Time Features
- [ ] Open an order tracking page (`app/tracking/[orderId].tsx`)
- [ ] Verify order tracking already works with real-time updates
- [ ] Check if `useOrderTracking` hook is being used
- [ ] Confirm connection status shows when offline
- [ ] **This already works! No changes needed.**

### Step 3: Verify Services
- [ ] Check `services/realTimeService.ts` has message queue
- [ ] Verify `MESSAGE_TYPES` includes new event types
- [ ] Confirm `updateAuthToken()` method exists
- [ ] Confirm `queueMessage()` and `processMessageQueue()` exist

---

## Phase 2: Extend Type System (15 minutes)

### Step 4: Add Socket Event Types
- [ ] Open `types/socket.types.ts`
- [ ] Copy event payloads from `REALTIME_IMPLEMENTATION_COMPLETE.md`
- [ ] Add `OrderStatusUpdatePayload`
- [ ] Add `OrderLocationUpdatePayload`
- [ ] Add `ChatMessagePayload`
- [ ] Add `ChatTypingPayload`
- [ ] Add `FeedNewPostPayload`
- [ ] Add `FeedPostLikedPayload`
- [ ] Add `LeaderboardUpdatePayload`
- [ ] Add `CartSyncPayload`
- [ ] Add `SocketEventsExtended` object
- [ ] Add all callback types

---

## Phase 3: Implement Chat Real-Time (2 hours)

### Step 5: Extend SocketContext for Chat
- [ ] Open `contexts/SocketContext.tsx`
- [ ] Add chat methods to `SocketContextType` interface:
  - [ ] `onChatMessage`
  - [ ] `onChatTyping`
  - [ ] `subscribeToChat`
  - [ ] `unsubscribeFromChat`
  - [ ] `sendChatMessage`
  - [ ] `sendTypingIndicator`
- [ ] Create `subscribedChats` ref
- [ ] Implement chat callback methods
- [ ] Add chat subscriptions to `resubscribeAll()`
- [ ] Add methods to context value

### Step 6: Update Chat Page
- [ ] Open `app/support/chat.tsx`
- [ ] Import `useSocket` hook
- [ ] Add `chatId` state
- [ ] Subscribe to chat on mount
- [ ] Listen for `onChatMessage` events
- [ ] Listen for `onChatTyping` events
- [ ] Update `handleSend` to use `sendChatMessage`
- [ ] Add typing indicator logic
- [ ] Unsubscribe on unmount
- [ ] Test: Send messages, see them arrive in real-time

---

## Phase 4: Implement Feed Real-Time (1 hour)

### Step 7: Extend SocketContext for Feed
- [ ] Open `contexts/SocketContext.tsx`
- [ ] Add feed methods to interface:
  - [ ] `onFeedNewPost`
  - [ ] `onFeedPostLiked`
  - [ ] `onFeedPostCommented`
  - [ ] `subscribeToFeed`
  - [ ] `unsubscribeFromFeed`
- [ ] Create `subscribedToFeed` ref
- [ ] Implement feed callback methods
- [ ] Add feed subscription to `resubscribeAll()`

### Step 8: Update Feed Page
- [ ] Open `app/feed/index.tsx`
- [ ] Import `useSocket` hook
- [ ] Subscribe to feed on mount
- [ ] Listen for `onFeedNewPost` events
- [ ] Listen for `onFeedPostLiked` events
- [ ] Listen for `onFeedPostCommented` events
- [ ] Prepend new posts to feed
- [ ] Update like/comment counts
- [ ] Show toast for new posts
- [ ] Unsubscribe on unmount
- [ ] Test: Create post, see it appear immediately

---

## Phase 5: Implement Leaderboard Real-Time (1 hour)

### Step 9: Extend SocketContext for Leaderboard
- [ ] Open `contexts/SocketContext.tsx`
- [ ] Add leaderboard methods to interface:
  - [ ] `onLeaderboardUpdate`
  - [ ] `onLeaderboardRankChange`
  - [ ] `onLeaderboardAchievement`
  - [ ] `subscribeToLeaderboard`
  - [ ] `unsubscribeFromLeaderboard`
- [ ] Create `subscribedToLeaderboard` ref
- [ ] Implement leaderboard callback methods
- [ ] Add leaderboard subscription to `resubscribeAll()`

### Step 10: Update Leaderboard Page
- [ ] Open `app/leaderboard/index.tsx`
- [ ] Import `useSocket` hook
- [ ] Subscribe to leaderboard on mount
- [ ] Listen for `onLeaderboardUpdate` events
- [ ] Listen for `onLeaderboardRankChange` events
- [ ] Listen for `onLeaderboardAchievement` events
- [ ] Update rankings in real-time
- [ ] Animate rank changes
- [ ] Show achievement toasts
- [ ] Unsubscribe on unmount
- [ ] Test: Update points, see rankings change

---

## Phase 6: Implement Cart Sync (1 hour)

### Step 11: Extend SocketContext for Cart
- [ ] Open `contexts/SocketContext.tsx`
- [ ] Add cart methods to interface:
  - [ ] `onCartSync`
  - [ ] `onCartItemReserved`
  - [ ] `onCartItemReleased`
  - [ ] `subscribeToCart`
  - [ ] `unsubscribeFromCart`
- [ ] Create `subscribedToCart` ref
- [ ] Implement cart callback methods
- [ ] Add cart subscription to `resubscribeAll()`

### Step 12: Update CartContext
- [ ] Open `contexts/CartContext.tsx`
- [ ] Import `useSocket` hook
- [ ] Subscribe to cart when authenticated
- [ ] Listen for `onCartSync` events
- [ ] Listen for `onCartItemReserved` events
- [ ] Listen for `onCartItemReleased` events
- [ ] Update cart on sync events
- [ ] Show countdown for reserved items
- [ ] Remove items on timeout
- [ ] Unsubscribe on unmount
- [ ] Test: Add item on device A, see it on device B

---

## Phase 7: Backend Implementation (2-3 days)

### Step 13: Implement Order Events
- [ ] Backend emits `order:status_update` when status changes
- [ ] Backend emits `order:location_update` for delivery location
- [ ] Backend listens for `subscribe:order` from clients
- [ ] Backend listens for `unsubscribe:order` from clients
- [ ] Backend joins client to order room on subscribe
- [ ] Test: Update order status, see frontend update

### Step 14: Implement Chat Events
- [ ] Backend listens for `subscribe:chat` from clients
- [ ] Backend listens for `unsubscribe:chat` from clients
- [ ] Backend listens for `chat:send_message` from clients
- [ ] Backend listens for `chat:typing` from clients
- [ ] Backend emits `chat:message` to chat room
- [ ] Backend emits `chat:typing` to other users
- [ ] Backend emits `chat:agent_status` on agent status change
- [ ] Test: Send message, see it on other device

### Step 15: Implement Feed Events
- [ ] Backend listens for `subscribe:feed` from clients
- [ ] Backend listens for `unsubscribe:feed` from clients
- [ ] Backend emits `feed:new_post` when post created
- [ ] Backend emits `feed:post_liked` when post liked
- [ ] Backend emits `feed:post_commented` when commented
- [ ] Backend joins client to user's feed room
- [ ] Test: Create post, see it appear for followers

### Step 16: Implement Leaderboard Events
- [ ] Backend listens for `subscribe:leaderboard` from clients
- [ ] Backend listens for `unsubscribe:leaderboard` from clients
- [ ] Backend emits `leaderboard:update` periodically
- [ ] Backend emits `leaderboard:rank_change` when rank changes
- [ ] Backend emits `leaderboard:achievement` when earned
- [ ] Backend joins client to leaderboard room
- [ ] Test: Update coins, see leaderboard change

### Step 17: Implement Cart Events
- [ ] Backend listens for `subscribe:cart` from clients
- [ ] Backend listens for `unsubscribe:cart` from clients
- [ ] Backend emits `cart:sync` when cart changes
- [ ] Backend emits `cart:item_reserved` when item reserved
- [ ] Backend emits `cart:item_released` when released
- [ ] Backend joins client to user's cart room
- [ ] Test: Add item, see cart sync on other device

---

## Phase 8: Testing (2 days)

### Step 18: Connection Testing
- [ ] Test app starts and connects automatically
- [ ] Test connection status shows when offline
- [ ] Test reconnection works after network interruption
- [ ] Test manual reconnect button works
- [ ] Test connection persists through app suspend/resume
- [ ] Test max reconnect attempts reached shows error

### Step 19: Order Tracking Testing
- [ ] Test order status updates appear immediately
- [ ] Test location updates show on map (if implemented)
- [ ] Test ETA updates reflect in UI
- [ ] Test multiple orders can be tracked
- [ ] Test order subscription persists through reconnect
- [ ] Test unsubscribe works on unmount

### Step 20: Chat Testing
- [ ] Test messages appear immediately for both users
- [ ] Test typing indicators work correctly
- [ ] Test typing indicator stops after 2 seconds
- [ ] Test agent online/offline status updates
- [ ] Test messages sent while offline queue and send later
- [ ] Test reconnection maintains chat subscription
- [ ] Test multiple chats can be active

### Step 21: Feed Testing
- [ ] Test new posts appear automatically
- [ ] Test like counts update in real-time
- [ ] Test comments appear immediately
- [ ] Test follow notifications appear
- [ ] Test toast shows for new posts
- [ ] Test feed subscription persists through reconnect
- [ ] Test scroll position maintained when new posts added

### Step 22: Leaderboard Testing
- [ ] Test rankings update automatically
- [ ] Test rank changes animate smoothly
- [ ] Test achievement notifications appear
- [ ] Test period filter changes subscription
- [ ] Test user's own rank highlighted
- [ ] Test leaderboard subscription persists through reconnect

### Step 23: Cart Testing
- [ ] Test cart syncs across devices immediately
- [ ] Test cart syncs across browser tabs
- [ ] Test item reservation countdown works
- [ ] Test reserved items release on timeout
- [ ] Test price updates reflect immediately
- [ ] Test stock updates trigger warnings
- [ ] Test cart subscription persists through reconnect
- [ ] Test optimistic updates rollback on failure

### Step 24: Message Queue Testing
- [ ] Test messages queue when offline
- [ ] Test queued messages send on reconnect
- [ ] Test queue has max 100 messages
- [ ] Test oldest messages dropped when queue full
- [ ] Test queue can be cleared manually
- [ ] Test queue size can be checked

### Step 25: Toast Testing
- [ ] Test success toasts appear and auto-dismiss
- [ ] Test error toasts appear and can be dismissed
- [ ] Test warning toasts show correct color
- [ ] Test info toasts show correct icon
- [ ] Test toasts with actions stay until dismissed
- [ ] Test multiple toasts can be shown
- [ ] Test toasts stack correctly

---

## Phase 9: Performance Testing (1 day)

### Step 26: Load Testing
- [ ] Test with 10+ simultaneous subscriptions
- [ ] Test with 100+ queued messages
- [ ] Test with rapid reconnections
- [ ] Test with slow network connections
- [ ] Test with intermittent network
- [ ] Monitor memory usage during long session
- [ ] Check for memory leaks

### Step 27: Network Testing
- [ ] Test with WiFi
- [ ] Test with cellular data
- [ ] Test with weak signal
- [ ] Test switching between WiFi and cellular
- [ ] Test with VPN
- [ ] Test with proxy
- [ ] Test with firewall

---

## Phase 10: Polish & Documentation (1 day)

### Step 28: Error Handling
- [ ] All errors show user-friendly messages
- [ ] Connection errors show toast notification
- [ ] Failed messages retry automatically
- [ ] User can manually retry failed operations
- [ ] Errors logged to console for debugging
- [ ] Critical errors reported to error tracking

### Step 29: User Experience
- [ ] Loading states show spinners
- [ ] Success operations show confirmation
- [ ] Smooth animations for rank changes
- [ ] Optimistic updates feel instant
- [ ] Connection status banner not intrusive
- [ ] Toasts positioned correctly
- [ ] UI remains responsive during sync

### Step 30: Documentation
- [ ] Update README with real-time features
- [ ] Document backend event requirements
- [ ] Create troubleshooting guide
- [ ] Document environment variables needed
- [ ] Add code comments for complex logic
- [ ] Update API documentation

---

## Completion Criteria

### Minimum Requirements (MVP):
- ✅ Connection status shows correctly
- ✅ Order tracking works in real-time
- ✅ Messages queue when offline
- ✅ Auto-reconnection works
- ✅ Toast notifications appear

### Full Implementation:
- ✅ All of MVP
- ✅ Chat messages real-time
- ✅ Feed auto-refreshes
- ✅ Leaderboard updates live
- ✅ Cart syncs across devices
- ✅ All tests passing
- ✅ Performance acceptable
- ✅ Documentation complete

---

## Estimated Timeline

### Individual Developer:
- Phase 1-2 (Setup): **1 hour**
- Phase 3 (Chat): **2 hours**
- Phase 4 (Feed): **1 hour**
- Phase 5 (Leaderboard): **1 hour**
- Phase 6 (Cart): **1 hour**
- Phase 7 (Backend): **2-3 days**
- Phase 8 (Testing): **2 days**
- Phase 9 (Performance): **1 day**
- Phase 10 (Polish): **1 day**

**Total: 6-8 days**

### Team of 2-3:
- Frontend dev: Phases 1-6 (**2 days**)
- Backend dev: Phase 7 (**2-3 days**)
- Testing: Phases 8-9 (**2 days**)
- Polish: Phase 10 (**1 day**)

**Total: 4-5 days**

---

## Quick Wins (Do These First)

1. **Add Connection Status** (5 mins)
   - Immediate visual feedback
   - Professional UX

2. **Test Order Tracking** (5 mins)
   - Already working!
   - Verify real-time updates

3. **Implement Chat** (2 hours)
   - Most visible feature
   - High user value

4. **Add Toast for Events** (30 mins)
   - Better user feedback
   - Easy to implement

---

## Support Resources

- **REALTIME_IMPLEMENTATION_COMPLETE.md** - Full code examples
- **REALTIME_QUICK_START.md** - Quick reference
- **REALTIME_SUMMARY.md** - Overview
- **Socket.IO Docs** - https://socket.io/docs/v4/
- **React Native Docs** - https://reactnative.dev/

---

## Progress Tracking

Update this section as you complete items:

- **Phase 1**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 2**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 3**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 4**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 5**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 6**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 7**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 8**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 9**: [ ] Not Started | [ ] In Progress | [ ] Complete
- **Phase 10**: [ ] Not Started | [ ] In Progress | [ ] Complete

**Overall Progress: 0%**

---

## Notes & Issues

Use this space to track problems or questions:

```
Date: ___________
Issue:
Solution:

Date: ___________
Issue:
Solution:
```

---

**Good luck with your implementation! 🚀**

The core infrastructure is already in place. Follow this checklist step by step, and you'll have a fully functional real-time system.

**Remember:** Start with quick wins (connection status, test order tracking) to see immediate results, then move to feature implementation.
