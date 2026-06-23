# SMS Notification Service - Quick Reference

## 🚀 Quick Start

### Check if SMS is Configured
```typescript
import SMSService from './services/SMSService';

if (SMSService.isConfigured()) {
  console.log('✅ SMS ready to send');
}
```

### Send a Simple SMS
```typescript
await SMSService.send({
  to: '+919876543210',
  message: 'Your message here'
});
```

---

## 📱 Common SMS Methods

### Order Notifications
```typescript
// Order confirmation
await SMSService.sendOrderConfirmation(
  '+919876543210',      // Customer phone
  'ORD-12345',          // Order number
  'ABC Store'           // Store name
);

// Order status update
await SMSService.sendOrderStatusUpdate(
  '+919876543210',      // Customer phone
  'ORD-12345',          // Order number
  'preparing',          // Status: preparing, ready, out_for_delivery, delivered, cancelled
  'ABC Store'           // Store name
);

// Payment received
await SMSService.sendPaymentReceived(
  '+919876543210',      // Customer phone
  'ORD-12345',          // Order number
  15999                 // Amount in ₹
);

// Refund notification
await SMSService.sendRefundNotification(
  '+919876543210',      // Customer phone
  'ORD-12345',          // Order number
  15999                 // Refund amount in ₹
);
```

### Merchant Alerts
```typescript
// New order alert
await SMSService.sendNewOrderAlertToMerchant(
  '+919876543210',      // Merchant phone
  'ORD-12345',          // Order number
  'John Doe',           // Customer name
  15999                 // Total amount in ₹
);

// Low stock alert
await SMSService.sendLowStockAlert(
  '+919876543210',      // Merchant phone
  'iPhone 15 Pro',      // Product name
  2                     // Current stock
);

// High-value order alert
await SMSService.sendHighValueOrderAlert(
  '+919876543210',      // Merchant phone
  'ORD-12345',          // Order number
  50000                 // Amount in ₹
);
```

### Security
```typescript
// Send OTP for merchant 2FA
await SMSService.sendMerchantOTP(
  '+919876543210',      // Merchant phone
  '123456',             // OTP code
  'ABC Store'           // Merchant name
);

// Account locked alert
const unlockTime = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
await SMSService.sendAccountLockedAlert(
  '+919876543210',      // Merchant phone
  'ABC Store',          // Merchant name
  unlockTime            // When account unlocks
);
```

---

## 🔧 Utilities

### Format Phone Number
```typescript
// Adds +91 country code if missing
const formatted = SMSService.formatPhoneNumber('9876543210');
// Result: '+919876543210'

// Custom country code
const formatted = SMSService.formatPhoneNumber('9876543210', '+1');
// Result: '+19876543210'
```

---

## 🛠️ Integration Examples

### In Order Route
```typescript
import SMSService from '../services/SMSService';
import { Merchant } from '../models/Merchant';

// After order status update
if (notifyCustomer && order.customer?.phone) {
  try {
    const merchant = await Merchant.findById(merchantId);
    const storeName = merchant?.businessName || 'Store';
    const phone = SMSService.formatPhoneNumber(order.customer.phone);

    await SMSService.sendOrderStatusUpdate(
      phone,
      order.orderNumber,
      status,
      storeName
    );
  } catch (error) {
    console.warn('SMS failed:', error);
    // Don't fail the request
  }
}
```

### In Product Route
```typescript
import SMSService from '../services/SMSService';
import { Merchant } from '../models/Merchant';

// After product update
if (product.inventory.stock <= product.inventory.lowStockThreshold) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (merchant?.phone) {
      const phone = SMSService.formatPhoneNumber(merchant.phone);

      await SMSService.sendLowStockAlert(
        phone,
        product.name,
        product.inventory.stock
      );
    }
  } catch (error) {
    console.warn('SMS failed:', error);
  }
}
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Get Twilio Credentials
1. Sign up at https://www.twilio.com/
2. Get Account SID and Auth Token from Console
3. Get a Twilio phone number
4. Add to `.env` file

---

## 🎯 Status Messages

### Order Status → SMS Message
- `preparing` → "Your order is being prepared"
- `ready` → "Your order is ready for pickup/delivery"
- `out_for_delivery` → "Your order is out for delivery"
- `delivered` → "Your order has been delivered"
- `cancelled` → "Your order has been cancelled"

---

## 🔍 Troubleshooting

### SMS Not Sending?
```typescript
// Check if configured
if (!SMSService.isConfigured()) {
  console.log('Twilio not configured - check .env');
}
```

### Testing Without Twilio
```typescript
// Set these to empty in .env to test console logging:
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

// SMS will be logged to console instead
```

### Error Handling
```typescript
try {
  await SMSService.send({ to: phone, message: 'Test' });
  console.log('✅ SMS sent');
} catch (error) {
  console.error('❌ SMS failed:', error.message);
  // Handle error gracefully
}
```

---

## 📊 Best Practices

1. **Always format phone numbers**
   ```typescript
   const phone = SMSService.formatPhoneNumber(rawPhone);
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     await SMSService.send(...);
   } catch (error) {
     console.warn('SMS failed:', error);
     // Don't fail the main operation
   }
   ```

3. **Check configuration first**
   ```typescript
   if (SMSService.isConfigured()) {
     await SMSService.send(...);
   }
   ```

4. **Use specific methods for clarity**
   ```typescript
   // Good ✅
   await SMSService.sendOrderStatusUpdate(...);

   // Less clear ❌
   await SMSService.send({ to, message: 'Order ready' });
   ```

---

## 📚 Full Method List

| Method | Purpose |
|--------|---------|
| `send(options)` | Send generic SMS |
| `sendMerchantOTP(phone, otp, name)` | 2FA OTP |
| `sendOrderConfirmation(phone, order, store)` | Order confirmed |
| `sendOrderStatusUpdate(phone, order, status, store)` | Status change |
| `sendNewOrderAlertToMerchant(phone, order, customer, total)` | New order |
| `sendLowStockAlert(phone, product, stock)` | Low inventory |
| `sendHighValueOrderAlert(phone, order, total)` | High-value order |
| `sendPaymentReceived(phone, order, amount)` | Payment confirmed |
| `sendRefundNotification(phone, order, amount)` | Refund processed |
| `sendAccountLockedAlert(phone, name, unlockTime)` | Security alert |
| `formatPhoneNumber(phone, countryCode)` | Format to E.164 |
| `isConfigured()` | Check if ready |

---

## ✅ Implementation Status

- ✅ Service created: `src/services/SMSService.ts`
- ✅ Orders integrated: `src/merchantroutes/orders.ts`
- ✅ Products integrated: `src/merchantroutes/products.ts`
- ✅ Environment configured: `.env` and `.env.example`
- ✅ Twilio dependency installed: `twilio@5.8.0`

**Ready to use! 🚀**

---

*Quick Reference Guide - SMS Notification Service*
*Last Updated: November 17, 2024*
