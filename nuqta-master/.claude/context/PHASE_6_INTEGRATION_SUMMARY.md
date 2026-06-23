# Phase 6 Frontend Integration - Quick Reference

## 🎯 What's New

Phase 6 adds **complete profile and account management** features to the REZ app, replacing all mock data with real backend integration.

## 📦 New API Services

### 1. Address Management (`addressApi.ts`)

```typescript
import addressApi from '@/services/addressApi';

// Get all addresses
const addresses = await addressApi.getUserAddresses();

// Create new address
const newAddress = await addressApi.createAddress({
  type: 'HOME',
  title: 'Home',
  addressLine1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'USA'
});

// Set as default
await addressApi.setDefaultAddress(newAddress.data.id);

// Update address
await addressApi.updateAddress(id, { city: 'Brooklyn' });

// Delete address
await addressApi.deleteAddress(id);
```

### 2. Payment Methods (`paymentMethodApi.ts`)

```typescript
import paymentMethodApi from '@/services/paymentMethodApi';

// Get all payment methods
const methods = await paymentMethodApi.getUserPaymentMethods();

// Add credit card
const card = await paymentMethodApi.createPaymentMethod({
  type: 'CARD',
  card: {
    type: 'CREDIT',
    brand: 'VISA',
    cardNumber: '4242424242424242',
    expiryMonth: 12,
    expiryYear: 2026,
    cardholderName: 'John Doe',
    nickname: 'Main Card'
  },
  isDefault: true
});

// Add bank account
const bank = await paymentMethodApi.createPaymentMethod({
  type: 'BANK_ACCOUNT',
  bankAccount: {
    bankName: 'Chase Bank',
    accountType: 'SAVINGS',
    accountNumber: '1234567890',
    ifscCode: 'CHASUS33',
    nickname: 'Primary Savings',
    isVerified: true
  }
});

// Add UPI
const upi = await paymentMethodApi.createPaymentMethod({
  type: 'UPI',
  upi: {
    vpa: 'user@upi',
    nickname: 'My UPI',
    isVerified: true
  }
});
```

### 3. User Settings (`userSettingsApi.ts`)

```typescript
import userSettingsApi from '@/services/userSettingsApi';

// Get all settings
const settings = await userSettingsApi.getUserSettings();

// Update notifications
await userSettingsApi.updateNotificationPreferences({
  push: {
    enabled: true,
    orderUpdates: true,
    promotions: false,
    deliveryUpdates: true
  },
  email: {
    enabled: true,
    orderReceipts: true,
    newsletters: false
  }
});

// Update privacy
await userSettingsApi.updatePrivacySettings({
  profileVisibility: 'FRIENDS',
  showActivity: false,
  allowMessaging: true
});

// Update security
await userSettingsApi.updateSecuritySettings({
  twoFactorAuth: {
    enabled: true,
    method: '2FA_SMS'
  },
  biometric: {
    fingerprintEnabled: true,
    faceIdEnabled: true
  }
});

// Update general settings
await userSettingsApi.updateGeneralSettings({
  language: 'en',
  currency: 'USD',
  theme: 'dark'
});
```

### 4. Achievements (`achievementApi.ts`)

```typescript
import achievementApi from '@/services/achievementApi';

// Get all achievements
const achievements = await achievementApi.getUserAchievements();

// Get only unlocked
const unlocked = await achievementApi.getUnlockedAchievements();

// Get progress summary
const progress = await achievementApi.getAchievementProgress();
console.log(`${progress.data.summary.unlocked} / ${progress.data.summary.total} unlocked`);
console.log(`Completion: ${progress.data.summary.completionPercentage}%`);

// Initialize achievements (on new user registration)
await achievementApi.initializeUserAchievements();

// Recalculate achievements (after major actions)
await achievementApi.recalculateAchievements();
```

### 5. Activity Feed (`activityApi.ts`)

```typescript
import activityApi from '@/services/activityApi';

// Get recent activities (paginated)
const activities = await activityApi.getUserActivities(1, 20);

// Filter by type
const orderActivities = await activityApi.getUserActivities(1, 20, 'ORDER');

// Get activity summary
const summary = await activityApi.getActivitySummary();
console.log(`Total activities: ${summary.data.totalActivities}`);

// Create activity (system-side, not user-facing)
await activityApi.createActivity({
  type: 'ORDER',
  title: 'Order delivered successfully',
  description: 'Fashion items from Trendy Store',
  amount: 129.99,
  relatedEntity: { id: orderId, type: 'Order' }
});
```

## 🔄 Replacing Mock Data

### Before (Mock Data)
```typescript
import { mockDeliveryAddresses, mockSavedCards } from '@/data/accountData';
import { achievementBadges, recentActivity } from '@/data/profileData';

// Using mock data
const addresses = mockDeliveryAddresses;
const achievements = achievementBadges;
```

### After (Real API)
```typescript
import addressApi from '@/services/addressApi';
import achievementApi from '@/services/achievementApi';

// Fetch real data
const { data: addresses } = await addressApi.getUserAddresses();
const { data: achievements } = await achievementApi.getUserAchievements();
```

## 📱 Integration with Existing Contexts

### AuthContext Integration

The existing `ProfileContext` already integrates with `AuthContext` and maps user data:

```typescript
// ProfileContext.tsx already handles this
const mapBackendUserToProfileUser = (backendUser: BackendUser): User => {
  return {
    id: backendUser.id,
    name: `${backendUser.profile?.firstName} ${backendUser.profile?.lastName}`,
    wallet: {
      balance: backendUser.wallet?.balance || 0,
      totalEarned: backendUser.wallet?.totalEarned || 0,
      totalSpent: backendUser.wallet?.totalSpent || 0,
    },
    // ... preferences mapping
  };
};
```

### Adding New Data to Contexts

You can extend contexts to include Phase 6 data:

```typescript
// In ProfileContext or create new contexts
const [addresses, setAddresses] = useState<Address[]>([]);
const [achievements, setAchievements] = useState<Achievement[]>([]);

useEffect(() => {
  const loadData = async () => {
    const [addressRes, achievementRes] = await Promise.all([
      addressApi.getUserAddresses(),
      achievementApi.getUserAchievements()
    ]);

    setAddresses(addressRes.data);
    setAchievements(achievementRes.data);
  };

  loadData();
}, []);
```

## 🎨 TypeScript Types

All services come with complete TypeScript types:

```typescript
// Address types
import { Address, AddressType, AddressCreate } from '@/services/addressApi';

// Payment types
import {
  PaymentMethod,
  PaymentMethodType,
  CardType,
  CardBrand
} from '@/services/paymentMethodApi';

// Settings types
import {
  UserSettings,
  NotificationPreferences,
  PrivacySettings,
  SecuritySettings
} from '@/services/userSettingsApi';

// Achievement types
import { Achievement, AchievementType } from '@/services/achievementApi';

// Activity types
import { Activity, ActivityType } from '@/services/activityApi';
```

## 🔐 Authentication

All API calls automatically include the authentication token via `apiClient`:

```typescript
// apiClient.ts already handles this
const token = await getAccessToken();
config.headers.Authorization = `Bearer ${token}`;
```

No need to manually add auth headers!

## ⚡ Usage Patterns

### Pattern 1: Load on Mount

```typescript
const ProfileScreen = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const { data } = await addressApi.getUserAddresses();
        setAddresses(data);
      } catch (error) {
        console.error('Failed to load addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  return loading ? <Spinner /> : <AddressList addresses={addresses} />;
};
```

### Pattern 2: Optimistic Updates

```typescript
const handleSetDefault = async (addressId: string) => {
  // Optimistic update
  setAddresses(prev =>
    prev.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId
    }))
  );

  try {
    await addressApi.setDefaultAddress(addressId);
  } catch (error) {
    // Revert on error
    const { data } = await addressApi.getUserAddresses();
    setAddresses(data);
  }
};
```

### Pattern 3: Mutation with Refetch

```typescript
const handleCreateAddress = async (newAddress: AddressCreate) => {
  try {
    await addressApi.createAddress(newAddress);

    // Refetch to get updated list
    const { data } = await addressApi.getUserAddresses();
    setAddresses(data);

    navigation.goBack();
  } catch (error) {
    showError('Failed to create address');
  }
};
```

### Pattern 4: Using with React Query (if installed)

```typescript
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Query
const { data: addresses, isLoading } = useQuery(
  'addresses',
  () => addressApi.getUserAddresses().then(res => res.data)
);

// Mutation
const queryClient = useQueryClient();
const createMutation = useMutation(
  (data: AddressCreate) => addressApi.createAddress(data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries('addresses');
    }
  }
);
```

## 📊 Dashboard Integration Example

Complete profile dashboard with all Phase 6 data:

```typescript
const ProfileDashboard = () => {
  const [data, setData] = useState({
    stats: null,
    achievements: null,
    activities: null,
    settings: null
  });

  useEffect(() => {
    const loadAll = async () => {
      const [stats, achievements, activities, settings] = await Promise.all([
        authApi.getUserStatistics(),
        achievementApi.getAchievementProgress(),
        activityApi.getUserActivities(1, 10),
        userSettingsApi.getUserSettings()
      ]);

      setData({
        stats: stats.data,
        achievements: achievements.data,
        activities: activities.data,
        settings: settings.data
      });
    };

    loadAll();
  }, []);

  return (
    <View>
      <StatsSummary data={data.stats} />
      <AchievementBadges achievements={data.achievements} />
      <RecentActivity activities={data.activities.activities} />
      <QuickSettings settings={data.settings} />
    </View>
  );
};
```

## 🐛 Error Handling

All API services use the centralized error handling from `apiClient`:

```typescript
try {
  const { data } = await addressApi.createAddress(newAddress);
  // Success
} catch (error: any) {
  // apiClient already handles:
  // - Network errors
  // - Auth errors (401 -> refresh token)
  // - Server errors (500)

  // Show user-friendly message
  if (error.response?.data?.message) {
    showError(error.response.data.message);
  } else {
    showError('Something went wrong. Please try again.');
  }
}
```

## 🚀 Quick Start Checklist

- [ ] Import the API service you need
- [ ] Add loading state
- [ ] Call the API method (async/await or .then())
- [ ] Update component state with response
- [ ] Handle errors gracefully
- [ ] Add loading indicators
- [ ] Test with real backend

## 📱 Screen Examples

### Address Management Screen
```typescript
import addressApi from '@/services/addressApi';

// List, create, edit, delete, set default
```

### Settings Screen
```typescript
import userSettingsApi from '@/services/userSettingsApi';

// Toggle switches, update preferences
```

### Achievements Screen
```typescript
import achievementApi from '@/services/achievementApi';

// Display badges, progress bars
```

### Activity Feed Screen
```typescript
import activityApi from '@/services/activityApi';

// Infinite scroll, pull to refresh
```

## 🔗 Backend Endpoints

All endpoints are prefixed with `/api`:

- `/api/addresses` - Address management
- `/api/payment-methods` - Payment methods
- `/api/user-settings` - User settings
- `/api/achievements` - Achievements
- `/api/activities` - Activity feed

Backend is running on `http://localhost:5001` (or your configured port).

## ✅ Phase 6 Complete!

You now have:
- ✅ Complete address management
- ✅ Payment methods (cards, banks, UPI)
- ✅ Granular user settings
- ✅ Achievement & badges system
- ✅ Activity feed
- ✅ Full TypeScript support
- ✅ Centralized error handling
- ✅ Authentication built-in

Happy coding! 🎉