# Phase 3 Integration Guide - REZ App

## Overview
This guide documents the integration of Phase 3 features (Subscriptions, Gamification, Referrals, Bill Upload) into existing user flows.

## Created Files & Components

### 1. Context Providers
- `contexts/SubscriptionContext.tsx` - Manages subscription state with caching and feature flags
- `contexts/GamificationContext.tsx` - Manages achievements, coins, challenges, and streaks

### 2. Components
- `components/gamification/AchievementToast.tsx` - Toast notification for achievement unlocks
- `components/gamification/AchievementToastManager.tsx` - Global manager for achievement toasts

### 3. Services
- `services/gamificationTriggerService.ts` - Centralized gamification event triggers
- `services/subscriptionApi.ts` - (Already exists) Subscription API calls

### 4. Utilities
- `utils/referralHandler.ts` - Deep linking and referral code management

---

## Integration Points

### 1. Subscription Benefits Integration

#### A. Checkout Flow (`app/checkout.tsx`)

**Implementation:**
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function CheckoutPage() {
  const { computed: subscription } = useSubscription();
  const { cashbackMultiplier, hasFreeDelivery, isPremium, isVIP } = subscription;

  // Calculate tier-based cashback
  const calculateCashback = () => {
    const baseCashback = totalAmount * 0.10; // 10% base
    return baseCashback * cashbackMultiplier; // 1x, 2x, or 3x
  };

  // Apply delivery fee
  const deliveryFee = hasFreeDelivery ? 0 : 50;

  return (
    <View>
      {/* Show tier badge */}
      {isPremium && <TierBadge tier="Premium" />}
      {isVIP && <TierBadge tier="VIP" />}

      {/* Show cashback multiplier */}
      <Text>Cashback: {cashbackMultiplier}x (₹{calculateCashback()})</Text>

      {/* Show free delivery indicator */}
      {hasFreeDelivery && <Text>FREE Delivery (Premium Benefit)</Text>}

      {/* Upgrade CTA for free users */}
      {!isPremium && !isVIP && (
        <TouchableOpacity onPress={() => router.push('/subscription')}>
          <Text>Upgrade to Premium for 2x Cashback!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

**Key Changes:**
- Import `useSubscription` hook
- Calculate cashback based on `cashbackMultiplier` (1x/2x/3x)
- Apply free delivery for Premium/VIP tiers
- Show upgrade CTA for free tier users

---

#### B. Profile Page (`app/profile/index.tsx`)

**Implementation:**
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function ProfilePage() {
  const { state, computed } = useSubscription();
  const { currentSubscription } = state;
  const { isPremium, isVIP, daysRemaining } = computed;

  return (
    <View>
      {/* Subscription Tier Card */}
      <TouchableOpacity
        style={styles.subscriptionCard}
        onPress={() => router.push('/subscription/manage')}
      >
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>
            {isVIP ? 'VIP' : isPremium ? 'Premium' : 'Free'}
          </Text>
        </View>

        <View style={styles.tierDetails}>
          <Text style={styles.tierTitle}>
            {currentSubscription?.tier.toUpperCase()} Member
          </Text>

          {(isPremium || isVIP) && (
            <Text style={styles.expiryText}>
              {daysRemaining} days remaining
            </Text>
          )}

          {/* Benefits Summary */}
          <View style={styles.benefitsList}>
            <BenefitItem
              icon="flash"
              text={`${computed.cashbackMultiplier}x Cashback`}
            />
            {computed.hasFreeDelivery && (
              <BenefitItem icon="car" text="FREE Delivery" />
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} />
      </TouchableOpacity>

      {/* Manage Subscription Button */}
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => router.push('/subscription/manage')}
      >
        <Text>Manage Subscription</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

#### C. Wallet Page (`app/WalletScreen.tsx`)

**Implementation:**
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function WalletScreen() {
  const { computed: subscription } = useSubscription();
  const { cashbackMultiplier, isPremium, isVIP } = subscription;

  return (
    <View>
      {/* Cashback Multiplier Card */}
      <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.multiplierCard}>
        <Text style={styles.multiplierTitle}>Your Cashback Rate</Text>
        <Text style={styles.multiplierValue}>{cashbackMultiplier}x</Text>
        <Text style={styles.multiplierDesc}>
          {isPremium ? 'Premium Member Bonus' : isVIP ? 'VIP Elite Bonus' : 'Standard Rate'}
        </Text>
      </LinearGradient>

      {/* Premium Benefits Banner (for free users) */}
      {!isPremium && !isVIP && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => router.push('/subscription')}
        >
          <Ionicons name="star" size={24} color="#FFD700" />
          <View style={styles.upgradeText}>
            <Text style={styles.upgradeTitle}>Unlock 2x Cashback</Text>
            <Text style={styles.upgradeSubtitle}>Upgrade to Premium</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Subscription Earnings Track (separate section) */}
      <View style={styles.earningsSection}>
        <Text style={styles.sectionTitle}>Subscription Savings</Text>
        <Text style={styles.savingsAmount}>
          ₹{subscriptionCashbackEarned} this month
        </Text>
      </View>
    </View>
  );
}
```

---

#### D. Cart Page (`app/CartPage.tsx`)

**Implementation:**
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function CartPage() {
  const { computed: subscription } = useSubscription();
  const { cashbackMultiplier, hasFreeDelivery } = subscription;

  const deliveryFee = hasFreeDelivery ? 0 : 50;
  const estimatedCashback = calculateTotal() * 0.10 * cashbackMultiplier;

  return (
    <View>
      {/* Price Summary */}
      <View style={styles.priceSection}>
        <PriceRow label="Subtotal" value={subtotal} />

        <PriceRow
          label="Delivery Fee"
          value={deliveryFee}
          strikethrough={hasFreeDelivery}
        />
        {hasFreeDelivery && (
          <Text style={styles.freeBadge}>FREE (Premium)</Text>
        )}

        <PriceRow
          label={`Cashback (${cashbackMultiplier}x)`}
          value={estimatedCashback}
          highlight
        />

        <Divider />
        <PriceRow label="Total" value={total} bold />
      </View>
    </View>
  );
}
```

---

### 2. Gamification Triggers

#### A. Order Placement (`services/ordersApi.ts`)

**Implementation:**
```typescript
import gamificationTriggerService from './gamificationTriggerService';

async placeOrder(orderData: any): Promise<any> {
  try {
    const response = await apiClient.post('/orders', orderData);

    if (response.data.success) {
      const order = response.data.data;

      // Trigger gamification events
      const rewards = await gamificationTriggerService.onOrderPlaced(
        order._id,
        order.totalAmount,
        order.items
      );

      // Log rewards for debugging
      console.log('[ORDER] Gamification rewards:', rewards);

      // Rewards will be shown via GamificationContext
      // Achievements -> Toast notifications
      // Coins -> Updated in user balance

      return response.data;
    }
  } catch (error) {
    console.error('[ORDER] Failed to place order:', error);
    throw error;
  }
}
```

---

#### B. Review Submission (`app/ReviewPage.tsx`)

**Implementation:**
```typescript
import { useGamification } from '@/contexts/GamificationContext';
import gamificationTriggerService from '@/services/gamificationTriggerService';

export default function ReviewPage() {
  const { actions } = useGamification();

  const handleSubmitReview = async () => {
    try {
      // Submit review to API
      const response = await reviewApi.submitReview({
        productId,
        rating,
        comment,
      });

      if (response.success) {
        // Trigger gamification
        const rewards = await gamificationTriggerService.onReviewSubmitted(
          response.data.reviewId,
          rating,
          productId
        );

        // Award coins
        if (rewards.coins > 0) {
          await actions.awardCoins(rewards.coins, 'Review Submission');
        }

        // Show success message with coins earned
        Alert.alert(
          'Review Submitted!',
          `Thank you! You earned ${rewards.coins} coins.`,
          [{ text: 'OK' }]
        );

        // Navigate back
        router.back();
      }
    } catch (error) {
      console.error('[REVIEW] Failed to submit:', error);
    }
  };

  return (
    <View>
      {/* Review Form */}
      <TouchableOpacity onPress={handleSubmitReview}>
        <Text>Submit Review (Earn 50 Coins)</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

#### C. Referral Success (`app/referral.tsx`)

**Implementation:**
```typescript
import { useGamification } from '@/contexts/GamificationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import gamificationTriggerService from '@/services/gamificationTriggerService';

export default function ReferralPage() {
  const { actions: gamificationActions } = useGamification();
  const { state: subscriptionState } = useSubscription();

  // Listen for referral success events (via WebSocket or polling)
  useEffect(() => {
    const handleReferralSuccess = async (data: any) => {
      const { refereeId, referralTier } = data;

      // Trigger gamification
      const rewards = await gamificationTriggerService.onReferralSuccess(
        userId,
        refereeId,
        referralTier
      );

      // Award tier-based coins
      if (rewards.coins > 0) {
        await gamificationActions.awardCoins(
          rewards.coins,
          `Referral Success (${referralTier})`
        );

        // Show celebration animation
        setShowCelebration(true);
      }

      // Check for tier upgrade eligibility
      if (rewards.tierProgress) {
        // Show tier upgrade prompt
        setShowTierUpgrade(true);
      }
    };

    // Subscribe to referral events
    // TODO: Implement WebSocket/polling subscription
  }, []);

  return (
    <View>
      {/* Referral Stats */}
      <View style={styles.statsCard}>
        <Text>Tier-Based Rewards:</Text>
        <Text>Free Tier: 100 coins</Text>
        <Text>Premium: 200 coins</Text>
        <Text>VIP: 500 coins</Text>
      </View>
    </View>
  );
}
```

---

#### D. Daily Login Streak (`app/_layout.tsx`)

**Implementation:**
```typescript
import { useGamification } from '@/contexts/GamificationContext';
import { useEffect } from 'react';

export default function RootLayout() {
  const { actions } = useGamification();

  useEffect(() => {
    // Update daily streak on app launch
    const initializeApp = async () => {
      try {
        // This will automatically award login coins and check achievements
        await actions.updateDailyStreak();
      } catch (error) {
        console.error('[APP] Failed to update daily streak:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <SubscriptionProvider>
      <GamificationProvider>
        <Stack>
          {/* App screens */}
          <AchievementToastManager />
        </Stack>
      </GamificationProvider>
    </SubscriptionProvider>
  );
}
```

---

### 3. Deep Linking Configuration

#### Implementation in `app/_layout.tsx`:

```typescript
import ReferralHandler from '@/utils/referralHandler';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    // Initialize deep linking
    const cleanup = ReferralHandler.initializeDeepLinking((code) => {
      console.log('[APP] Referral code detected:', code);

      // Show welcome message
      Alert.alert(
        'Welcome!',
        `You've been referred by a friend. Use code ${code} during signup to get bonus rewards!`,
        [{ text: 'OK' }]
      );
    });

    return cleanup;
  }, []);

  // Configure linking config
  const linking = {
    prefixes: ['rezapp://', 'https://rez.app'],
    config: {
      screens: {
        'referral': 'ref/:code',
        'onboarding/registration': 'join/:code',
        'checkout': 'checkout',
        'product/[id]': 'product/:id',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      {/* App navigation */}
    </NavigationContainer>
  );
}
```

---

### 4. Bill Upload Page

**Create:** `app/bill-upload.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useGamification } from '@/contexts/GamificationContext';
import gamificationTriggerService from '@/services/gamificationTriggerService';

export default function BillUploadPage() {
  const [billImage, setBillImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { actions } = useGamification();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setBillImage(result.assets[0].uri);
    }
  };

  const uploadBill = async () => {
    if (!billImage) return;

    setUploading(true);
    try {
      // Upload bill to backend
      const response = await billApi.uploadBill(billImage);

      if (response.success && response.data.verified) {
        // Trigger gamification
        const rewards = await gamificationTriggerService.onBillUploaded(
          response.data.billId,
          response.data.amount,
          true
        );

        // Award coins
        if (rewards.coins > 0) {
          await actions.awardCoins(rewards.coins, 'Bill Upload');
        }

        // Calculate cashback
        const cashback = response.data.amount * 0.05; // 5% cashback

        Alert.alert(
          'Bill Verified!',
          `You earned ${rewards.coins} coins and ₹${cashback} cashback!`,
          [{ text: 'Great!' }]
        );

        // Navigate back
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload bill');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Your Bill</Text>
      <Text style={styles.subtitle}>Earn 100 coins + 5% cashback</Text>

      {billImage ? (
        <Image source={{ uri: billImage }} style={styles.preview} />
      ) : (
        <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
          <Ionicons name="camera" size={40} color="#8B5CF6" />
          <Text>Select Bill Image</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.uploadButton, !billImage && styles.disabled]}
        onPress={uploadBill}
        disabled={!billImage || uploading}
      >
        <Text style={styles.uploadText}>
          {uploading ? 'Uploading...' : 'Upload & Verify'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Provider Setup

**Update** `app/_layout.tsx`:

```typescript
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import AchievementToastManager from '@/components/gamification/AchievementToastManager';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <GamificationProvider>
          <NavigationContainer>
            <Stack>
              {/* Your screens */}
            </Stack>

            {/* Global Achievement Toast Manager */}
            <AchievementToastManager />
          </NavigationContainer>
        </GamificationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
```

---

## Feature Flags

All Phase 3 features support feature flags for gradual rollout:

**Subscription Flags** (`contexts/SubscriptionContext.tsx`):
```typescript
const FEATURE_FLAGS = {
  ENABLE_SUBSCRIPTIONS: true,
  ENABLE_TIER_BENEFITS: true,
  ENABLE_CASHBACK_MULTIPLIER: true,
  ENABLE_FREE_DELIVERY: true,
};
```

**Gamification Flags** (`contexts/GamificationContext.tsx`):
```typescript
const GAMIFICATION_FLAGS = {
  ENABLE_ACHIEVEMENTS: true,
  ENABLE_COINS: true,
  ENABLE_CHALLENGES: true,
  ENABLE_LEADERBOARD: true,
  ENABLE_NOTIFICATIONS: true,
};
```

---

## Error Handling & Graceful Degradation

Both contexts implement graceful degradation:

1. **Subscription Context**: Falls back to free tier if API fails
2. **Gamification Context**: Continues without rewards if trigger fails
3. **All integrations**: Work without Phase 3 features enabled

Example:
```typescript
const cashbackMultiplier = subscription.computed?.cashbackMultiplier || 1;
// Always works, defaults to 1x if subscription is unavailable
```

---

## Testing Integration

See `E2E_TEST_CHECKLIST.md` for comprehensive testing guide.

---

## Performance Considerations

1. **Caching**: Both contexts cache data for 5-10 minutes
2. **Lazy Loading**: Gamification data loads on demand
3. **Async Triggers**: Gamification triggers don't block UI
4. **Feature Flags**: Disable features to improve performance if needed

---

## Next Steps

1. Test all integration points in development
2. Enable feature flags gradually in production
3. Monitor analytics for adoption rates
4. Collect user feedback on new features
5. Iterate based on data and feedback

---

## Support

For questions or issues, contact Team 3 or refer to:
- Backend API documentation
- Phase 3 specification documents
- Team Slack channel: #phase3-integration
