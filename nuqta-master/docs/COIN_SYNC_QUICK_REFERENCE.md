# Coin Sync Quick Reference Guide

## TL;DR

**WALLET API IS THE SINGLE SOURCE OF TRUTH FOR ALL COIN BALANCES**

Use this guide when implementing any feature that involves coins.

## Quick Decision Tree

```
Need to display coin balance?
├─ YES → Use Wallet API or GamificationContext
│         const coins = state.coinBalance.total
│
Need to award coins?
├─ YES → Use Coin Sync Service
│         await coinSyncService.syncGamificationReward(amount, source)
│
Need to spend coins?
├─ YES → Use Coin Sync Service
│         await coinSyncService.spendCoins(amount, purpose)
│
Building gamification feature?
├─ YES → Use Gamification API for achievements/challenges
│         DON'T use it for coin balances!
```

## Essential Imports

```typescript
// For displaying coin balance
import walletApi from '@/services/walletApi';
import { useGamification } from '@/contexts/GamificationContext';

// For awarding/spending coins
import coinSyncService from '@/services/coinSyncService';
```

## Common Use Cases

### 1. Display Coin Balance in UI

**Option A: Direct Wallet API** (Recommended for new components)
```typescript
import walletApi from '@/services/walletApi';

const [coins, setCoins] = useState(0);

useEffect(() => {
  const fetchBalance = async () => {
    const response = await walletApi.getBalance();
    if (response.success && response.data) {
      const wasilCoin = response.data.coins.find(c => c.type === 'wasil');
      setCoins(wasilCoin?.amount || 0);
    }
  };
  fetchBalance();
}, []);

return <Text>{coins} coins</Text>;
```

**Option B: GamificationContext** (Recommended for existing components)
```typescript
import { useGamification } from '@/contexts/GamificationContext';

const { state } = useGamification();
const coins = state.coinBalance.total;

return <Text>{coins} coins</Text>;
```

### 2. Award Coins from Games

```typescript
import coinSyncService from '@/services/coinSyncService';

// When user wins a game
const handleGameWin = async (coinsWon: number) => {
  const syncResult = await coinSyncService.handleGameReward(
    'spin_wheel',  // or 'scratch_card', 'quiz'
    coinsWon,
    { gameSessionId: '123', difficulty: 'easy' }
  );

  if (syncResult.success) {
    alert(`You won ${coinsWon} coins! New balance: ${syncResult.newWalletBalance}`);
  }
};
```

### 3. Award Coins from Challenge Completion

```typescript
import coinSyncService from '@/services/coinSyncService';

// When user completes a challenge
const handleChallengeCompletion = async (challengeId: string, reward: number) => {
  const syncResult = await coinSyncService.handleChallengeReward(
    challengeId,
    'Complete 5 purchases',
    reward
  );

  if (syncResult.success) {
    console.log(`Challenge completed! New balance: ${syncResult.newWalletBalance}`);
  }
};
```

### 4. Award Coins from Achievement Unlock

```typescript
import coinSyncService from '@/services/coinSyncService';

// When user unlocks an achievement
const handleAchievementUnlock = async (achievementId: string, reward: number) => {
  const syncResult = await coinSyncService.handleAchievementReward(
    achievementId,
    'First Purchase',
    reward
  );

  if (syncResult.success) {
    console.log(`Achievement unlocked! New balance: ${syncResult.newWalletBalance}`);
  }
};
```

### 5. Award Coins from Daily Login

```typescript
import coinSyncService from '@/services/coinSyncService';

// When user performs daily check-in
const handleDailyCheckIn = async (streak: number, reward: number) => {
  const syncResult = await coinSyncService.handleDailyLoginReward(
    streak,
    reward
  );

  if (syncResult.success) {
    console.log(`Day ${streak} check-in! New balance: ${syncResult.newWalletBalance}`);
  }
};
```

### 6. Spend Coins

```typescript
import coinSyncService from '@/services/coinSyncService';

// When user purchases something with coins
const handlePurchase = async (itemId: string, cost: number) => {
  const syncResult = await coinSyncService.spendCoins(
    cost,
    `Purchase ${itemId}`,
    { itemId, purchaseType: 'voucher' }
  );

  if (syncResult.success) {
    console.log(`Purchase complete! New balance: ${syncResult.newWalletBalance}`);
  } else {
    alert(syncResult.error || 'Insufficient balance');
  }
};
```

### 7. Refresh Coin Balance

```typescript
import { useGamification } from '@/contexts/GamificationContext';

const { actions } = useGamification();

// Manually refresh from wallet
await actions.syncCoinsFromWallet();
```

### 8. Check Sync Status (Debugging)

```typescript
import coinSyncService from '@/services/coinSyncService';

// Check if wallet and points are in sync
const syncStatus = await coinSyncService.checkSync();

console.log('Wallet:', syncStatus.walletBalance);
console.log('Points:', syncStatus.pointsBalance);
console.log('In Sync:', syncStatus.synced);

if (!syncStatus.synced) {
  console.warn('Sync mismatch:', syncStatus.difference);
}
```

## API Endpoints - At a Glance

| Purpose | Endpoint | Use For |
|---------|----------|---------|
| **Get Balance** | `GET /wallet/balance` | Display coins in UI |
| **Award Coins** | `POST /points/earn` | Gamification rewards |
| **Spend Coins** | `POST /points/spend` | Purchases, redemptions |
| **Daily Check-in** | `POST /points/daily-checkin` | Daily login rewards |
| **Achievements** | `GET /gamification/achievements` | List achievements (NOT coins) |
| **Challenges** | `GET /gamification/challenges` | List challenges (NOT coins) |

## Common Patterns

### Pattern 1: Game with Coin Reward

```typescript
// 1. User plays game
const playGame = async () => {
  // Game logic...
  const coinsWon = calculateReward();

  // 2. Award coins via sync service
  const syncResult = await coinSyncService.handleGameReward(
    'spin_wheel',
    coinsWon
  );

  // 3. Update UI with new balance
  if (syncResult.success) {
    setBalance(syncResult.newWalletBalance);
  }
};
```

### Pattern 2: Challenge Claim Flow

```typescript
// 1. User completes challenge
const claimChallenge = async (challengeId: string) => {
  // API call to claim
  const response = await api.post(`/challenges/${challengeId}/claim`);
  const reward = response.data.rewards.coins;

  // 2. Sync coins to wallet
  const syncResult = await coinSyncService.handleChallengeReward(
    challengeId,
    response.data.challenge.title,
    reward
  );

  // 3. Update UI
  if (syncResult.success) {
    setBalance(syncResult.newWalletBalance);
    showSuccessMessage(`Claimed ${reward} coins!`);
  }
};
```

### Pattern 3: Display Balance with Auto-Refresh

```typescript
import { useGamification } from '@/contexts/GamificationContext';

const CoinDisplay = () => {
  const { state, actions } = useGamification();

  useEffect(() => {
    // Initial load
    actions.syncCoinsFromWallet();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      actions.syncCoinsFromWallet();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity onPress={() => actions.syncCoinsFromWallet()}>
      <Text>{state.coinBalance.total} coins</Text>
    </TouchableOpacity>
  );
};
```

## Do's and Don'ts

### ✅ DO

- Use Wallet API for all coin balance displays
- Use Coin Sync Service for awarding/spending coins
- Use GamificationContext for consistent state
- Log all coin operations for debugging
- Handle errors gracefully with fallbacks

### ❌ DON'T

- Don't use Gamification API for coin balances
- Don't directly modify wallet without sync service
- Don't mix multiple coin sources in same component
- Don't forget to refresh balance after operations
- Don't award/spend coins without proper validation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Balance not updating | Call `actions.syncCoinsFromWallet()` |
| Different balances on different pages | Verify all pages use Wallet API |
| Reward not appearing | Check console for sync errors |
| Sync taking too long | Use optimistic UI updates |
| "Insufficient balance" error | Verify wallet balance before spending |

## Console Logs to Watch For

**Success:**
```
✅ [COIN SYNC] Wallet balance: 3500
✅ [COIN SYNC] Reward synced successfully. New wallet balance: 3550
✅ [COIN SYNC] Wallet and points are in sync: 3550
```

**Warnings:**
```
⚠️ [COIN SYNC] Sync mismatch detected! Wallet: 3500, Points: 3450
⚠️ [GAMIFICATION] Wallet API failed, syncing from gamification context...
```

**Errors:**
```
❌ [COIN SYNC] Error fetching wallet balance: Network error
❌ [COIN SYNC] Error syncing gamification reward: Insufficient balance
```

## Testing Your Implementation

### Quick Test Checklist

1. ✅ Display coin balance from wallet
2. ✅ Award coins → balance updates
3. ✅ Spend coins → balance decreases
4. ✅ Refresh page → balance persists
5. ✅ Navigate to other pages → same balance
6. ✅ Error handling → graceful fallback

### Test Code Snippet

```typescript
// Quick integration test
const testCoinSync = async () => {
  console.log('🧪 Testing Coin Sync...');

  // 1. Get initial balance
  const initialBalance = await coinSyncService.getWalletBalance();
  console.log(`Initial: ${initialBalance}`);

  // 2. Award coins
  const awardResult = await coinSyncService.syncGamificationReward(100, 'bonus');
  console.log(`After award: ${awardResult.newWalletBalance}`);

  // 3. Verify balance increased
  const newBalance = await coinSyncService.getWalletBalance();
  console.log(`Verified: ${newBalance}`);
  console.log(newBalance === initialBalance + 100 ? '✅ PASS' : '❌ FAIL');
};
```

## Need Help?

1. Check this quick reference
2. Review `COIN_SYNC_ARCHITECTURE.md` for detailed documentation
3. Check console logs for sync status
4. Use `checkSync()` to diagnose issues
5. Review component examples in:
   - `app/games/index.tsx`
   - `app/gamification/index.tsx`
   - `app/(tabs)/index.tsx`

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
