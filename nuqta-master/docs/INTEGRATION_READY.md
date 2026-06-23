# Frontend Integration Guide - Production Ready

**Date**: November 15, 2025
**Status**: ✅ All Systems Operational
**Backend**: http://localhost:5001 (Development) | TBD (Production)

---

## 🚀 Quick Start

### Prerequisites

**Backend**:
```bash
# 1. Install dependencies
cd user-backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and secrets

# 3. Seed database
npm run seed:all

# 4. Start server
npm start
# Server running at http://localhost:5001
```

**Frontend**:
```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Configure environment
# .env file should have:
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api

# 3. Start app
npm start
```

---

## 📡 API Base URLs

### Development
```typescript
const API_BASE_URL = 'http://localhost:5001/api';
```

### Production
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.rezapp.com/api';
```

**Current Configuration**: `frontend/utils/apiClient.ts`

---

## 🔐 Authentication Flow

### 1. Send OTP

**Endpoint**: `POST /auth/send-otp`

**Frontend Code**:
```typescript
import authApi from '@/services/authApi';

const handleSendOTP = async (phoneNumber: string) => {
  try {
    const response = await authApi.sendOTP({ phoneNumber });
    if (response.success) {
      Alert.alert('Success', 'OTP sent to your phone');
      navigation.navigate('otp-verification');
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

**Request**:
```json
{
  "phoneNumber": "+918102232747"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300
  }
}
```

### 2. Verify OTP

**Endpoint**: `POST /auth/verify-otp`

**Frontend Code**:
```typescript
const handleVerifyOTP = async (phoneNumber: string, otp: string) => {
  try {
    const response = await authApi.verifyOTP({ phoneNumber, otp });
    if (response.success && response.data) {
      // Store tokens
      await AsyncStorage.setItem('accessToken', response.data.tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);

      // Update auth state
      setUser(response.data.user);

      navigation.navigate('home');
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "673638d40b6f8c1e6c123456",
      "phoneNumber": "+918102232747",
      "isVerified": true,
      "wallet": {
        "balance": 1500.50
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 604800
    }
  }
}
```

### 3. Get Current User

**Endpoint**: `GET /auth/me`

**Frontend Code**:
```typescript
const fetchCurrentUser = async () => {
  try {
    const response = await authApi.getCurrentUser();
    if (response.success && response.data) {
      setUser(response.data);
    }
  } catch (error: any) {
    // Token expired or invalid
    await AsyncStorage.removeItem('accessToken');
    navigation.navigate('login');
  }
};
```

---

## 🛒 Shopping Cart Integration

### Get Cart

**Endpoint**: `GET /cart`

**Frontend Code**:
```typescript
import cartApi from '@/services/cartApi';

const fetchCart = async () => {
  try {
    const response = await cartApi.getCart();
    if (response.success && response.data) {
      setCart(response.data);
    }
  } catch (error: any) {
    console.error('Failed to fetch cart:', error);
  }
};
```

### Add to Cart

**Endpoint**: `POST /cart/add`

**Frontend Code**:
```typescript
const handleAddToCart = async (productId: string, quantity: number) => {
  try {
    const response = await cartApi.addToCart({
      productId,
      quantity,
      variant: selectedVariant
    });

    if (response.success) {
      Alert.alert('Success', 'Added to cart');
      // Update cart state
      setCart(response.data);
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Update Quantity

**Endpoint**: `PUT /cart/item/:productId`

**Frontend Code**:
```typescript
const handleUpdateQuantity = async (productId: string, quantity: number) => {
  try {
    const response = await cartApi.updateCartItem(productId, { quantity });
    if (response.success) {
      setCart(response.data);
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

---

## 💰 Wallet & Payments

### Get Balance

**Endpoint**: `GET /wallet/balance`

**Frontend Code**:
```typescript
import walletApi from '@/services/walletApi';

const fetchBalance = async () => {
  try {
    const response = await walletApi.getBalance();
    if (response.success && response.data) {
      setBalance(response.data.balance);
    }
  } catch (error: any) {
    console.error('Failed to fetch balance:', error);
  }
};
```

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": {
      "total": 1500.50,
      "available": 1250.50,
      "pending": 250
    },
    "coins": [
      {
        "type": "wasil",
        "amount": 1000,
        "isActive": true
      },
      {
        "type": "promo",
        "amount": 250,
        "isActive": true
      }
    ]
  }
}
```

### Topup Wallet

**Endpoint**: `POST /wallet/topup`

**Frontend Code**:
```typescript
const handleTopup = async (amount: number, paymentId: string) => {
  try {
    const response = await walletApi.topup({
      amount,
      paymentMethod: 'card',
      paymentId
    });

    if (response.success) {
      Alert.alert('Success', `Added ${amount} RC to wallet`);
      // Refresh balance
      await fetchBalance();
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Process Payment

**Endpoint**: `POST /wallet/payment`

**Frontend Code**:
```typescript
const handleWalletPayment = async (orderId: string, amount: number) => {
  try {
    const response = await walletApi.processPayment({
      amount,
      orderId,
      storeId: order.storeId,
      storeName: order.storeName,
      description: `Payment for order #${order.orderNumber}`
    });

    if (response.success) {
      Alert.alert('Success', 'Payment successful');
      navigation.navigate('order-success', { orderId });
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

---

## 📦 Orders

### Create Order

**Endpoint**: `POST /orders`

**Frontend Code**:
```typescript
import ordersApi from '@/services/ordersApi';

const handlePlaceOrder = async () => {
  try {
    const response = await ordersApi.createOrder({
      deliveryAddress: selectedAddress,
      paymentMethod: 'wallet',
      specialInstructions: instructions
    });

    if (response.success && response.data) {
      // Process payment
      await handleWalletPayment(response.data.id, response.data.totals.total);
    }
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};
```

### Get Orders

**Endpoint**: `GET /orders`

**Frontend Code**:
```typescript
const fetchOrders = async (filters?: any) => {
  try {
    const response = await ordersApi.getOrders({
      page: 1,
      limit: 20,
      status: filters?.status,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo
    });

    if (response.success && response.data) {
      setOrders(response.data.orders);
    }
  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
  }
};
```

### Track Order

**Endpoint**: `GET /orders/:orderId/tracking`

**Frontend Code**:
```typescript
const trackOrder = async (orderId: string) => {
  try {
    const response = await ordersApi.getOrderTracking(orderId);
    if (response.success && response.data) {
      setTracking(response.data);
    }
  } catch (error: any) {
    console.error('Failed to track order:', error);
  }
};
```

---

## 🔍 Search & Discovery

### Search Products

**Endpoint**: `GET /products/search`

**Frontend Code**:
```typescript
import productsApi from '@/services/productsApi';

const handleSearch = async (query: string) => {
  try {
    const response = await productsApi.searchProducts({
      q: query,
      page: 1,
      limit: 20,
      category: selectedCategory
    });

    if (response.success && response.data) {
      setSearchResults(response.data.products);
      setSuggestions(response.data.suggestions);
    }
  } catch (error: any) {
    console.error('Search failed:', error);
  }
};
```

### Get Featured Products

**Endpoint**: `GET /products/featured`

**Frontend Code**:
```typescript
const fetchFeaturedProducts = async () => {
  try {
    const response = await productsApi.getFeaturedProducts();
    if (response.success && response.data) {
      setFeaturedProducts(response.data);
    }
  } catch (error: any) {
    console.error('Failed to fetch featured products:', error);
  }
};
```

---

## 🎁 Referrals & Cashback

### Get Referral Data

**Endpoint**: `GET /referral/data`

**Frontend Code**:
```typescript
import referralApi from '@/services/referralApi';

const fetchReferralData = async () => {
  try {
    const response = await referralApi.getReferralData();
    if (response.success && response.data) {
      setReferralData(response.data);
    }
  } catch (error: any) {
    console.error('Failed to fetch referral data:', error);
  }
};
```

### Get Cashback Summary

**Endpoint**: `GET /cashback/summary`

**Frontend Code**:
```typescript
import cashbackApi from '@/services/cashbackApi';

const fetchCashbackSummary = async () => {
  try {
    const response = await cashbackApi.getCashbackSummary();
    if (response.success && response.data) {
      setCashback(response.data);
    }
  } catch (error: any) {
    console.error('Failed to fetch cashback:', error);
  }
};
```

---

## 🔔 Notifications

### Get Notifications

**Endpoint**: `GET /notifications`

**Frontend Code**:
```typescript
import notificationsApi from '@/services/notificationsApi';

const fetchNotifications = async () => {
  try {
    const response = await notificationsApi.getNotifications({
      page: 1,
      limit: 50
    });

    if (response.success && response.data) {
      setNotifications(response.data.notifications);
    }
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
  }
};
```

### Mark as Read

**Endpoint**: `PATCH /notifications/read`

**Frontend Code**:
```typescript
const markAsRead = async (notificationIds: string[]) => {
  try {
    await notificationsApi.markAsRead({ notificationIds });
    // Update local state
    setNotifications(prev =>
      prev.map(n =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      )
    );
  } catch (error: any) {
    console.error('Failed to mark as read:', error);
  }
};
```

---

## ⚙️ Error Handling

### Standard Error Response

All API errors follow this format:

```json
{
  "success": false,
  "error": "Error message for user",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

### Error Handling Pattern

```typescript
const handleApiCall = async () => {
  try {
    const response = await someApi.someMethod();

    if (response.success && response.data) {
      // Success case
      return response.data;
    } else {
      // Unexpected response format
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    // Handle different error types
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      await AsyncStorage.removeItem('accessToken');
      navigation.navigate('login');
    } else if (error.response?.status === 400) {
      // Bad request - show validation errors
      Alert.alert('Validation Error', error.response.data.error);
    } else if (error.response?.status === 500) {
      // Server error
      Alert.alert('Server Error', 'Please try again later');
    } else {
      // Network or other errors
      Alert.alert('Error', error.message || 'Something went wrong');
    }

    return null;
  }
};
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INVALID_OTP` | OTP verification failed | Show error, allow retry |
| `OTP_EXPIRED` | OTP has expired | Resend OTP |
| `INSUFFICIENT_BALANCE` | Not enough wallet balance | Prompt topup |
| `PRODUCT_OUT_OF_STOCK` | Product unavailable | Remove from cart |
| `INVALID_COUPON` | Coupon not valid | Show error |
| `UNAUTHORIZED` | Token expired/invalid | Redirect to login |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Show retry later message |

---

## 🔄 Loading States

### Best Practices

```typescript
const SomeComponent = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.fetchData();
      if (response.success) {
        setData(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return <DataView data={data} />;
};
```

---

## 🚨 Common Issues & Solutions

### Issue: "Network Error"
**Cause**: Backend not running or wrong URL
**Solution**:
```bash
# Check backend is running
cd user-backend
npm start

# Verify frontend .env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
```

### Issue: "401 Unauthorized"
**Cause**: Token expired or missing
**Solution**:
```typescript
// Clear token and redirect to login
await AsyncStorage.removeItem('accessToken');
await AsyncStorage.removeItem('refreshToken');
navigation.navigate('login');
```

### Issue: "Insufficient Balance"
**Cause**: Wallet doesn't have enough funds
**Solution**:
```typescript
// Show topup prompt
Alert.alert(
  'Insufficient Balance',
  `You need ${shortfall} more RC. Would you like to topup?`,
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Topup', onPress: () => navigation.navigate('wallet-topup') }
  ]
);
```

### Issue: TypeScript errors
**Cause**: Interface mismatch between frontend and backend
**Solution**: Check `frontend/services/*Api.ts` files and update interfaces

---

## 📚 Available API Services

All services are located in `frontend/services/`:

- `authApi.ts` - Authentication and user management
- `productsApi.ts` - Product catalog and search
- `cartApi.ts` - Shopping cart operations
- `ordersApi.ts` - Order management and tracking
- `walletApi.ts` - Wallet and transactions
- `storesApi.ts` - Store browsing and search
- `categoriesApi.ts` - Category management
- `referralApi.ts` - Referral system
- `cashbackApi.ts` - Cashback tracking
- `notificationsApi.ts` - Notifications
- `wishlistApi.ts` - Wishlist management
- `reviewsApi.ts` - Reviews and ratings
- `videosApi.ts` - Video content
- `searchApi.ts` - Universal search

---

## 🧪 Testing Your Integration

### 1. Authentication Flow
```bash
# Test login with phone
Phone: +918102232747
OTP: Check backend console logs
```

### 2. Shopping Flow
```bash
# Browse products → Add to cart → Checkout → Pay with wallet
```

### 3. Wallet Flow
```bash
# View balance → Topup → View transactions
```

### 4. Order Flow
```bash
# Place order → Track delivery → View history
```

---

## 📞 Support & Resources

**Documentation**:
- [Complete API Reference](./BACKEND_API_ENDPOINTS.md)
- [Backend Fixes Report](./BACKEND_FIXES_COMPLETE_REPORT.md)
- [Production Readiness](./COMPREHENSIVE_PRODUCTION_READINESS_REPORT.md)

**Quick Links**:
- Backend Server: http://localhost:5001
- API Health Check: http://localhost:5001/health
- API Info: http://localhost:5001/api-info

**Test Credentials**:
```
Phone: +918102232747
OTP: Check backend console logs (dev mode)
```

---

## ✅ Integration Checklist

**Before Development**:
- [ ] Backend server running
- [ ] Database seeded with test data
- [ ] Frontend .env configured
- [ ] All dependencies installed

**During Development**:
- [ ] Import correct API service
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Add proper TypeScript types
- [ ] Test with real API calls

**Before Production**:
- [ ] Update API base URL to production
- [ ] Remove console.log statements
- [ ] Test all user flows
- [ ] Verify error handling
- [ ] Check token management

---

**Status**: ✅ Ready for Integration
**Last Updated**: November 15, 2025

---

*Happy Coding! 🚀*
