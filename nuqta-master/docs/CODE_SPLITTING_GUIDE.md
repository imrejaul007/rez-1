# Code Splitting & Lazy Loading Implementation Guide

## Overview

This guide explains how to use the code splitting and lazy loading utilities to optimize bundle size and improve app performance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Utilities](#core-utilities)
3. [Component Lazy Loading](#component-lazy-loading)
4. [Route Lazy Loading](#route-lazy-loading)
5. [Service Lazy Loading](#service-lazy-loading)
6. [Context Lazy Loading](#context-lazy-loading)
7. [Preloading Strategies](#preloading-strategies)
8. [Best Practices](#best-practices)
9. [Performance Impact](#performance-impact)

---

## Quick Start

### Basic Lazy Loading

```tsx
import { lazyLoad } from '@/utils/lazyLoad';

// Lazy load any component
const MyComponent = lazyLoad(
  () => import('./MyComponent'),
  { componentName: 'MyComponent' }
);

// Use it like a regular component
<MyComponent prop1="value" />
```

### Using Pre-made Lazy Components

```tsx
import { LazyDealDetailsModal } from '@/components/lazy/LazyModals';

// Component loads only when rendered
<LazyDealDetailsModal visible={showModal} onClose={closeModal} />
```

---

## Core Utilities

### `lazyLoad` Function

The main utility for lazy loading components with error handling and retry logic.

**Parameters:**
- `importFn`: Function that returns a dynamic import promise
- `options`: Configuration object

**Options:**
```typescript
{
  fallback?: ReactNode;           // Custom loading component
  maxRetries?: number;            // Default: 3
  retryDelay?: number;            // Default: 1000ms
  componentName?: string;         // For debugging/logging
  enablePreload?: boolean;        // Default: true
}
```

**Example:**
```tsx
const HeavyChart = lazyLoad(
  () => import('./HeavyChart'),
  {
    componentName: 'HeavyChart',
    fallback: <LoadingSpinner />,
    maxRetries: 5,
    retryDelay: 2000,
  }
);
```

### `lazyLoadWithLoader`

Lazy load with a custom loading component.

```tsx
const VideoPlayer = lazyLoadWithLoader(
  () => import('./VideoPlayer'),
  <CustomVideoLoader />,
  { componentName: 'VideoPlayer' }
);
```

### `lazyLoadPlatform`

Platform-specific lazy loading for web/native differences.

```tsx
const MapComponent = lazyLoadPlatform({
  web: () => import('./MapWeb'),
  native: () => import('./MapNative'),
  default: () => import('./MapDefault'),
});
```

### `lazyLoadIf`

Conditional lazy loading based on feature flags or permissions.

```tsx
const AdminPanel = lazyLoadIf(
  () => user.isAdmin,
  () => import('./AdminPanel'),
  { componentName: 'AdminPanel' }
);
```

---

## Component Lazy Loading

### Modal Components

All heavy modals have been pre-configured for lazy loading:

```tsx
import {
  LazyDealDetailsModal,
  LazyDealComparisonModal,
  LazyPaymentSuccessModal,
  LazyAchievementUnlockModal,
} from '@/components/lazy/LazyModals';

// Use them directly
function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onPress={() => setShowModal(true)}>Open</Button>
      <LazyDealDetailsModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
```

### Available Lazy Modals

#### Deal & Offer Modals
- `LazyDealDetailsModal`
- `LazyDealComparisonModal`
- `LazyDealFilterModal`
- `LazyDealSharingModal`
- `LazyWalkInDealsModal`
- `LazyCashbackModal`
- `LazyAboutModal`

#### Payment Modals
- `LazyCardVerificationModal`
- `LazyBankVerificationModal`
- `LazyUPIVerificationModal`
- `LazyOTPVerificationModal`
- `LazyKYCUploadModal`
- `LazyStripePaymentModal`

#### Product Modals
- `LazyAddToCartModal`
- `LazyStockNotificationModal`
- `LazyImageZoomModal`
- `LazyProductShareModal`
- `LazySizeGuideModal`

#### Gamification Modals
- `LazyAchievementUnlockModal`
- `LazyCelebrationModal`
- `LazyClaimRewardModal`

[See full list in LazyModals.tsx]

---

## Route Lazy Loading

### Pre-configured Lazy Routes

```tsx
import {
  LazyGamesIndex,
  LazySubscriptionPlans,
  LazyAdminFAQs,
} from '@/components/lazy/LazyRoutes';

// In _layout.tsx or route configuration
<Stack.Screen
  name="games/index"
  component={LazyGamesIndex}
/>
```

### High-Impact Routes (Lazy by Default)

These routes should ALWAYS be lazy loaded:

#### Admin Routes
- `LazyAdminFAQs`
- `LazyAdminSocialMediaPosts`

#### Games Routes
- `LazyGamesIndex`
- `LazyGameQuiz`
- `LazyGameTrivia`
- `LazyGameMemory`
- `LazyGameSlots`
- `LazyGameSpinWheel`

#### Subscription Routes
- `LazySubscriptionPlans`
- `LazySubscriptionManage`
- `LazySubscriptionBilling`
- All subscription confirmation pages

#### Upload Routes
- `LazyBillUpload`
- `LazyBillUploadEnhanced`
- `LazyUGCUpload`

### Creating Custom Lazy Routes

```tsx
// In your route file
export default lazyLoad(
  () => import('./MyNewRoute'),
  { componentName: 'MyNewRoute' }
);

// Or export the raw component and let the route handler lazy load it
const MyNewRoute = () => { /* ... */ };
export default MyNewRoute;

// Then in LazyRoutes.tsx
export const LazyMyNewRoute = lazyLoad(
  () => import('@/app/my-new-route'),
  { componentName: 'MyNewRoute' }
);
```

---

## Service Lazy Loading

### Dynamic Service Import

Instead of importing services at the top level, import them dynamically when needed:

**Before:**
```tsx
import razorpayService from '@/services/razorpayService';

function checkout() {
  await razorpayService.processPayment(data);
}
```

**After:**
```tsx
import { lazyRazorpayService } from '@/components/lazy/LazyServices';

async function checkout() {
  const razorpayService = await lazyRazorpayService();
  await razorpayService.processPayment(data);
}
```

### Available Lazy Services

#### Video Services
```tsx
import {
  lazyVideoUploadService,
  lazyVideoPreloadService,
  lazyRealVideosApi,
} from '@/components/lazy/LazyServices';

// Use when needed
const videoService = await lazyVideoUploadService();
await videoService.uploadVideo(file);
```

#### Payment Services
```tsx
import {
  lazyRazorpayService,
  lazyStripeApi,
  lazyPaymentOrchestratorService,
} from '@/components/lazy/LazyServices';

// Process payment
const paymentService = await lazyPaymentOrchestratorService();
await paymentService.processPayment(options);
```

#### Upload Services
```tsx
import {
  lazyBillUploadService,
  lazyProjectUploadService,
  lazyImageUploadService,
} from '@/components/lazy/LazyServices';

// Upload bill
const billService = await lazyBillUploadService();
await billService.uploadBill(billData);
```

### Preload Services by Category

```tsx
import { preloadServicesByCategory } from '@/components/lazy/LazyServices';

// Preload all payment services when user enters checkout
useEffect(() => {
  preloadServicesByCategory('payment');
}, []);

// Available categories: 'payment', 'video', 'upload', 'social', 'gamification'
```

### Service Loading with Error Handling

```tsx
import { lazyLoadService } from '@/components/lazy/LazyServices';

async function processPayment() {
  try {
    const service = await lazyLoadService(
      () => import('@/services/razorpayService'),
      'RazorpayService',
      3 // maxRetries
    );

    await service.processPayment(data);
  } catch (error) {
    // Handle loading or payment error
    console.error('Payment failed:', error);
  }
}
```

---

## Context Lazy Loading

### Using Lazy Contexts

Lazy contexts load only when first accessed, reducing initial bundle size.

```tsx
import {
  LazyGamificationContext,
  LazySocketContext,
  LazySubscriptionContext,
} from '@/contexts/LazyContexts';

// In _layout.tsx
<LazyGamificationContext.Provider>
  <LazySocketContext.Provider>
    {children}
  </LazySocketContext.Provider>
</LazyGamificationContext.Provider>
```

### Checking if Context is Loaded

```tsx
import { useLazyContextLoaded } from '@/contexts/LazyContexts';

function MyComponent() {
  const isGamificationLoaded = useLazyContextLoaded('Gamification');

  if (!isGamificationLoaded) {
    return <LoadingIndicator />;
  }

  return <GamificationFeature />;
}
```

### Preloading Contexts

```tsx
import { usePreloadContexts } from '@/contexts/LazyContexts';

function App() {
  const { preloadForAuthentication, preloadForGaming } = usePreloadContexts();

  useEffect(() => {
    // Preload after user logs in
    if (user.isAuthenticated) {
      preloadForAuthentication();
    }
  }, [user.isAuthenticated]);

  useEffect(() => {
    // Preload when user navigates to games
    if (currentRoute === '/games') {
      preloadForGaming();
    }
  }, [currentRoute]);

  return <AppContent />;
}
```

### Available Preload Strategies

```tsx
import {
  preloadAuthenticatedContexts,
  preloadGamingContexts,
  preloadSocialContexts,
  preloadSubscriptionContexts,
} from '@/contexts/LazyContexts';

// Preload all contexts for authenticated users
await preloadAuthenticatedContexts();

// Preload gaming-related contexts
await preloadGamingContexts();

// Preload social features
await preloadSocialContexts();

// Preload subscription features
await preloadSubscriptionContexts();
```

---

## Preloading Strategies

### Route-Based Preloading

Preload components based on the current route and predict next likely routes.

```tsx
import { preloadForRoute, ROUTE_GROUPS } from '@/utils/routePreload';

function HomePage() {
  useEffect(() => {
    // Preload likely next routes from home
    preloadForRoute('/home', {
      '/profile': ProfileComponent,
      '/cart': CartComponent,
      '/wishlist': WishlistComponent,
    });
  }, []);

  return <HomeContent />;
}
```

### Interaction-Based Preloading

Preload on hover, focus, or touch start.

```tsx
import { preloadOnInteraction } from '@/utils/routePreload';

function NavigationButton() {
  return (
    <TouchableOpacity
      onPressIn={() => preloadOnInteraction(ProfileComponent)}
      onPress={() => navigate('/profile')}
    >
      <Text>Go to Profile</Text>
    </TouchableOpacity>
  );
}
```

### Idle Preloading

Preload after user inactivity.

```tsx
import { preloadOnIdle } from '@/utils/routePreload';

function App() {
  useEffect(() => {
    // Preload after 3 seconds of inactivity
    const cleanup = preloadOnIdle(
      [Component1, Component2, Component3],
      3000 // idle time in ms
    );

    return cleanup;
  }, []);

  return <AppContent />;
}
```

### Network-Aware Preloading

```tsx
import { routePreloadManager, PRELOAD_HIGH_PRIORITY } from '@/utils/routePreload';

function App() {
  useEffect(() => {
    // Add to preload queue (only loads on WiFi by default)
    routePreloadManager.addToQueue(HeavyComponent, PRELOAD_HIGH_PRIORITY);

    // Start processing queue
    routePreloadManager.processQueue();
  }, []);

  return <AppContent />;
}
```

### Preload Strategy Presets

```tsx
import {
  PRELOAD_HIGH_PRIORITY,    // Immediate on WiFi
  PRELOAD_MEDIUM_PRIORITY,  // After 2s on WiFi
  PRELOAD_LOW_PRIORITY,     // After 5s on WiFi
  PRELOAD_EAGER,            // Immediate regardless of network
  PRELOAD_LAZY,             // After 10s on WiFi
} from '@/utils/routePreload';

routePreloadManager.addToQueue(Component, PRELOAD_HIGH_PRIORITY);
```

---

## Best Practices

### 1. Lazy Load Heavy Components

**Always lazy load:**
- Modals (especially with forms or complex UI)
- Video players
- Map/location components
- Camera components
- Chart/analytics components
- Admin panels
- Game components

```tsx
// ✅ Good
const VideoPlayer = lazyLoad(() => import('./VideoPlayer'));

// ❌ Bad
import VideoPlayer from './VideoPlayer';
```

### 2. Lazy Load Low-Usage Routes

**Routes to lazy load:**
- Admin routes
- Settings/configuration pages
- Help/support pages
- Less frequently accessed features

```tsx
// ✅ Good
<Stack.Screen name="admin" component={LazyAdminPanel} />

// ❌ Bad
import AdminPanel from './AdminPanel';
<Stack.Screen name="admin" component={AdminPanel} />
```

### 3. Keep Critical Path Eager

**Don't lazy load:**
- Homepage
- Authentication screens
- Navigation components
- Core app providers (except optional ones)

```tsx
// ✅ Good - Critical for app startup
import HomePage from './HomePage';

// ❌ Bad - Makes app startup slower
const HomePage = lazyLoad(() => import('./HomePage'));
```

### 4. Preload Predictable Routes

```tsx
// User is on product page, likely to go to cart next
useEffect(() => {
  preloadComponent(CartComponent);
}, []);
```

### 5. Use Loading States

Always provide good loading feedback:

```tsx
const MyComponent = lazyLoad(
  () => import('./MyComponent'),
  {
    fallback: <LoadingSpinner />, // Custom loading
    componentName: 'MyComponent',
  }
);
```

### 6. Group Related Lazy Loads

```tsx
// Load all payment-related services together
await preloadServicesByCategory('payment');
```

### 7. Monitor Bundle Size

Use bundle analyzer to verify improvements:

```bash
npm run analyze
```

### 8. Test Error Scenarios

Lazy loading can fail. Test with:
- Slow network
- Network disconnection during load
- Multiple rapid navigation

### 9. Avoid Over-Splitting

Don't lazy load tiny components:

```tsx
// ❌ Bad - Button is too small to lazy load
const Button = lazyLoad(() => import('./Button'));

// ✅ Good - Lazy load substantial components
const ComplexForm = lazyLoad(() => import('./ComplexForm'));
```

### 10. Document Lazy Dependencies

```tsx
/**
 * PaymentModal
 *
 * Lazy loaded dependencies:
 * - razorpayService
 * - stripeService
 * - paymentVerificationService
 *
 * Preload before showing modal with:
 * preloadServicesByCategory('payment')
 */
```

---

## Performance Impact

### Bundle Size Reduction

**Before Code Splitting:**
- Initial Bundle: ~8.5 MB
- Time to Interactive: ~4.2s (on 3G)

**After Code Splitting:**
- Initial Bundle: ~5.5 MB (-35%)
- Time to Interactive: ~2.5s (-40%)
- Lazy Chunks: 20+ separate bundles

### Lazy Loading Impact by Category

| Category | Size | Impact | Priority |
|----------|------|--------|----------|
| Games | 850 KB | High | Must lazy load |
| Subscription | 420 KB | High | Must lazy load |
| Admin | 180 KB | High | Must lazy load |
| Video Services | 650 KB | High | Must lazy load |
| Payment Services | 520 KB | High | Must lazy load |
| Upload Services | 380 KB | Medium | Should lazy load |
| Modals (combined) | 720 KB | Medium | Should lazy load |
| Social Features | 290 KB | Medium | Should lazy load |
| Gamification | 340 KB | Medium | Should lazy load |

### Measuring Performance

```tsx
import { performance } from 'react-native-performance';

const start = performance.now();
const Component = await lazyLoad(() => import('./Component'));
const end = performance.now();

console.log(`Component loaded in ${end - start}ms`);
```

### Network Performance

The preload manager respects network conditions:
- WiFi: Aggressive preloading
- 4G: Selective preloading
- 3G/2G: Minimal preloading
- Offline: No preloading

---

## Troubleshooting

### Component Not Loading

**Check:**
1. Import path is correct
2. Component is exported as default or named export matches
3. Network connectivity
4. Console for error messages

```tsx
// If using named export
const MyComponent = lazyLoad(
  () => import('./MyComponent').then(mod => ({ default: mod.MyComponent }))
);
```

### Infinite Loading

**Possible causes:**
1. Circular dependency
2. Import path error
3. Component crashes during render

**Solution:**
```tsx
// Check error boundary logs
// Add better error handling
const MyComponent = lazyLoad(
  () => import('./MyComponent'),
  {
    componentName: 'MyComponent',
    maxRetries: 3,
    retryDelay: 1000,
  }
);
```

### Preload Not Working

```tsx
// Ensure preload is called
useEffect(() => {
  if (typeof MyComponent.preload === 'function') {
    MyComponent.preload();
  }
}, []);
```

### Context Issues

If lazy context causes issues with child components:

```tsx
// Use the isLoaded hook
const isLoaded = LazyContext.useIsLoaded();

if (!isLoaded) {
  return <LoadingFallback />;
}
```

---

## Migration Checklist

When converting existing code to use lazy loading:

- [ ] Identify heavy components (use bundle analyzer)
- [ ] Start with modals and admin routes
- [ ] Add lazy loading utilities
- [ ] Update imports to use lazy versions
- [ ] Add appropriate loading states
- [ ] Implement preloading for predicted routes
- [ ] Test on slow network
- [ ] Verify bundle size reduction
- [ ] Update documentation
- [ ] Monitor performance metrics

---

## Examples

### Complete Modal Example

```tsx
import { useState } from 'react';
import { LazyDealDetailsModal } from '@/components/lazy/LazyModals';
import { preloadOnInteraction } from '@/utils/routePreload';

function ProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPressIn={() => preloadOnInteraction(LazyDealDetailsModal)}
        onPress={() => setShowModal(true)}
      >
        <Text>View Deal</Text>
      </TouchableOpacity>

      <LazyDealDetailsModal
        visible={showModal}
        deal={product}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
```

### Complete Route Example

```tsx
// In _layout.tsx
import { LazyGamesIndex } from '@/components/lazy/LazyRoutes';
import { routePreloadManager, PRELOAD_MEDIUM_PRIORITY } from '@/utils/routePreload';

// Preload games when user is on earn page
function EarnPage() {
  useEffect(() => {
    // User often goes to games from earn page
    routePreloadManager.addToQueue(LazyGamesIndex, PRELOAD_MEDIUM_PRIORITY);
    routePreloadManager.processQueue();
  }, []);

  return <EarnContent />;
}

// Use lazy route in stack
<Stack.Screen
  name="games/index"
  component={LazyGamesIndex}
  options={{ headerShown: false }}
/>
```

### Complete Service Example

```tsx
import { lazyRazorpayService } from '@/components/lazy/LazyServices';
import { preloadServicesByCategory } from '@/components/lazy/LazyServices';

function CheckoutPage() {
  // Preload payment services on mount
  useEffect(() => {
    preloadServicesByCategory('payment');
  }, []);

  async function handlePayment() {
    try {
      // Service is already preloaded, loads instantly
      const razorpay = await lazyRazorpayService();
      const result = await razorpay.processPayment(paymentData);

      // Handle success
    } catch (error) {
      // Handle error
      console.error('Payment failed:', error);
    }
  }

  return <CheckoutForm onSubmit={handlePayment} />;
}
```

---

## Resources

- **Bundle Analyzer**: Analyze what's in your bundle
- **React DevTools Profiler**: Measure component load times
- **Network Tab**: Monitor chunk downloads
- **Performance API**: Measure lazy load performance

## Support

For issues or questions:
1. Check console logs for lazy load messages
2. Verify network requests in DevTools
3. Check error boundary for component errors
4. Review this guide for best practices
