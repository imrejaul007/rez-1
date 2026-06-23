# Loyalty Redemption System - Quick Start Guide

## Installation

### 1. Install Required Dependencies

The loyalty system needs the React Native Community Slider:

```bash
npm install @react-native-community/slider
```

Or with Expo:
```bash
npx expo install @react-native-community/slider
```

### 2. Verify Existing Dependencies

Make sure you have these already installed (should be from previous features):
- `react-native-reanimated` - For animations
- `expo-linear-gradient` - For gradient backgrounds
- `socket.io-client` - For real-time updates

## Files Created

### Types
- `types/loyaltyRedemption.types.ts` - All type definitions

### Services
- `services/loyaltyRedemptionApi.ts` - API service layer

### Hooks
- `hooks/useLoyaltyRedemption.ts` - Main state management hook

### Components (all in `components/loyalty/`)
- `RewardCard.tsx` - Display individual rewards
- `RedemptionModal.tsx` - Redemption flow modal
- `PointsSlider.tsx` - Points selection slider
- `TierBenefitsCard.tsx` - Tier benefits display
- `RewardCatalog.tsx` - Browse rewards
- `RedemptionHistory.tsx` - Past redemptions
- `PointsExpiryBanner.tsx` - Expiry warnings

### Pages
- `app/loyalty.tsx` - Main loyalty page (updated)

## Backend Requirements

Your backend needs these endpoints:

```typescript
// Rewards Catalog
GET /api/loyalty/catalog?category=voucher&sortBy=points

// Point Balance
GET /api/loyalty/points/balance

// Redemption
POST /api/loyalty/redeem
{
  "rewardId": "reward_123",
  "points": 500,
  "quantity": 1
}

// Tier Info
GET /api/loyalty/tier

// Redemption History
GET /api/loyalty/redemptions?limit=20&status=active

// Gamification
POST /api/loyalty/games/check-in
POST /api/loyalty/games/spin-wheel
GET /api/loyalty/challenges
POST /api/loyalty/challenges/:id/claim

// Expiring Points
GET /api/loyalty/points/expiring
```

## WebSocket Events (Optional but Recommended)

Add these to your backend Socket.IO:

```javascript
// Emit when points change
socket.emit('loyalty:pointsUpdated', {
  points: 1250,
  transaction: { ... }
});

// Emit when tier upgrades
socket.emit('loyalty:tierUpdated', {
  tier: 'Gold',
  benefits: [...]
});

// Emit when new reward available
socket.emit('loyalty:rewardAvailable', rewardData);

// Emit when challenge completed
socket.emit('loyalty:challengeCompleted', challengeData);
```

## Quick Test

### 1. Navigate to Loyalty Page

```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/loyalty');
```

### 2. Test Hook Directly

```tsx
import useLoyaltyRedemption from '@/hooks/useLoyaltyRedemption';

function TestComponent() {
  const {
    balance,
    rewards,
    loading,
    error,
    redeemReward,
    dailyCheckIn,
  } = useLoyaltyRedemption();

  console.log('Current Points:', balance?.currentPoints);
  console.log('Available Rewards:', rewards.length);

  return null;
}
```

### 3. Test Redemption

```tsx
const { redeemReward } = useLoyaltyRedemption();

// Redeem a reward
const result = await redeemReward({
  rewardId: 'reward_abc123',
  points: 500,
});

console.log('Voucher Code:', result.voucher?.code);
console.log('New Balance:', result.newBalance);
```

## Sample Backend Response Formats

### Point Balance Response
```json
{
  "success": true,
  "data": {
    "currentPoints": 1250,
    "lifetimePoints": 5000,
    "pendingPoints": 0,
    "expiringPoints": 100,
    "expiryDate": "2025-12-31",
    "tier": "Silver",
    "nextTier": "Gold",
    "pointsToNextTier": 3750
  }
}
```

### Rewards Catalog Response
```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "_id": "reward_123",
        "title": "₹100 OFF Voucher",
        "description": "Get ₹100 off on orders above ₹500",
        "type": "discountVoucher",
        "category": "voucher",
        "points": 500,
        "value": 100,
        "icon": "pricetag",
        "available": true,
        "featured": true,
        "stockRemaining": 50,
        "validUntil": "2025-12-31",
        "termsAndConditions": [
          "Valid on orders above ₹500",
          "Cannot be combined with other offers",
          "Valid for 30 days from redemption"
        ]
      }
    ],
    "total": 25
  }
}
```

### Tier Info Response
```json
{
  "success": true,
  "data": {
    "name": "Silver",
    "minPoints": 1000,
    "maxPoints": 4999,
    "color": "#C0C0C0",
    "icon": "star",
    "discountPercentage": 5,
    "earningMultiplier": 1.2,
    "benefits": [
      {
        "id": "ben_1",
        "title": "5% Extra Discount",
        "description": "Get 5% extra discount on all orders",
        "icon": "pricetag",
        "type": "discount",
        "value": "5%"
      },
      {
        "id": "ben_2",
        "title": "Priority Support",
        "description": "Get faster response from support",
        "icon": "flash",
        "type": "priority"
      }
    ]
  }
}
```

### Redemption Response
```json
{
  "success": true,
  "data": {
    "message": "Reward redeemed successfully",
    "newBalance": 750,
    "redemption": {
      "_id": "redemption_xyz",
      "userId": "user_123",
      "reward": { /* reward object */ },
      "pointsSpent": 500,
      "status": "active",
      "redeemedAt": "2025-10-27T10:30:00Z",
      "expiresAt": "2025-11-27T10:30:00Z",
      "code": "WELCOME100"
    },
    "voucher": {
      "code": "WELCOME100",
      "value": 100,
      "type": "fixed",
      "expiryDate": "2025-11-27T10:30:00Z",
      "minPurchase": 500,
      "usageLimit": 1,
      "usageCount": 0
    }
  }
}
```

## Troubleshooting

### Issue: "Cannot find module '@react-native-community/slider'"
**Solution:** Install the slider package:
```bash
npm install @react-native-community/slider
```

### Issue: Real-time updates not working
**Solution:**
1. Check if SocketContext is in your app layout
2. Verify WebSocket connection in backend
3. Check event names match exactly

### Issue: "balance is null"
**Solution:**
1. Verify backend endpoint returns correct format
2. Check API base URL in env.ts
3. Look for errors in console

### Issue: Animations not smooth
**Solution:**
1. Ensure react-native-reanimated is installed
2. Add Reanimated plugin to babel.config.js
3. Restart development server

## Environment Variables

Add to your `.env` file:

```env
# Loyalty System
EXPO_PUBLIC_LOYALTY_POINT_VALUE=0.1     # 1 point = ₹0.10
EXPO_PUBLIC_LOYALTY_EXPIRY_DAYS=365     # Points expire after 1 year
EXPO_PUBLIC_LOYALTY_MIN_REDEMPTION=100  # Minimum points to redeem
```

## Testing Steps

1. **Load Page:** Navigate to `/loyalty` - should show points balance
2. **View Rewards:** Tap "Rewards" tab - should show available rewards
3. **Search:** Type in search box - should filter results
4. **Filter:** Tap category chips - should filter by category
5. **Redeem:** Tap "Redeem Now" - should open modal
6. **Daily Check-in:** Tap check-in card - should earn points
7. **View History:** Tap "History" tab - should show past redemptions
8. **Real-time:** Earn points elsewhere - should update automatically

## Performance Tips

1. **Enable Caching:**
```tsx
const { balance, rewards } = useLoyaltyRedemption({
  autoLoad: true,
  enableRealTimeUpdates: true,  // Disable if not needed
});
```

2. **Lazy Load Images:**
Reward images are lazy loaded automatically

3. **Pagination:**
Load rewards in batches of 20

## Next Steps

1. Configure backend endpoints
2. Set up WebSocket events (optional)
3. Customize tier colors and benefits
4. Add custom reward types
5. Configure point-to-money ratio
6. Set up push notifications for expiry
7. Add analytics tracking

## Support

- Full documentation: `LOYALTY_REDEMPTION_COMPLETE.md`
- Type definitions: `types/loyaltyRedemption.types.ts`
- API reference: `services/loyaltyRedemptionApi.ts`
- Hook usage: `hooks/useLoyaltyRedemption.ts`

---

**Ready to use! 🚀**

Your loyalty redemption system is fully functional. Users can now:
- Earn points from purchases, reviews, referrals
- Redeem points for rewards and vouchers
- Track tier progress and benefits
- Complete challenges for bonus points
- Get notified of expiring points
- View redemption history
- Auto-apply rewards at checkout
