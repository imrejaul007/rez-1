# Lazy Loading Quick Reference

## One-Page Cheat Sheet

### Basic Usage

```tsx
// Import lazy component
import { LazyDealDetailsModal } from '@/components/lazy/LazyModals';

// Use like regular component
<LazyDealDetailsModal visible={show} onClose={close} />
```

### Create Lazy Component

```tsx
import { lazyLoad } from '@/utils/lazyLoad';

const MyComponent = lazyLoad(
  () => import('./MyComponent'),
  { componentName: 'MyComponent' }
);
```

### Preload on Interaction

```tsx
import { preloadOnInteraction } from '@/utils/routePreload';

<Button onPressIn={() => preloadOnInteraction(LazyModal)}>
  Open
</Button>
```

### Lazy Load Service

```tsx
import { lazyRazorpayService } from '@/components/lazy/LazyServices';

const service = await lazyRazorpayService();
await service.processPayment(data);
```

### Preload Services

```tsx
import { preloadServicesByCategory } from '@/components/lazy/LazyServices';

useEffect(() => {
  preloadServicesByCategory('payment');
}, []);
```

---

## Available Lazy Modals

### Deals & Offers (7)
- `LazyDealDetailsModal`
- `LazyDealComparisonModal`
- `LazyDealFilterModal`
- `LazyDealSharingModal`
- `LazyWalkInDealsModal`
- `LazyCashbackModal`
- `LazyAboutModal`

### Payment (6)
- `LazyCardVerificationModal`
- `LazyBankVerificationModal`
- `LazyUPIVerificationModal`
- `LazyOTPVerificationModal`
- `LazyKYCUploadModal`
- `LazyStripePaymentModal`

### Product (5)
- `LazyAddToCartModal`
- `LazyStockNotificationModal`
- `LazyImageZoomModal`
- `LazyProductShareModal`
- `LazySizeGuideModal`

### Gamification (3)
- `LazyAchievementUnlockModal`
- `LazyCelebrationModal`
- `LazyClaimRewardModal`

### Others
- `LazyReviewModal`
- `LazyVoucherPurchaseModal`
- `LazyReferralQRModal`
- `LazyFilterModal`
- `LazyTopupModal`
- And 30+ more...

**Import:** `@/components/lazy/LazyModals`

---

## Available Lazy Routes

### High Priority (Must Lazy Load)
- `LazyGamesIndex` + 5 game routes
- `LazyAdminFAQs` + 1 admin route
- `LazySubscriptionPlans` + 9 subscription routes
- `LazyBillUpload` + 2 upload routes
- `LazyPaymentRazorpay` + 3 payment routes

### Medium Priority (Should Lazy Load)
- `LazyUGCUpload`
- `LazyFeedIndex`
- `LazyMessagesIndex`
- `LazyProjectsPage`
- `LazyReferralPage`
- And 40+ more...

**Import:** `@/components/lazy/LazyRoutes`

---

## Available Lazy Services

### Video Services
```tsx
import {
  lazyVideoUploadService,
  lazyVideoPreloadService,
  lazyRealVideosApi,
} from '@/components/lazy/LazyServices';
```

### Payment Services
```tsx
import {
  lazyRazorpayService,
  lazyStripeApi,
  lazyPaymentService,
} from '@/components/lazy/LazyServices';
```

### Upload Services
```tsx
import {
  lazyBillUploadService,
  lazyProjectUploadService,
  lazyImageUploadService,
} from '@/components/lazy/LazyServices';
```

### Preload by Category
```tsx
preloadServicesByCategory('payment');
preloadServicesByCategory('video');
preloadServicesByCategory('upload');
preloadServicesByCategory('social');
preloadServicesByCategory('gamification');
```

---

## Lazy Contexts

```tsx
import {
  LazyGamificationContext,
  LazySocketContext,
  LazySubscriptionContext,
  LazyNotificationContext,
} from '@/contexts/LazyContexts';

// Use like regular provider
<LazyGamificationContext.Provider>
  {children}
</LazyGamificationContext.Provider>

// Preload contexts
const { preloadForGaming } = usePreloadContexts();
preloadForGaming();
```

---

## Preload Strategies

### On Interaction
```tsx
import { preloadOnInteraction } from '@/utils/routePreload';

<Button onPressIn={() => preloadOnInteraction(Component)}>
  Open
</Button>
```

### On Idle
```tsx
import { preloadOnIdle } from '@/utils/routePreload';

useEffect(() => {
  const cleanup = preloadOnIdle([Comp1, Comp2], 3000);
  return cleanup;
}, []);
```

### Route Prediction
```tsx
import { preloadForRoute } from '@/utils/routePreload';

preloadForRoute('/home', {
  '/profile': ProfileComp,
  '/cart': CartComp,
});
```

### Manual Preload
```tsx
import { preloadComponent } from '@/utils/lazyLoad';

preloadComponent(MyLazyComponent);
```

### Batch Preload
```tsx
import { preloadComponents } from '@/utils/lazyLoad';

preloadComponents([Comp1, Comp2, Comp3]);
```

---

## Preload Priorities

```tsx
import {
  PRELOAD_HIGH_PRIORITY,    // Immediate on WiFi
  PRELOAD_MEDIUM_PRIORITY,  // After 2s on WiFi
  PRELOAD_LOW_PRIORITY,     // After 5s on WiFi
  PRELOAD_EAGER,            // Immediate any network
  PRELOAD_LAZY,             // After 10s on WiFi
} from '@/utils/routePreload';

routePreloadManager.addToQueue(Component, PRELOAD_HIGH_PRIORITY);
```

---

## Advanced Usage

### Custom Loading
```tsx
const MyComponent = lazyLoad(
  () => import('./MyComponent'),
  {
    componentName: 'MyComponent',
    fallback: <CustomLoader />,
    maxRetries: 5,
    retryDelay: 2000,
  }
);
```

### Platform Specific
```tsx
import { lazyLoadPlatform } from '@/utils/lazyLoad';

const Map = lazyLoadPlatform({
  web: () => import('./MapWeb'),
  native: () => import('./MapNative'),
  default: () => import('./MapDefault'),
});
```

### Conditional Loading
```tsx
import { lazyLoadIf } from '@/utils/lazyLoad';

const AdminPanel = lazyLoadIf(
  () => user.isAdmin,
  () => import('./AdminPanel'),
  { componentName: 'AdminPanel' }
);
```

### Service with Error Handling
```tsx
import { lazyLoadService } from '@/components/lazy/LazyServices';

try {
  const service = await lazyLoadService(
    () => import('@/services/myService'),
    'MyService',
    3 // maxRetries
  );
  await service.doSomething();
} catch (error) {
  console.error('Failed to load service:', error);
}
```

---

## Common Patterns

### Pattern 1: Modal with Preload
```tsx
function Card() {
  const [show, setShow] = useState(false);

  return (
    <>
      <Button
        onPressIn={() => preloadComponent(LazyModal)}
        onPress={() => setShow(true)}
      >
        Open
      </Button>
      <LazyModal visible={show} onClose={() => setShow(false)} />
    </>
  );
}
```

### Pattern 2: Service on Page Mount
```tsx
function Page() {
  useEffect(() => {
    preloadServicesByCategory('payment');
  }, []);

  async function action() {
    const service = await lazyPaymentService();
    await service.process();
  }

  return <Content onAction={action} />;
}
```

### Pattern 3: Predictive Preload
```tsx
function ProductPage() {
  useEffect(() => {
    // Preload likely next pages
    preloadComponent(LazyCartPage);
    preloadComponent(LazyCheckoutPage);
  }, []);

  return <Product />;
}
```

---

## Performance Impact

| Component Type | Size | Impact |
|---------------|------|--------|
| Games | 1 MB | HIGH |
| Subscriptions | 695 KB | HIGH |
| Admin | 185 KB | HIGH |
| Modals (all) | 2.5 MB | MEDIUM |
| Payment Services | 820 KB | HIGH |
| Upload Services | 470 KB | MEDIUM |

**Total Savings: ~8.7 MB moved to lazy chunks**
**Initial Bundle: 35% smaller (3 MB reduction)**

---

## Quick Checklist

### Converting Existing Code
- [ ] Replace import with lazy version
- [ ] Add loading state if needed
- [ ] Add preload on interaction
- [ ] Test on slow network

### Creating New Lazy Component
- [ ] Use `lazyLoad()` wrapper
- [ ] Add to appropriate lazy file
- [ ] Document usage
- [ ] Test error scenarios

### Optimizing Performance
- [ ] Identify navigation patterns
- [ ] Add predictive preloading
- [ ] Use network-aware strategies
- [ ] Monitor bundle sizes

---

## Troubleshooting

### Not Loading?
1. Check import path
2. Verify export type
3. Check console errors
4. Check network tab

### Too Slow?
1. Add preloading
2. Check network
3. Improve loading UI
4. Consider eager load

### User Complaints?
1. Better loading indicators
2. Preload on interaction
3. Cache chunks
4. Test on 3G

---

## Resources

- **Full Guide**: `CODE_SPLITTING_GUIDE.md`
- **Examples**: `LAZY_LOADING_INTEGRATION_EXAMPLE.md`
- **Report**: `CODE_SPLITTING_REPORT.md`
- **Utils**: `utils/lazyLoad.tsx`
- **Preload**: `utils/routePreload.ts`

---

## Quick Commands

```bash
# Test lazy loading
npm start

# Check bundle size
npm run build

# Analyze bundle
# Use metro bundler analysis

# Test on slow network
# Chrome DevTools → Network → Slow 3G
```

---

## Support

**Issues?** Check console logs for `[LazyLoad]` or `[RoutePreload]` messages

**Questions?** Review `CODE_SPLITTING_GUIDE.md` for detailed explanations

**Examples?** See `LAZY_LOADING_INTEGRATION_EXAMPLE.md` for practical usage

---

**Keep it lazy, keep it fast! 🚀**

---

**Generated:** 2025-11-11 | **Version:** 1.0
