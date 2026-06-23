# Analytics System

A comprehensive, production-ready analytics tracking system with multi-provider support, GDPR compliance, and offline capabilities.

## Features

- 🎯 **150+ Pre-defined Events** - Complete event catalog for e-commerce apps
- 🔌 **Multi-Provider Support** - Firebase, Google Analytics, Mixpanel, Amplitude, Custom
- 🛒 **E-commerce Funnel** - 7-stage purchase journey tracking
- 🔐 **GDPR Compliant** - Granular consent management
- 📱 **Offline Support** - Event queuing with automatic retry
- ✅ **Event Validation** - Type-safe with schema enforcement
- 🐛 **Debug Tools** - Built-in debugger and event inspector
- 📊 **Revenue Tracking** - Complete transaction tracking

## Quick Start

### 1. Initialize

```typescript
import { analytics } from '@/services/analytics';

analytics.initialize({
  enabled: true,
  debug: __DEV__,
  providers: [
    { name: 'custom', enabled: true, config: {} },
  ],
});
```

### 2. Track Events

```typescript
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';

const { trackProductViewed, trackAddToCart } = useComprehensiveAnalytics();

trackProductViewed({
  productId: 'PROD-123',
  productName: 'Nike Air Max',
  price: 129.99,
  category: 'Shoes',
});

trackAddToCart({
  productId: 'PROD-123',
  productName: 'Nike Air Max',
  price: 129.99,
  quantity: 1,
  totalValue: 129.99,
  category: 'Shoes',
});
```

### 3. Track Screens

```typescript
import { useScreenTracking } from '@/hooks/useScreenTracking';

export default function MyScreen() {
  useScreenTracking(); // Auto-tracks screen view
  return <View>...</View>;
}
```

## Event Categories

### Store Events (10)
- `store_viewed`, `store_followed`, `store_shared`, etc.

### Product Events (19)
- `product_viewed`, `product_searched`, `product_filtered`, etc.

### Cart Events (12)
- `add_to_cart`, `checkout_started`, `checkout_completed`, etc.

### UGC Events (10)
- `ugc_viewed`, `ugc_liked`, `ugc_upload_completed`, etc.

### Booking Events (9)
- `booking_started`, `booking_completed`, etc.

### And 100+ more...

See `events.ts` for complete catalog.

## E-commerce Funnel

Track complete purchase journey:

```typescript
import { ecommerceFunnel } from '@/services/analytics';

ecommerceFunnel.trackProductDiscovery('search', { query: 'shoes' });
ecommerceFunnel.trackProductView('PROD-123', 'Nike Air Max', 129.99);
ecommerceFunnel.trackAddToCart('PROD-123', 'Nike Air Max', 129.99, 1);
ecommerceFunnel.trackViewCart(1, 129.99);
ecommerceFunnel.trackCheckoutStarted(1, 129.99);
ecommerceFunnel.trackPaymentInfo('credit_card');
ecommerceFunnel.trackPurchaseCompleted('TXN-123', 129.99, 1);

// Get metrics
const funnel = await ecommerceFunnel.getFunnelState();
console.log('Conversion rate:', funnel.conversionRate);
```

## Privacy & Consent

```typescript
import { consentManager } from '@/services/analytics';

// Request consent
await consentManager.requestConsent({
  analytics: true,
  marketing: false,
  personalization: true,
});

// Check consent
const hasConsent = await consentManager.hasConsent();

// Revoke consent
await consentManager.revokeAll();
```

## Debug & Test

```typescript
import { analyticsDebugger } from '@/services/analytics';

// Enable debugger
analyticsDebugger.setEnabled(true);

// View recent events
const events = analyticsDebugger.getRecentEvents(20);

// Print statistics
analyticsDebugger.printStats();

// Test event
analyticsDebugger.testEvent('my_event', { test: true });
```

## API

### Analytics Service

```typescript
import { analytics } from '@/services/analytics';

analytics.trackEvent(name, properties)
analytics.trackScreen(screenName, properties)
analytics.setUserId(userId)
analytics.setUserProperties(properties)
analytics.trackPurchase(transaction)
analytics.setConsent(granted)
analytics.flush()
```

### Hooks

```typescript
import { useComprehensiveAnalytics, useScreenTracking } from '@/services/analytics';

const {
  trackEvent,
  trackProductViewed,
  trackAddToCart,
  trackStoreViewed,
  trackUGCViewed,
  // ... 50+ tracking functions
} = useComprehensiveAnalytics();

useScreenTracking(); // Auto screen tracking
```

### Components

```typescript
import { TrackableButton, TrackableTouchable } from '@/services/analytics';

<TrackableButton
  eventName="button_clicked"
  eventProperties={{ button_id: 'cta' }}
  onPress={handlePress}
>
  <Text>Click Me</Text>
</TrackableButton>
```

## Documentation

- **[Implementation Guide](../../ANALYTICS_IMPLEMENTATION_GUIDE.md)** - Complete setup guide
- **[Integration Checklist](../../ANALYTICS_INTEGRATION_CHECKLIST_NEW.md)** - Step-by-step implementation
- **[Comprehensive Summary](../../COMPREHENSIVE_ANALYTICS_SUMMARY.md)** - Complete overview

## Architecture

```
App Components
      ↓
Analytics Hooks (useComprehensiveAnalytics)
      ↓
Analytics Service (validation, consent, enrichment)
      ↓
Providers (Firebase, GA, Mixpanel, Custom)
      ↓
Backend API (/api/analytics/events)
```

## File Structure

```
services/analytics/
├── AnalyticsService.ts          # Main service
├── types.ts                     # TypeScript types
├── events.ts                    # Event catalog (150+ events)
├── index.ts                     # Main exports
├── providers/
│   ├── BaseProvider.ts          # Abstract base
│   ├── CustomProvider.ts        # Custom backend
│   └── FirebaseProvider.ts      # Firebase integration
└── README.md                    # This file

utils/
├── ecommerceFunnel.ts           # Funnel tracking
├── analyticsConsent.ts          # Consent management
├── eventValidator.ts            # Event validation
├── analyticsQueue.ts            # Offline queue
└── analyticsDebugger.ts         # Debug tools

hooks/
├── useComprehensiveAnalytics.ts # Main tracking hook
└── useScreenTracking.ts         # Auto screen tracking

components/analytics/
├── AnalyticsView.tsx            # Trackable view
├── TrackableButton.tsx          # Trackable button
└── TrackableTouchable.tsx       # Trackable touchable
```

## Best Practices

✅ **DO:**
- Request consent before tracking
- Use pre-defined events when possible
- Include context (source, referrer)
- Validate events in development

❌ **DON'T:**
- Track PII (emails, phones)
- Track every action
- Ignore validation warnings
- Track without consent

## Support

For issues or questions:
- See [Implementation Guide](../../ANALYTICS_IMPLEMENTATION_GUIDE.md)
- Review event catalog in `events.ts`
- Check [Comprehensive Summary](../../COMPREHENSIVE_ANALYTICS_SUMMARY.md)

---

**Version:** 1.0.0
**Status:** ✅ Production Ready
**Last Updated:** 2025-01-12
