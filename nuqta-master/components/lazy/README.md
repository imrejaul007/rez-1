# Lazy Loading Components

This directory contains pre-configured lazy-loaded components for the Rez App.

## Overview

All heavy components have been converted to lazy-loading versions to reduce initial bundle size and improve app performance.

## Files

- **LazyModals.tsx** - 47 lazy-loaded modal components
- **LazyRoutes.tsx** - 60+ lazy-loaded route components
- **LazyServices.ts** - 50+ lazy-loaded service imports

## Usage

### Using Lazy Modals

```tsx
import { LazyDealDetailsModal } from '@/components/lazy/LazyModals';

<LazyDealDetailsModal
  visible={showModal}
  onClose={() => setShowModal(false)}
/>
```

### Using Lazy Routes

```tsx
import { LazyGamesIndex } from '@/components/lazy/LazyRoutes';

<Stack.Screen
  name="games/index"
  component={LazyGamesIndex}
/>
```

### Using Lazy Services

```tsx
import { lazyRazorpayService } from '@/components/lazy/LazyServices';

const service = await lazyRazorpayService();
await service.processPayment(data);
```

## Performance Impact

- **Modals:** ~2.5 MB saved from initial bundle
- **Routes:** ~4.5 MB saved from initial bundle
- **Services:** ~3.6 MB saved from initial bundle
- **Total:** ~10.6 MB moved to lazy chunks

## Documentation

For complete documentation, see:
- `CODE_SPLITTING_GUIDE.md` - Full implementation guide
- `LAZY_LOADING_QUICK_REF.md` - Quick reference
- `LAZY_LOADING_INTEGRATION_EXAMPLE.md` - Integration examples

## Adding New Components

To add a new lazy component:

1. Create your component as normal
2. Add lazy export to appropriate file:

```tsx
export const LazyMyComponent = lazyLoad(
  () => import('@/components/MyComponent'),
  { componentName: 'MyComponent' }
);
```

3. Import and use the lazy version
4. Update documentation

## Best Practices

1. ✅ Always use lazy versions for heavy components
2. ✅ Preload on user interaction for instant feel
3. ✅ Provide good loading indicators
4. ✅ Test on slow networks
5. ❌ Don't lazy load critical path components
6. ❌ Don't lazy load tiny components

## Support

For issues or questions, check:
- Console logs for `[LazyLoad]` messages
- `CODE_SPLITTING_GUIDE.md` for detailed documentation
- `LAZY_LOADING_INTEGRATION_EXAMPLE.md` for examples
