# Subscription Components Extraction Guide

This document outlines the 6 reusable subscription components that have been successfully extracted and refactored from existing pages.

## Overview

All components are located in `/components/subscription/` and follow the established design system with the purple-pink gradient theme.

### Key Features:
- Proper TypeScript typing with comprehensive interfaces
- Consistent styling using centralized `subscriptionStyles.ts`
- Responsive design supporting different screen sizes
- Loading and error states handled appropriately
- No hard-coded values - fully configurable via props

---

## Component 1: PlanCard.tsx

**Purpose**: Display individual subscription plan with pricing, features, and CTA button

**Location**: `/components/subscription/PlanCard.tsx`

### Props Interface:
```typescript
interface PlanCardProps {
  tier: SubscriptionTier;
  name: string;
  price: number;
  yearlyPrice: number;
  icon: string;
  features: string[];
  isCurrentPlan: boolean;
  isMostPopular?: boolean;
  onSubscribe: () => void;
  discount?: number;
  billingCycle: BillingCycle;
  isLoading?: boolean;
  disabled?: boolean;
}
```

### Key Features:
- Tier-based gradient header with icon and tier name
- Dynamic pricing display (monthly/yearly conversion)
- Savings percentage display for yearly plans
- Feature checklist with icons
- Discount badge support
- Multiple button states (Active, Current Plan, Free, Upgrade)
- Loading state with ActivityIndicator

### Usage Example:
```typescript
import PlanCard from '@/components/subscription/PlanCard';

<PlanCard
  tier="premium"
  name="Premium"
  price={99}
  yearlyPrice={950}
  icon="star"
  features={[
    '2x cashback on all orders',
    'Free delivery on orders above ₹500',
    'Priority customer support',
  ]}
  isCurrentPlan={currentTier === 'premium'}
  isMostPopular={true}
  billingCycle="monthly"
  discount={10}
  onSubscribe={handleSubscribe}
/>
```

---

## Component 2: ROICalculator.tsx

**Purpose**: Display return on investment calculations for subscription

**Location**: `/components/subscription/ROICalculator.tsx`

### Props Interface:
```typescript
interface ROICalculatorProps {
  subscriptionCost: number;
  totalSavings: number;
  showDetails?: boolean;
  currency?: string;
}
```

### Key Features:
- Visual progress bar showing ROI percentage
- Net savings calculation (positive/negative color coding)
- Break-even period indicator
- Monthly average savings display
- Annual subscription cost calculation
- Expandable details section
- Color-coded metrics (green for positive, red for negative)

### Usage Example:
```typescript
import ROICalculator from '@/components/subscription/ROICalculator';

<ROICalculator
  subscriptionCost={99}
  totalSavings={500}
  showDetails={true}
  currency="₹"
/>
```

### What it Displays:
- Subscription Cost vs Total Savings comparison
- Progress bar with percentage to target
- Net Savings badge with ROI percentage
- Expandable: Break-even months, Monthly average savings, Annual cost

---

## Component 3: PaymentMethodSelector.tsx

**Purpose**: Allow users to select and manage payment methods

**Location**: `/components/subscription/PaymentMethodSelector.tsx`

### Props Interface:
```typescript
interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  displayName: string;
  icon: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  bankName?: string;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew?: () => void;
  allowAddNew?: boolean;
  title?: string;
}
```

### Key Features:
- Beautiful selected payment display with icon and details
- Modal-based selection interface
- Support for 4 payment types: Card, UPI, Net Banking, Wallet
- Default method badge
- Radio button selection
- Empty state handling
- Add new payment method button
- Automatic icon mapping for payment types

### Usage Example:
```typescript
import PaymentMethodSelector from '@/components/subscription/PaymentMethodSelector';

const [selectedPaymentId, setSelectedPaymentId] = useState('');

<PaymentMethodSelector
  methods={[
    {
      id: '1',
      type: 'card',
      displayName: 'Visa ending in 4242',
      icon: 'card-outline',
      lastFour: '4242',
      isDefault: true,
    },
    {
      id: '2',
      type: 'upi',
      displayName: 'user@okhdfcbank',
      icon: 'phone-portrait-outline',
    },
  ]}
  selectedId={selectedPaymentId}
  onSelect={setSelectedPaymentId}
  onAddNew={() => router.push('/add-payment')}
  allowAddNew={true}
  title="Select Payment Method"
/>
```

---

## Component 4: BenefitsModal.tsx

**Purpose**: Show detailed tier benefits comparison in a modal

**Location**: `/components/subscription/BenefitsModal.tsx`

### Props Interface:
```typescript
interface BenefitsModalProps {
  visible: boolean;
  tier?: SubscriptionTier;
  onClose: () => void;
  onUpgrade?: () => void;
}
```

### Key Features:
- Full-screen modal with gradient header
- Three-column tier comparison table (Free, Premium, VIP)
- 9 predefined benefit categories with icons
- Check/close indicators for each tier
- Feature comparison with descriptions
- Tier-specific upgrade CTA button
- Close button in header and footer
- Scrollable benefits list

### Benefit Categories:
1. Cashback Rate
2. Free Delivery
3. Priority Support
4. Exclusive Deals
5. Unlimited Wishlists
6. Early Flash Sales
7. Personal Shopper
8. Concierge Service
9. Premium Events

### Usage Example:
```typescript
import BenefitsModal from '@/components/subscription/BenefitsModal';

const [showBenefitsModal, setShowBenefitsModal] = useState(false);

<BenefitsModal
  visible={showBenefitsModal}
  tier="premium"
  onClose={() => setShowBenefitsModal(false)}
  onUpgrade={() => {
    setShowBenefitsModal(false);
    router.push('/subscription/plans');
  }}
/>
```

---

## Component 5: TrialBanner.tsx

**Purpose**: Display trial countdown and encourage upgrade

**Location**: `/components/subscription/TrialBanner.tsx`

### Props Interface:
```typescript
interface TrialBannerProps {
  daysRemaining: number;
  tier: SubscriptionTier;
  onUpgrade: () => void;
  onDismiss?: () => void;
  showBenefit?: boolean;
}
```

### Key Features:
- Animated entrance with fade and slide effects
- Countdown display with day counter
- Tier-specific gradient backgrounds
- Urgency indicator (changes color on last day)
- Benefit reminder list
- Dismissible with AsyncStorage persistence
- Auto-dismiss when trial expires
- Progress bar showing time remaining
- Special warning message on last day
- Different icons (timer vs alert) based on urgency

### Trial Benefits (Tier-Specific):
- **Free**: Basic cashback, access to all stores, email support
- **Premium**: 2x Cashback, Free delivery, Priority support
- **VIP**: 3x Cashback, Free delivery, Concierge service

### Usage Example:
```typescript
import TrialBanner from '@/components/subscription/TrialBanner';

<TrialBanner
  daysRemaining={5}
  tier="premium"
  onUpgrade={() => router.push('/subscription/plans')}
  onDismiss={() => handleBannerDismissed()}
  showBenefit={true}
/>
```

---

## Component 6: UpgradeBanner.tsx

**Purpose**: Promotional banner to encourage subscription upgrades

**Location**: `/components/subscription/UpgradeBanner.tsx`

### Props Interface:
```typescript
interface UpgradeBannerProps {
  currentTier: SubscriptionTier;
  onUpgrade: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}
```

### Key Features:
- Eye-catching gradient banner (purple for free→premium, amber for premium→vip)
- Tier-specific messaging
- Quick benefits preview (top 3 benefits)
- Close button for dismissal
- Animated fade-out on dismissal
- Auto-hides for VIP tier
- CTA button with arrow icon
- Customizable dismissibility

### Tier Messages:
- **Free**: "Unlock Premium Benefits!" - 2x Cashback, Free Delivery, Priority Support
- **Premium**: "Go VIP for Maximum Rewards!" - 3x Cashback, Concierge Service, Premium Events
- **VIP**: Hidden (not shown)

### Usage Example:
```typescript
import UpgradeBanner from '@/components/subscription/UpgradeBanner';

<UpgradeBanner
  currentTier={currentTier}
  onUpgrade={() => router.push('/subscription/plans')}
  dismissible={true}
  onDismiss={() => handleBannerDismissed()}
/>
```

---

## Integration Examples

### Complete Subscription Manage Page:
```typescript
import { ScrollView, View } from 'react-native';
import UpgradeBanner from '@/components/subscription/UpgradeBanner';
import TrialBanner from '@/components/subscription/TrialBanner';
import ROICalculator from '@/components/subscription/ROICalculator';
import PaymentMethodSelector from '@/components/subscription/PaymentMethodSelector';
import BenefitsModal from '@/components/subscription/BenefitsModal';

export default function SubscriptionManage() {
  const [showBenefits, setShowBenefits] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');

  return (
    <ScrollView>
      {/* Trial Banner - if in trial */}
      {isInTrial && (
        <TrialBanner
          daysRemaining={daysRemaining}
          tier={currentTier}
          onUpgrade={() => router.push('/subscription/plans')}
        />
      )}

      {/* Upgrade Banner - for non-VIP users */}
      {currentTier !== 'vip' && (
        <UpgradeBanner
          currentTier={currentTier}
          onUpgrade={() => router.push('/subscription/plans')}
        />
      )}

      {/* ROI Calculator */}
      <ROICalculator
        subscriptionCost={monthlyPrice}
        totalSavings={stats.totalSavings}
        showDetails={true}
      />

      {/* Payment Method Selection */}
      <PaymentMethodSelector
        methods={paymentMethods}
        selectedId={selectedPayment}
        onSelect={setSelectedPayment}
        onAddNew={() => router.push('/add-payment')}
      />

      {/* Benefits Modal */}
      <BenefitsModal
        visible={showBenefits}
        tier={currentTier}
        onClose={() => setShowBenefits(false)}
        onUpgrade={() => router.push('/subscription/plans')}
      />
    </ScrollView>
  );
}
```

### Plan Selection Page:
```typescript
import PlanCard from '@/components/subscription/PlanCard';

const PLANS = [
  {
    tier: 'premium',
    name: 'Premium',
    price: 99,
    yearlyPrice: 950,
    features: ['2x cashback', 'Free delivery above ₹500', 'Priority support'],
    isPopular: true,
  },
  // More plans...
];

<View>
  {PLANS.map(plan => (
    <PlanCard
      key={plan.tier}
      tier={plan.tier}
      name={plan.name}
      price={plan.price}
      yearlyPrice={plan.yearlyPrice}
      icon={TIER_ICONS[plan.tier]}
      features={plan.features}
      isCurrentPlan={currentTier === plan.tier}
      isMostPopular={plan.isPopular}
      billingCycle={billingCycle}
      onSubscribe={() => handleSubscribe(plan.tier)}
    />
  ))}
</View>
```

---

## Styling Reference

All components use centralized styles from `/styles/subscriptionStyles.ts`:

### Colors:
- **Purple**: #8B5CF6 (Primary action)
- **Amber/Gold**: #F59E0B (VIP tier)
- **Gray**: #6B7280 (Free tier)
- **Success**: #10B981 (Positive metrics)
- **Error**: #EF4444 (Urgent messages)

### Spacing Scale:
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- xxl: 24px

### Border Radius:
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- full: 9999px

---

## Type Definitions

All components use types from `/types/subscription.types.ts`:

```typescript
export type SubscriptionTier = 'free' | 'premium' | 'vip';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'grace_period' | 'payment_failed';

// Tier colors and gradients
export const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#6B7280',
  premium: '#8B5CF6',
  vip: '#F59E0B',
};

export const TIER_GRADIENTS: Record<SubscriptionTier, string[]> = {
  free: ['#6B7280', '#9CA3AF'],
  premium: ['#8B5CF6', '#A78BFA'],
  vip: ['#F59E0B', '#FBBF24'],
};
```

---

## Best Practices

### 1. **Import Organization**
```typescript
// Always import types first
import type { SubscriptionTier, BillingCycle } from '@/types/subscription.types';

// Then import components
import PlanCard from '@/components/subscription/PlanCard';

// Then UI components
import { ThemedText } from '@/components/ThemedText';
```

### 2. **Prop Validation**
All components accept only necessary props. Avoid prop drilling by using Context for global subscription state.

### 3. **Loading States**
Components like PlanCard handle loading internally:
```typescript
<PlanCard
  isLoading={isProcessing}
  disabled={isProcessing}
  onSubscribe={handleSubscribe}
/>
```

### 4. **Error Handling**
Implement error handling in parent components, display errors via modals/alerts.

### 5. **AsyncStorage Integration**
- TrialBanner uses AsyncStorage to persist dismissal state
- Create similar patterns for other user preferences

### 6. **Animation Performance**
- TrialBanner and UpgradeBanner use Animated API
- useNativeDriver is set to true where possible for better performance

---

## Component Checklist

- [x] PlanCard - Complete with all features
- [x] ROICalculator - Complete with expandable details
- [x] PaymentMethodSelector - Complete with modal interface
- [x] BenefitsModal - Complete with 3-tier comparison
- [x] TrialBanner - Complete with animations
- [x] UpgradeBanner - Complete with dismissal

## Files Created

1. `/components/subscription/PlanCard.tsx` - 289 lines
2. `/components/subscription/ROICalculator.tsx` - 325 lines
3. `/components/subscription/PaymentMethodSelector.tsx` - 380 lines
4. `/components/subscription/BenefitsModal.tsx` - 378 lines
5. `/components/subscription/TrialBanner.tsx` - 380 lines
6. `/components/subscription/UpgradeBanner.tsx` - 198 lines

**Total Lines of Code**: 1,950 lines of production-ready component code

---

## Next Steps

1. **Testing**: Create Jest tests for each component
2. **Accessibility**: Add accessibility labels and screen reader support
3. **Localization**: Add i18n support for multi-language
4. **Analytics**: Integrate analytics tracking for component interactions
5. **Documentation**: Add Storybook stories for design system

---

## Support

For questions or issues with these components, refer to:
- Type definitions: `/types/subscription.types.ts`
- Styling guide: `/styles/subscriptionStyles.ts`
- Existing pages: `/app/subscription/plans.tsx`, `/app/subscription/manage.tsx`

