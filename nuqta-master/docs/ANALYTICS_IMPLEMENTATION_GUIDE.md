# Analytics Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Event Tracking](#event-tracking)
5. [E-commerce Tracking](#e-commerce-tracking)
6. [Privacy & Consent](#privacy--consent)
7. [Provider Integration](#provider-integration)
8. [Testing & Debugging](#testing--debugging)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Overview

Our comprehensive analytics system provides:

- **Multi-provider support**: Google Analytics, Firebase, Mixpanel, Amplitude, Custom backend
- **Type-safe tracking**: Full TypeScript support with event validation
- **E-commerce funnel**: Complete purchase journey tracking
- **Privacy-first**: GDPR-compliant consent management
- **Offline support**: Event queuing when offline
- **Debug tools**: Built-in debugger and event inspector
- **150+ pre-defined events**: Comprehensive event catalog

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Components, Screens, User Interactions)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Hooks                           │
│  • useComprehensiveAnalytics()                              │
│  • useScreenTracking()                                       │
│  • useProductAnalytics()                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Analytics Service Layer                      │
│  • Event validation                                          │
│  • Consent checking                                          │
│  • Event enrichment                                          │
│  • Queue management                                          │
└────────┬──────────┬──────────┬──────────┬──────────┬────────┘
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Firebase│ │ Google │ │Mixpanel│ │Amplitud│ │ Custom │
    │Provider│ │Analytics│ │Provider│ │Provider│ │Provider│
    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
         │          │          │          │          │
         └──────────┴──────────┴──────────┴──────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Backend API    │
                    │  /analytics/*   │
                    └─────────────────┘
```

---

## Quick Start

### 1. Initialize Analytics

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { analytics } from '@/services/analytics';

export default function RootLayout() {
  useEffect(() => {
    // Initialize analytics on app start
    analytics.initialize({
      enabled: true,
      debug: __DEV__,
      providers: [
        {
          name: 'custom',
          enabled: true,
          config: {
            apiUrl: process.env.EXPO_PUBLIC_API_URL,
          },
        },
        {
          name: 'firebase',
          enabled: true,
          config: {},
        },
      ],
      batchSize: 50,
      flushInterval: 30000,
      offlineQueueEnabled: true,
      privacyMode: false,
    });

    // Set user when logged in
    // analytics.setUserId(user.id);

    return () => {
      analytics.trackSessionEnd();
    };
  }, []);

  return <Slot />;
}
```

### 2. Use in Components

```typescript
// components/ProductCard.tsx
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';

export function ProductCard({ product }) {
  const {
    trackProductViewed,
    trackAddToCart,
    trackProductWishlistAdded,
  } = useComprehensiveAnalytics();

  const handlePress = () => {
    trackProductViewed({
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category,
      brand: product.brand,
      source: 'product_list',
    });

    router.push(`/product/${product.id}`);
  };

  const handleAddToCart = () => {
    trackAddToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      totalValue: product.price,
      category: product.category,
    });
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* Product UI */}
      <Button onPress={handleAddToCart}>Add to Cart</Button>
    </TouchableOpacity>
  );
}
```

### 3. Track Screens Automatically

```typescript
// app/product/[id].tsx
import { useScreenTracking } from '@/hooks/useScreenTracking';

export default function ProductPage() {
  // Automatically tracks screen view
  useScreenTracking();

  return <View>{/* Product details */}</View>;
}
```

---

## Event Tracking

### Available Events

All events are defined in `ANALYTICS_EVENTS`:

**Store Events** (10 events)
- `store_viewed`, `store_followed`, `store_unfollowed`, `store_shared`
- `store_contact_clicked`, `store_info_viewed`, etc.

**Product Events** (19 events)
- `product_viewed`, `product_quick_viewed`, `product_searched`
- `product_filtered`, `product_sorted`, `product_list_viewed`
- `product_wishlist_added`, `product_variant_selected`, etc.

**Cart Events** (12 events)
- `add_to_cart`, `remove_from_cart`, `cart_viewed`, `cart_updated`
- `checkout_started`, `checkout_completed`, `checkout_abandoned`, etc.

**Deal/Offer Events** (10 events)
- `deal_viewed`, `voucher_copied`, `voucher_claimed`, `cashback_earned`, etc.

**UGC Events** (10 events)
- `ugc_viewed`, `ugc_liked`, `ugc_commented`, `ugc_upload_started`, etc.

**Booking Events** (9 events)
- `booking_started`, `booking_completed`, `table_booking_started`, etc.

**And 100+ more events...**

### Custom Event Tracking

```typescript
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';

function MyComponent() {
  const { trackEvent } = useComprehensiveAnalytics();

  const handleCustomAction = () => {
    trackEvent('custom_action', {
      action_type: 'button_click',
      button_name: 'special_feature',
      value: 100,
    });
  };

  return <Button onPress={handleCustomAction}>Click Me</Button>;
}
```

### Trackable Components

```typescript
import { TrackableButton, TrackableTouchable } from '@/services/analytics';

// Trackable button - auto-tracks clicks
<TrackableButton
  eventName="promo_banner_clicked"
  eventProperties={{ banner_id: 'summer_sale', position: 'top' }}
  onPress={() => router.push('/sale')}
>
  <Text>View Sale</Text>
</TrackableButton>

// Trackable touchable - tracks any pressable
<TrackableTouchable
  eventName="product_image_tapped"
  eventProperties={{ product_id: product.id }}
  onPress={handleImageTap}
>
  <Image source={{ uri: product.image }} />
</TrackableTouchable>
```

---

## E-commerce Tracking

### Funnel Tracking

```typescript
import { ecommerceFunnel } from '@/services/analytics';

// Stage 1: Product Discovery
ecommerceFunnel.trackProductDiscovery('search', {
  query: 'running shoes',
  category: 'sports',
});

// Stage 2: Product View
ecommerceFunnel.trackProductView(
  'PROD-123',
  'Nike Air Max',
  129.99
);

// Stage 3: Add to Cart
ecommerceFunnel.trackAddToCart(
  'PROD-123',
  'Nike Air Max',
  129.99,
  1
);

// Stage 4: View Cart
ecommerceFunnel.trackViewCart(3, 389.97);

// Stage 5: Checkout Started
ecommerceFunnel.trackCheckoutStarted(3, 389.97);

// Stage 6: Payment Info
ecommerceFunnel.trackPaymentInfo('credit_card');

// Stage 7: Purchase Completed
ecommerceFunnel.trackPurchaseCompleted('TXN-12345', 389.97, 3);
```

### Get Funnel Metrics

```typescript
const funnel = await ecommerceFunnel.getFunnelState();

console.log(funnel);
// {
//   productDiscovery: 1000,
//   productView: 850,
//   addToCart: 450,
//   viewCart: 400,
//   checkoutStarted: 320,
//   paymentInfo: 280,
//   purchaseCompleted: 250,
//   conversionRate: 25.0,
//   dropOffRates: {
//     discovery_to_view: 15.0,
//     view_to_cart: 47.1,
//     cart_to_checkout: 20.0,
//     checkout_to_payment: 12.5,
//     payment_to_purchase: 10.7
//   }
// }
```

### Revenue Tracking

```typescript
import { analytics } from '@/services/analytics';

analytics.trackPurchase({
  transactionId: 'TXN-12345',
  revenue: 2499.99,
  tax: 449.99,
  shipping: 0,
  currency: 'INR',
  items: [
    {
      productId: 'PROD-123',
      name: 'Premium Headphones',
      category: 'Electronics',
      price: 1999.99,
      quantity: 1,
      brand: 'Sony',
    },
    {
      productId: 'PROD-456',
      name: 'Phone Case',
      category: 'Accessories',
      price: 500.00,
      quantity: 1,
    },
  ],
  coupon: 'SAVE20',
  discount: 500,
  paymentMethod: 'credit_card',
});
```

---

## Privacy & Consent

### Request Consent

```typescript
import { consentManager } from '@/services/analytics';

// Request consent with specific categories
const consent = await consentManager.requestConsent({
  analytics: true,
  marketing: false,
  personalization: true,
});

// Grant all consent
await consentManager.grantAll();

// Revoke all consent
await consentManager.revokeAll();

// Update specific category
await consentManager.updateCategory('marketing', true);
```

### Check Consent

```typescript
// Check if consent granted
const hasConsent = await consentManager.hasConsent();

// Check specific category
const hasAnalytics = await consentManager.hasCategoryConsent('analytics');

// Check if consent required
const needsConsent = await consentManager.isConsentRequired();
```

### Consent UI Example

```typescript
import { consentManager } from '@/services/analytics';

function ConsentModal() {
  const [consent, setConsent] = useState({
    analytics: false,
    marketing: false,
    personalization: false,
  });

  const handleAcceptAll = async () => {
    await consentManager.grantAll();
    closeModal();
  };

  const handleRejectAll = async () => {
    await consentManager.revokeAll();
    closeModal();
  };

  const handleCustomize = async () => {
    await consentManager.requestConsent(consent);
    closeModal();
  };

  return (
    <Modal>
      <Text>We use cookies and analytics to improve your experience</Text>

      <Switch
        value={consent.analytics}
        onValueChange={(v) => setConsent({ ...consent, analytics: v })}
      >
        Analytics
      </Switch>

      <Switch
        value={consent.marketing}
        onValueChange={(v) => setConsent({ ...consent, marketing: v })}
      >
        Marketing
      </Switch>

      <Button onPress={handleAcceptAll}>Accept All</Button>
      <Button onPress={handleRejectAll}>Reject All</Button>
      <Button onPress={handleCustomize}>Save Preferences</Button>
    </Modal>
  );
}
```

---

## Provider Integration

### Custom Backend Provider

Automatically enabled. Sends events to your backend API.

**Backend Endpoint:**
```
POST /api/analytics/events
```

**Payload:**
```json
{
  "events": [
    {
      "name": "product_viewed",
      "properties": {
        "product_id": "PROD-123",
        "product_name": "Nike Air Max",
        "price": 129.99
      },
      "timestamp": 1699000000000,
      "userId": "USER-456",
      "sessionId": "session_123",
      "platform": "ios",
      "appVersion": "1.0.0"
    }
  ],
  "sessionId": "session_123",
  "userId": "USER-456"
}
```

### Firebase Analytics

```bash
# Install Firebase
expo install @react-native-firebase/analytics @react-native-firebase/app

# Configure in app.json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app"
    ]
  }
}

# Add google-services.json (Android) and GoogleService-Info.plist (iOS)
```

Enable in config:
```typescript
analytics.initialize({
  providers: [
    {
      name: 'firebase',
      enabled: true,
      config: {
        debug: __DEV__,
      },
    },
  ],
});
```

### Google Analytics

(Coming soon - similar setup to Firebase)

### Mixpanel

(Coming soon)

### Amplitude

(Coming soon)

---

## Testing & Debugging

### Enable Debug Mode

```typescript
import { analyticsDebugger } from '@/services/analytics';

// Enable debugger
analyticsDebugger.setEnabled(true);

// Test an event
analyticsDebugger.testEvent('product_viewed', {
  product_id: 'PROD-123',
  product_name: 'Test Product',
  price: 99.99,
  category: 'Test',
});

// Get recent events
const recent = analyticsDebugger.getRecentEvents(10);

// Get statistics
analyticsDebugger.printStats();

// Search events
const results = analyticsDebugger.searchEvents('product');

// Export events
const json = analyticsDebugger.exportEvents();
```

### Event Validation

```typescript
import { eventValidator } from '@/services/analytics';

// Validate event
const result = eventValidator.validateEvent('product_viewed', {
  product_id: 'PROD-123',
  product_name: 'Nike Air Max',
  price: 129.99,
  category: 'Shoes',
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}

// Sanitize event name
const sanitized = eventValidator.sanitizeEventName('Product Viewed!');
// Returns: "product_viewed"

// Get event statistics
const stats = eventValidator.getEventStats();
```

### Offline Queue Inspection

```typescript
import { analyticsQueue } from '@/services/analytics';

// Get queue size
const size = analyticsQueue.getQueueSize();

// Get queue contents
const events = analyticsQueue.getQueue();

// Clear queue
await analyticsQueue.clearQueue();
```

---

## Best Practices

### 1. Event Naming

✅ **DO:**
- Use lowercase with underscores: `product_viewed`
- Be specific: `checkout_payment_failed` not `error`
- Use consistent naming: `product_*`, `cart_*`, `checkout_*`

❌ **DON'T:**
- Use spaces: `product viewed`
- Use camelCase: `productViewed`
- Be too generic: `click`, `action`

### 2. Event Properties

✅ **DO:**
- Include context: `source`, `referrer`, `timestamp`
- Use consistent types: Always number for `price`, not string
- Keep properties flat when possible

❌ **DON'T:**
- Send PII: emails, phone numbers, addresses
- Use deeply nested objects
- Send circular references

### 3. Performance

✅ **DO:**
- Use batching (already enabled)
- Track important events only
- Use offline queue for network issues

❌ **DON'T:**
- Track every scroll or mouse move
- Send huge payloads (>100KB)
- Block UI thread

### 4. Privacy

✅ **DO:**
- Request consent before tracking
- Respect user's privacy choices
- Anonymize sensitive data
- Provide opt-out mechanism

❌ **DON'T:**
- Track without consent
- Store PII in analytics
- Ignore privacy regulations (GDPR, CCPA)

---

## API Reference

### Analytics Service

```typescript
import { analytics } from '@/services/analytics';

// Initialize
analytics.initialize(config);

// Track events
analytics.trackEvent(name, properties);
analytics.trackScreen(screenName, properties);
analytics.trackError(error, context);
analytics.trackPurchase(transaction);

// User identification
analytics.setUserId(userId);
analytics.setUserProperties(properties);

// Control
analytics.setConsent(granted);
analytics.setEnabled(enabled);
analytics.flush();
analytics.trackSessionEnd();

// Get info
analytics.getSessionStats();
analytics.isEnabled();
```

### useComprehensiveAnalytics Hook

```typescript
const {
  // Generic
  trackEvent,
  trackScreen,
  trackError,
  setUserId,
  setUserProperties,

  // Store
  trackStoreViewed,
  trackStoreFollowed,
  trackStoreUnfollowed,
  trackStoreShared,
  trackStoreContactClicked,

  // Product
  trackProductViewed,
  trackProductSearched,
  trackProductFiltered,
  trackProductWishlistAdded,
  trackProductVariantSelected,

  // Cart
  trackAddToCart,
  trackRemoveFromCart,
  trackCartViewed,
  trackCheckoutStarted,
  trackCheckoutCompleted,

  // And many more...
} = useComprehensiveAnalytics();
```

### E-commerce Funnel

```typescript
import { ecommerceFunnel } from '@/services/analytics';

ecommerceFunnel.trackProductDiscovery(method, details);
ecommerceFunnel.trackProductView(id, name, price);
ecommerceFunnel.trackAddToCart(id, name, price, quantity);
ecommerceFunnel.trackViewCart(itemCount, totalValue);
ecommerceFunnel.trackCheckoutStarted(itemCount, totalValue);
ecommerceFunnel.trackPaymentInfo(paymentMethod);
ecommerceFunnel.trackPurchaseCompleted(transactionId, revenue, itemCount);

ecommerceFunnel.trackAbandonment(stage, reason);
ecommerceFunnel.getFunnelState();
ecommerceFunnel.resetFunnel();
```

### Consent Manager

```typescript
import { consentManager } from '@/services/analytics';

consentManager.requestConsent(categories);
consentManager.grantAll();
consentManager.revokeAll();
consentManager.updateCategory(category, granted);
consentManager.getConsent();
consentManager.hasConsent();
consentManager.hasCategoryConsent(category);
consentManager.isConsentRequired();
consentManager.exportConsentData();
consentManager.deleteConsentData();
```

---

## Troubleshooting

### Events not showing up

1. Check if analytics is enabled:
   ```typescript
   console.log(analytics.isEnabled());
   ```

2. Check consent:
   ```typescript
   const hasConsent = await consentManager.hasConsent();
   console.log('Consent:', hasConsent);
   ```

3. Check network:
   ```typescript
   const queueSize = analyticsQueue.getQueueSize();
   console.log('Queued events:', queueSize);
   ```

4. Enable debug mode:
   ```typescript
   analyticsDebugger.setEnabled(true);
   analyticsDebugger.printStats();
   ```

### Validation errors

```typescript
import { eventValidator } from '@/services/analytics';

// Test your event
eventValidator.testEvent('my_event', {
  property1: 'value1',
});
```

### Performance issues

- Reduce batch size
- Increase flush interval
- Check for tracking loops
- Use `eventValidator.checkForLoops()`

---

## Support

For issues or questions:
- Check the [Analytics Architecture](./ANALYTICS_ARCHITECTURE.md)
- See [Analytics Quick Reference](./ANALYTICS_QUICK_REFERENCE.md)
- Review event catalog in `services/analytics/events.ts`

---

**Last Updated:** 2025-01-12
