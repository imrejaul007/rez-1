# StoreActionButtons Component API

## Overview
The `StoreActionButtons` component provides three action buttons (Buy, Lock, Booking) with conditional visibility based on store type (Product vs Service). It includes comprehensive state management, loading states, and responsive design.

## Props Interface

### Core Props

```typescript
interface StoreActionButtonsProps {
  // Required
  storeType: 'PRODUCT' | 'SERVICE';

  // Optional Button Handlers
  onBuyPress?: () => void | Promise<void>;
  onLockPress?: () => void | Promise<void>;
  onBookingPress?: () => void | Promise<void>;

  // Individual Button States
  isBuyLoading?: boolean;
  isLockLoading?: boolean;
  isBookingLoading?: boolean;
  
  isBuyDisabled?: boolean;
  isLockDisabled?: boolean;
  isBookingDisabled?: boolean;

  // Advanced Configuration
  showBookingButton?: boolean; // Override conditional rendering
  customBuyText?: string;      // Default: "Buy"
  customLockText?: string;     // Default: "Lock"
  customBookingText?: string;  // Default: "Booking"

  // Styling Customization
  containerStyle?: ViewStyle;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
}
```

## Usage Examples

### Basic Product Store (Default)
```typescript
<StoreActionButtons
  storeType="PRODUCT"
  onBuyPress={handleBuyProduct}
  onLockPress={handleLockProduct}
/>
// Renders: [Buy] [Lock] (Booking hidden)
```

### Service Store with All Buttons
```typescript
<StoreActionButtons
  storeType="SERVICE"
  onBuyPress={handleBuyService}
  onLockPress={handleLockService}
  onBookingPress={handleBookService}
/>
// Renders: [Buy] [Lock] [Booking]
```

### Custom Configuration
```typescript
<StoreActionButtons
  storeType="PRODUCT"
  showBookingButton={true} // Force show booking for product
  customBuyText="Purchase"
  customLockText="Reserve"
  customBookingText="Schedule"
  isBuyLoading={isProcessing}
  isLockDisabled={!canReserve}
  onBuyPress={async () => {
    await purchaseProduct();
  }}
/>
```

## Button Behavior Matrix

| Store Type | Buy Button | Lock Button | Booking Button | Notes |
|------------|------------|-------------|----------------|--------|
| PRODUCT    | ✅ Visible  | ✅ Visible   | ❌ Hidden      | Default behavior |
| PRODUCT*   | ✅ Visible  | ✅ Visible   | ✅ Visible     | *With `showBookingButton={true}` |
| SERVICE    | ✅ Visible  | ✅ Visible   | ✅ Visible     | All buttons shown |
| SERVICE*   | ✅ Visible  | ✅ Visible   | ❌ Hidden      | *With `showBookingButton={false}` |

## Button States

### Loading States
- Individual buttons can show loading spinners
- While any button is loading, others are disabled
- Loading buttons show reduced opacity (0.8)

### Disabled States
- Explicitly disabled buttons show 50% opacity
- Disabled buttons have gray gradient background
- Disabled buttons don't respond to touch

### Error States
- Errors are managed internally by component
- Failed actions show brief error feedback
- Errors auto-clear after timeout

## Styling & Layout

### Responsive Layout
- **1 Button**: Full width (100%)
- **2 Buttons**: Side by side (48% each, 12px gap)
- **3 Buttons**: Equal width (32% each, 8px gap)

### Color Scheme
- **Buy Button**: Green gradient `['#10B981', '#059669']`
- **Lock Button**: Amber gradient `['#F59E0B', '#D97706']`
- **Booking Button**: Purple gradient `['#8B5CF6', '#7C3AED']` (theme consistent)

### Typography
- Font weight: 700 (bold)
- Font size: 16px (responsive to 14px on small screens)
- Color: White text on colored backgrounds

## Integration with StorePage

### Import and Usage
```typescript
// In StorePage.tsx
import StoreActionButtons from './StoreSection/StoreActionButtons';

export default function StorePage() {
  const [storeType] = useState<StoreType>('PRODUCT'); // Will come from backend

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <StoreHeader />
        <ProductInfo />
        
        {/* NEW: Action buttons above NewSection */}
        <StoreActionButtons
          storeType={storeType}
          onBuyPress={handleBuyAction}
          onLockPress={handleLockAction}
          onBookingPress={storeType === 'SERVICE' ? handleBookingAction : undefined}
        />
        
        <NewSection />
        {/* ... rest of sections */}
      </ScrollView>
    </ThemedView>
  );
}
```

## Event Handlers

### Handler Function Signatures
```typescript
// All handlers can be sync or async
type ButtonHandler = () => void | Promise<void>;

// Example implementations
const handleBuyAction = async () => {
  try {
    await addToCart(productData);
    showSuccessMessage('Added to cart!');
  } catch (error) {
    showErrorMessage('Failed to add to cart');
  }
};

const handleLockAction = async () => {
  const result = await lockProduct(productId, userId);
  if (result.success) {
    showSuccessMessage('Product reserved for 15 minutes');
  }
};

const handleBookingAction = async () => {
  navigation.navigate('BookingScreen', { serviceId });
};
```

## Accessibility

### Built-in Features
- Proper `accessibilityRole="button"` for all buttons
- Dynamic `accessibilityLabel` based on button state
- `accessibilityState` indicates loading/disabled states
- `accessibilityHint` provides context for action

### Example Accessibility Props
```typescript
// Generated automatically
accessibilityLabel="Buy product" // or "Purchasing..." when loading
accessibilityState={{ 
  disabled: isBuyDisabled || isAnyLoading,
  busy: isBuyLoading 
}}
accessibilityHint="Add this item to your shopping cart"
```

## Performance Considerations

### Optimizations
- `useCallback` for all button handlers to prevent re-renders
- `useMemo` for button configuration calculation
- Efficient state updates using functional setState
- Minimal re-renders through strategic prop dependencies

### Memory Management
- Event listeners properly cleaned up
- Timeout functions cleared on unmount
- State managers disposed correctly

## Future Backend Integration

### Expected API Structure
```typescript
// Store data from backend
interface StoreResponse {
  id: string;
  type: 'PRODUCT' | 'SERVICE';
  actions: {
    canBuy: boolean;
    canLock: boolean;
    canBook: boolean;
  };
  // ... other store data
}

// Usage with backend data
<StoreActionButtons
  storeType={storeData.type}
  isBuyDisabled={!storeData.actions.canBuy}
  isLockDisabled={!storeData.actions.canLock}
  showBookingButton={storeData.actions.canBook}
  // ... handlers
/>
```

## Testing Strategy

### Unit Tests
- Button visibility logic for different store types
- State management functions
- Handler execution and error handling
- Responsive layout calculations

### Integration Tests
- Full component rendering with various props
- Button interaction flows
- Error state handling
- Accessibility compliance