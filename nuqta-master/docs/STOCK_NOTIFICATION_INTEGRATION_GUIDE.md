# Stock Notification API - Frontend Integration Guide

**Quick Start Guide for Frontend Developers**
**Estimated Time:** 1-2 hours
**Status:** Backend API is 100% ready

---

## TL;DR - What You Need to Do

1. ✅ **Backend is ready** - All APIs are live at `/api/stock-notifications`
2. 🚧 **Create API service** - Copy code from Section 2 below
3. 🚧 **Update ProductPage** - Replace mock code (Lines 440-456)
4. 🚧 **Test** - Verify subscribe/unsubscribe flow works

---

## 1. Create API Service (10 minutes)

**File:** `frontend/services/stockNotificationApi.ts` (NEW FILE)

```typescript
import apiClient from './apiClient';

export interface StockSubscription {
  _id: string;
  userId: string;
  productId: string;
  notificationMethod: 'email' | 'sms' | 'both' | 'push';
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
  product?: {
    name: string;
    image: string;
    price: number;
  };
}

class StockNotificationApi {
  private baseUrl = '/stock-notifications';

  /**
   * Subscribe to product stock notifications
   * @param productId - Product ID to subscribe to
   * @param method - Notification method (default: 'push')
   */
  async subscribe(
    productId: string,
    method: 'email' | 'sms' | 'both' | 'push' = 'push'
  ) {
    const response = await apiClient.post(`${this.baseUrl}/subscribe`, {
      productId,
      method
    });
    return response.data;
  }

  /**
   * Unsubscribe from product stock notifications
   * @param productId - Product ID to unsubscribe from
   */
  async unsubscribe(productId: string) {
    const response = await apiClient.post(`${this.baseUrl}/unsubscribe`, {
      productId
    });
    return response.data;
  }

  /**
   * Get user's stock notification subscriptions
   * @param status - Filter by status (optional)
   */
  async getMySubscriptions(status?: 'pending' | 'sent' | 'cancelled') {
    const params = status ? { status } : {};
    const response = await apiClient.get(`${this.baseUrl}/my-subscriptions`, {
      params
    });
    return response.data;
  }

  /**
   * Check if user is subscribed to a product
   * @param productId - Product ID to check
   * @returns boolean - true if subscribed
   */
  async checkSubscription(productId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/check/${productId}`);
      return response.data?.data?.isSubscribed || false;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * Delete a subscription
   * @param notificationId - Subscription ID to delete
   */
  async deleteSubscription(notificationId: string) {
    const response = await apiClient.delete(`${this.baseUrl}/${notificationId}`);
    return response.data;
  }
}

export const stockNotificationApi = new StockNotificationApi();
export default stockNotificationApi;
```

---

## 2. Update ProductPage (20 minutes)

**File:** `frontend/app/product/[id].tsx`

### Step 1: Import the API service

**Add to imports (around line 1-30):**
```typescript
import stockNotificationApi from '@/services/stockNotificationApi';
```

### Step 2: Add subscription check on page load

**Find the useEffect that loads product data, add this after:**
```typescript
// Check if user is subscribed to stock notifications
useEffect(() => {
  const checkNotificationStatus = async () => {
    if (!product?.id || product?.inventory?.stock > 0) return;

    try {
      const subscribed = await stockNotificationApi.checkSubscription(product.id);
      setIsNotified(subscribed);
    } catch (error) {
      console.error('Failed to check notification status:', error);
    }
  };

  checkNotificationStatus();
}, [product?.id, product?.inventory?.stock]);
```

### Step 3: Replace Mock Handler (Lines 440-456)

**BEFORE (Mock Implementation):**
```typescript
const handleNotifyMe = async () => {
  setNotifyLoading(true);
  try {
    // TODO: Integrate with backend API when available
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsNotified(true);
    Alert.alert(
      'Success',
      "You'll be notified when this product is back in stock!"
    );
  } catch (error) {
    Alert.alert('Error', 'Failed to subscribe. Please try again.');
  } finally {
    setNotifyLoading(false);
  }
};
```

**AFTER (Real Implementation):**
```typescript
const handleNotifyMe = async () => {
  if (!product?.id) {
    Alert.alert('Error', 'Product information is not available.');
    return;
  }

  setNotifyLoading(true);
  try {
    if (isNotified) {
      // Unsubscribe from notifications
      await stockNotificationApi.unsubscribe(product.id);
      setIsNotified(false);

      Alert.alert(
        'Unsubscribed',
        'You will no longer receive stock notifications for this product.'
      );
    } else {
      // Subscribe to notifications
      const response = await stockNotificationApi.subscribe(product.id, 'push');
      setIsNotified(true);

      Alert.alert(
        'Success',
        response.data?.message || "You'll be notified when this product is back in stock!"
      );
    }
  } catch (error: any) {
    console.error('Stock notification error:', error);

    const errorMessage = error.response?.data?.message
      || error.message
      || 'Failed to update notification preference. Please try again.';

    Alert.alert('Error', errorMessage);
  } finally {
    setNotifyLoading(false);
  }
};
```

### Step 4: Update Button Text (Optional)

**Find the "Notify Me" button, update text to show subscription status:**

```typescript
<TouchableOpacity
  style={[
    styles.notifyButton,
    isNotified && styles.notifyButtonActive
  ]}
  onPress={handleNotifyMe}
  disabled={notifyLoading}
>
  {notifyLoading ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : (
    <>
      <Ionicons
        name={isNotified ? "checkmark-circle" : "notifications-outline"}
        size={20}
        color="#fff"
      />
      <Text style={styles.notifyButtonText}>
        {isNotified ? "Subscribed ✓" : "Notify Me"}
      </Text>
    </>
  )}
</TouchableOpacity>
```

### Step 5: Add Active Button Style (Optional)

**Add to StyleSheet:**
```typescript
notifyButtonActive: {
  backgroundColor: '#10B981', // Green to indicate active subscription
  borderColor: '#10B981',
},
```

---

## 3. Testing Checklist

### Local Testing (Frontend)

1. **Subscribe Flow**
   - [ ] Open product page with out-of-stock item
   - [ ] Click "Notify Me" button
   - [ ] Verify loading state shows
   - [ ] Verify success alert appears
   - [ ] Verify button changes to "Subscribed ✓"
   - [ ] Verify button turns green

2. **Unsubscribe Flow**
   - [ ] Click "Subscribed ✓" button
   - [ ] Verify confirmation/unsubscribe alert
   - [ ] Verify button changes back to "Notify Me"

3. **Persistence Check**
   - [ ] Subscribe to product
   - [ ] Close app/navigate away
   - [ ] Return to product page
   - [ ] Verify button still shows "Subscribed ✓"

4. **Error Handling**
   - [ ] Disconnect internet
   - [ ] Try to subscribe
   - [ ] Verify error alert shows
   - [ ] Reconnect internet
   - [ ] Verify can subscribe successfully

### Backend Integration Testing

1. **Check Subscription Created**
   ```bash
   # In MongoDB
   db.stocknotifications.find({ productId: ObjectId("YOUR_PRODUCT_ID") })
   ```

2. **Verify API Calls**
   ```javascript
   // In browser console (React Native Debugger)
   // Should see successful API responses
   ```

3. **Test Notification Trigger**
   - Subscribe to product
   - Update product stock from 0 to 10 (via merchant panel)
   - Check in-app notifications
   - Verify subscription status changes to 'sent'

---

## 4. API Response Examples

### Subscribe Success
```json
{
  "success": true,
  "message": "Subscribed successfully",
  "data": {
    "subscription": {
      "_id": "67890abcdef1234567890def",
      "userId": "12345abcdef1234567890abc",
      "productId": "67890abcdef1234567890abc",
      "notificationMethod": "push",
      "status": "pending",
      "createdAt": "2025-12-01T10:30:00.000Z"
    },
    "message": "You'll be notified when this product is back in stock"
  }
}
```

### Check Subscription
```json
{
  "success": true,
  "message": "Subscription status retrieved",
  "data": {
    "isSubscribed": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404
}
```

---

## 5. Common Issues & Solutions

### Issue: "No token provided"
**Solution:** User is not logged in. Ensure authentication check before showing button.

```typescript
// Only show button to logged-in users
{isAuthenticated && product?.inventory?.stock === 0 && (
  <TouchableOpacity onPress={handleNotifyMe}>
    {/* Button content */}
  </TouchableOpacity>
)}
```

### Issue: API call fails silently
**Solution:** Check apiClient configuration, ensure base URL is correct.

```typescript
// In services/apiClient.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';
```

### Issue: Button state doesn't persist
**Solution:** Ensure `checkSubscription` is called on component mount.

### Issue: "Product not found" error
**Solution:** Verify product ID is correct and product exists in database.

---

## 6. Optional: Create Subscriptions Management Page

**File:** `frontend/app/notifications/stock-subscriptions.tsx` (NEW)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import stockNotificationApi, { StockSubscription } from '@/services/stockNotificationApi';

export default function StockSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<StockSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await stockNotificationApi.getMySubscriptions('pending');
      setSubscriptions(response.data?.subscriptions || []);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (productId: string) => {
    Alert.alert(
      'Unsubscribe',
      'Are you sure you want to stop receiving notifications for this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              await stockNotificationApi.unsubscribe(productId);
              loadSubscriptions(); // Refresh list
              Alert.alert('Success', 'Unsubscribed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to unsubscribe');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.subscriptionCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.productId?.name}</Text>
        <Text style={styles.subscriptionDate}>
          Subscribed on {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unsubscribeButton}
        onPress={() => handleUnsubscribe(item.productId._id)}
      >
        <Text style={styles.unsubscribeText}>Unsubscribe</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stock Notifications</Text>
      {loading ? (
        <Text>Loading...</Text>
      ) : subscriptions.length === 0 ? (
        <Text style={styles.emptyText}>
          No active stock notifications
        </Text>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
        />
      )}
    </View>
  );
}

// Add styles...
```

---

## 7. Performance Tips

### Debounce Button Clicks
```typescript
const [lastClickTime, setLastClickTime] = useState(0);

const handleNotifyMe = async () => {
  const now = Date.now();
  if (now - lastClickTime < 1000) return; // Prevent double-click
  setLastClickTime(now);

  // ... rest of handler
};
```

### Cache Subscription Status
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache subscription status
const cacheSubscriptionStatus = async (productId: string, isSubscribed: boolean) => {
  await AsyncStorage.setItem(
    `stock_notification_${productId}`,
    JSON.stringify(isSubscribed)
  );
};

// Read from cache first
const getCachedSubscriptionStatus = async (productId: string) => {
  const cached = await AsyncStorage.getItem(`stock_notification_${productId}`);
  return cached ? JSON.parse(cached) : null;
};
```

---

## 8. Future Enhancements

### Multi-Notification Method Support
```typescript
const handleNotifyMe = async (method: 'push' | 'email' | 'sms' | 'both') => {
  // Allow user to choose notification method
  await stockNotificationApi.subscribe(product.id, method);
};
```

### Notification Preferences Modal
```typescript
<Modal visible={showPreferences}>
  <Text>How would you like to be notified?</Text>
  <CheckBox label="Push Notification" value={preferences.push} />
  <CheckBox label="Email" value={preferences.email} />
  <CheckBox label="SMS" value={preferences.sms} />
</Modal>
```

---

## 9. Backend API Endpoints Reference

```
Base URL: http://localhost:5001/api/stock-notifications
All endpoints require authentication (JWT token)

┌──────────────────────────────────────────────────────────┐
│  POST /subscribe                                          │
│  Body: { productId, method }                             │
│  Returns: Subscription object                            │
├──────────────────────────────────────────────────────────┤
│  POST /unsubscribe                                        │
│  Body: { productId }                                     │
│  Returns: Success message                                │
├──────────────────────────────────────────────────────────┤
│  GET /my-subscriptions?status=pending                     │
│  Returns: Array of subscriptions                         │
├──────────────────────────────────────────────────────────┤
│  GET /check/:productId                                    │
│  Returns: { isSubscribed: boolean }                      │
├──────────────────────────────────────────────────────────┤
│  DELETE /:notificationId                                  │
│  Returns: Success message                                │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Contact & Support

**Backend Team:** API is fully implemented and tested
**Documentation:** See `user-backend/STOCK_NOTIFICATION_API_COMPLETE.md` for full technical details

**Questions?**
- Check backend logs for API errors
- Use MongoDB Compass to verify data
- Test API directly with Postman/Insomnia

---

## Quick Copy-Paste Checklist

- [ ] Copy `stockNotificationApi.ts` from Section 1
- [ ] Import API in ProductPage
- [ ] Add subscription check useEffect
- [ ] Replace `handleNotifyMe` function (Lines 440-456)
- [ ] Update button text/styling
- [ ] Test subscribe flow
- [ ] Test unsubscribe flow
- [ ] Commit changes

**Estimated Total Time:** 1-2 hours

---

**Document Version:** 1.0
**Created:** December 1, 2025
**For:** Frontend Development Team
