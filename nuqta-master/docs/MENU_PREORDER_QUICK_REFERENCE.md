# Menu Pre-Order - Quick Reference

## Files Created

```
components/booking/
├── MenuItemCard.tsx          ✓ Individual menu item card
├── MenuPreOrderModal.tsx     ✓ Full menu browsing modal
└── RestaurantBookingModal.tsx ✓ Updated with integration
```

## Quick Usage

### 1. Import Components
```tsx
import RestaurantBookingModal from '@/components/booking/RestaurantBookingModal';
```

### 2. Use in Your Page
```tsx
const [showBooking, setShowBooking] = useState(false);

<RestaurantBookingModal
  visible={showBooking}
  restaurant={{
    id: 'rest_123',
    name: 'The Purple Bistro',
    image: 'https://...',
    address: '123 Main St',
    cuisine: ['Italian', 'Mediterranean']
  }}
  onClose={() => setShowBooking(false)}
  onConfirm={(bookingData) => {
    console.log('Booking:', bookingData);
    // bookingData.menuItems contains selected items
  }}
/>
```

## Booking Flow

```
Step 1: Party Size
   ↓
Step 2: Date & Time
   ↓
Step 3: Seating Preference
   ↓
Step 4: Special Occasion
   ↓
Step 5: Pre-order Menu ← NEW!
   ↓
Step 6: Confirmation
```

## Step 5 Features

### Empty State
- "Browse Menu & Pre-order" button
- Opens MenuPreOrderModal

### Selected State
- Shows list of selected items
- Total amount
- "Edit Menu Selection" button

## MenuPreOrderModal Features

### Search
- Real-time filtering
- Searches name & description
- Clear button

### Categories
- All
- Appetizers
- Main Course
- Desserts
- Beverages

### Menu Items (2-column grid)
- Image
- Veg/Non-veg indicator (🟢/🔴)
- Name & description
- Price
- Spice level (🌶️)
- Allergen warnings
- Add/Quantity buttons

### Cart Summary
- Item count
- Total amount
- "Add to Reservation" button

## Mock Menu Data

### Appetizers (5 items)
- Paneer Tikka - ₹280
- Chicken Wings - ₹350
- Spring Rolls - ₹220
- Fish Fingers - ₹380
- Bruschetta - ₹260

### Main Course (10 items)
- Butter Chicken - ₹450
- Dal Makhani - ₹320
- Biryani - ₹480
- Paneer Butter Masala - ₹380
- Grilled Salmon - ₹680
- Pasta Alfredo - ₹420
- Lamb Rogan Josh - ₹550
- Margherita Pizza - ₹380
- Thai Green Curry - ₹420
- Steak - ₹750

### Desserts (5 items)
- Gulab Jamun - ₹120
- Chocolate Lava Cake - ₹220
- Tiramisu - ₹280
- Ice Cream Sundae - ₹180
- Cheesecake - ₹260

### Beverages (5 items)
- Mango Lassi - ₹120
- Fresh Lime Soda - ₹80
- Masala Chai - ₹60
- Fresh Juice - ₹100
- Cold Coffee - ₹140

## Data Types

### MenuItem
```typescript
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isVeg?: boolean;
  spiceLevel?: 'mild' | 'medium' | 'hot';
  allergens?: string[];
  quantity: number;
}
```

### RestaurantBookingData
```typescript
interface RestaurantBookingData {
  restaurantId: string;
  date: string;              // "2025-11-15"
  timeSlot: string;          // "19:00"
  partySize: number;         // 4
  seatingPreference?: 'indoor' | 'outdoor' | 'window' | 'booth';
  occasion?: string;
  specialRequests?: string;
  menuItems?: MenuItem[];    // ← Menu items here
}
```

## Styling

### Colors
- Primary: `#7C3AED` (Purple)
- Success: `#10B981` (Green - Veg)
- Error: `#EF4444` (Red - Non-veg)

### Key Styles
```typescript
// Veg Indicator
vegIndicator: {
  borderColor: '#10B981',
  backgroundColor: transparent
}

// Non-veg Indicator
nonVegIndicator: {
  borderColor: '#EF4444',
  backgroundColor: transparent
}

// Button
addButton: {
  backgroundColor: '#7C3AED',
  color: '#FFF'
}
```

## Common Operations

### Add Item
```typescript
// User clicks "Add" on Paneer Tikka
onQuantityChange('app1', 1) // quantity = 1
```

### Increase Quantity
```typescript
// User clicks "+" on Paneer Tikka
onQuantityChange('app1', 2) // quantity = 2
```

### Remove Item
```typescript
// User clicks "-" when quantity is 1
onQuantityChange('app1', 0) // quantity = 0
```

### Clear All
```typescript
// User clicks "Clear" button
setMenuItems(prev => prev.map(item => ({ ...item, quantity: 0 })))
```

### Calculate Total
```typescript
const total = menuItems.reduce(
  (sum, item) => sum + (item.price * item.quantity),
  0
);
```

## Integration Points

### 1. Opening Modal
```tsx
// From Step 5 in RestaurantBookingModal
<TouchableOpacity onPress={() => setShowMenuModal(true)}>
  <Text>Browse Menu & Pre-order</Text>
</TouchableOpacity>
```

### 2. Adding Items
```tsx
const handleAddMenuItems = (items: MenuItem[]) => {
  setMenuItems(items);
  setShowMenuModal(false);
};

<MenuPreOrderModal
  onAddItems={handleAddMenuItems}
/>
```

### 3. Including in Booking
```tsx
const handleConfirm = () => {
  const bookingData = {
    // ... other fields
    menuItems: menuItems.length > 0 ? menuItems : undefined
  };
  onConfirm(bookingData);
};
```

## Testing Quick Checklist

```
□ Open modal from Step 5
□ Search for "chicken"
□ Filter by "Main Course"
□ Add Butter Chicken (x2)
□ Add Gulab Jamun (x1)
□ Check total = ₹1,020
□ Click "Add to Reservation"
□ Verify items show in Step 5
□ Click "Edit Menu Selection"
□ Verify quantities preserved
□ Proceed to Step 6
□ Confirm booking includes menu items
```

## API Integration (Future)

### Replace Mock Data
```typescript
// In MenuPreOrderModal.tsx

// Before (Mock)
const MOCK_MENU_DATA = [...];

// After (API)
const [menuData, setMenuData] = useState<MenuItem[]>([]);

useEffect(() => {
  const fetchMenu = async () => {
    const data = await restaurantMenuApi.getMenu(restaurant.id);
    setMenuData(data);
  };
  fetchMenu();
}, [restaurant.id]);
```

### API Service
```typescript
// services/restaurantMenuApi.ts
export const restaurantMenuApi = {
  getMenu: async (restaurantId: string) => {
    const response = await apiClient.get(
      `/restaurants/${restaurantId}/menu`
    );
    return response.data;
  }
};
```

## Troubleshooting

### Modal Not Opening
- Check `showMenuModal` state
- Verify button `onPress`

### Items Not Updating
- Check `onQuantityChange` callback
- Verify state updates

### Total Wrong
- Check price * quantity calculation
- Verify reduce function

### Images Not Loading
- Verify image URLs
- Check network connection

## Performance Tips

1. Use `useMemo` for filtered items
2. Use proper `key` props
3. Optimize image loading
4. Debounce search input
5. Batch state updates

## Accessibility

- ✓ Visual indicators (color + shape)
- ✓ Large touch targets (44pt min)
- ✓ Clear labels
- ✓ Screen reader support
- ✓ Keyboard navigation

## Browser/Platform Support

- ✓ iOS
- ✓ Android
- ✓ Web (with expo-blur fallback)

## Dependencies

```json
{
  "expo-blur": "~13.0.2",
  "@expo/vector-icons": "^14.0.0"
}
```

## Support

For questions or issues:
- Check MENU_PREORDER_INTEGRATION_GUIDE.md
- Review component comments
- Test with mock data first
