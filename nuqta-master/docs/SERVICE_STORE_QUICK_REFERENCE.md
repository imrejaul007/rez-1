# Service Store Features - Quick Reference

## 🎯 Quick Overview

**What:** PayYourBill, Vouchers, and QuickActions for service-based stores
**Where:** C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend
**Status:** ✅ Implementation Complete

---

## 📂 Files Created/Modified

### New Files
- `components/store/VouchersSection.tsx` - Voucher display component
- `app/paybill.tsx` - Bill payment page
- `utils/storeFeatures.ts` - Store type utilities
- `SERVICE_STORE_FEATURES_SUMMARY.md` - Full documentation

### Modified Files
- `app/MainStorePage.tsx` - Added conditional rendering

### Existing Files (Verified)
- `components/store/PayBillCard.tsx` - Already exists ✓
- `components/store/QuickActions.tsx` - Already exists ✓
- `services/storeVouchersApi.ts` - Already exists ✓
- `services/paybillApi.ts` - Already exists ✓

---

## 🏪 Store Types

| Type | Shows | Example Stores |
|------|-------|----------------|
| **PRODUCT** | Products, Cart, Wishlist | Retail, Grocery, Electronics |
| **SERVICE** | Bookings, PayBill, Vouchers | Salon, Spa, Clinic, Gym |
| **RESTAURANT** | Menu, TableBooking, PayBill | Cafe, Restaurant, Bakery |
| **HYBRID** | All Features | Store + Services combo |

---

## 🎨 Components

### 1. VouchersSection
```tsx
<VouchersSection
  storeId="store-123"
  storeName="Awesome Salon"
/>
```

**Shows:**
- Horizontal scrollable voucher cards
- Discount badges, codes, validity
- Claim/Copy functionality

**When:** SERVICE, RESTAURANT, or HYBRID stores

---

### 2. PayBillCard
```tsx
<PayBillCard
  productData={storeData}
  discountPercentage={20}
/>
```

**Shows:**
- Amount input with live discount calc
- 20% bonus display
- Payment method modal

**When:** SERVICE or RESTAURANT stores (or specific PRODUCT categories)

---

### 3. QuickActions
```tsx
<QuickActions
  storeId="store-123"
  storeName="Restaurant Name"
  storeType="RESTAURANT"
  contact={{ phone: "+911234567890" }}
  location={{ coordinates: [77.5, 12.9] }}
  hasMenu={true}
  allowBooking={true}
/>
```

**Shows:**
- 2-column grid of action buttons
- 6 context-aware actions
- Phone, directions, booking, menu, etc.

**When:** SERVICE, RESTAURANT, or HYBRID stores

---

## 🔧 Utility Functions

### Detect Store Type
```typescript
import { detectStoreType } from '@/utils/storeFeatures';

const storeType = detectStoreType(
  'Restaurant',        // category
  ['food', 'dining'],  // tags
  deliveryCategories   // object
);
// Returns: 'RESTAURANT'
```

### Get Features
```typescript
import { getStoreFeatures } from '@/utils/storeFeatures';

const features = getStoreFeatures('SERVICE');
// Returns object with feature flags
```

### Check PayBill
```typescript
import { shouldShowPayBill } from '@/utils/storeFeatures';

const showPayBill = shouldShowPayBill('SERVICE', 'Salon');
// Returns: true
```

---

## 📍 Section Placement

```jsx
{/* In MainStorePage.tsx, after UGC Section */}

{/* 1. PayBill Card */}
{shouldShowPayBill(storeType, storeData?.category) && (
  <PayBillCard productData={storeData} discountPercentage={20} />
)}

{/* 2. Vouchers Section */}
{(storeType === 'SERVICE' || storeType === 'RESTAURANT' || storeType === 'HYBRID') && (
  <VouchersSection storeId={storeData.id} storeName={storeData.name} />
)}

{/* 3. Quick Actions */}
{(storeType === 'SERVICE' || storeType === 'RESTAURANT' || storeType === 'HYBRID') && (
  <QuickActions
    storeId={storeData.id}
    storeName={storeData.name}
    storeType={storeType}
    contact={storeData.contact}
    location={storeData.location}
    hasMenu={storeType === 'RESTAURANT'}
    allowBooking={storeType === 'SERVICE' || storeType === 'HYBRID'}
  />
)}
```

---

## 🌐 API Endpoints

### Vouchers
```
GET  /store-vouchers/store/:storeId
POST /store-vouchers/:id/claim
GET  /store-vouchers/my-vouchers
POST /store-vouchers/:id/redeem
```

### PayBill
```
GET  /wallet/paybill/balance
POST /wallet/paybill
POST /wallet/paybill/use
GET  /wallet/paybill/transactions
```

---

## 🎯 Quick Actions by Store Type

### PRODUCT
✓ Call | ✓ Directions | ✓ Share | ✓ Reviews | ✓ Message | ✓ Offers

### SERVICE (Salon, Spa)
✓ **Book Appointment** | ✓ Call | ✓ Directions | ✓ Message | ✓ Reviews | ✓ Share

### RESTAURANT
✓ **View Menu** | ✓ **Book Table** | ✓ Call | ✓ Directions | ✓ Message | ✓ Offers

### HYBRID
✓ Book | ✓ Menu | ✓ Call | ✓ Directions | ✓ Message | ✓ Offers

---

## 🎨 Theme Colors

```typescript
const COLORS = {
  primary: '#7C3AED',      // Purple
  light: '#F3E8FF',        // Light Purple
  success: '#059669',      // Green
  background: '#F8FAFC',   // Light Gray
  text: '#1F2937',         // Dark Gray
  subtle: '#6B7280',       // Medium Gray
};
```

---

## 📝 Mock Vouchers

```typescript
const mockVouchers = [
  { code: 'SAVE20', discount: '20%', min: 500, max: 100 },
  { code: 'FIRST500', discount: '₹500', min: 2000 },
  { code: 'WEEKEND15', discount: '15%', min: 300, max: 150 },
];
```

---

## ✅ Testing Checklist

**Vouchers:**
- [ ] Load from API
- [ ] Fallback to mock data
- [ ] Claim button works
- [ ] Copy code works
- [ ] Validity displays

**PayBill:**
- [ ] Amount validation
- [ ] Discount calculation
- [ ] Payment modal
- [ ] API integration

**QuickActions:**
- [ ] Correct actions per type
- [ ] Phone dialer
- [ ] Maps navigation
- [ ] Share works

**Store Detection:**
- [ ] Detects PRODUCT
- [ ] Detects SERVICE
- [ ] Detects RESTAURANT
- [ ] Detects HYBRID

---

## 🚀 Usage Examples

### Restaurant Store
```typescript
// Auto-detected as RESTAURANT
const store = {
  category: 'Restaurant',
  tags: ['food', 'dining', 'italian'],
  contact: { phone: '+911234567890' },
  location: { coordinates: [77.5, 12.9] }
};

// Will show:
// ✓ PayBill Card
// ✓ Vouchers (3-5 cards)
// ✓ Quick Actions (Menu, Book Table, Call, Directions)
```

### Salon Store
```typescript
// Auto-detected as SERVICE
const store = {
  category: 'Beauty & Wellness',
  tags: ['salon', 'spa', 'beauty'],
  contact: { phone: '+910987654321' },
  location: { coordinates: [77.6, 12.8] }
};

// Will show:
// ✓ PayBill Card
// ✓ Vouchers
// ✓ Quick Actions (Book Appointment, Call, Directions)
```

---

## 🔍 Troubleshooting

### Sections not showing?
1. Check `storeType` state value
2. Verify `storeData` is not null
3. Check conditional rendering logic
4. Console log detection: `console.log('🏪 Store Type:', storeType)`

### API not loading?
1. Check network tab
2. Verify API endpoint
3. Check auth headers
4. Fallback to mock data enabled

### Wrong store type detected?
1. Check category name spelling
2. Verify tags array
3. Add explicit type if needed
4. Check `detectStoreType` logic

---

## 📚 Full Documentation
See `SERVICE_STORE_FEATURES_SUMMARY.md` for complete documentation

---

**Quick Start:**
1. Navigate to any service store (salon, restaurant, spa)
2. Store type auto-detected
3. PayBill, Vouchers, and QuickActions appear automatically
4. All features work out of the box

**Support:** Check console logs with prefix `🏪 [MAINSTORE]`
