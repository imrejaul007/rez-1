# Phase 3 Integration - Quick Start Guide

**5-Minute Setup for Developers**

---

## 1. Install Providers (2 minutes)

Update `app/_layout.tsx`:

```typescript
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import AchievementToastManager from '@/components/gamification/AchievementToastManager';
import ReferralHandler from '@/utils/referralHandler';

export default function RootLayout() {
  // Deep linking setup
  useEffect(() => {
    const cleanup = ReferralHandler.initializeDeepLinking((code) => {
      console.log('Referral code detected:', code);
    });
    return cleanup;
  }, []);

  // Linking configuration
  const linking = {
    prefixes: ['rezapp://', 'https://rez.app'],
    config: {
      screens: {
        'referral': 'ref/:code',
        'onboarding/registration': 'join/:code',
      },
    },
  };

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <GamificationProvider>
          <NavigationContainer linking={linking}>
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

## 2. Use in Checkout (1 minute)

Update `app/checkout.tsx`:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function CheckoutPage() {
  const { computed } = useSubscription();

  // Use subscription benefits
  const cashback = totalAmount * 0.10 * computed.cashbackMultiplier; // 1x, 2x, or 3x
  const deliveryFee = computed.hasFreeDelivery ? 0 : 50;

  return (
    <View>
      {/* Show tier badge */}
      {computed.isPremium && <Text>Premium Member - 2x Cashback!</Text>}
      {computed.isVIP && <Text>VIP Member - 3x Cashback!</Text>}

      {/* Show benefits */}
      <Text>Cashback: ₹{cashback}</Text>
      <Text>Delivery: {computed.hasFreeDelivery ? 'FREE' : `₹${deliveryFee}`}</Text>

      {/* Upgrade CTA for free users */}
      {!computed.isSubscribed && (
        <TouchableOpacity onPress={() => router.push('/subscription')}>
          <Text>Upgrade to Premium for 2x Cashback!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

## 3. Add Gamification Triggers (2 minutes)

Update `services/ordersApi.ts`:

```typescript
import gamificationTriggerService from './gamificationTriggerService';

async placeOrder(orderData: any): Promise<any> {
  // Place order
  const response = await apiClient.post('/orders', orderData);

  if (response.data.success) {
    const order = response.data.data;

    // Trigger gamification (non-blocking)
    try {
      const rewards = await gamificationTriggerService.onOrderPlaced(
        order._id,
        order.totalAmount,
        order.items
      );

      console.log('Gamification rewards:', rewards);
      // Rewards are automatically shown via toasts
    } catch (error) {
      console.error('Gamification trigger failed:', error);
      // Order still succeeds even if gamification fails
    }
  }

  return response.data;
}
```

Update `app/ReviewPage.tsx`:

```typescript
import gamificationTriggerService from '@/services/gamificationTriggerService';

const handleSubmit = async () => {
  const response = await reviewApi.submitReview({ productId, rating, comment });

  if (response.success) {
    // Trigger gamification
    const rewards = await gamificationTriggerService.onReviewSubmitted(
      response.data.reviewId,
      rating,
      productId
    );

    Alert.alert(
      'Review Submitted!',
      `Thank you! You earned ${rewards.coins} coins.`,
      [{ text: 'OK' }]
    );
  }
};
```

---

## 4. Test It (30 seconds)

```bash
npm start
```

1. Login to app
2. Navigate to checkout
3. Verify subscription tier shown
4. Complete order
5. Achievement toast appears
6. Coins added to balance

**Done!** 🎉

---

## Common Use Cases

### Get Subscription Data
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

const { state, computed } = useSubscription();

// Current subscription
console.log(state.currentSubscription?.tier); // 'free', 'premium', or 'vip'

// Computed values
console.log(computed.cashbackMultiplier); // 1, 2, or 3
console.log(computed.hasFreeDelivery); // true/false
console.log(computed.isPremium); // true/false
console.log(computed.isVIP); // true/false
console.log(computed.daysRemaining); // number
```

### Award Coins
```typescript
import { useGamification } from '@/contexts/GamificationContext';

const { actions } = useGamification();

await actions.awardCoins(50, 'Review Submission');
```

### Trigger Achievements
```typescript
const rewards = await gamificationTriggerService.onOrderPlaced(
  orderId,
  orderValue,
  items
);

console.log(rewards);
// { coins: 100, achievements: [...], challenges: [...] }
```

### Handle Referral Code
```typescript
import ReferralHandler from '@/utils/referralHandler';

// Get stored referral code
const referralData = await ReferralHandler.getStoredReferralCode();
if (referralData) {
  console.log('Referral code:', referralData.code);
}

// Clear after attribution
await ReferralHandler.clearReferralCode();
```

---

## Feature Flags

Disable features if needed:

**Subscription:**
```typescript
// contexts/SubscriptionContext.tsx
const FEATURE_FLAGS = {
  ENABLE_SUBSCRIPTIONS: false, // Disable all subscription features
  ENABLE_CASHBACK_MULTIPLIER: false, // Disable multiplier only
};
```

**Gamification:**
```typescript
// contexts/GamificationContext.tsx
const GAMIFICATION_FLAGS = {
  ENABLE_ACHIEVEMENTS: false, // Disable achievements
  ENABLE_COINS: false, // Disable coin rewards
  ENABLE_NOTIFICATIONS: false, // Disable toasts
};
```

---

## Troubleshooting

### Issue: Subscription data not loading
**Solution:** Check API connection and auth token
```typescript
const { state } = useSubscription();
console.log('Error:', state.error);
console.log('Loading:', state.isLoading);
```

### Issue: Achievement toasts not showing
**Solution:** Verify `AchievementToastManager` is in `_layout.tsx`
```typescript
// Must be inside GamificationProvider
<GamificationProvider>
  <NavigationContainer>...</NavigationContainer>
  <AchievementToastManager /> {/* Add this */}
</GamificationProvider>
```

### Issue: Referral links not working
**Solution:** Check linking configuration and URL format
```typescript
// Test URL parsing
const code = ReferralHandler.parseReferralFromUrl('rezapp://ref/ABC123');
console.log('Parsed code:', code); // Should be 'ABC123'
```

---

## Full Documentation

- **Integration Guide:** `PHASE3_INTEGRATION_GUIDE.md` (detailed examples)
- **E2E Testing:** `scripts/e2e-test-checklist.md` (test cases)
- **Summary:** `PHASE3_INTEGRATION_SUMMARY.md` (overview)

---

## Support

**Questions?** Contact Team 3 or check:
- Slack: #phase3-integration
- Documentation: `/docs` folder
- API Docs: Backend documentation

---

**That's it!** You're ready to use Phase 3 features. 🚀
