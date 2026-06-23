# Toast Notifications Testing Guide

## Pre-Testing Setup

### 1. Verify Installation
```bash
# Make sure all dependencies are installed
npm install

# Verify useToast hook exists
ls -la hooks/useToast.ts

# Verify ToastContext exists
ls -la contexts/ToastContext.tsx
```

### 2. Verify ToastProvider Setup
Check `app/_layout.tsx` includes:
```tsx
<ToastProvider>
  {/* Your app content */}
</ToastProvider>
```

### 3. Check Console
Open browser/device console before testing to catch any errors.

---

## Test Scenarios

### Test Suite 1: ProductCard Add to Cart

#### TC1.1: Add Product to Cart (Success)
**Steps:**
1. Navigate to home page or any page showing ProductCard
2. Click "Add to Cart" button on any product
3. Observe toast notification

**Expected Result:**
- Success toast appears at top
- Message: `"[Product Name] added to cart"`
- Duration: ~3 seconds
- Toast fades out smoothly

**Verification:**
- [ ] Toast appears
- [ ] Product name is correct
- [ ] Toast color is green (success)
- [ ] Notification auto-dismisses

---

#### TC1.2: Add Out-of-Stock Product
**Steps:**
1. Find a product marked as "Out of Stock"
2. Button should show "Notify Me" instead of "Add to Cart"
3. Verify button is disabled

**Expected Result:**
- "Add to Cart" button should be disabled
- "Notify Me" button shown instead
- No toast should appear when button is clicked in disabled state

**Verification:**
- [ ] Button is visually disabled
- [ ] No toast appears for disabled button
- [ ] Different button text is shown

---

### Test Suite 2: ProductCard Quantity Controls

#### TC2.1: Increase Quantity
**Steps:**
1. Add a product to cart
2. Click the "+" button to increase quantity
3. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"[Product Name] quantity increased"`
- Quantity value updates in UI

**Verification:**
- [ ] Toast shows success message
- [ ] Product name is included
- [ ] Quantity number updates
- [ ] Toast auto-dismisses

---

#### TC2.2: Decrease Quantity
**Steps:**
1. Product must have quantity > 1 in cart
2. Click the "-" button to decrease quantity
3. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"[Product Name] quantity decreased"`
- Quantity decreases by 1

**Verification:**
- [ ] Toast shows correct message
- [ ] Quantity decreases by exactly 1
- [ ] Product remains in cart
- [ ] Toast auto-dismisses

---

#### TC2.3: Remove from Quantity Controls
**Steps:**
1. Product must have quantity = 1 in cart
2. Click the "-" button
3. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"[Product Name] removed from cart"`
- Product disappears from cart
- Quantity controls replaced with "Add to Cart" button

**Verification:**
- [ ] Toast shows "removed" message
- [ ] Product name is included
- [ ] Item removed from cart
- [ ] UI updates correctly

---

#### TC2.4: Maximum Quantity Reached
**Steps:**
1. Add product to cart
2. Continue clicking "+" until max stock is reached
3. Try to click "+" again

**Expected Result:**
- Error toast appears
- Message: `"Maximum quantity reached for [Product Name]"`
- Button becomes disabled/non-responsive
- Plus button visual indication of disabled state

**Verification:**
- [ ] Toast shows error message
- [ ] Product name is included
- [ ] Button is disabled
- [ ] Cannot exceed max quantity

---

### Test Suite 3: CartItem Quantity Selector

#### TC3.1: Update Quantity via QuantitySelector
**Steps:**
1. Navigate to cart page
2. Find a cart item with quantity controls
3. Click "+" to increase quantity
4. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"Quantity updated"`
- Quantity updates immediately
- Cart total updates

**Verification:**
- [ ] Toast appears with correct message
- [ ] Quantity changes as expected
- [ ] Cart UI updates
- [ ] Total price recalculates

---

#### TC3.2: Remove Item via QuantitySelector
**Steps:**
1. Navigate to cart page
2. Set quantity to 1
3. Click "-" or set quantity to 0
4. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"Item removed from cart"`
- Item disappears from cart
- Cart total updates

**Verification:**
- [ ] Toast shows removal message
- [ ] Item removed from UI
- [ ] Cart count decreases
- [ ] Total price updates

---

#### TC3.3: Delete via Delete Button
**Steps:**
1. Navigate to cart page
2. Click trash/delete icon on cart item
3. Observe toast notification

**Expected Result:**
- Success toast appears
- Message: `"[Item Name] removed from cart"`
- Item deleted immediately
- Cart updates

**Verification:**
- [ ] Toast appears
- [ ] Item name shown (if implemented)
- [ ] Item removed from list
- [ ] Animation plays smoothly

---

### Test Suite 4: Error Handling

#### TC4.1: Network Error on Add to Cart
**Steps:**
1. Simulate poor network or offline mode
2. Click "Add to Cart"
3. Observe error toast

**Expected Result:**
- Error toast appears
- Message: `"Failed to add [Product Name] to cart"`
- Button remains enabled for retry
- Error logged to console

**Verification:**
- [ ] Error toast appears in red
- [ ] Product name shown in error
- [ ] User can retry action
- [ ] Console shows error details

---

#### TC4.2: Network Error on Quantity Update
**Steps:**
1. Simulate network interruption
2. Click quantity control button
3. Observe error toast

**Expected Result:**
- Error toast appears
- Message: `"Failed to update [Product Name]"`
- Loading state clears
- User can retry

**Verification:**
- [ ] Error toast displayed
- [ ] Loading spinner stops
- [ ] Retry is possible
- [ ] Original state preserved

---

### Test Suite 5: Edge Cases

#### TC5.1: Rapid Clicks
**Steps:**
1. Click "Add to Cart" multiple times quickly
2. Observe toasts

**Expected Result:**
- Only one toast for the first action
- Subsequent clicks are queued
- Toasts appear sequentially
- No duplicate messages

**Verification:**
- [ ] Single toast per action
- [ ] Queue system works
- [ ] Toasts don't overlap
- [ ] All actions complete

---

#### TC5.2: Long Product Names
**Steps:**
1. Find product with very long name
2. Perform cart action
3. Observe toast

**Expected Result:**
- Toast displays full product name
- Text doesn't overflow
- Toast is readable
- Layout not broken

**Verification:**
- [ ] Full name visible
- [ ] Toast doesn't break layout
- [ ] Text is readable
- [ ] Toast size appropriate

---

#### TC5.3: Toast Duration Consistency
**Steps:**
1. Perform multiple cart actions
2. Time each toast appearance

**Expected Result:**
- All toasts appear for ~3 seconds
- Timing is consistent
- User can read message completely
- Toast dismisses smoothly

**Verification:**
- [ ] Timing is consistent
- [ ] 3+ seconds visible
- [ ] Enough time to read
- [ ] Smooth fade-out

---

### Test Suite 6: Multi-Language/Special Characters

#### TC6.1: Product Names with Special Characters
**Steps:**
1. Product name contains: é, ñ, ü, etc.
2. Add to cart
3. Observe toast

**Expected Result:**
- Toast displays special characters correctly
- No encoding issues
- Message is readable

**Verification:**
- [ ] Characters display correctly
- [ ] No encoding errors
- [ ] Toast readable

---

#### TC6.2: Product Names with Numbers
**Steps:**
1. Product name: "iPhone 15 Pro Max 256GB"
2. Add to cart
3. Observe toast

**Expected Result:**
- Full name shown in toast
- Numbers displayed correctly
- No truncation

**Verification:**
- [ ] Full name shown
- [ ] Numbers visible
- [ ] No truncation

---

## Stress Testing

### ST1: Rapid Cart Operations
```tsx
// Steps:
1. Add 10 items to cart in succession
2. Update quantities on all items rapidly
3. Monitor system performance

// Expected:
- All operations complete
- Toasts appear in queue
- No app crashes
- Memory usage reasonable
```

### ST2: Large Cart
```tsx
// Steps:
1. Add 50+ items to cart
2. Update multiple quantities
3. Remove multiple items

// Expected:
- All actions show toasts
- App remains responsive
- Toasts queue correctly
- Performance maintained
```

---

## Browser/Device Testing

### Desktop Testing
- [ ] Chrome - Desktop
- [ ] Firefox - Desktop
- [ ] Safari - Desktop
- [ ] Edge - Desktop

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] iOS Chrome
- [ ] Android Firefox

### Testing Checklist for Each Platform
- [ ] Toast appears at correct position
- [ ] Text is readable
- [ ] Colors render correctly
- [ ] Animations are smooth
- [ ] Auto-dismiss works
- [ ] Tap to dismiss works (if available)

---

## Accessibility Testing

### AT1: Screen Reader
```
Steps:
1. Enable screen reader
2. Perform cart action
3. Verify toast is announced

Expected:
- Toast message read by screen reader
- Action announced clearly
- User knows action completed
```

### AT2: High Contrast
```
Steps:
1. Enable high contrast mode
2. Perform cart action
3. Verify toast is visible

Expected:
- Toast colors contrast well
- Text is readable
- Icons visible in high contrast
```

### AT3: Touch Targets
```
Steps:
1. Test on small device
2. Verify buttons easily tappable
3. Check spacing

Expected:
- Buttons minimum 44x44 touch target
- Adequate spacing between buttons
- No accidental button presses
```

---

## Performance Testing

### PT1: Toast Rendering
```
Tools:
- React DevTools Profiler
- Chrome DevTools Performance

Steps:
1. Record performance profile
2. Add 5 items to cart
3. Analyze rendering time

Expected:
- Toast render time < 50ms
- No jank or stuttering
- Smooth 60fps animation
```

### PT2: Memory Leaks
```
Steps:
1. Open DevTools Memory tab
2. Add/remove items 100+ times
3. Check memory growth

Expected:
- Memory stable over time
- No significant leaks
- GC handles cleanup
```

---

## Test Results Template

```markdown
## Test Results - [Date]

### Environment
- **OS:** [iOS/Android/Web]
- **Device:** [Device Model]
- **App Version:** [Version]
- **Browser:** [Browser/Version]

### Test Summary
- Total Tests: __
- Passed: __
- Failed: __
- Blocked: __

### Failures (if any)
1. [Test Name]
   - Expected: [Description]
   - Actual: [Description]
   - Steps to Reproduce: [Steps]
   - Severity: [Critical/High/Medium/Low]

### Notes
[Additional observations]

### Recommendations
[Improvements or fixes needed]
```

---

## Sign-Off Checklist

- [ ] All ProductCard toast notifications tested
- [ ] All CartItem toast notifications tested
- [ ] Error handling verified
- [ ] Edge cases covered
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Mobile and desktop tested
- [ ] No regressions found
- [ ] Documentation complete

---

**Test Plan Version:** 1.0
**Created:** 2025-11-12
**Last Updated:** 2025-11-12
