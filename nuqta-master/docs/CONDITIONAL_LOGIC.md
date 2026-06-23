# StoreActionButtons Conditional Logic Documentation

## Overview
The StoreActionButtons component implements conditional rendering logic to show different button combinations based on the store/product type.

## Type System

### StoreType Enum
```typescript
export type StoreType = 'PRODUCT' | 'SERVICE';
```

## Conditional Rendering Logic

### Button Visibility Rules

#### PRODUCT Type
- **Buy Button**: ✅ Always visible
- **Lock Button**: ✅ Always visible  
- **Booking Button**: ❌ Hidden by default (can be overridden with `showBookingButton={true}`)

#### SERVICE Type
- **Buy Button**: ❌ Hidden (not applicable for services)
- **Lock Button**: ✅ Always visible
- **Booking Button**: ✅ Always visible (replaces Buy for services)

### Implementation Details

The conditional logic is implemented in `utils/store-action-logic.ts`:

```typescript
export function getVisibleButtons(storeType: StoreType, showBookingButton?: boolean): {
  showBuy: boolean;
  showLock: boolean;
  showBooking: boolean;
} {
  const baseButtons = {
    showBuy: true,
    showLock: true,
    showBooking: false,
  };

  switch (storeType) {
    case 'PRODUCT':
      return {
        ...baseButtons,
        showBooking: showBookingButton || false, // Override available but defaults to false
      };
    
    case 'SERVICE':
      return {
        showBuy: false, // Hide Buy button for services
        showLock: true,
        showBooking: true, // Show Booking instead of Buy
      };
    
    default:
      return baseButtons;
  }
}
```

## Usage Examples

### Product Page (2 buttons)
```tsx
<StoreActionButtons
  storeType="PRODUCT"
  onBuyPress={handleBuy}
  onLockPress={handleLock}
  // Booking button will be hidden
/>
```

### Service Page (3 buttons)
```tsx
<StoreActionButtons
  storeType="SERVICE"
  onBuyPress={handleBuy}
  onLockPress={handleLock}
  onBookingPress={handleBooking} // Booking button will be shown
/>
```

### Product with Booking Override
```tsx
<StoreActionButtons
  storeType="PRODUCT"
  showBookingButton={true} // Force show booking button
  onBuyPress={handleBuy}
  onLockPress={handleLock}
  onBookingPress={handleBooking}
/>
```

### Service without Booking
```tsx
<StoreActionButtons
  storeType="SERVICE"
  showBookingButton={false} // Force hide booking button
  onBuyPress={handleBuy}
  onLockPress={handleLock}
/>
```

## Backend Integration Preparation

### Current Implementation
Currently using hardcoded `storeType="PRODUCT"` in StorePage.tsx:

```tsx
<StoreActionButtons
  storeType="PRODUCT" // Current default - will come from backend later
  onBuyPress={handleBuyPress}
  onLockPress={handleLockPress}
/>
```

### Future Backend Integration

When backend integration is ready, replace the hardcoded value with dynamic data:

```tsx
<StoreActionButtons
  storeType={storeData.type} // From API: 'PRODUCT' | 'SERVICE'
  onBuyPress={handleBuyPress}
  onLockPress={handleLockPress}
  onBookingPress={handleBookingPress}
  showBookingButton={storeData.hasBookingOption} // Optional override from backend
/>
```

### Required Backend Data Structure

```typescript
interface StoreData {
  id: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  hasBookingOption?: boolean; // Optional override for booking visibility
  // ... other store properties
}
```

### API Endpoints to Implement

1. **GET /api/store/{storeId}**
   - Returns store information including type
   - Used to determine button configuration

2. **POST /api/store/{storeId}/buy**
   - Handles buy button action
   
3. **POST /api/store/{storeId}/lock**
   - Handles lock button action
   
4. **POST /api/store/{storeId}/booking** (for services)
   - Handles booking button action

## Testing Scenarios

### Scenario 1: Product Store
- Expected: Buy + Lock buttons (2 buttons in row layout)
- Booking button should be hidden
- Button width: 48% each with 12px gap

### Scenario 2: Service Store  
- Expected: Lock + Booking buttons (2 buttons in row layout)
- Buy button hidden, Booking replaces it
- Button width: 48% each with 12px gap

### Scenario 3: Product with Booking Override
- Expected: Buy + Lock + Booking buttons (3 buttons)
- Booking button shown despite PRODUCT type
- Button width: 32% each with 8px gap

### Scenario 4: Service Store (Standard)
- Expected: Lock + Booking buttons (2 buttons)
- Buy button always hidden for services

## Layout Adaptations

The component automatically adjusts layout based on button count:

- **1 button**: 100% width
- **2 buttons**: 48% width each, 12px gap
- **3 buttons**: 32% width each, 8px gap

This ensures optimal visual presentation regardless of the conditional rendering result.