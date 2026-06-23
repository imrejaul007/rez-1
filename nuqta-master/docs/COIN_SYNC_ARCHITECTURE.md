# Coin Synchronization Architecture

## Executive Summary

This document describes the unified coin system architecture for the REZ app. All coin balances are now synchronized through a **single source of truth: the Wallet API**.

## Problem Statement

Previously, the app had two separate coin systems:
1. **Wallet API** (`/wallet/balance`) - Main wallet with coin balances
2. **Gamification API** (`/gamification/coins/balance`) - Separate coin tracking for games

This created synchronization issues where:
- Users would see different coin balances in different parts of the app
- Coins earned from games weren't reflected in the wallet
- Gamification rewards weren't properly credited to user accounts

## Solution: Single Source of Truth

### Architecture Principles

1. **Wallet API is the ONLY source for coin balances**
   - All coin displays must fetch from `/wallet/balance`
   - No component should use gamification API for coin balances

2. **Points API handles earning/spending operations**
   - Use `/points/earn` to award coins (auto-syncs to wallet)
   - Use `/points/spend` to deduct coins (auto-syncs to wallet)
   - Points API automatically updates wallet balance

3. **Gamification API is for achievements/challenges ONLY**
   - Use for achievements, challenges, games, leaderboards
   - Never use for coin balance queries
   - When games/challenges award coins, use Points API

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                  User Action                         │
│  (Play game, complete challenge, earn achievement)   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          Coin Sync Service                           │
│  (services/coinSyncService.ts)                       │
│  - syncGamificationReward()                          │
│  - handleGameReward()                                │
│  - handleChallengeReward()                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          Points API                                  │
│  POST /points/earn                                   │
│  - Records transaction                               │
│  - Auto-syncs to wallet                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          Wallet API (Source of Truth)                │
│  GET /wallet/balance                                 │
│  - Returns authoritative coin balance                │
│  - All UI displays this balance                      │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Coin Sync Service (`services/coinSyncService.ts`)

The central service that coordinates all coin operations:

**Key Methods:**
- `getWalletBalance()` - Fetch current balance from wallet API
- `syncGamificationReward(amount, source, metadata)` - Award coins and sync to wallet
- `spendCoins(amount, purpose, metadata)` - Deduct coins and sync to wallet
- `handleGameReward(gameType, coinsWon, gameData)` - Handle mini-game rewards
- `handleChallengeReward(challengeId, challengeName, coinsReward)` - Handle challenge rewards
- `handleAchievementReward(achievementId, achievementName, coinsReward)` - Handle achievement rewards
- `checkSync()` - Verify wallet and points are in sync

### 2. GamificationContext (`contexts/GamificationContext.tsx`)

Updated to use wallet API as the source of truth:

**Changes:**
- Added `syncCoinsFromWallet()` method to fetch coins from wallet
- Updated `loadGamificationData()` to fetch coins from wallet instead of points API
- Updated `awardCoins()` to use coin sync service
- Updated `spendCoins()` to use coin sync service
- Updated `updateDailyStreak()` to refresh from wallet after check-in

**Usage:**
```typescript
const { state, actions } = useGamification();

// Get current coin balance (from wallet)
const coins = state.coinBalance.total;

// Award coins (syncs to wallet automatically)
await actions.awardCoins(100, 'Daily login bonus');

// Spend coins (syncs to wallet automatically)
await actions.spendCoins(50, 'Purchase scratch card');

// Manually sync from wallet
await actions.syncCoinsFromWallet();
```

### 3. Games Page (`app/games/index.tsx`)

**Implementation:**
- Fetches wallet balance directly on load
- Falls back to gamification context (which also uses wallet)
- Displays wallet balance in header
- All coin displays show wallet balance

**Key Code:**
```typescript
// Fetch wallet balance (source of truth)
const walletResponse = await walletApi.getBalance();
const wasilCoin = walletResponse.data.coins.find(c => c.type === 'wasil');
const actualWalletCoins = wasilCoin?.amount || 0;
setUserCoins(actualWalletCoins);
```

### 4. Gamification Dashboard (`app/gamification/index.tsx`)

**Implementation:**
- Fetches wallet balance in parallel with gamification data
- Displays wallet balance in header
- When claiming challenges, syncs coins to wallet via coin sync service
- All coin displays show wallet balance

**Key Code:**
```typescript
// Fetch wallet balance alongside gamification data
const [challengesRes, achievementsRes, streaksRes, statsRes, walletRes] = await Promise.all([
  apiClient.get('/challenges/my-progress'),
  apiClient.get('/achievements'),
  apiClient.get('/streaks'),
  apiClient.get('/gamification/stats'),
  walletApi.getBalance(), // ✅ Wallet balance
]);

// When claiming rewards, sync to wallet
const syncResult = await coinSyncService.handleChallengeReward(
  challengeId,
  challengeName,
  coinsEarned
);
```

### 5. Homepage (`app/(tabs)/index.tsx`)

**Implementation:**
- Already correctly using wallet API for coin balance
- Fetches wallet balance and displays in header
- Syncs loyalty points to wallet if needed
- All coin displays show wallet balance

**Verification:**
✅ Homepage correctly uses wallet API as single source of truth
✅ Coin balance displayed in header comes from wallet
✅ Loyalty points are synced to wallet

## API Endpoints Reference

### Wallet API (Source of Truth)
```
GET  /wallet/balance           - Get current wallet balance (USE THIS!)
POST /wallet/credit-loyalty-points - Credit loyalty points to wallet
```

### Points API (Earning/Spending)
```
GET  /points/balance           - Get points balance (cross-check only)
POST /points/earn              - Award points (auto-syncs to wallet)
POST /points/spend             - Spend points (auto-syncs to wallet)
GET  /points/daily-checkin     - Check daily check-in status
POST /points/daily-checkin     - Perform daily check-in
```

### Gamification API (Achievements/Challenges ONLY - NOT Coins)
```
GET  /gamification/achievements     - Get achievements
GET  /gamification/challenges       - Get challenges
POST /gamification/claim-reward     - Claim challenge reward
GET  /gamification/leaderboard      - Get leaderboard
POST /gamification/spin-wheel       - Spin wheel game
POST /gamification/scratch-card     - Scratch card game
POST /gamification/quiz/start       - Start quiz game
```

## Component Usage Guidelines

### ✅ DO: Use Wallet API for Coin Balance

```typescript
// Good - Fetch from wallet API
import walletApi from '@/services/walletApi';

const walletResponse = await walletApi.getBalance();
const wasilCoin = walletResponse.data.coins.find(c => c.type === 'wasil');
const coins = wasilCoin?.amount || 0;
```

### ✅ DO: Use Coin Sync Service for Rewards

```typescript
// Good - Award coins via sync service
import coinSyncService from '@/services/coinSyncService';

const syncResult = await coinSyncService.syncGamificationReward(
  100,
  'achievement',
  { achievementId: '123', achievementName: 'First Purchase' }
);

if (syncResult.success) {
  console.log(`New wallet balance: ${syncResult.newWalletBalance}`);
}
```

### ✅ DO: Use GamificationContext (which uses wallet)

```typescript
// Good - Use gamification context (fetches from wallet internally)
import { useGamification } from '@/contexts/GamificationContext';

const { state, actions } = useGamification();
const coins = state.coinBalance.total; // From wallet

// Award coins (syncs to wallet automatically)
await actions.awardCoins(50, 'Daily bonus');
```

### ❌ DON'T: Use Gamification API for Coins

```typescript
// Bad - Don't use gamification API for coin balance
import gamificationAPI from '@/services/gamificationApi';

const response = await gamificationAPI.getCoinBalance(); // ❌ WRONG!
```

### ❌ DON'T: Mix Multiple Sources

```typescript
// Bad - Don't fetch from multiple sources
const walletCoins = await walletApi.getBalance();
const gamificationCoins = await gamificationAPI.getCoinBalance(); // ❌ WRONG!
const pointsCoins = await pointsApi.getBalance();

// Which one to display? This creates confusion!
```

## Testing Checklist

### Unit Tests
- [ ] Coin sync service correctly awards coins to wallet
- [ ] Coin sync service correctly spends coins from wallet
- [ ] GamificationContext fetches coins from wallet
- [ ] All coin displays show wallet balance

### Integration Tests
- [ ] User plays spin wheel → coins credited to wallet
- [ ] User completes challenge → coins credited to wallet
- [ ] User unlocks achievement → coins credited to wallet
- [ ] User performs daily check-in → coins credited to wallet
- [ ] Wallet balance updates across all pages

### Manual Test Scenarios

1. **Game Reward Flow:**
   - Open Games page → note wallet balance
   - Play spin wheel → win 50 coins
   - Verify wallet balance increased by 50
   - Refresh Games page → verify balance persists
   - Open Homepage → verify same balance displayed
   - Open Gamification Dashboard → verify same balance displayed

2. **Challenge Reward Flow:**
   - Open Gamification Dashboard → note wallet balance
   - Complete challenge → claim reward (e.g., 100 coins)
   - Verify wallet balance increased by 100
   - Refresh dashboard → verify balance persists
   - Navigate to other pages → verify consistent balance

3. **Achievement Reward Flow:**
   - Trigger achievement unlock
   - Verify coins awarded to wallet
   - Check wallet balance across all pages
   - Verify all pages show same balance

4. **Daily Check-in Flow:**
   - Perform daily check-in
   - Verify coins awarded to wallet
   - Check balance consistency across pages

## Monitoring and Debugging

### Console Logs

The coin sync service includes detailed logging:

```
🔄 [COIN SYNC] Fetching wallet balance (source of truth)...
✅ [COIN SYNC] Wallet balance: 3500

🎮 [COIN SYNC] Syncing gamification reward: 50 coins from spin_wheel
✅ [COIN SYNC] Points awarded: 50
✅ [COIN SYNC] Reward synced successfully. New wallet balance: 3550

🔍 [COIN SYNC] Checking wallet and points sync status...
✅ [COIN SYNC] Wallet and points are in sync: 3550
```

### Error Handling

All coin sync operations include proper error handling:

```typescript
const syncResult = await coinSyncService.syncGamificationReward(amount, source);

if (!syncResult.success) {
  console.error('Sync failed:', syncResult.error);
  // Handle error appropriately
}
```

### Sync Verification

Use `checkSync()` to verify wallet and points are in sync:

```typescript
const syncStatus = await coinSyncService.checkSync();

if (syncStatus.synced) {
  console.log('✅ Wallet and points in sync');
} else {
  console.warn(`⚠️ Sync mismatch: ${syncStatus.difference} coins`);
}
```

## Migration Guide

### For Existing Components

If you have a component that uses gamification API for coins:

**Before:**
```typescript
import gamificationAPI from '@/services/gamificationApi';

const response = await gamificationAPI.getCoinBalance();
const coins = response.data.balance;
```

**After:**
```typescript
import walletApi from '@/services/walletApi';

const response = await walletApi.getBalance();
const wasilCoin = response.data.coins.find(c => c.type === 'wasil');
const coins = wasilCoin?.amount || 0;
```

Or use GamificationContext (recommended):
```typescript
import { useGamification } from '@/contexts/GamificationContext';

const { state } = useGamification();
const coins = state.coinBalance.total;
```

## Benefits of This Architecture

1. **Single Source of Truth:**
   - No confusion about which balance is "correct"
   - Wallet API is authoritative for all coin balances
   - Consistent coin display across entire app

2. **Automatic Synchronization:**
   - Gamification rewards automatically sync to wallet
   - Points API updates wallet in real-time
   - No manual sync needed

3. **Proper Separation of Concerns:**
   - Wallet API: Manages balances and transactions
   - Points API: Handles earning/spending operations
   - Gamification API: Handles achievements, challenges, games

4. **Error Handling and Retry:**
   - Coin sync service includes proper error handling
   - Automatic retry logic for failed syncs
   - Fallback mechanisms when APIs unavailable

5. **Scalability:**
   - Easy to add new coin sources (referrals, social media, etc.)
   - All new sources use coin sync service
   - Centralized monitoring and logging

## Future Enhancements

1. **Real-time Synchronization:**
   - WebSocket integration for instant balance updates
   - Push notifications for coin rewards
   - Live balance updates across all open tabs

2. **Advanced Sync Logic:**
   - Batch sync for multiple small rewards
   - Offline support with queue system
   - Conflict resolution for concurrent updates

3. **Analytics and Tracking:**
   - Track coin earning sources
   - Monitor sync performance
   - Alert on sync failures or discrepancies

## Troubleshooting

### Issue: Coin balances don't match across pages

**Solution:**
1. Check if all pages are using wallet API
2. Verify gamification context is using `syncCoinsFromWallet()`
3. Run `checkSync()` to verify wallet and points match
4. Refresh wallet balance explicitly: `actions.syncCoinsFromWallet()`

### Issue: Gamification rewards not appearing in wallet

**Solution:**
1. Verify coin sync service is being used for rewards
2. Check console logs for sync errors
3. Verify Points API is accessible
4. Check if reward amount is valid (> 0)

### Issue: Wallet balance is stale

**Solution:**
1. Call `syncCoinsFromWallet()` to refresh
2. Verify wallet API is responding correctly
3. Check if local cache is too old
4. Force refresh by passing `forceRefresh: true`

## Support and Contact

For questions about coin synchronization:
- Check this documentation first
- Review console logs for detailed information
- Use `checkSync()` to diagnose issues
- Refer to API documentation for endpoint details

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-03
**Author:** Agent 5 - Data Synchronization Architect
