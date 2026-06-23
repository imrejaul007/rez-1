# Lock Timer Logic Documentation

## Overview

The locked products feature uses a sophisticated timer system to manage product reservations with automatic expiration and cleanup.

## Timer Configuration

### Constants (from `types/cart.ts`)
```typescript
export const LOCK_CONFIG = {
  DEFAULT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  WARNING_THRESHOLD: 2 * 60 * 1000, // Show warning when 2 minutes remaining
  CRITICAL_THRESHOLD: 30 * 1000, // Critical warning at 30 seconds
  UPDATE_INTERVAL: 1000, // Update timer every second
}
```

## Timer Logic Flow

### 1. Lock Creation
When a product is locked (from StorePage):
- `lockedAt`: Current timestamp
- `expiresAt`: `lockedAt + DEFAULT_DURATION` (15 minutes later)
- `remainingTime`: Calculated as `expiresAt - now`
- `status`: Determined by `getLockStatus()` function

### 2. Timer Updates
The main timer runs in `CartPage.tsx`:
```typescript
useEffect(() => {
  if (lockedProducts.length > 0) {
    timerRef.current = setInterval(() => {
      setLockedProducts(prev => {
        const updated = updateLockedProductTimers(prev);
        return updated;
      });
    }, LOCK_CONFIG.UPDATE_INTERVAL);
  }
}, [lockedProducts.length]);
```

### 3. Status Determination
```typescript
export const getLockStatus = (remainingTime: number): 'active' | 'expiring' | 'expired' => {
  if (remainingTime <= 0) return 'expired';
  if (remainingTime <= LOCK_CONFIG.WARNING_THRESHOLD) return 'expiring';
  return 'active';
};
```

### 4. Automatic Cleanup
The `updateLockedProductTimers` function:
- Recalculates `remainingTime` for all items
- Updates `status` based on remaining time
- **Automatically removes expired items** (remainingTime <= 0)

## Timer States and Visual Indicators

### Active State
- **Condition**: `remainingTime > 2 minutes`
- **Status**: `'active'`
- **Visual**: Green timer, normal display
- **Behavior**: Regular countdown display

### Warning State  
- **Condition**: `30 seconds < remainingTime <= 2 minutes`
- **Status**: `'expiring'`
- **Visual**: Yellow/orange timer, warning indicators
- **Behavior**: More prominent countdown, possible warnings

### Critical State
- **Condition**: `0 < remainingTime <= 30 seconds`
- **Status**: `'expiring'` (but critical)
- **Visual**: Red timer, urgent indicators
- **Behavior**: Urgent countdown, critical warnings

### Expired State
- **Condition**: `remainingTime <= 0`
- **Status**: `'expired'`
- **Behavior**: **Automatic removal** from locked products array

## Time Formatting

```typescript
export const formatRemainingTime = (remainingTime: number): string => {
  if (remainingTime <= 0) return "Expired";
  
  const minutes = Math.floor(remainingTime / (60 * 1000));
  const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
};
```

### Format Examples:
- `14:32` - 14 minutes 32 seconds
- `2:05` - 2 minutes 5 seconds  
- `0:45` - 45 seconds
- `0:03` - 3 seconds
- `Expired` - Timer expired

## Memory Management

### Timer Cleanup
```typescript
// Clean up timer on component unmount
useEffect(() => {
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, []);
```

### Automatic Array Filtering
The system automatically removes expired items from the state array, preventing memory leaks and keeping the UI clean.

## Performance Considerations

### Efficient Updates
- Single timer interval for all locked products
- Batch updates using `setLockedProducts`
- Automatic cleanup prevents array growth

### Background Handling
- Timer continues running when app is backgrounded
- Proper cleanup when app is destroyed
- State recalculation on app foreground resume

## Testing Scenarios

### Mock Data Setup
The system includes different lock states for testing:

1. **Recently Locked** (1 min ago) - `active` state
2. **Mid-Duration** (7 min ago) - `active` state  
3. **Warning Phase** (13.5 min ago) - `expiring` state
4. **Critical Phase** (14.5 min ago) - `expiring` state

### Edge Cases Handled
- Zero locked products (timer stops)
- All products expired (automatic cleanup)
- App backgrounding/foregrounding
- Component unmounting during active timers
- Multiple simultaneous expirations

## Integration Points

### StorePage Lock Action
When user clicks lock button:
```typescript
const newLockedProduct = createLockedProductFromCartItem(productData);
setLockedProducts(prev => [...prev, newLockedProduct]);
```

### CartPage Display
- Real-time countdown display in UI
- Color-coded status indicators
- Automatic removal of expired items

### State Management
- Local component state for demonstration
- Ready for integration with global state (Redux/Context)
- Persistent storage capabilities (AsyncStorage)

## Future Enhancements

### Planned Features
1. **Push Notifications**: Warn users before expiration
2. **Background Sync**: Server-side lock validation
3. **Lock Extension**: Allow users to extend locks
4. **Analytics**: Track lock conversion rates

### Scalability Considerations
- Efficient timer management for 100+ locked items
- Server-side expiration validation
- Offline/online state synchronization
- Multi-device lock synchronization