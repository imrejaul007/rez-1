# Activity Triggers Integration Guide

## Overview

Automatic activity creation system that logs user actions throughout the app without requiring manual API calls in every screen.

---

## Architecture

### Files Created

1. **`utils/activityTriggers.ts`** - Core trigger functions for all activity types
2. **`utils/activityIntegration.ts`** - Enhanced service wrappers with automatic logging

---

## How It Works

### Traditional Approach (Manual)
```typescript
// Before: Manual activity creation
const handleOrder = async () => {
  await ordersApi.placeOrder(data);

  // Have to remember to create activity manually
  await activityApi.createActivity({
    type: 'ORDER',
    title: 'Order Placed',
    description: `Placed an order at ${storeName}`,
    // ...
  });
};
```

### New Approach (Automatic)
```typescript
// After: Automatic activity creation
import { enhancedOrderService } from '@/utils/activityIntegration';

const handleOrder = async () => {
  // Activity is created automatically!
  await enhancedOrderService.placeOrder(cartId, addressId, paymentMethodId);
};
```

---

## Integration Instructions

### 1. Order Flow (checkout.tsx)

**Current code:**
```typescript
import { ordersApi } from '@/services/ordersApi';

const handleCheckout = async () => {
  const response = await ordersApi.placeOrder({
    cartId,
    addressId,
    paymentMethodId,
  });
};
```

**Updated code:**
```typescript
import { enhancedOrderService } from '@/utils/activityIntegration';

const handleCheckout = async () => {
  // Automatically creates "Order Placed" activity
  const response = await enhancedOrderService.placeOrder(
    cartId,
    addressId,
    paymentMethodId
  );
};
```

---

### 2. Wallet Operations (WalletScreen.tsx)

**Add money to wallet:**
```typescript
import { enhancedWalletService } from '@/utils/activityIntegration';

const handleRecharge = async (amount: number) => {
  // Automatically creates "Wallet Recharged" activity
  await enhancedWalletService.rechargeWallet(amount, 'UPI');
};
```

**Withdraw from wallet:**
```typescript
const handleWithdraw = async (amount: number) => {
  // Automatically creates "Wallet Withdrawal" activity
  await enhancedWalletService.withdrawFromWallet(amount, 'Bank Transfer');
};
```

---

### 3. Order Status Updates

**In order tracking screen:**
```typescript
import { handleOrderStatusChange } from '@/utils/activityIntegration';

useEffect(() => {
  const checkOrderStatus = async () => {
    const response = await ordersApi.getOrder(orderId);
    const newStatus = response.data.status;

    if (newStatus !== currentStatus) {
      // Automatically creates "Order Delivered" or "Order Cancelled" activity
      await handleOrderStatusChange(
        orderId,
        newStatus,
        order.store.name,
        currentStatus
      );

      setCurrentStatus(newStatus);
    }
  };

  const interval = setInterval(checkOrderStatus, 30000); // Poll every 30s
  return () => clearInterval(interval);
}, [orderId, currentStatus]);
```

---

### 4. Reviews (ReviewPage.tsx)

```typescript
import { enhancedReviewService } from '@/utils/activityIntegration';

const handleSubmitReview = async () => {
  // Automatically creates "Review Submitted" activity
  await enhancedReviewService.submitReview(
    product.id,
    product.name,
    rating,
    comment
  );
};
```

---

### 5. Vouchers (online-voucher.tsx)

**Purchase voucher:**
```typescript
import { enhancedVoucherService } from '@/utils/activityIntegration';

const handlePurchase = async (voucher: Voucher) => {
  // Automatically creates "Voucher Purchased" activity
  await enhancedVoucherService.purchaseVoucher(
    voucher.id,
    voucher.name,
    voucher.price
  );
};
```

**Redeem voucher:**
```typescript
const handleRedeem = async (voucher: Voucher, store: Store) => {
  // Automatically creates "Voucher Redeemed" activity
  await enhancedVoucherService.redeemVoucher(
    voucher.id,
    voucher.name,
    store.name
  );
};
```

---

### 6. Offers (offers page)

```typescript
import { enhancedOfferService } from '@/utils/activityIntegration';

const handleRedeemOffer = async (offer: Offer) => {
  // Automatically creates "Offer Redeemed" activity
  await enhancedOfferService.redeemOffer(
    offer.id,
    offer.title,
    offer.savings
  );
};
```

---

### 7. Profile Updates (profile/edit.tsx)

```typescript
import { enhancedProfileService } from '@/utils/activityIntegration';

const handleSaveProfile = async () => {
  const updates = {
    name: newName,
    phone: newPhone,
    email: newEmail,
  };

  // Automatically creates "Profile Updated" activity
  await enhancedProfileService.updateProfile(updates);
};
```

**Upload profile picture:**
```typescript
const handleUploadPicture = async (imageUri: string) => {
  // Automatically creates "Profile Picture Added" activity
  await enhancedProfileService.uploadProfilePicture(imageUri);
};
```

---

### 8. Store Favorites (StoreCard.tsx)

```typescript
import { enhancedStoreService } from '@/utils/activityIntegration';

const handleFavorite = async (store: Store) => {
  if (isFavorite) {
    // Automatically creates "Store Unfavorited" activity
    await enhancedStoreService.unfavoriteStore(store.id, store.name);
  } else {
    // Automatically creates "Store Favorited" activity
    await enhancedStoreService.favoriteStore(store.id, store.name);
  }

  setIsFavorite(!isFavorite);
};
```

---

## Direct Trigger Usage

For cases where you don't have an API call but still want to log activity:

### Video Milestones

```typescript
import { activityTriggers } from '@/utils/activityTriggers';

// When video reaches 1000 views
useEffect(() => {
  if (video.views >= 1000 && !milestoneReached) {
    activityTriggers.video.onVideoMilestone(
      video.id,
      video.title,
      1000
    );
    setMilestoneReached(true);
  }
}, [video.views]);
```

### Cashback Earned

```typescript
import { activityTriggers } from '@/utils/activityTriggers';

// When order is delivered and cashback is calculated
const handleDeliveryComplete = async (order: Order) => {
  const cashbackAmount = order.totalAmount * 0.05; // 5% cashback

  await activityTriggers.cashback.onCashbackEarned(
    cashbackAmount,
    order.id,
    order.store.name
  );
};
```

### Referral Flow

```typescript
import { activityTriggers } from '@/utils/activityTriggers';

// When user sends referral
const handleSendReferral = async (email: string) => {
  await activityTriggers.referral.onReferralSent(email);
};

// When referred user signs up (backend webhook)
const handleReferralJoined = async (referredName: string) => {
  await activityTriggers.referral.onReferralJoined(referredName, 100);
};

// When referral bonus is credited
const handleReferralBonus = async (referredName: string) => {
  await activityTriggers.referral.onReferralBonus(referredName, 100);
};
```

---

## Available Triggers

### Order Activities
- `activityTriggers.order.onOrderPlaced(orderId, storeName, amount)`
- `activityTriggers.order.onOrderDelivered(orderId, storeName)`
- `activityTriggers.order.onOrderCancelled(orderId, storeName)`

### Cashback Activities
- `activityTriggers.cashback.onCashbackEarned(amount, orderId, storeName)`
- `activityTriggers.cashback.onCashbackCredited(amount, orderId)`

### Review Activities
- `activityTriggers.review.onReviewSubmitted(productId, productName, rating)`
- `activityTriggers.review.onReviewLiked(reviewId, productName, totalLikes)`

### Video Activities
- `activityTriggers.video.onVideoUploaded(videoId, title)`
- `activityTriggers.video.onVideoEarnings(videoId, title, amount)`
- `activityTriggers.video.onVideoMilestone(videoId, title, views)`

### Project Activities
- `activityTriggers.project.onProjectCompleted(projectId, title, earnings)`
- `activityTriggers.project.onProjectPayment(projectId, title, amount)`

### Offer Activities
- `activityTriggers.offer.onOfferRedeemed(offerId, offerTitle, savings)`
- `activityTriggers.offer.onOfferExpired(offerId, offerTitle)`

### Voucher Activities
- `activityTriggers.voucher.onVoucherPurchased(voucherId, voucherName, amount)`
- `activityTriggers.voucher.onVoucherRedeemed(voucherId, voucherName, storeName)`

### Referral Activities
- `activityTriggers.referral.onReferralSent(referredEmail)`
- `activityTriggers.referral.onReferralJoined(referredName, bonusAmount)`
- `activityTriggers.referral.onReferralBonus(referredName, amount)`

### Profile Activities
- `activityTriggers.profile.onProfileUpdated(fieldsUpdated)`
- `activityTriggers.profile.onProfilePictureAdded()`
- `activityTriggers.profile.onMilestoneReached(milestoneName, value)`

### Store Activities
- `activityTriggers.store.onStoreFavorited(storeId, storeName)`
- `activityTriggers.store.onStoreUnfavorited(storeId, storeName)`
- `activityTriggers.store.onStoreFollowed(storeId, storeName)`

### Wallet Activities
- `activityTriggers.wallet.onWalletRecharge(amount, method)`
- `activityTriggers.wallet.onWalletWithdrawal(amount, method)`
- `activityTriggers.wallet.onWalletPayment(amount, purpose)`

---

## Batch Activities

For creating multiple activities at once:

```typescript
import { createBatchActivities } from '@/utils/activityTriggers';

const activities = [
  {
    type: 'ORDER',
    title: 'Order Placed',
    description: 'Placed an order at Store A',
    metadata: { orderId: '123' },
    amount: 500,
  },
  {
    type: 'CASHBACK',
    title: 'Cashback Earned',
    description: 'Earned ₹25 cashback',
    metadata: { orderId: '123' },
    amount: 25,
  },
];

await createBatchActivities(activities);
```

---

## Error Handling

All triggers fail silently to avoid disrupting the user experience:

```typescript
// If activity creation fails, the main operation still succeeds
await enhancedOrderService.placeOrder(cartId, addressId, paymentMethodId);
// Order is placed even if activity logging fails
```

Errors are logged to console for debugging:
```
Failed to create activity: Network error
```

---

## Implementation Checklist

### High Priority (Order Flow)
- [ ] Update `app/checkout.tsx` - Use `enhancedOrderService.placeOrder`
- [ ] Update order tracking screen - Use `handleOrderStatusChange`
- [ ] Update `app/WalletScreen.tsx` - Use `enhancedWalletService`

### Medium Priority (Engagement)
- [ ] Update `app/ReviewPage.tsx` - Use `enhancedReviewService`
- [ ] Update `app/online-voucher.tsx` - Use `enhancedVoucherService`
- [ ] Update offers page - Use `enhancedOfferService`
- [ ] Update `components/homepage/cards/StoreCard.tsx` - Use `enhancedStoreService`

### Low Priority (Profile & Misc)
- [ ] Update `app/profile/edit.tsx` - Use `enhancedProfileService`
- [ ] Add video milestones in video player
- [ ] Add referral triggers in referral flow
- [ ] Add project completion triggers

---

## Testing

### Manual Testing

1. **Place an order** → Check activity feed for "Order Placed"
2. **Recharge wallet** → Check for "Wallet Recharged"
3. **Submit a review** → Check for "Review Submitted"
4. **Favorite a store** → Check for "Store Favorited"
5. **Update profile** → Check for "Profile Updated"

### Verify in Activity Feed
- Navigate to `/profile/activity`
- Pull to refresh
- Filter by activity type
- Verify correct title, description, amount, timestamp

---

## Benefits

✅ **Automatic Logging** - No need to remember manual activity creation
✅ **Consistent Format** - All activities follow same structure
✅ **Silent Failures** - Won't disrupt user experience if logging fails
✅ **Easy Integration** - Replace API calls with enhanced versions
✅ **Type Safety** - Full TypeScript support
✅ **Reusable** - Trigger functions work anywhere
✅ **Maintainable** - Centralized activity logic

---

## Next Steps

1. Update high-priority screens (checkout, wallet)
2. Test activity creation in dev environment
3. Verify activities appear in activity feed
4. Continue with remaining screens
5. Add more triggers as new features are built

---

**Status**: Activity trigger system ready for integration. Replace direct API calls with enhanced services to enable automatic activity logging.