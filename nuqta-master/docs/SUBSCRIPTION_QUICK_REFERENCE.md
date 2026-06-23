# Subscription Components - Quick Reference

Quick copy-paste examples for common use cases.

## 1. Display Plan Cards (Planning Page)

```typescript
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import PlanCard from '@/components/subscription/PlanCard';
import { useRouter } from 'expo-router';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    icon: 'person-outline',
    features: ['Basic cashback', 'Access to all stores', 'Email support'],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: 99,
    yearlyPrice: 950,
    icon: 'star',
    features: ['2x cashback', 'Free delivery (₹500+)', 'Priority support', 'Exclusive deals'],
    popular: true,
  },
  {
    tier: 'vip',
    name: 'VIP',
    price: 299,
    yearlyPrice: 2850,
    icon: 'diamond',
    features: ['3x cashback', 'Free delivery (all)', 'Concierge service', 'Premium events'],
  },
];

export default function PlansPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const currentTier = 'free'; // Get from context

  const handleSubscribe = async (tier) => {
    setIsLoading(true);
    try {
      // Handle subscription logic
      router.push('/subscription/payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView>
      {PLANS.map(plan => (
        <PlanCard
          key={plan.tier}
          tier={plan.tier}
          name={plan.name}
          price={plan.price}
          yearlyPrice={plan.yearlyPrice}
          icon={plan.icon}
          features={plan.features}
          isCurrentPlan={currentTier === plan.tier}
          isMostPopular={plan.popular}
          billingCycle={billingCycle}
          isLoading={isLoading && currentTier === plan.tier}
          onSubscribe={() => handleSubscribe(plan.tier)}
        />
      ))}
    </ScrollView>
  );
}
```

---

## 2. Show ROI to User

```typescript
import ROICalculator from '@/components/subscription/ROICalculator';

export default function SubscriptionStats() {
  const stats = {
    subscriptionCost: 99, // Monthly cost
    totalSavings: 500,    // Actual savings this month
  };

  return (
    <View>
      <ROICalculator
        subscriptionCost={stats.subscriptionCost}
        totalSavings={stats.totalSavings}
        showDetails={true}
        currency="₹"
      />
    </View>
  );
}
```

---

## 3. Payment Method Selection

```typescript
import { useState } from 'react';
import PaymentMethodSelector from '@/components/subscription/PaymentMethodSelector';

export default function CheckoutPage() {
  const [selectedPayment, setSelectedPayment] = useState('');

  const paymentMethods = [
    {
      id: 'card_1',
      type: 'card',
      displayName: 'Visa ending in 4242',
      icon: 'card-outline',
      lastFour: '4242',
      isDefault: true,
    },
    {
      id: 'upi_1',
      type: 'upi',
      displayName: 'user@okhdfcbank',
      icon: 'phone-portrait-outline',
    },
  ];

  return (
    <PaymentMethodSelector
      methods={paymentMethods}
      selectedId={selectedPayment}
      onSelect={setSelectedPayment}
      onAddNew={() => {
        // Navigate to add payment form
      }}
      allowAddNew={true}
      title="Select Payment Method"
    />
  );
}
```

---

## 4. Show Benefits Comparison

```typescript
import { useState } from 'react';
import BenefitsModal from '@/components/subscription/BenefitsModal';
import { TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

export default function SubscriptionPage() {
  const [showBenefits, setShowBenefits] = useState(false);
  const currentTier = 'premium';

  return (
    <>
      <TouchableOpacity onPress={() => setShowBenefits(true)}>
        <ThemedText>View All Benefits</ThemedText>
      </TouchableOpacity>

      <BenefitsModal
        visible={showBenefits}
        tier={currentTier}
        onClose={() => setShowBenefits(false)}
        onUpgrade={() => {
          setShowBenefits(false);
          // Navigate to upgrade
        }}
      />
    </>
  );
}
```

---

## 5. Trial Countdown Banner

```typescript
import TrialBanner from '@/components/subscription/TrialBanner';

export default function HomePage() {
  const subscription = {
    tier: 'premium',
    trialEndsIn: 5, // days
  };

  return (
    <TrialBanner
      daysRemaining={subscription.trialEndsIn}
      tier={subscription.tier}
      onUpgrade={() => {
        // Navigate to subscription plans
      }}
      onDismiss={() => {
        // Handle dismissal if needed
      }}
      showBenefit={true}
    />
  );
}
```

---

## 6. Upgrade Recommendation Banner

```typescript
import UpgradeBanner from '@/components/subscription/UpgradeBanner';

export default function HomePage() {
  const userTier = 'free'; // or 'premium'

  return (
    <UpgradeBanner
      currentTier={userTier}
      onUpgrade={() => {
        // Navigate to plans
      }}
      dismissible={true}
    />
  );
}
```

---

## Common Patterns

### Pattern 1: Complete Subscription Status Page

```typescript
import { ScrollView, View } from 'react-native';
import UpgradeBanner from '@/components/subscription/UpgradeBanner';
import TrialBanner from '@/components/subscription/TrialBanner';
import ROICalculator from '@/components/subscription/ROICalculator';
import PaymentMethodSelector from '@/components/subscription/PaymentMethodSelector';
import BenefitsModal from '@/components/subscription/BenefitsModal';

export default function SubscriptionStatus() {
  const [showBenefits, setShowBenefits] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');

  // Mock data - replace with actual context/API
  const subscription = {
    tier: 'premium',
    isInTrial: true,
    trialDaysLeft: 10,
    monthlyPrice: 99,
    stats: {
      totalSavings: 450,
      ordersThisMonth: 12,
    },
  };

  const paymentMethods = [/* ... */];

  return (
    <ScrollView>
      {/* Show upgrade path for free users */}
      {subscription.tier === 'free' && (
        <UpgradeBanner
          currentTier="free"
          onUpgrade={() => router.push('/subscription/plans')}
        />
      )}

      {/* Show trial countdown if in trial */}
      {subscription.isInTrial && (
        <TrialBanner
          daysRemaining={subscription.trialDaysLeft}
          tier={subscription.tier}
          onUpgrade={() => router.push('/subscription/plans')}
        />
      )}

      {/* Show ROI for paid tiers */}
      {subscription.tier !== 'free' && (
        <ROICalculator
          subscriptionCost={subscription.monthlyPrice}
          totalSavings={subscription.stats.totalSavings}
        />
      )}

      {/* Payment method selection */}
      {subscription.tier !== 'free' && (
        <PaymentMethodSelector
          methods={paymentMethods}
          selectedId={selectedPayment}
          onSelect={setSelectedPayment}
        />
      )}

      {/* Expandable benefits comparison */}
      <TouchableOpacity onPress={() => setShowBenefits(true)}>
        <ThemedText>View All Benefits</ThemedText>
      </TouchableOpacity>

      <BenefitsModal
        visible={showBenefits}
        tier={subscription.tier}
        onClose={() => setShowBenefits(false)}
      />
    </ScrollView>
  );
}
```

### Pattern 2: Plan Selection Wizard

```typescript
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import PlanCard from '@/components/subscription/PlanCard';
import PricingToggle from '@/components/subscription/PricingToggle';

export default function SelectPlanPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const PLAN_DATA = [
    {
      tier: 'premium',
      name: 'Premium',
      pricing: { monthly: 99, yearly: 950 },
      features: [/* ... */],
      popular: true,
    },
    {
      tier: 'vip',
      name: 'VIP',
      pricing: { monthly: 299, yearly: 2850 },
      features: [/* ... */],
    },
  ];

  return (
    <ScrollView>
      {/* Toggle between monthly and yearly */}
      <PricingToggle
        selected={billingCycle}
        onSelect={setBillingCycle}
      />

      {/* Plan cards */}
      {PLAN_DATA.map(plan => (
        <PlanCard
          key={plan.tier}
          tier={plan.tier}
          name={plan.name}
          price={plan.pricing[billingCycle]}
          yearlyPrice={plan.pricing.yearly}
          billingCycle={billingCycle}
          isMostPopular={plan.popular}
          features={plan.features}
          onSubscribe={() => {
            setSelectedPlan(plan.tier);
            // Proceed to payment
          }}
        />
      ))}
    </ScrollView>
  );
}
```

---

## TypeScript Types Reference

```typescript
// From /types/subscription.types.ts

type SubscriptionTier = 'free' | 'premium' | 'vip';
type BillingCycle = 'monthly' | 'yearly';

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  displayName: string;
  icon: string;
  lastFour?: string;
  isDefault?: boolean;
  bankName?: string;
}
```

---

## Styling Customization

All components use values from `/styles/subscriptionStyles.ts`:

```typescript
// Override colors if needed
const CUSTOM_COLORS = {
  ...SUBSCRIPTION_COLORS,
  purple: '#7C3AED', // Custom purple
};

// Apply in components
<View style={{ backgroundColor: CUSTOM_COLORS.purple }} />
```

---

## State Management Pattern

```typescript
// Using Context for subscription state
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function MyComponent() {
  const { state, actions } = useSubscription();

  const { currentSubscription, isLoading } = state;
  const { loadSubscription, upgradeSubscription } = actions;

  // Use in components
  return (
    <PlanCard
      isCurrentPlan={currentSubscription?.tier === 'premium'}
      isLoading={isLoading}
      onSubscribe={() => upgradeSubscription('vip')}
    />
  );
}
```

---

## Error Handling Pattern

```typescript
import { Alert } from 'react-native';

const handleSubscribe = async (tier) => {
  try {
    setIsLoading(true);
    const result = await subscriptionAPI.subscribeToPlan(tier, billingCycle);
    // Handle success
  } catch (error) {
    Alert.alert(
      'Subscription Failed',
      error.message || 'Please try again later'
    );
  } finally {
    setIsLoading(false);
  }
};
```

---

## Performance Tips

1. **Memoization**: Wrap components in React.memo() if passing stable props
2. **Lazy Loading**: Use React.lazy() for modal components not immediately visible
3. **Animation Optimization**: useNativeDriver is enabled where applicable
4. **List Performance**: Use FlatList for payment methods if > 5 items

---

## Accessibility

All components follow WCAG 2.1 guidelines:
- Proper contrast ratios
- Descriptive touch targets (min 44x44 pts)
- Semantic hierarchy with ThemedText variants
- Support for native accessibility features

---

## Browser/Platform Support

- iOS: iOS 12+
- Android: Android 8.0+
- Web: Modern browsers (Chrome, Firefox, Safari)
- React Native: 0.71+
- Expo: SDK 48+

