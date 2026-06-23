# Accessibility Implementation Guide

## Complete Guide to Adding Accessibility Labels to Rez App

**Goal**: Achieve 100/100 accessibility score by adding proper labels, roles, and hints to all 526 interactive components.

**Current Status**: 32 files have accessibility labels (~6% coverage)
**Target**: 526 files with accessibility labels (100% coverage)

---

## 📋 Quick Reference

### Essential Props

```typescript
// Button/Touchable Elements
accessibilityLabel="Clear descriptive text"
accessibilityRole="button"
accessibilityHint="What happens when activated"
accessibilityState={{ disabled: isDisabled }}

// Text Input
accessibilityLabel="Email address"
accessibilityRole="text"
accessibilityHint="Enter your email to continue"

// Images
accessibilityLabel="Product image showing red sneakers"
accessibilityRole="image"

// Switches/Checkboxes
accessibilityLabel="Enable notifications"
accessibilityRole="switch"
accessibilityState={{ checked: isEnabled }}

// Links
accessibilityLabel="View terms and conditions"
accessibilityRole="link"
```

---

## 🎯 Priority Components Checklist

### Phase 1: Navigation (HIGH PRIORITY) ✅
- [x] Tab navigation - `app/(tabs)/_layout.tsx`
- [ ] Bottom navigation - `components/navigation/BottomNavigation.tsx`
- [ ] Header navigation
- [ ] Back buttons
- [ ] Menu buttons

### Phase 2: Cart & Checkout (CRITICAL)
- [ ] Add to cart buttons
- [ ] Quantity controls (+/-)
- [ ] Remove item buttons
- [ ] Proceed to checkout button
- [ ] Apply coupon button
- [ ] Cart item cards

### Phase 3: Product Pages (HIGH)
- [ ] Product cards
- [ ] Image galleries
- [ ] Variant selectors
- [ ] Price displays
- [ ] Stock indicators
- [ ] Review buttons

### Phase 4: Forms (HIGH)
- [ ] Email inputs
- [ ] Password inputs
- [ ] Phone number inputs
- [ ] Search inputs
- [ ] Submit buttons
- [ ] Cancel buttons

### Phase 5: Modals & Overlays (MEDIUM)
- [ ] Modal close buttons
- [ ] Confirmation buttons
- [ ] Cancel buttons
- [ ] Overlay backgrounds

### Phase 6: Lists & Cards (MEDIUM)
- [ ] Product list items
- [ ] Order history items
- [ ] Review cards
- [ ] Notification items

---

## 📝 Implementation Patterns

### 1. Buttons

```typescript
// ✅ GOOD - Complete accessibility
<TouchableOpacity
  onPress={handleAddToCart}
  accessibilityLabel="Add to cart"
  accessibilityRole="button"
  accessibilityHint="Double tap to add this product to your shopping cart"
  accessibilityState={{ disabled: outOfStock }}
>
  <Text>Add to Cart</Text>
</TouchableOpacity>

// ❌ BAD - No accessibility
<TouchableOpacity onPress={handleAddToCart}>
  <Text>Add to Cart</Text>
</TouchableOpacity>
```

### 2. Text Inputs

```typescript
// ✅ GOOD
<TextInput
  placeholder="Enter email"
  accessibilityLabel="Email address"
  accessibilityRole="text"
  accessibilityHint="Enter your email address to continue"
  value={email}
  onChangeText={setEmail}
/>

// ❌ BAD
<TextInput
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
/>
```

### 3. Images

```typescript
// ✅ GOOD
<Image
  source={{ uri: product.image }}
  accessibilityLabel={`Product image of ${product.name}`}
  accessibilityRole="image"
/>

// With decorative images (no label needed)
<Image
  source={decorativePattern}
  accessibilityRole="none"
  accessible={false}
/>

// ❌ BAD
<Image source={{ uri: product.image }} />
```

### 4. Icons & Icon Buttons

```typescript
// ✅ GOOD
<TouchableOpacity
  onPress={handleClose}
  accessibilityLabel="Close modal"
  accessibilityRole="button"
  accessibilityHint="Double tap to close this dialog"
>
  <Ionicons name="close" size={24} />
</TouchableOpacity>

// ❌ BAD
<TouchableOpacity onPress={handleClose}>
  <Ionicons name="close" size={24} />
</TouchableOpacity>
```

### 5. Switches & Toggles

```typescript
// ✅ GOOD
<Switch
  value={notificationsEnabled}
  onValueChange={setNotificationsEnabled}
  accessibilityLabel="Enable push notifications"
  accessibilityRole="switch"
  accessibilityHint="Toggle to enable or disable push notifications"
  accessibilityState={{ checked: notificationsEnabled }}
/>

// ❌ BAD
<Switch
  value={notificationsEnabled}
  onValueChange={setNotificationsEnabled}
/>
```

### 6. Lists & FlatLists

```typescript
// ✅ GOOD
<FlatList
  data={products}
  renderItem={({ item }) => (
    <TouchableOpacity
      onPress={() => handleProductPress(item.id)}
      accessibilityLabel={`${item.name}, priced at $${item.price}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view product details"
    >
      <Image
        source={{ uri: item.image }}
        accessibilityLabel={`Image of ${item.name}`}
      />
      <Text>{item.name}</Text>
      <Text>${item.price}</Text>
    </TouchableOpacity>
  )}
  accessibilityLabel="Product list"
  accessibilityRole="list"
/>

// ❌ BAD
<FlatList
  data={products}
  renderItem={({ item }) => (
    <TouchableOpacity onPress={() => handleProductPress(item.id)}>
      <Image source={{ uri: item.image }} />
      <Text>{item.name}</Text>
    </TouchableOpacity>
  )}
/>
```

### 7. Modals

```typescript
// ✅ GOOD
<Modal
  visible={visible}
  onRequestClose={onClose}
  accessibilityViewIsModal={true}
>
  <View accessibilityRole="dialog">
    <TouchableOpacity
      onPress={onClose}
      accessibilityLabel="Close modal"
      accessibilityRole="button"
    >
      <Ionicons name="close" />
    </TouchableOpacity>
    <Text accessibilityRole="header">Modal Title</Text>
    {/* Modal content */}
  </View>
</Modal>

// ❌ BAD
<Modal visible={visible} onRequestClose={onClose}>
  <View>
    <TouchableOpacity onPress={onClose}>
      <Ionicons name="close" />
    </TouchableOpacity>
    <Text>Modal Title</Text>
  </View>
</Modal>
```

### 8. Quantity Controls

```typescript
// ✅ GOOD
<View accessibilityRole="adjustable" accessibilityLabel={`Quantity: ${quantity}`}>
  <TouchableOpacity
    onPress={handleDecrease}
    accessibilityLabel="Decrease quantity"
    accessibilityRole="button"
    accessibilityHint={`Decrease quantity, currently ${quantity}`}
    disabled={quantity <= 1}
    accessibilityState={{ disabled: quantity <= 1 }}
  >
    <Text>-</Text>
  </TouchableOpacity>

  <Text accessibilityLabel={`${quantity} items`}>{quantity}</Text>

  <TouchableOpacity
    onPress={handleIncrease}
    accessibilityLabel="Increase quantity"
    accessibilityRole="button"
    accessibilityHint={`Increase quantity, currently ${quantity}`}
    disabled={quantity >= maxQuantity}
    accessibilityState={{ disabled: quantity >= maxQuantity }}
  >
    <Text>+</Text>
  </TouchableOpacity>
</View>

// ❌ BAD
<View>
  <TouchableOpacity onPress={handleDecrease}>
    <Text>-</Text>
  </TouchableOpacity>
  <Text>{quantity}</Text>
  <TouchableOpacity onPress={handleIncrease}>
    <Text>+</Text>
  </TouchableOpacity>
</View>
```

---

## 🎨 Accessibility Roles

Use the correct `accessibilityRole` for each element:

| Element Type | accessibilityRole |
|--------------|-------------------|
| Button | `"button"` |
| Link | `"link"` |
| Search field | `"search"` |
| Image | `"image"` |
| Text | `"text"` |
| Header | `"header"` |
| Summary | `"summary"` |
| Checkbox | `"checkbox"` |
| Radio button | `"radio"` |
| Switch | `"switch"` |
| Tab | `"tab"` |
| Tab list | `"tablist"` |
| Menu | `"menu"` |
| Menu item | `"menuitem"` |
| Progress bar | `"progressbar"` |
| Adjustable | `"adjustable"` |
| List | `"list"` |
| None (decorative) | `"none"` |

---

## ✅ Testing Accessibility

### iOS - VoiceOver
1. Enable: Settings → Accessibility → VoiceOver
2. Triple-click side button to toggle
3. Swipe right/left to navigate
4. Double-tap to activate
5. Three-finger swipe to scroll

### Android - TalkBack
1. Enable: Settings → Accessibility → TalkBack
2. Volume keys to toggle
3. Swipe right/left to navigate
4. Double-tap to activate
5. Two-finger swipe to scroll

### Testing Checklist
- [ ] All buttons have labels
- [ ] All inputs have labels and hints
- [ ] All images have descriptive labels (non-decorative)
- [ ] Navigation works with screen reader only
- [ ] Can complete checkout flow with eyes closed
- [ ] Disabled states are announced
- [ ] Loading states are announced
- [ ] Error messages are announced

---

## 🔧 Automation Script

Use the helper script to check which files need accessibility updates:

```bash
# Check a specific file
node scripts/check-accessibility.js app/CartPage.tsx

# Check all files
node scripts/check-accessibility.js

# Generate report
node scripts/check-accessibility.js --report
```

---

## 📊 Progress Tracking

### By Component Type

| Component Type | Total | With Labels | Progress |
|---------------|-------|-------------|----------|
| Navigation | 15 | 3 | 20% |
| Buttons | 200 | 10 | 5% |
| Forms | 50 | 5 | 10% |
| Cards | 100 | 8 | 8% |
| Modals | 30 | 3 | 10% |
| Images | 80 | 3 | 4% |
| Lists | 51 | 0 | 0% |

**Overall**: 32/526 files (6% complete)

---

## 🚀 Quick Start Guide

### Step 1: Identify Component Type
Determine what type of component you're working with (button, input, image, etc.)

### Step 2: Add Required Props
Add the minimum required accessibility props:
- `accessibilityLabel` (required for all interactive elements)
- `accessibilityRole` (required)
- `accessibilityHint` (recommended for buttons/actions)

### Step 3: Add Optional Props
Based on component state:
- `accessibilityState` for disabled/checked/selected states
- `accessibilityValue` for progress/adjustable elements
- `accessible={false}` for decorative elements

### Step 4: Test
Test with VoiceOver (iOS) or TalkBack (Android) to ensure:
- Labels are clear and descriptive
- Navigation order is logical
- Actions are obvious

---

## 📖 Resources

- [React Native Accessibility Docs](https://reactnative.dev/docs/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [iOS VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)

---

## 🎯 Next Steps

1. **Complete Phase 1**: Add labels to all navigation components
2. **Complete Phase 2**: Add labels to cart & checkout flow
3. **Complete Phase 3**: Add labels to product pages
4. **Complete Phase 4**: Add labels to forms
5. **Complete Phase 5**: Add labels to modals
6. **Complete Phase 6**: Add labels to lists & cards
7. **Test thoroughly**: Use screen readers on both platforms
8. **Iterate**: Fix any issues found during testing

---

**Target**: 100/100 Accessibility Score
**Current**: 90/100
**Improvement Needed**: +10 points
**Estimated Time**: 8-12 hours for complete implementation

---

Last Updated: January 2025
