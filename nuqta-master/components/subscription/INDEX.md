# Subscription Components Index

Welcome to the subscription components library. All components are located in this directory and are production-ready.

## Components Overview

| Component | Purpose | Props | Status |
|-----------|---------|-------|--------|
| **PlanCard** | Display subscription plans | tier, name, price, features | ✓ Ready |
| **ROICalculator** | Show ROI metrics | subscriptionCost, totalSavings | ✓ Ready |
| **PaymentMethodSelector** | Select payment methods | methods, selectedId, onSelect | ✓ Ready |
| **BenefitsModal** | Compare tier benefits | visible, tier, onClose | ✓ Ready |
| **TrialBanner** | Trial countdown banner | daysRemaining, tier, onUpgrade | ✓ Ready |
| **UpgradeBanner** | Upgrade promotion banner | currentTier, onUpgrade | ✓ Ready |

## Quick Navigation

### For First-Time Users:
1. Read: `/frontend/SUBSCRIPTION_EXTRACTION_SUMMARY.md` - Overview
2. Study: `/frontend/SUBSCRIPTION_COMPONENTS_GUIDE.md` - Detailed guide
3. Reference: `/frontend/SUBSCRIPTION_QUICK_REFERENCE.md` - Code examples

### For Developers:
1. Import: `import ComponentName from '@/components/subscription/ComponentName'`
2. Use: Add component with required props
3. Debug: Check types in `/types/subscription.types.ts`
4. Style: Reference `/styles/subscriptionStyles.ts`

## File Listing

```
components/subscription/
├── PlanCard.tsx                   - Plan display card (289 lines)
├── ROICalculator.tsx              - ROI metrics display (325 lines)
├── PaymentMethodSelector.tsx      - Payment selection (380 lines)
├── BenefitsModal.tsx              - Benefits comparison (378 lines)
├── TrialBanner.tsx                - Trial countdown (380 lines)
├── UpgradeBanner.tsx              - Upgrade banner (198 lines)
├── TierBadge.tsx                  - Tier indicator badge
├── FeatureComparisonTable.tsx     - Feature comparison table
├── PaymentSuccessModal.tsx        - Payment success confirmation
├── PricingToggle.tsx              - Monthly/yearly toggle
├── RazorpayPaymentForm.tsx        - Razorpay payment form
├── TrialCountdownCircle.tsx       - Circular countdown
├── BenefitShowcaseCard.tsx        - Single benefit card
├── TrialStatCard.tsx              - Trial stats display
├── ProgressSteps.tsx              - Progress indicator
├── ProratedPriceDisplay.tsx       - Prorated pricing
├── RetentionOfferCard.tsx         - Retention offer card
└── INDEX.md                       - This file
```

## Component Dependencies

### External Dependencies:
- `react-native` - Core components
- `expo-linear-gradient` - Gradient backgrounds
- `@expo/vector-icons` - Ionicons
- `react-native-async-storage` - Persistent storage (TrialBanner)
- `expo-router` - Navigation

### Internal Dependencies:
- `@/components/ThemedText` - Styled text component
- `@/components/ThemedView` - Styled view component
- `@/types/subscription.types` - Type definitions
- `@/styles/subscriptionStyles` - Shared styles
- `@/contexts/SubscriptionContext` - State management (optional)

## Installation & Setup

### 1. Copy Components
Components are already in the right location.

### 2. Import Types
```typescript
import type { SubscriptionTier, BillingCycle } from '@/types/subscription.types';
```

### 3. Import Styles
```typescript
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
} from '@/styles/subscriptionStyles';
```

### 4. Start Using
```typescript
import PlanCard from '@/components/subscription/PlanCard';

<PlanCard
  tier="premium"
  name="Premium"
  price={99}
  yearlyPrice={950}
  icon="star"
  features={features}
  isCurrentPlan={false}
  onSubscribe={handleSubscribe}
/>
```

## Common Use Cases

### Use Case 1: Display Plans
```typescript
import PlanCard from '@/components/subscription/PlanCard';

// Display plan cards in a ScrollView
<PlanCard {...planProps} />
```

### Use Case 2: Show ROI
```typescript
import ROICalculator from '@/components/subscription/ROICalculator';

// Display ROI metrics to justify subscription
<ROICalculator
  subscriptionCost={99}
  totalSavings={500}
/>
```

### Use Case 3: Payment Selection
```typescript
import PaymentMethodSelector from '@/components/subscription/PaymentMethodSelector';

// Let user select payment method
<PaymentMethodSelector
  methods={paymentMethods}
  selectedId={selected}
  onSelect={setSelected}
/>
```

### Use Case 4: Benefits Comparison
```typescript
import BenefitsModal from '@/components/subscription/BenefitsModal';

// Show tier comparison in modal
<BenefitsModal
  visible={showModal}
  tier="premium"
  onClose={handleClose}
/>
```

### Use Case 5: Trial Countdown
```typescript
import TrialBanner from '@/components/subscription/TrialBanner';

// Display trial countdown with urgency
<TrialBanner
  daysRemaining={5}
  tier="premium"
  onUpgrade={handleUpgrade}
/>
```

### Use Case 6: Upgrade Promotion
```typescript
import UpgradeBanner from '@/components/subscription/UpgradeBanner';

// Show upgrade promotion on home page
<UpgradeBanner
  currentTier="free"
  onUpgrade={handleUpgrade}
/>
```

## Type Definitions

All components are fully typed. Key types:

```typescript
// Subscription tiers
type SubscriptionTier = 'free' | 'premium' | 'vip';

// Billing cycles
type BillingCycle = 'monthly' | 'yearly';

// Payment method types
type PaymentType = 'card' | 'upi' | 'netbanking' | 'wallet';
```

See `/types/subscription.types.ts` for complete definitions.

## Styling System

All components use centralized styles:

### Colors:
```typescript
SUBSCRIPTION_COLORS = {
  purple: '#8B5CF6',
  amber: '#F59E0B',
  gray: '#6B7280',
  success: '#10B981',
  error: '#EF4444',
  // ... more colors
}
```

### Spacing:
```typescript
SUBSCRIPTION_SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24
}
```

### Border Radius:
```typescript
SUBSCRIPTION_BORDER_RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 9999
}
```

## Documentation Files

| File | Content |
|------|---------|
| `SUBSCRIPTION_EXTRACTION_SUMMARY.md` | Project overview and checklist |
| `SUBSCRIPTION_COMPONENTS_GUIDE.md` | Detailed guide for each component |
| `SUBSCRIPTION_QUICK_REFERENCE.md` | Quick code examples and patterns |
| `INDEX.md` | This file |

## Performance Tips

1. **Memoization**: Components are optimized, wrap in React.memo() if needed
2. **Animations**: useNativeDriver is enabled for smooth 60 FPS
3. **Lazy Loading**: Load components on demand
4. **State Management**: Use context to avoid prop drilling

## Accessibility

All components follow WCAG 2.1 guidelines:
- Proper contrast ratios
- Semantic structure
- Touch targets (min 44x44 pts)
- Screen reader support
- Keyboard navigation

## Testing

### Unit Tests:
- Test component rendering with different props
- Verify calculations (ROICalculator)
- Test interaction handlers

### Integration Tests:
- Test with subscription context
- Verify navigation flows
- Test state updates

## Troubleshooting

### Component Not Showing
1. Check props match interface
2. Verify all required props are provided
3. Check if parent has correct height

### Styling Looks Wrong
1. Verify subscriptionStyles are imported
2. Check color values in SUBSCRIPTION_COLORS
3. Verify spacing values

### TypeScript Errors
1. Import types from subscription.types.ts
2. Check prop interfaces match usage
3. Verify tier/payment type enums

## Version History

### v1.0.0 - Initial Release
- All 6 components created
- Full TypeScript support
- Comprehensive documentation
- Ready for production use

## Contributing

When adding new components:
1. Follow existing naming conventions
2. Use subscriptionStyles for all styling
3. Add comprehensive TypeScript types
4. Document in this INDEX
5. Update main guide documents

## Support

For questions or issues:
1. Check SUBSCRIPTION_COMPONENTS_GUIDE.md
2. Review SUBSCRIPTION_QUICK_REFERENCE.md
3. Look at component source code
4. Check existing usage in app pages

## License

Same as parent project - check root LICENSE file

## Links

- **Components**: `/frontend/components/subscription/`
- **Types**: `/frontend/types/subscription.types.ts`
- **Styles**: `/frontend/styles/subscriptionStyles.ts`
- **Documentation**: `/frontend/SUBSCRIPTION_*.md`

---

**Last Updated**: November 2024
**Status**: Production Ready
**Maintainer**: Frontend Team

