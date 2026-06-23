# Remaining Context Fixes - Implementation Guide

## Quick Reference for Applying Remaining Fixes

### 1. NotificationContext.tsx - Interval Cleanup ⚡ HIGH PRIORITY

**Current Issue:** Memory leak from auto-sync interval not cleaned up

**Fix to Apply:**

```typescript
// Replace the auto-sync useEffect (lines 252-273) with:
useEffect(() => {
  if (!isAuthenticated || !user) return;

  const interval = setInterval(async () => {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        const lastSyncTime = new Date(lastSync).getTime();
        const now = new Date().getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - lastSyncTime > fiveMinutes) {
          await refreshSettings();
        }
      }
    } catch (err) {
      console.error('Auto-sync failed:', err);
    }
  }, 5 * 60 * 1000);

  // CRITICAL: Add cleanup
  return () => {
    clearInterval(interval);
  };
}, [isAuthenticated, user, refreshSettings]); // Add refreshSettings to deps

// Also memoize the context value (add at line 275):
const value: NotificationContextType = useMemo(() => ({
  settings,
  isLoading,
  error,
  updateSettings,
  refreshSettings,
  canSendPushNotification,
  canSendEmailNotification,
  canSendSMSNotification,
  canShowInAppNotification,
}), [
  settings,
  isLoading,
  error,
  updateSettings,
  refreshSettings,
  canSendPushNotification,
  canSendEmailNotification,
  canSendSMSNotification,
  canShowInAppNotification,
]);
```

---

### 2. SocketContext.tsx - Memory Leak Fix ⚡ HIGH PRIORITY

**Current Issue:** Event listeners not cleaned up, accumulating on reconnections

**Fix to Apply:**

```typescript
// At the top, add import:
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';

// In the provider, replace the initialization useEffect (lines 120-301) with:
useEffect(() => {
  const socketUrl = getSocketUrl();
  const socketConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: socketConfig.autoConnect,
      reconnection: socketConfig.reconnection,
      reconnectionAttempts: socketConfig.reconnectionAttempts,
      reconnectionDelay: socketConfig.reconnectionDelay,
      reconnectionDelayMax: socketConfig.reconnectionDelayMax,
      timeout: socketConfig.timeout,
    });

    socketRef.current = socket;

    // Define all event handlers in an object for easy cleanup
    const eventHandlers = {
      [SocketEvents.CONNECT]: () => {
        console.log('🔌 [SocketContext] Connected to socket server');
        setSocketState(prev => ({
          ...prev,
          connected: true,
          reconnecting: false,
          error: null,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        }));
        resubscribeAll();
      },

      [SocketEvents.DISCONNECT]: (reason: string) => {
        console.log('🔌 [SocketContext] Disconnected:', reason);
        setSocketState(prev => ({
          ...prev,
          connected: false,
          reconnecting: reason === 'io server disconnect' ? false : true,
        }));
      },

      [SocketEvents.CONNECT_ERROR]: (error: Error) => {
        console.error('🔌 [SocketContext] Connection error:', error.message);
        setSocketState(prev => ({
          ...prev,
          error: error.message,
          reconnecting: true,
        }));
      },

      // ... other handlers (keep all existing handlers)
    };

    // Attach all listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // CRITICAL: Cleanup function
    return () => {
      console.log('🔌 [SocketContext] Cleaning up socket connection');

      // Remove ALL listeners
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
  } catch (error) {
    console.error('🔌 [SocketContext] Failed to initialize socket:', error);
    setSocketState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : 'Failed to initialize socket',
    }));
  }
}, []); // Empty deps - only run once

// Also memoize the context value (replace lines 516-539):
const contextValue: SocketContextType = useMemo(() => ({
  socket: socketRef.current,
  state: socketState,
  connect,
  disconnect,
  onStockUpdate,
  onLowStock,
  onOutOfStock,
  onPriceUpdate,
  onProductAvailability,
  onConnect,
  onDisconnect,
  onError,
  onFlashSaleStarted,
  onFlashSaleEndingSoon,
  onFlashSaleEnded,
  onFlashSaleStockUpdated,
  onFlashSaleStockLow,
  onFlashSaleSoldOut,
  subscribeToProduct,
  unsubscribeFromProduct,
  subscribeToStore,
  unsubscribeFromStore,
}), [
  socketState,
  connect,
  disconnect,
  onStockUpdate,
  onLowStock,
  onOutOfStock,
  onPriceUpdate,
  onProductAvailability,
  onConnect,
  onDisconnect,
  onError,
  onFlashSaleStarted,
  onFlashSaleEndingSoon,
  onFlashSaleEnded,
  onFlashSaleStockUpdated,
  onFlashSaleStockLow,
  onFlashSaleSoldOut,
  subscribeToProduct,
  unsubscribeFromProduct,
  subscribeToStore,
  unsubscribeFromStore,
]);
```

---

### 3. GamificationContext.tsx - Operation Queue ⚡ HIGH PRIORITY

**Current Issue:** Race conditions in coin operations causing balance corruption

**Fix to Apply:**

```typescript
// Add these refs after line 229:
const coinOperationQueue = useRef<Array<() => Promise<void>>>([]);
const isProcessingCoins = useRef(false);

// Add queue processing function after line 300:
const processCoinQueue = useCallback(async () => {
  if (isProcessingCoins.current) return;
  isProcessingCoins.current = true;

  while (coinOperationQueue.current.length > 0) {
    const operation = coinOperationQueue.current.shift();
    if (operation) {
      try {
        await operation();
      } catch (error) {
        console.error('[GAMIFICATION] Coin operation failed:', error);
      }
    }
  }

  isProcessingCoins.current = false;
}, []);

const queueCoinOperation = useCallback((operation: () => Promise<void>): Promise<void> => {
  return new Promise((resolve, reject) => {
    coinOperationQueue.current.push(async () => {
      try {
        await operation();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    if (!isProcessingCoins.current) {
      processCoinQueue();
    }
  });
}, [processCoinQueue]);

// Replace awardCoins function (lines 431-461) with:
const awardCoins = useCallback(async (amount: number, reason: string) => {
  if (!state.featureFlags.ENABLE_COINS) return;

  return queueCoinOperation(async () => {
    try {
      console.log(`💰 [GAMIFICATION] Awarding ${amount} coins: ${reason}`);

      const syncResult = await coinSyncService.syncGamificationReward(
        amount,
        'bonus',
        { reason, timestamp: new Date().toISOString() }
      );

      if (syncResult.success) {
        dispatch({ type: 'COINS_EARNED', payload: amount });
        await syncCoinsFromWallet();
        await triggerAchievementCheck('COINS_EARNED', { amount, reason });
        console.log(`✅ [GAMIFICATION] Coins awarded: ${syncResult.newWalletBalance}`);
      } else {
        throw new Error(syncResult.error || 'Failed to sync coins to wallet');
      }
    } catch (error) {
      console.error('[GAMIFICATION] Error awarding coins:', error);
      throw error;
    }
  });
}, [state.featureFlags.ENABLE_COINS, queueCoinOperation, syncCoinsFromWallet, triggerAchievementCheck]);

// Replace spendCoins function (lines 464-494) with:
const spendCoins = useCallback(async (amount: number, reason: string) => {
  if (!state.featureFlags.ENABLE_COINS) return;

  return queueCoinOperation(async () => {
    try {
      console.log(`💸 [GAMIFICATION] Spending ${amount} coins: ${reason}`);

      if (state.coinBalance.total < amount) {
        throw new Error('Insufficient coin balance');
      }

      const syncResult = await coinSyncService.spendCoins(amount, reason, {
        timestamp: new Date().toISOString(),
      });

      if (syncResult.success) {
        dispatch({ type: 'COINS_SPENT', payload: amount });
        await syncCoinsFromWallet();
        console.log(`✅ [GAMIFICATION] Coins spent: ${syncResult.newWalletBalance}`);
      } else {
        throw new Error(syncResult.error || 'Failed to sync coin spending to wallet');
      }
    } catch (error) {
      console.error('[GAMIFICATION] Error spending coins:', error);
      throw error;
    }
  });
}, [state.featureFlags.ENABLE_COINS, state.coinBalance.total, queueCoinOperation, syncCoinsFromWallet]);

// Also memoize context value (replace lines 589-609):
const contextValue: GamificationContextType = useMemo(() => ({
  state,
  actions: {
    loadGamificationData,
    syncCoinsFromWallet,
    triggerAchievementCheck,
    awardCoins,
    spendCoins,
    updateDailyStreak,
    markAchievementAsShown,
    refreshAchievements,
    clearError,
  },
  computed: {
    unlockedCount,
    completionPercentage,
    pendingAchievements,
    hasUnshownAchievements,
    canEarnCoins,
  },
}), [
  state,
  loadGamificationData,
  syncCoinsFromWallet,
  triggerAchievementCheck,
  awardCoins,
  spendCoins,
  updateDailyStreak,
  markAchievementAsShown,
  refreshAchievements,
  clearError,
  unlockedCount,
  completionPercentage,
  pendingAchievements,
  hasUnshownAchievements,
  canEarnCoins,
]);
```

---

### 4. WishlistContext.tsx - Optimistic Updates 🚀 UX IMPROVEMENT

**Current Issue:** Slow UI updates, blocking on API calls

**Fix to Apply:**

```typescript
// Add import for useMemo and useCallback:
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

// Replace addToWishlist function (lines 203-253) with:
const addToWishlist = useCallback(async (item: Omit<WishlistItem, 'id' | 'addedAt'>): Promise<void> => {
  try {
    setError(null);

    // Check if already in wishlist
    if (isInWishlist(item.productId)) {
      throw new Error('Item already in wishlist');
    }

    // Create optimistic item
    const optimisticItem: WishlistItem = {
      ...item,
      id: `temp-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };

    // Update UI immediately (optimistic)
    setWishlistItems(prev => [...prev, optimisticItem]);

    // API call in background
    try {
      const wishlistsResponse = await wishlistApi.getWishlists(1, 1);
      let wishlistId: string | undefined;

      if (wishlistsResponse.data && wishlistsResponse.data.wishlists && wishlistsResponse.data.wishlists.length > 0) {
        wishlistId = wishlistsResponse.data.wishlists[0].id || (wishlistsResponse.data.wishlists[0] as any)._id;
      } else {
        const newWishlistResponse = await wishlistApi.createWishlist({
          name: 'My Wishlist',
          description: 'Default wishlist',
          isPublic: false
        });
        wishlistId = newWishlistResponse.data?.id || (newWishlistResponse.data as any)?._id;
      }

      if (!wishlistId) {
        throw new Error('Failed to get or create wishlist');
      }

      const response = await wishlistApi.addToWishlist({
        itemType: 'product',
        itemId: item.productId,
        wishlistId,
        notes: `Added ${item.productName}`,
        priority: 'medium',
        tags: [item.category]
      });

      // Replace temp item with real item
      if (response.data) {
        setWishlistItems(prev => prev.map(i =>
          i.id === optimisticItem.id
            ? { ...i, id: response.data.id || (response.data as any)._id }
            : i
        ));
      } else {
        throw new Error('Failed to add item to wishlist');
      }
    } catch (apiError) {
      // Rollback on error
      setWishlistItems(prev => prev.filter(i => i.id !== optimisticItem.id));
      throw apiError;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to add to wishlist';
    setError(errorMessage);
    throw new Error(errorMessage);
  }
}, [isInWishlist]);

// Replace removeFromWishlist function (lines 255-285) with:
const removeFromWishlist = useCallback(async (productId: string): Promise<void> => {
  try {
    setError(null);

    // Find the wishlist item to remove
    const itemToRemove = wishlistItems.find(item => item.productId === productId);
    if (!itemToRemove) {
      throw new Error('Item not found in wishlist');
    }

    // Update UI immediately (optimistic)
    setWishlistItems(prev => prev.filter(item => item.productId !== productId));

    // API call in background
    try {
      const wishlistsResponse = await wishlistApi.getWishlists(1, 1);
      if (!wishlistsResponse.data || !wishlistsResponse.data.wishlists || wishlistsResponse.data.wishlists.length === 0) {
        throw new Error('Wishlist not found');
      }

      await wishlistApi.removeFromWishlist(itemToRemove.id);
    } catch (apiError) {
      // Rollback on error
      setWishlistItems(prev => [...prev, itemToRemove]);
      throw apiError;
    }
  } catch (err) {
    const errorMessage = 'Failed to remove from wishlist';
    setError(errorMessage);
    throw new Error(errorMessage);
  }
}, [wishlistItems]);

// Replace contextValue (lines 309-318) with:
const contextValue: WishlistContextType = useMemo(() => ({
  wishlistItems,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  getWishlistCount,
  isLoading,
  error,
}), [
  wishlistItems,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  getWishlistCount,
  isLoading,
  error,
]);
```

---

### 5. ProfileContext.tsx - Stale Closure Fix ✅ MINOR

**Current Issue:** Stale closures in some functions (mostly already fixed)

**Additional Fix:**

```typescript
// The context is mostly already optimized! Just ensure updateUser uses functional updates:

// In updateUser function (line 125), ensure we're not capturing stale state:
const updateUser = useCallback(async (userData: Partial<User>) => {
  if (!authState.user) return;

  try {
    setError(null);

    // ... existing mapping logic ...

    const response = await authService.updateProfile(profileUpdateData);

    if (response.data) {
      // Use checkAuthStatus to refresh - this is already good!
      await authActions.checkAuthStatus();
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update user profile');
    throw err;
  }
}, [authState.user, authActions]); // Dependencies are correct
```

**ProfileContext is mostly already optimized!** ✅

---

## Testing After Applying Fixes

### 1. Memory Leak Test
```bash
# Run app, navigate around, then check memory usage
# Memory should stabilize, not continuously grow
```

### 2. Race Condition Test
```typescript
// Try multiple concurrent operations
await Promise.all([
  awardCoins(100, 'test1'),
  awardCoins(200, 'test2'),
  spendCoins(50, 'test3'),
]);
// Balance should be correct: (initial + 100 + 200 - 50)
```

### 3. Optimistic Update Test
```typescript
// Add item to wishlist
addToWishlist(item);
// Should appear immediately in UI
// Even if API is slow or fails
```

---

## Priority Order for Implementation

1. **HIGH PRIORITY:**
   - ✅ AppContext.tsx (DONE)
   - ✅ AuthContext.tsx (DONE)
   - ⚡ NotificationContext.tsx (5 min fix)
   - ⚡ SocketContext.tsx (10 min fix)
   - ⚡ GamificationContext.tsx (15 min fix)

2. **MEDIUM PRIORITY:**
   - 🚀 WishlistContext.tsx (10 min fix)

3. **LOW PRIORITY:**
   - ✅ ProfileContext.tsx (Already mostly optimized)
   - ✅ CartContext.tsx (Already fully optimized)

---

## Quick Apply Script

To apply all fixes at once, run:

```bash
# Apply NotificationContext fix
# (Copy-paste code from section 1)

# Apply SocketContext fix
# (Copy-paste code from section 2)

# Apply GamificationContext fix
# (Copy-paste code from section 3)

# Apply WishlistContext fix
# (Copy-paste code from section 4)

# Test everything
npm test
```

---

## Success Criteria

✅ All contexts have:
- [ ] Context value wrapped in useMemo
- [ ] All actions wrapped in useCallback
- [ ] Proper cleanup in useEffect
- [ ] No memory leaks
- [ ] No race conditions
- [ ] Optimistic updates (where applicable)

✅ Performance metrics:
- [ ] 50-90% reduction in re-renders
- [ ] No memory growth over time
- [ ] Instant UI updates (optimistic)
- [ ] Zero balance corruption incidents
