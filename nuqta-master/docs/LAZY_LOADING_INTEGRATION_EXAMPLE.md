# Lazy Loading Integration Examples

## Quick Integration Guide

This document shows practical examples of integrating lazy loading into your existing Rez App code.

---

## Example 1: Converting a Modal to Lazy Loading

### Before (Eager Loading)

```tsx
// app/MainStorePage.tsx
import DealDetailsModal from '@/components/DealDetailsModal';
import CashbackModal from '@/components/CashbackModal';

function MainStorePage() {
  const [showDealModal, setShowDealModal] = useState(false);
  const [showCashbackModal, setShowCashbackModal] = useState(false);

  return (
    <View>
      <Button onPress={() => setShowDealModal(true)}>View Deal</Button>
      <Button onPress={() => setShowCashbackModal(true)}>Cashback Info</Button>

      <DealDetailsModal
        visible={showDealModal}
        onClose={() => setShowDealModal(false)}
      />
      <CashbackModal
        visible={showCashbackModal}
        onClose={() => setShowCashbackModal(false)}
      />
    </View>
  );
}
```

### After (Lazy Loading)

```tsx
// app/MainStorePage.tsx
import { LazyDealDetailsModal, LazyCashbackModal } from '@/components/lazy/LazyModals';
import { preloadOnInteraction } from '@/utils/routePreload';

function MainStorePage() {
  const [showDealModal, setShowDealModal] = useState(false);
  const [showCashbackModal, setShowCashbackModal] = useState(false);

  return (
    <View>
      {/* Preload on hover/press start for instant feel */}
      <Button
        onPressIn={() => preloadOnInteraction(LazyDealDetailsModal)}
        onPress={() => setShowDealModal(true)}
      >
        View Deal
      </Button>
      <Button
        onPressIn={() => preloadOnInteraction(LazyCashbackModal)}
        onPress={() => setShowCashbackModal(true)}
      >
        Cashback Info
      </Button>

      {/* Modals load only when visible */}
      <LazyDealDetailsModal
        visible={showDealModal}
        onClose={() => setShowDealModal(false)}
      />
      <LazyCashbackModal
        visible={showCashbackModal}
        onClose={() => setShowCashbackModal(false)}
      />
    </View>
  );
}
```

**Result:**
- Initial page load: 205 KB lighter
- Modals load on-demand
- Preloading on interaction makes it feel instant

---

## Example 2: Converting Routes to Lazy Loading

### Before (Eager Loading)

```tsx
// app/_layout.tsx
import GamesIndex from './games/index';
import AdminFAQs from './admin/faqs';
import SubscriptionPlans from './subscription/plans';

<Stack>
  <Stack.Screen name="games/index" component={GamesIndex} />
  <Stack.Screen name="admin/faqs" component={AdminFAQs} />
  <Stack.Screen name="subscription/plans" component={SubscriptionPlans} />
</Stack>
```

### After (Lazy Loading)

```tsx
// app/_layout.tsx
import {
  LazyGamesIndex,
  LazyAdminFAQs,
  LazySubscriptionPlans,
} from '@/components/lazy/LazyRoutes';

<Stack>
  <Stack.Screen
    name="games/index"
    component={LazyGamesIndex}
    options={{ headerShown: false }}
  />
  <Stack.Screen
    name="admin/faqs"
    component={LazyAdminFAQs}
    options={{ headerShown: false }}
  />
  <Stack.Screen
    name="subscription/plans"
    component={LazySubscriptionPlans}
    options={{ headerShown: false }}
  />
</Stack>
```

**Result:**
- Initial bundle: 1,310 KB lighter
- Routes load only when navigated to
- Automatic loading indicators

---

## Example 3: Lazy Loading Services

### Before (Eager Loading)

```tsx
// app/checkout.tsx
import razorpayService from '@/services/razorpayService';
import stripeService from '@/services/stripeApi';
import paymentVerificationService from '@/services/paymentVerificationService';

async function processPayment(amount: number) {
  if (paymentMethod === 'razorpay') {
    const result = await razorpayService.processPayment({ amount });
    await paymentVerificationService.verifyPayment(result.id);
  } else if (paymentMethod === 'stripe') {
    const result = await stripeService.createPayment({ amount });
    await paymentVerificationService.verifyPayment(result.id);
  }
}
```

### After (Lazy Loading)

```tsx
// app/checkout.tsx
import {
  lazyRazorpayService,
  lazyStripeApi,
  lazyPaymentVerificationService,
  preloadServicesByCategory,
} from '@/components/lazy/LazyServices';
import { useEffect } from 'react';

function CheckoutPage() {
  // Preload all payment services when page loads
  useEffect(() => {
    preloadServicesByCategory('payment');
  }, []);

  async function processPayment(amount: number) {
    if (paymentMethod === 'razorpay') {
      // Service already preloaded, loads instantly
      const razorpayService = await lazyRazorpayService();
      const result = await razorpayService.processPayment({ amount });

      const verificationService = await lazyPaymentVerificationService();
      await verificationService.verifyPayment(result.id);
    } else if (paymentMethod === 'stripe') {
      const stripeService = await lazyStripeApi();
      const result = await stripeService.createPayment({ amount });

      const verificationService = await lazyPaymentVerificationService();
      await verificationService.verifyPayment(result.id);
    }
  }

  return <CheckoutForm onSubmit={processPayment} />;
}
```

**Result:**
- Initial page: 820 KB lighter
- Services preload in background
- No user-visible delay

---

## Example 4: Lazy Loading Contexts

### Before (Eager Loading)

```tsx
// app/_layout.tsx
import { GamificationProvider } from '@/contexts/GamificationContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

<GamificationProvider>
  <SocketProvider>
    <SubscriptionProvider>
      {children}
    </SubscriptionProvider>
  </SocketProvider>
</GamificationProvider>
```

### After (Lazy Loading)

```tsx
// app/_layout.tsx
import {
  LazyGamificationContext,
  LazySocketContext,
  LazySubscriptionContext,
} from '@/contexts/LazyContexts';

<LazyGamificationContext.Provider>
  <LazySocketContext.Provider>
    <LazySubscriptionContext.Provider>
      {children}
    </LazySubscriptionContext.Provider>
  </LazySocketContext.Provider>
</LazyGamificationContext.Provider>
```

**And in specific pages where you need to ensure context is loaded:**

```tsx
// app/games/index.tsx
import { usePreloadContexts } from '@/contexts/LazyContexts';

function GamesPage() {
  const { preloadForGaming } = usePreloadContexts();

  useEffect(() => {
    // Ensure gaming contexts are loaded
    preloadForGaming();
  }, []);

  return <GamesList />;
}
```

**Result:**
- Initial load: 850 KB lighter
- Contexts load when needed
- Graceful loading states

---

## Example 5: Preloading Based on User Navigation

### Intelligent Preloading

```tsx
// app/(tabs)/index.tsx (Home Page)
import { useEffect } from 'react';
import { routePreloadManager, PRELOAD_MEDIUM_PRIORITY } from '@/utils/routePreload';
import {
  LazyGamesIndex,
  LazyOnlineVoucherPage,
  LazyMyVouchersPage,
} from '@/components/lazy/LazyRoutes';

function HomePage() {
  useEffect(() => {
    // Preload commonly accessed pages from home
    routePreloadManager.addToQueue(LazyGamesIndex, PRELOAD_MEDIUM_PRIORITY);
    routePreloadManager.addToQueue(LazyOnlineVoucherPage, PRELOAD_MEDIUM_PRIORITY);
    routePreloadManager.addToQueue(LazyMyVouchersPage, PRELOAD_MEDIUM_PRIORITY);

    // Start processing (only on WiFi by default)
    routePreloadManager.processQueue();
  }, []);

  return <HomeContent />;
}
```

**Result:**
- Predicted pages load in background
- Instant navigation feel
- Smart network usage

---

## Example 6: Idle Preloading

### Preload During User Inactivity

```tsx
// app/(tabs)/earn.tsx
import { useEffect } from 'react';
import { preloadOnIdle } from '@/utils/routePreload';
import {
  LazyProjectsPage,
  LazyMyEarningsPage,
  LazyReferralPage,
} from '@/components/lazy/LazyRoutes';

function EarnPage() {
  useEffect(() => {
    // After 3 seconds of inactivity, preload related pages
    const cleanup = preloadOnIdle(
      [LazyProjectsPage, LazyMyEarningsPage, LazyReferralPage],
      3000 // 3 seconds idle time
    );

    return cleanup;
  }, []);

  return <EarnContent />;
}
```

**Result:**
- Preloads during idle time
- Doesn't interfere with user actions
- Better resource utilization

---

## Example 7: Creating Custom Lazy Component

### Custom Component

```tsx
// components/MyHeavyComponent.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function MyHeavyComponent({ data }) {
  // Heavy component logic
  return (
    <View>
      <Text>Heavy Component</Text>
    </View>
  );
}
```

### Make It Lazy

```tsx
// components/lazy/LazyMyHeavyComponent.tsx
import { lazyLoad } from '@/utils/lazyLoad';
import { ActivityIndicator, View } from 'react-native';

const CustomLoader = () => (
  <View style={{ padding: 20 }}>
    <ActivityIndicator size="large" color="#8B5CF6" />
  </View>
);

export const LazyMyHeavyComponent = lazyLoad(
  () => import('@/components/MyHeavyComponent'),
  {
    componentName: 'MyHeavyComponent',
    fallback: <CustomLoader />,
    maxRetries: 3,
    retryDelay: 1000,
  }
);
```

### Use It

```tsx
// app/MyPage.tsx
import { LazyMyHeavyComponent } from '@/components/lazy/LazyMyHeavyComponent';

function MyPage() {
  return (
    <View>
      <Text>Page Content</Text>
      <LazyMyHeavyComponent data={myData} />
    </View>
  );
}
```

---

## Example 8: Platform-Specific Lazy Loading

### Different Implementations for Web/Native

```tsx
// components/lazy/LazyMap.tsx
import { lazyLoadPlatform } from '@/utils/lazyLoad';

export const LazyMapComponent = lazyLoadPlatform({
  web: () => import('@/components/MapWeb'),
  native: () => import('@/components/MapNative'),
  default: () => import('@/components/MapDefault'),
}, {
  componentName: 'MapComponent',
});
```

### Use It

```tsx
// app/StoreLocation.tsx
import { LazyMapComponent } from '@/components/lazy/LazyMap';

function StoreLocation() {
  return (
    <View>
      <LazyMapComponent
        latitude={store.latitude}
        longitude={store.longitude}
      />
    </View>
  );
}
```

---

## Example 9: Conditional Lazy Loading

### Feature Flag or Permission Based

```tsx
// components/lazy/LazyAdminPanel.tsx
import { lazyLoadIf } from '@/utils/lazyLoad';
import { useAuth } from '@/contexts/AuthContext';

export function createLazyAdminPanel() {
  const { user } = useAuth();

  return lazyLoadIf(
    () => user?.role === 'admin',
    () => import('@/components/AdminPanel'),
    { componentName: 'AdminPanel' }
  );
}
```

### Use It

```tsx
// app/admin/dashboard.tsx
import { createLazyAdminPanel } from '@/components/lazy/LazyAdminPanel';

function AdminDashboard() {
  const LazyAdminPanel = createLazyAdminPanel();

  return (
    <View>
      <Text>Admin Dashboard</Text>
      <LazyAdminPanel />
    </View>
  );
}
```

---

## Example 10: Batch Preloading

### Preload Multiple Components

```tsx
// app/checkout.tsx
import { useEffect } from 'react';
import { preloadComponents } from '@/utils/lazyLoad';
import {
  LazyCardVerificationModal,
  LazyBankVerificationModal,
  LazyUPIVerificationModal,
  LazyOTPVerificationModal,
} from '@/components/lazy/LazyModals';

function CheckoutPage() {
  useEffect(() => {
    // Preload all payment modals together
    preloadComponents([
      LazyCardVerificationModal,
      LazyBankVerificationModal,
      LazyUPIVerificationModal,
      LazyOTPVerificationModal,
    ]);
  }, []);

  return <CheckoutForm />;
}
```

**Result:**
- All related components preload together
- Ready when user selects payment method
- No loading delay

---

## Common Patterns

### Pattern 1: Modal with Preload on Hover

```tsx
function ProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPressIn={() => preloadComponent(LazyProductModal)}
        onPress={() => setShowModal(true)}
      >
        <Text>View Product</Text>
      </TouchableOpacity>

      <LazyProductModal
        visible={showModal}
        product={product}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
```

### Pattern 2: Service with Preload on Page Mount

```tsx
function PaymentPage() {
  useEffect(() => {
    preloadServicesByCategory('payment');
  }, []);

  async function handlePayment() {
    const service = await lazyPaymentService();
    // Service loads instantly (already preloaded)
    await service.process();
  }

  return <PaymentForm onSubmit={handlePayment} />;
}
```

### Pattern 3: Route with Predictive Preload

```tsx
function ProductPage() {
  useEffect(() => {
    // User viewing product likely to add to cart
    preloadComponent(LazyCartPage);
    preloadComponent(LazyCheckoutPage);
  }, []);

  return <ProductDetails />;
}
```

---

## Migration Checklist

When converting existing code to use lazy loading:

### Step 1: Identify Components
- [ ] List all heavy components (modals, charts, maps)
- [ ] List all low-usage routes (admin, games, subscriptions)
- [ ] List all heavy services (video, payment, upload)

### Step 2: Convert Components
- [ ] Import lazy versions from `@/components/lazy/*`
- [ ] Replace eager imports with lazy imports
- [ ] Add loading states where needed
- [ ] Test component loading

### Step 3: Add Preloading
- [ ] Identify user navigation patterns
- [ ] Add preload on interaction
- [ ] Add preload on idle
- [ ] Add predictive preload

### Step 4: Test & Optimize
- [ ] Test on slow network
- [ ] Verify bundle size reduction
- [ ] Monitor load times
- [ ] Adjust preload strategies

---

## Best Practices Summary

1. **Lazy load heavy components** - Modals, games, admin panels
2. **Preload on interaction** - Hover, focus, press start
3. **Preload predictable routes** - Based on navigation patterns
4. **Use network-aware loading** - Respect user's network conditions
5. **Provide good loading states** - Don't leave users wondering
6. **Test on slow networks** - Ensure good UX everywhere
7. **Monitor bundle sizes** - Keep initial bundle small
8. **Document lazy dependencies** - Help other developers

---

## Troubleshooting

### Component Not Loading?
1. Check import path
2. Verify export (default vs named)
3. Check network tab for chunk download
4. Look for console errors

### Loading Too Slow?
1. Implement preloading
2. Check network conditions
3. Reduce chunk size
4. Use better loading indicators

### User Complaining About Delays?
1. Add preload on interaction
2. Improve loading indicators
3. Cache chunks properly
4. Consider eager loading critical paths

---

## Resources

- **Main Guide**: See `CODE_SPLITTING_GUIDE.md`
- **Implementation Report**: See `CODE_SPLITTING_REPORT.md`
- **Utils**: `utils/lazyLoad.tsx`, `utils/routePreload.ts`
- **Lazy Components**: `components/lazy/*`
- **Lazy Contexts**: `contexts/LazyContexts.tsx`

---

**Happy Lazy Loading! 🚀**
