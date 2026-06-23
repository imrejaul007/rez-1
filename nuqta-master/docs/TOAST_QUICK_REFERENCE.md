# Toast Notifications Quick Reference

## Quick Implementation Guide

### For ProductCard-like Components

#### Step 1: Import
```tsx
import { useToast } from '@/hooks/useToast';
```

#### Step 2: Initialize
```tsx
export default function MyComponent() {
  const { showSuccess, showError } = useToast();

  // ... rest of component
}
```

#### Step 3: Use in Actions
```tsx
const handleAction = async () => {
  try {
    await performCartAction();
    showSuccess(`Action completed for ${item.name}`);
  } catch (error) {
    showError(`Failed to complete action`);
  }
};
```

---

## Toast Methods

### Success Toast
```tsx
showSuccess('Item added to cart');
showSuccess('Item added to cart', 3000); // Custom duration in ms
```

### Error Toast
```tsx
showError('Failed to add item');
showError('Network error occurred', 4000); // Longer duration for errors
```

### Info Toast
```tsx
showInfo('Processing your request...');
```

### Warning Toast
```tsx
showWarning('Low stock available');
```

### Custom Toast
```tsx
showToast('Custom message', 'success', 3000);
showToast('Warning!', 'warning', 3000);
```

### Dismiss All
```tsx
dismissAll(); // Clear all pending toasts
```

---

## Common Patterns

### Pattern 1: Simple Action
```tsx
const handleRemove = async () => {
  try {
    await removeItem(id);
    showSuccess('Item removed');
  } catch (error) {
    showError('Failed to remove item');
  }
};
```

### Pattern 2: With Product Name
```tsx
const handleAddToCart = async (product) => {
  try {
    await addToCart(product);
    showSuccess(`${product.name} added to cart`);
  } catch (error) {
    showError(`Failed to add ${product.name}`);
  }
};
```

### Pattern 3: Conditional Messages
```tsx
const handleQuantity = async (qty) => {
  try {
    if (qty === 0) {
      await removeItem(id);
      showSuccess(`${item.name} removed from cart`);
    } else {
      await updateQuantity(id, qty);
      showSuccess('Quantity updated');
    }
  } catch (error) {
    showError('Failed to update quantity');
  }
};
```

### Pattern 4: With State Management
```tsx
const [isUpdating, setIsUpdating] = useState(false);

const handleAction = async () => {
  if (isUpdating) return;

  try {
    setIsUpdating(true);
    await performAction();
    showSuccess('Action completed');
  } catch (error) {
    showError('Action failed');
  } finally {
    setIsUpdating(false);
  }
};
```

---

## Components with Toast Already Integrated

✅ **ProductCard** - `components/homepage/cards/ProductCard.tsx`
- Add to Cart
- Increase Quantity
- Decrease Quantity
- Remove Item

✅ **CartItem** - `components/cart/CartItem.tsx`
- Update Quantity
- Remove Item
- Error Handling

---

## Message Templates

### Success Messages
```tsx
`${product.name} added to cart`
`${product.name} quantity increased`
`${product.name} quantity decreased`
`${product.name} removed from cart`
`Quantity updated`
`Item removed from cart`
```

### Error Messages
```tsx
`Failed to add ${product.name} to cart`
`Failed to update ${product.name}`
`Maximum quantity reached for ${product.name}`
`Failed to update quantity`
```

### Info Messages
```tsx
`Processing...`
`Updating cart...`
`Loading...`
```

### Warning Messages
```tsx
`Low stock available`
`Only ${stock} items left`
`${product.name} is out of stock`
```

---

## Configuration

### Toast Duration
```tsx
// Default: 3000ms
showSuccess('Item added');

// Custom: 5 seconds
showSuccess('Processing complete', 5000);

// Quick notification: 2 seconds
showError('Action failed', 2000);
```

### Recommended Durations
- **Quick actions:** 2000ms
- **Standard actions:** 3000ms
- **Errors:** 4000-5000ms
- **Critical:** 6000ms+

---

## Troubleshooting

### Toast Not Showing
**Problem:** Toast notifications don't appear
**Solution:**
1. Verify `ToastProvider` wraps your entire app in `_layout.tsx`
2. Check that component is inside ToastProvider
3. Verify import path is correct: `@/hooks/useToast`
4. Check browser console for errors

### Multiple Toasts Appearing
**Problem:** Too many toasts on screen simultaneously
**Solution:**
1. This is intentional - queue system handles them
2. Toasts appear one after another
3. Use `dismissAll()` to clear queue if needed

### Toast Text Not Showing
**Problem:** Toast appears but no text visible
**Solution:**
1. Check that message string is not empty
2. Verify product.name exists and is not undefined
3. Test with hardcoded string: `showSuccess('Test')`

---

## Best Practices

1. **Always Include Product Names**
   ✅ `showSuccess(\`${product.name} added\`)`
   ❌ `showSuccess('Added')`

2. **Use Try-Catch Blocks**
   ✅ Wrap async operations
   ❌ Call toast outside try-catch

3. **Avoid Toast Spam**
   ✅ Use `isUpdating` state
   ❌ Call multiple toasts in rapid succession

4. **Match Action to Message**
   ✅ "Quantity increased" for increment
   ❌ "Updated" for all operations

5. **Handle Errors Explicitly**
   ✅ Catch and show error toast
   ❌ Let errors fail silently

---

## Related Files

- **Hook:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\hooks\useToast.ts`
- **Context:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\contexts\ToastContext.tsx`
- **Component:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\components\common\Toast.tsx`

---

**Last Updated:** 2025-11-12
