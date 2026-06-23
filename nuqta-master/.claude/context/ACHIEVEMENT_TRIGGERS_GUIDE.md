# Achievement Triggers Integration Guide

## Overview

Automatic achievement recalculation system that checks for newly unlocked badges when users perform milestone-worthy actions.

---

## How Achievement Triggers Work

### 1. Recalculation Process
When triggered, the system:
1. Calls backend `/api/achievements/recalculate` to update all achievement progress
2. Fetches updated achievement list
3. Identifies recently unlocked achievements (within last 5 minutes)
4. Creates activity feed entries for newly unlocked achievements

### 2. Integration with Activity Triggers
Achievement triggers are **automatically called** by the enhanced service wrappers. You don't need to call them manually if you're using the enhanced services.

---

## Available Achievement Triggers

### Order Achievements
**Unlockable Badges:**
- `FIRST_ORDER` - Complete first order
- `ORDER_5` - Complete 5 orders
- `ORDER_10` - Complete 10 orders
- `ORDER_25` - Complete 25 orders
- `ORDER_50` - Complete 50 orders
- `ORDER_100` - Complete 100 orders

**Trigger Function:**
```typescript
import { achievementTriggers } from '@/utils/achievementTriggers';

// After order is placed
await achievementTriggers.order.onOrderPlaced();

// After order is delivered
await achievementTriggers.order.onOrderDelivered();
```

---

### Spending Achievements
**Unlockable Badges:**
- `SPEND_1K` - Spend ₹1,000
- `SPEND_5K` - Spend ₹5,000
- `SPEND_10K` - Spend ₹10,000
- `SPEND_25K` - Spend ₹25,000
- `SPEND_50K` - Spend ₹50,000
- `SPEND_100K` - Spend ₹100,000

**Trigger Function:**
```typescript
// After payment is made (only triggers for ₹100+)
await achievementTriggers.spending.onPaymentMade(amount);
```

---

### Review Achievements
**Unlockable Badges:**
- `FIRST_REVIEW` - Submit first review
- `REVIEW_10` - Submit 10 reviews
- `REVIEW_25` - Submit 25 reviews
- `REVIEW_50` - Submit 50 reviews

**Trigger Function:**
```typescript
// After review is submitted
await achievementTriggers.review.onReviewSubmitted();
```

---

### Video Achievements
**Unlockable Badges:**
- `VIDEO_1` - Upload first video
- `VIDEO_10` - Upload 10 videos
- `VIDEO_25` - Upload 25 videos
- `VIDEO_EARNINGS_500` - Earn ₹500 from videos
- `VIDEO_EARNINGS_1K` - Earn ₹1,000 from videos
- `VIDEO_EARNINGS_5K` - Earn ₹5,000 from videos

**Trigger Functions:**
```typescript
// After video is uploaded
await achievementTriggers.video.onVideoUploaded();

// After video earnings credited (only triggers for ₹50+)
await achievementTriggers.video.onVideoEarningsReceived(amount);
```

---

### Referral Achievements
**Unlockable Badges:**
- `REFERRAL_1` - Refer 1 user
- `REFERRAL_5` - Refer 5 users
- `REFERRAL_10` - Refer 10 users

**Trigger Function:**
```typescript
// When referred user joins
await achievementTriggers.referral.onReferralJoined();
```

---

### Profile Achievement
**Unlockable Badge:**
- `PROFILE_COMPLETE` - Complete profile (100% filled)

**Trigger Functions:**
```typescript
// After profile is updated
await achievementTriggers.profile.onProfileUpdated();

// After profile picture is added
await achievementTriggers.profile.onProfilePictureAdded();
```

---

### Wallet Achievement
**Unlockable Badge:**
- `WALLET_LOADED` - Load money into wallet

**Trigger Function:**
```typescript
// After wallet recharge
await achievementTriggers.wallet.onWalletRecharged();
```

---

## Automatic Integration (Enhanced Services)

If you use the **enhanced service wrappers**, achievement triggers are called automatically:

### ✅ Already Integrated

#### 1. Order Placement
```typescript
import { enhancedOrderService } from '@/utils/activityIntegration';

// This automatically triggers:
// - activityTriggers.order.onOrderPlaced()
// - achievementTriggers.order.onOrderPlaced() ✅
// - achievementTriggers.spending.onPaymentMade() ✅
await enhancedOrderService.placeOrder(cartId, addressId, paymentMethodId);
```

#### 2. Order Status Change
```typescript
import { handleOrderStatusChange } from '@/utils/activityIntegration';

// This automatically triggers (on DELIVERED status):
// - activityTriggers.order.onOrderDelivered()
// - achievementTriggers.order.onOrderDelivered() ✅
await handleOrderStatusChange(orderId, 'DELIVERED', storeName, previousStatus);
```

#### 3. Wallet Recharge
```typescript
import { enhancedWalletService } from '@/utils/activityIntegration';

// This automatically triggers:
// - activityTriggers.wallet.onWalletRecharge()
// - achievementTriggers.wallet.onWalletRecharged() ✅
await enhancedWalletService.rechargeWallet(amount, method);
```

#### 4. Review Submission
```typescript
import { enhancedReviewService } from '@/utils/activityIntegration';

// This automatically triggers:
// - activityTriggers.review.onReviewSubmitted()
// - achievementTriggers.review.onReviewSubmitted() ✅
await enhancedReviewService.submitReview(productId, productName, rating, comment);
```

#### 5. Profile Update
```typescript
import { enhancedProfileService } from '@/utils/activityIntegration';

// This automatically triggers:
// - activityTriggers.profile.onProfileUpdated()
// - achievementTriggers.profile.onProfileUpdated() ✅
await enhancedProfileService.updateProfile(updates);
```

#### 6. Profile Picture Upload
```typescript
import { enhancedProfileService } from '@/utils/activityIntegration';

// This automatically triggers:
// - activityTriggers.profile.onProfilePictureAdded()
// - achievementTriggers.profile.onProfilePictureAdded() ✅
await enhancedProfileService.uploadProfilePicture(imageUri);
```

---

## Manual Trigger Usage

For cases where you need direct control:

### Video Features

```typescript
import { achievementTriggers } from '@/utils/achievementTriggers';

// When user uploads a video
const handleVideoUpload = async (video: Video) => {
  // Upload video logic...

  // Trigger achievement check
  await achievementTriggers.video.onVideoUploaded();
};

// When video earnings are credited
const handleVideoEarnings = async (earnings: number) => {
  // Credit earnings logic...

  // Trigger achievement check (only if ≥₹50)
  await achievementTriggers.video.onVideoEarningsReceived(earnings);
};
```

### Referral Flow

```typescript
import { achievementTriggers } from '@/utils/achievementTriggers';

// Backend webhook: When referred user signs up
const handleReferralSignup = async (referrerId: string) => {
  // Record referral...

  // Trigger achievement check for referrer
  await achievementTriggers.referral.onReferralJoined();
};
```

---

## Manual Recalculation

For debug or admin purposes:

```typescript
import { achievementTriggers } from '@/utils/achievementTriggers';

// Recalculate all achievements
await achievementTriggers.recalculate();

// Check for newly unlocked achievements
await achievementTriggers.checkNew();

// Combined: Recalculate and check in one call
import { triggerAchievementCheck } from '@/utils/achievementTriggers';
await triggerAchievementCheck();
```

---

## Achievement Notification Flow

When an achievement is unlocked:

1. **User performs action** (e.g., places 5th order)
2. **Enhanced service triggers achievement check**
3. **Backend recalculates achievement progress**
4. **Frontend fetches updated achievements**
5. **System detects newly unlocked achievement**
6. **Activity feed entry is created** ("Milestone Reached: Order Master")
7. **User sees activity in feed** with achievement details

---

## Testing Achievements

### Test Scenario: First Order Achievement

```typescript
// 1. Place first order
import { enhancedOrderService } from '@/utils/activityIntegration';
await enhancedOrderService.placeOrder(cartId, addressId, paymentMethodId);

// 2. Wait 2 seconds for recalculation
await new Promise((resolve) => setTimeout(resolve, 2000));

// 3. Check achievements screen
// Navigate to /profile/achievements
// Verify "First Order" badge is now unlocked

// 4. Check activity feed
// Navigate to /profile/activity
// Verify "Milestone Reached: First Order" activity exists
```

### Test Scenario: Spending Achievements

```typescript
// Place multiple orders totaling ₹1,000+
for (let i = 0; i < 5; i++) {
  await enhancedOrderService.placeOrder(cartId, addressId, paymentMethodId);
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

// Check for "Spend ₹1,000" achievement unlock
```

---

## Performance Considerations

### Silent Failures
- All achievement triggers fail silently to avoid disrupting user experience
- Errors are logged to console for debugging
- Main operations succeed even if achievement recalculation fails

### Throttling
- Spending achievements only trigger for amounts ≥₹100
- Video earnings only trigger for amounts ≥₹50
- Prevents excessive API calls for small transactions

### Timing
- Achievement checks are asynchronous (non-blocking)
- Recalculation happens in background
- User can continue using app immediately

---

## Implementation Checklist

### Already Complete ✅
- [x] Achievement trigger system created
- [x] Integrated with order placement
- [x] Integrated with order delivery
- [x] Integrated with wallet recharge
- [x] Integrated with review submission
- [x] Integrated with profile updates
- [x] Integrated with profile picture upload

### To Be Added (Low Priority)
- [ ] Video upload triggers
- [ ] Video earnings triggers
- [ ] Referral signup triggers
- [ ] Project completion triggers

---

## Backend Requirements

The achievement system requires these backend endpoints:

1. **POST `/api/achievements/recalculate`**
   - Recalculates all achievement progress for current user
   - Uses MongoDB aggregation pipelines
   - Returns updated achievements

2. **GET `/api/achievements`**
   - Returns all achievements with current progress
   - Includes unlocked status and unlock dates

---

## Achievement Types Reference

### 18 Total Achievements

| Achievement | Type | Target | Description |
|-------------|------|--------|-------------|
| FIRST_ORDER | Order | 1 | Complete first order |
| ORDER_5 | Order | 5 | Complete 5 orders |
| ORDER_10 | Order | 10 | Complete 10 orders |
| ORDER_25 | Order | 25 | Complete 25 orders |
| ORDER_50 | Order | 50 | Complete 50 orders |
| ORDER_100 | Order | 100 | Complete 100 orders |
| SPEND_1K | Spending | 1000 | Spend ₹1,000 |
| SPEND_5K | Spending | 5000 | Spend ₹5,000 |
| SPEND_10K | Spending | 10000 | Spend ₹10,000 |
| SPEND_25K | Spending | 25000 | Spend ₹25,000 |
| SPEND_50K | Spending | 50000 | Spend ₹50,000 |
| SPEND_100K | Spending | 100000 | Spend ₹100,000 |
| FIRST_REVIEW | Review | 1 | Submit first review |
| REVIEW_10 | Review | 10 | Submit 10 reviews |
| REVIEW_25 | Review | 25 | Submit 25 reviews |
| REVIEW_50 | Review | 50 | Submit 50 reviews |
| VIDEO_1 | Video | 1 | Upload first video |
| VIDEO_10 | Video | 10 | Upload 10 videos |

---

## Benefits

✅ **Automatic Recalculation** - Achievements update without manual intervention
✅ **Activity Feed Integration** - Unlocked badges appear in activity timeline
✅ **Silent Failures** - Won't disrupt user experience if recalculation fails
✅ **Performance Optimized** - Throttled triggers for small transactions
✅ **Type Safe** - Full TypeScript support
✅ **Easy Testing** - Manual trigger functions for debugging

---

**Status**: Achievement trigger system fully integrated with enhanced services. Achievements automatically recalculate when users perform milestone-worthy actions.