# Quick Reference - Ring Sizer & My Products

## Ring Sizer

### Basic Usage
```typescript
import ringSizeApi from '@/services/ringSizeApi';

// Save ring size
const result = await ringSizeApi.saveRingSize('7.5', 'measure');
if (result.success) {
  console.log('Saved:', result.data);
}

// Get saved size
const saved = await ringSizeApi.getRingSize();
if (saved.success && saved.data) {
  console.log('Your size:', saved.data.size);
}
```

### Key Features
- ✅ Saves locally (AsyncStorage) + backend
- ✅ Works offline
- ✅ Auto-retry mechanism
- ✅ Visual indicators for saved sizes

---

## My Products (Reorder)

### Basic Usage
```typescript
import { useReorder } from '@/hooks/useReorder';
import { useCart } from '@/contexts/CartContext';

function MyComponent() {
  const { reorderFull, reordering, validation } = useReorder();
  const { refreshCart } = useCart();

  const handleReorder = async (orderId: string) => {
    const success = await reorderFull(orderId);
    if (success) {
      await refreshCart();
      // Show success message
    }
  };
}
```

### Key Features
- ✅ Validates availability before adding
- ✅ Shows detailed success/failure modal
- ✅ Handles partial success (some items unavailable)
- ✅ Auto-navigates to cart on success
- ✅ Clear error messages with reasons

---

## Common Patterns

### Loading States
```typescript
// Ring Sizer
const [saving, setSaving] = useState(false);

const save = async () => {
  setSaving(true);
  try {
    await ringSizeApi.saveRingSize(size);
  } finally {
    setSaving(false);
  }
};

// My Products
{reorderingProductId === item.orderId ? (
  <ActivityIndicator size="small" color="#8B5CF6" />
) : (
  <Text>Reorder</Text>
)}
```

### Error Handling
```typescript
// With retry
Alert.alert(
  'Save Failed',
  error,
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Retry', onPress: () => retryFunction() }
  ]
);
```

### Success Feedback
```typescript
// Simple success
Alert.alert('Success', 'Operation completed!');

// With navigation
Alert.alert('Success', 'Items added to cart', [
  {
    text: 'View Cart',
    onPress: () => router.push('/CartPage')
  }
]);
```

---

## File Locations

### Ring Sizer
- **Page**: `app/ring-sizer.tsx`
- **API**: `services/ringSizeApi.ts`
- **Storage Key**: `'user_ring_size'`

### My Products
- **Page**: `app/my-products.tsx`
- **Hook**: `hooks/useReorder.ts`
- **API**: `services/reorderApi.ts`

---

## Quick Fixes

### Ring Sizer Not Saving
```bash
# Check AsyncStorage
import asyncStorageService from '@/services/asyncStorageService';
const size = await asyncStorageService.get('user_ring_size');
console.log('Saved size:', size);

# Force sync
await ringSizeApi.syncToBackend();
```

### Reorder Not Working
```bash
# Check validation
const validation = await reorderService.validateReorder(orderId);
console.log('Can reorder:', validation.data?.canReorder);
console.log('Issues:', validation.data?.warnings);

# Check cart state
const { state } = useCart();
console.log('Cart items:', state.items.length);
```

---

## Testing Commands

```bash
# Test ring size save
console.log(await ringSizeApi.saveRingSize('7', 'measure'));

# Test ring size retrieval
console.log(await ringSizeApi.getRingSize());

# Test reorder validation
console.log(await reorderService.validateReorder('ORDER123'));

# Test full reorder
console.log(await reorderService.reorderFullOrder('ORDER123'));
```

---

## Status Codes

### Ring Size API
- `200`: Success
- `400`: Invalid ring size
- `401`: Not authenticated
- `500`: Server error

### Reorder API
- `200`: Success
- `400`: Invalid order or items unavailable
- `404`: Order not found
- `500`: Server error

---

## Best Practices

1. **Always check success flag**
   ```typescript
   const result = await api.call();
   if (result.success) {
     // Handle success
   } else {
     // Handle error
   }
   ```

2. **Use loading states**
   ```typescript
   const [loading, setLoading] = useState(false);
   // Show spinner while loading
   ```

3. **Provide user feedback**
   ```typescript
   Alert.alert('Success', 'Operation completed');
   ```

4. **Handle offline gracefully**
   ```typescript
   if (!navigator.onLine) {
     // Save locally, sync later
   }
   ```

5. **Log errors for debugging**
   ```typescript
   console.error('Operation failed:', error);
   ```
