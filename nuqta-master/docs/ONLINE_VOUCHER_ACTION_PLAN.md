# Online Voucher - Quick Action Plan

**Generated**: October 31, 2025
**Status**: 🔴 NOT PRODUCTION READY (63.75% Complete)
**Time to Launch**: 2-3 weeks (if Phase 1 completed)

---

## 🚨 CRITICAL BLOCKERS (Must Fix Before Launch)

### 1. **Voucher Purchase Flow** ❌ MISSING
**Why Critical**: Users cannot buy vouchers - the core functionality!

**What to Build**:
```
components/voucher/PurchaseModal.tsx
hooks/useVoucherPurchase.ts
```

**User Flow**:
```
User clicks "Earn up to 12% Reward" button on brand page
  ↓
Modal opens showing:
  - Brand name & logo
  - Available denominations (₹100, ₹500, ₹1000, ₹2000)
  - Your wallet balance: ₹500
  - Selected: ₹500
  - You'll pay: ₹500 coins
  ↓
User clicks "Purchase Now"
  ↓
Backend creates voucher, deducts coins
  ↓
Success! Navigate to "My Vouchers"
  ↓
Voucher appears with QR code
```

**Files to Modify**:
- `app/voucher/[brandId].tsx` - Add purchase button handler
- Create new components and hooks

**Time**: 6-8 hours

---

### 2. **Online Redemption Flow** ❌ INCOMPLETE
**Why Critical**: Users need easy way to use purchased vouchers

**What to Build**:
```
components/voucher/OnlineRedemptionModal.tsx
```

**User Flow**:
```
User has active ₹500 Amazon voucher
  ↓
Clicks "Use Online" button
  ↓
Modal shows:
  - Voucher Code: AMAZ-500-XY9Z4A (large text)
  - [Copy Code] button
  - Instructions: "Paste this code at Amazon checkout"
  - [Open Amazon Website] button
  - [Mark as Used] button
  ↓
User copies code, opens website, completes purchase
  ↓
Marks as used
  ↓
Voucher moves to "Used" tab
```

**Files to Modify**:
- `app/my-vouchers.tsx` - Add "Use Online" button
- Create OnlineRedemptionModal component

**Time**: 4-6 hours

---

### 3. **Enhanced Search** ⚠️ LOCAL ONLY
**Why Critical**: Search only finds loaded brands (50 out of 1000+)

**What to Fix**:
```typescript
// Current: Searches only from loaded brands
const filteredBrands = allBrands.filter(...)

// Fix: Call backend API
const searchRes = await realVouchersApi.getVoucherBrands({
  search: query,
  page: 1,
  limit: 50
});
```

**Files to Modify**:
- `hooks/useOnlineVoucher.ts` - Update `searchBrands` function

**Time**: 2-3 hours

---

### 4. **Error Handling & Retry** ⚠️ BASIC
**Why Critical**: Poor UX when things fail

**What to Add**:
- Retry buttons on all errors
- Specific error messages (network, server, auth)
- Loading indicators
- Empty states

**Files to Modify**:
- `app/online-voucher.tsx` - Add error states component
- `hooks/useOnlineVoucher.ts` - Better error handling

**Time**: 3-4 hours

---

## ⚠️ HIGH PRIORITY (Should Fix Soon)

### 5. **Share Functionality** ⚠️ STUB ONLY
**Current Code**:
```typescript
const handleShare = () => {
  // TODO: Implement actual sharing functionality
};
```

**Fix**:
```bash
npm install expo-sharing
```

```typescript
import * as Sharing from 'expo-sharing';
import { Share, Platform } from 'react-native';

const handleShare = async (brand: Brand) => {
  const message = `Check out ${brand.name} - Get ${brand.cashbackRate}% cashback!`;

  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ text: message });
    } else {
      await Clipboard.setStringAsync(message);
      Alert.alert('Copied to clipboard!');
    }
  } else {
    await Share.share({ message });
  }
};
```

**Time**: 2-3 hours

---

### 6. **Wishlist/Favorites** ❌ MISSING
**What to Build**:
- Backend: Wishlist API endpoints
- Frontend: Heart button toggle
- Page: My Wishlist

**Time**: 6-8 hours

---

### 7. **Filters & Sorting** ❌ MISSING
**What to Add**:
- Filter modal
- Sort by: Cashback, Rating, Newest
- Filter by: Category, Min Cashback

**Time**: 5-7 hours

---

### 8. **Pagination** ❌ MISSING
**What to Add**:
- Infinite scroll or "Load More" button
- Currently shows only first 50 brands

**Time**: 3-4 hours

---

## 📊 WHAT'S WORKING WELL ✅

| Feature | Status | Quality |
|---------|--------|---------|
| **UI/UX Design** | ✅ Complete | ⭐⭐⭐⭐⭐ Excellent |
| **Backend API** | ✅ Complete | ⭐⭐⭐⭐⭐ Excellent |
| **Hero Carousel** | ✅ Working | ⭐⭐⭐⭐⭐ Perfect |
| **Category Grid** | ✅ Working | ⭐⭐⭐⭐⭐ Perfect |
| **Brand Display** | ✅ Working | ⭐⭐⭐⭐⭐ Beautiful |
| **Search (Basic)** | ✅ Working | ⭐⭐⭐ Good (local only) |
| **Brand Detail Page** | ⚠️ UI Done | ⭐⭐⭐⭐ Good (missing functionality) |
| **QR Code in My Vouchers** | ✅ Working | ⭐⭐⭐⭐⭐ Excellent |
| **Data Models** | ✅ Complete | ⭐⭐⭐⭐⭐ Well-designed |

---

## 🎯 IMPLEMENTATION PRIORITY

### Week 1: CRITICAL BLOCKERS
```
Day 1-2: Purchase Flow (Task 1.1)
  - Build PurchaseModal
  - Build useVoucherPurchase hook
  - Wire up brand detail page
  - Test end-to-end

Day 3-4: Online Redemption (Task 1.2)
  - Build OnlineRedemptionModal
  - Update My Vouchers page
  - Test copy & open flow

Day 5: Search & Error Handling (Tasks 1.3, 1.4)
  - Fix search to use backend
  - Add debouncing
  - Add retry buttons
  - Better error messages
```

### Week 2: HIGH PRIORITY
```
Day 1-2: Share Functionality (Task 2.3)
  - Implement sharing
  - Test on mobile & web

Day 3-5: Wishlist (Task 2.1)
  - Backend endpoints
  - Frontend integration
  - Wishlist page
```

### Week 3: POLISH & LAUNCH
```
Day 1-2: Filters & Sorting (Task 2.2)
Day 3-4: Testing & Bug Fixes
Day 5: Launch!
```

---

## 📝 QUICK CHECKLISTS

### Before You Start Coding
- [ ] Read the full production readiness report
- [ ] Set up development environment
- [ ] Pull latest code from git
- [ ] Install missing dependencies
- [ ] Start backend server
- [ ] Start frontend dev server

### Purchase Flow Checklist
- [ ] Create PurchaseModal component
- [ ] Create useVoucherPurchase hook
- [ ] Update brand detail page
- [ ] Test with sufficient balance
- [ ] Test with insufficient balance
- [ ] Test API errors
- [ ] Verify voucher appears in My Vouchers
- [ ] Verify wallet balance updates
- [ ] Verify transaction recorded

### Redemption Flow Checklist
- [ ] Create OnlineRedemptionModal
- [ ] Add "Use Online" button
- [ ] Implement copy to clipboard
- [ ] Implement open website
- [ ] Implement mark as used
- [ ] Test copy functionality
- [ ] Test website opening
- [ ] Test marking as used
- [ ] Verify status updates

### Testing Checklist
- [ ] Happy path: Browse → Click → Purchase → Redeem
- [ ] Error path: Network failure
- [ ] Error path: Insufficient balance
- [ ] Error path: Server error
- [ ] Search finds all brands
- [ ] Filters work correctly
- [ ] Share works on mobile
- [ ] Share works on web

---

## 🛠️ CODE SNIPPETS TO USE

### 1. Debounced Search Hook
```typescript
// hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 2. Error State Component
```typescript
// components/common/ErrorState.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <View style={styles.container}>
    <Ionicons name="alert-circle" size={64} color="#EF4444" />
    <ThemedText style={styles.message}>{message}</ThemedText>
    <TouchableOpacity style={styles.button} onPress={onRetry}>
      <ThemedText style={styles.buttonText}>Tap to Retry</ThemedText>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

### 3. Purchase Hook Template
```typescript
// hooks/useVoucherPurchase.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import realVouchersApi from '@/services/realVouchersApi';

export const useVoucherPurchase = () => {
  const router = useRouter();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseVoucher = async (
    brandId: string,
    denomination: number
  ) => {
    setPurchasing(true);
    setError(null);

    try {
      const result = await realVouchersApi.purchaseVoucher({
        brandId,
        denomination,
        paymentMethod: 'wallet',
      });

      if (result.success && result.data) {
        Alert.alert(
          'Success!',
          `Voucher purchased successfully! Check My Vouchers.`,
          [
            {
              text: 'View Voucher',
              onPress: () => router.push('/my-vouchers'),
            },
            { text: 'OK', style: 'default' },
          ]
        );
        return true;
      } else {
        setError(result.error || 'Purchase failed');
        Alert.alert('Error', result.error || 'Failed to purchase voucher');
        return false;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to purchase voucher';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      return false;
    } finally {
      setPurchasing(false);
    }
  };

  return {
    purchaseVoucher,
    purchasing,
    error,
  };
};
```

---

## 📞 NEED HELP?

### Documentation
- Full Report: `ONLINE_VOUCHER_PRODUCTION_READINESS_REPORT.md`
- Voucher System: `VOUCHER_COUPON_SYSTEM_COMPLETE.md`
- Quick Start: `VOUCHER_QUICK_START.md`
- My Vouchers: `MY_VOUCHERS_EARNINGS_FIXES_COMPLETE.md`

### Key Files to Reference
```
Frontend:
  app/online-voucher.tsx               - Main page
  hooks/useOnlineVoucher.ts            - State management
  services/realVouchersApi.ts          - API calls
  types/voucher.types.ts               - Type definitions

Backend:
  models/Voucher.ts                    - Data models
  controllers/voucherController.ts     - Business logic
  routes/voucherRoutes.ts              - API routes
```

### Common Issues

**Issue**: "Cannot find module 'expo-sharing'"
**Fix**: `npm install expo-sharing`

**Issue**: "Backend returns 401 Unauthorized"
**Fix**: Check if user is logged in, refresh auth token

**Issue**: "Wallet balance not updating"
**Fix**: Check wallet service, verify transaction created

**Issue**: "Search not finding brands"
**Fix**: Implement backend search (see Task 1.3)

---

## 🎓 LEARNING RESOURCES

### React Native
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### MongoDB
- [Mongoose Docs](https://mongoosejs.com/docs/)

### Testing
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

---

## ✅ DEFINITION OF DONE

A feature is "Done" when:
- [ ] Code written and follows best practices
- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Tested manually (happy path + error paths)
- [ ] No console errors or warnings
- [ ] Code reviewed by another developer
- [ ] Documented (if complex)
- [ ] Committed to git with clear message

---

## 🚀 LAUNCH CRITERIA

Ready to launch when:
- [ ] Purchase flow works end-to-end
- [ ] Redemption flow works end-to-end
- [ ] Search finds all brands
- [ ] Errors handled gracefully with retry
- [ ] Share functionality works
- [ ] No critical bugs
- [ ] Backend stable (no crashes)
- [ ] API response times < 500ms
- [ ] Tested on Android & iOS
- [ ] Tested on Web (if applicable)

---

**Good luck with the implementation!** 🎉

If you need clarification on any task, refer to the full production readiness report.
