# Developer Guide: Gamification & Games System

A comprehensive guide for developers working with the REZ app gamification system. Learn how to add new games, integrate coin rewards, trigger achievements, and extend the gamification features.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Coin System](#coin-system)
3. [Adding New Games](#adding-new-games)
4. [Achievement System](#achievement-system)
5. [Challenge System](#challenge-system)
6. [Integration Points](#integration-points)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

---

## System Architecture

### Overview

The gamification system consists of several interconnected components:

```
┌─────────────────────────────────────────────────┐
│              User Actions                        │
│  (Orders, Reviews, Referrals, App Usage)        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│        GamificationTriggerService                │
│  - Detects events                                │
│  - Awards coins                                  │
│  - Triggers achievements                         │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  Points API  │    │Achievement API│
│  - Balance   │    │  - Progress  │
│  - Earn/Spend│    │  - Unlock    │
│  - History   │    │  - Rewards   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────┐
│         GamificationContext                      │
│  - State management                              │
│  - Real-time updates                             │
│  - Notifications                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              UI Components                       │
│  - Games (Spin, Quiz, Scratch)                  │
│  - CoinBalance                                   │
│  - Achievements                                  │
│  - Leaderboard                                   │
└─────────────────────────────────────────────────┘
```

### Key Files

```
frontend/
├── services/
│   ├── gamificationApi.ts          # Main API service
│   ├── gamificationTriggerService.ts  # Event triggers
│   ├── pointsApi.ts                # Coins/points API
│   └── achievementApi.ts           # Achievements API
├── contexts/
│   └── GamificationContext.tsx     # Global state
├── hooks/
│   ├── usePoints.ts                # Coins hook
│   └── useGamification.ts          # Main hook
├── components/gamification/
│   ├── SpinWheelGame.tsx           # Spin wheel
│   ├── QuizGame.tsx                # Quiz game
│   ├── ScratchCardGame.tsx         # Scratch cards
│   ├── CoinBalance.tsx             # Balance display
│   └── PointsNotificationManager.tsx  # Notifications
└── types/
    └── gamification.types.ts       # TypeScript types
```

---

## Coin System

### How Coins Work

Coins are the primary currency in the gamification system. Users earn coins through various activities and can spend them on rewards.

### Coin Sources

| Source | Base Reward | Description |
|--------|-------------|-------------|
| Order Placed | 1% of order value | Automatic on order completion |
| Review Submitted | 50 coins | For each product review |
| Referral Success | 200-500 coins | Based on referral tier |
| Daily Login | 10-50 coins | Streak bonus |
| Quiz Completion | 10 per correct | Quiz rewards |
| Spin Wheel | 10-1000 coins | Random rewards |
| Scratch Card | 50-500 coins | Random prizes |
| Achievement Unlock | 50-500 coins | One-time reward |
| Challenge Complete | 100-1000 coins | Based on difficulty |

### Awarding Coins Programmatically

#### Method 1: Using GamificationTriggerService (Recommended)

```typescript
import gamificationTrigger from '@/services/gamificationTriggerService';

// On order placed
await gamificationTrigger.onOrderPlaced(
  orderId,
  orderAmount,
  orderItems
);

// On review submitted
await gamificationTrigger.onReviewSubmitted(
  reviewId,
  rating,
  productId
);

// On referral success
await gamificationTrigger.onReferralSuccess(
  referrerId,
  refereeId,
  tier
);
```

#### Method 2: Using GamificationContext

```typescript
import { useGamification } from '@/contexts/GamificationContext';

function MyComponent() {
  const { actions } = useGamification();

  const handleAction = async () => {
    // Award coins
    await actions.awardCoins(100, 'Special bonus');

    // This will:
    // 1. Call the API
    // 2. Update local state
    // 3. Show notification
    // 4. Trigger achievement check
  };
}
```

#### Method 3: Direct API Call

```typescript
import pointsApi from '@/services/pointsApi';

const response = await pointsApi.earnPoints({
  amount: 100,
  source: 'bonus',
  description: 'Welcome bonus',
  metadata: {
    campaignId: 'welcome_2024'
  }
});

if (response.success) {
  console.log('New balance:', response.data.newBalance);
}
```

### Spending Coins

```typescript
import { useGamification } from '@/contexts/GamificationContext';

function RedeemReward() {
  const { actions, state } = useGamification();

  const handleRedeem = async (rewardCost: number) => {
    if (state.coinBalance.total < rewardCost) {
      Alert.alert('Insufficient coins');
      return;
    }

    try {
      await actions.spendCoins(rewardCost, 'Reward redemption');
      Alert.alert('Success', 'Reward redeemed!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
}
```

### Custom Coin Calculations

Modify `gamificationTriggerService.ts`:

```typescript
private calculateCoinReward(
  eventType: GamificationEventType,
  data?: any
): number {
  switch (eventType) {
    case 'ORDER_PLACED':
      // 1% of order value, minimum 10 coins
      const orderValue = data?.orderValue || 0;
      return Math.max(10, Math.floor(orderValue * 0.01));

    case 'REVIEW_SUBMITTED':
      // Bonus for high ratings
      const rating = data?.rating || 0;
      return rating >= 4 ? 75 : 50;

    case 'REFERRAL_SUCCESS':
      // Tiered rewards
      const tier = data?.tier || 'bronze';
      return tier === 'gold' ? 500 : tier === 'silver' ? 300 : 200;

    default:
      return 10;
  }
}
```

---

## Adding New Games

### Step 1: Create Game Component

Create a new component in `components/gamification/`:

```typescript
// components/gamification/MemoryCardGame.tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

interface MemoryCardGameProps {
  onGameComplete: (score: number, coinsEarned: number) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export default function MemoryCardGame({
  onGameComplete,
  difficulty = 'medium'
}: MemoryCardGameProps) {
  const [score, setScore] = useState(0);
  const [cards, setCards] = useState(generateCards(difficulty));

  const handleCardClick = (cardId: string) => {
    // Game logic here
  };

  const finishGame = () => {
    const coinsEarned = calculateCoins(score, difficulty);
    onGameComplete(score, coinsEarned);
  };

  return (
    <View style={styles.container}>
      {/* Game UI */}
    </View>
  );
}

function generateCards(difficulty: string) {
  const cardCount = difficulty === 'easy' ? 8 :
                    difficulty === 'medium' ? 12 : 16;
  // Generate cards logic
}

function calculateCoins(score: number, difficulty: string) {
  const baseCoins = difficulty === 'easy' ? 20 :
                    difficulty === 'medium' ? 50 : 100;
  return Math.floor(baseCoins * (score / 100));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
```

### Step 2: Add API Endpoints

Update `services/gamificationApi.ts`:

```typescript
class GamificationAPI {
  // ... existing methods

  /**
   * Start memory card game
   */
  async startMemoryGame(difficulty?: 'easy' | 'medium' | 'hard'): Promise<ApiResponse<{
    gameId: string;
    cards: Card[];
    timeLimit: number;
  }>> {
    try {
      const response = await apiClient.post('/gamification/memory-game/start', {
        difficulty,
      });
      return response;
    } catch (error: any) {
      console.error('Error starting memory game:', error);
      throw error;
    }
  }

  /**
   * Submit memory game result
   */
  async submitMemoryGameResult(
    gameId: string,
    score: number,
    timeSpent: number
  ): Promise<ApiResponse<{
    coinsEarned: number;
    newBalance: number;
    achievements?: string[];
  }>> {
    try {
      const response = await apiClient.post('/gamification/memory-game/complete', {
        gameId,
        score,
        timeSpent,
      });
      return response;
    } catch (error: any) {
      console.error('Error submitting memory game result:', error);
      throw error;
    }
  }
}
```

### Step 3: Add Type Definitions

Update `types/gamification.types.ts`:

```typescript
export interface MemoryCard {
  id: string;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryGameState {
  id: string;
  userId: string;
  cards: MemoryCard[];
  score: number;
  moves: number;
  timeLimit: number;
  startedAt: Date;
  completedAt?: Date;
}
```

### Step 4: Create Game Page

```typescript
// app/games/memory-game.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import MemoryCardGame from '@/components/gamification/MemoryCardGame';
import gamificationAPI from '@/services/gamificationApi';
import { useGamification } from '@/contexts/GamificationContext';
import { showPointsNotification } from '@/components/gamification/PointsNotificationManager';

export default function MemoryGamePage() {
  const router = useRouter();
  const [gameId, setGameId] = useState<string | null>(null);
  const { actions } = useGamification();

  const handleGameStart = async () => {
    try {
      const response = await gamificationAPI.startMemoryGame('medium');
      if (response.success) {
        setGameId(response.data.gameId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start game');
    }
  };

  const handleGameComplete = async (score: number, coinsEarned: number) => {
    if (!gameId) return;

    try {
      const response = await gamificationAPI.submitMemoryGameResult(
        gameId,
        score,
        0
      );

      if (response.success) {
        // Show notification
        showPointsNotification({
          amount: response.data.coinsEarned,
          type: 'earned',
          reason: `Memory Game: ${score} points!`,
          icon: 'trophy',
        });

        // Trigger achievement check
        await actions.triggerAchievementCheck('GAME_COMPLETED', {
          gameType: 'memory',
          score,
        });

        Alert.alert(
          'Game Complete!',
          `Score: ${score}\nCoins Earned: ${response.data.coinsEarned}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit game result');
    }
  };

  return (
    <View style={styles.container}>
      <MemoryCardGame onGameComplete={handleGameComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Step 5: Add Navigation Link

Update your games list page:

```typescript
const games = [
  {
    id: 'spin-wheel',
    title: 'Spin Wheel',
    icon: 'disc',
    route: '/games/spin-wheel',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    icon: 'help-circle',
    route: '/games/quiz',
  },
  {
    id: 'memory-game',
    title: 'Memory Cards',
    icon: 'grid',
    route: '/games/memory-game',
    isNew: true,
  },
];
```

---

## Achievement System

### How Achievements Work

Achievements are automatically checked and unlocked when certain conditions are met. The system recalculates achievements based on user statistics.

### Achievement Types

Defined in `services/achievementApi.ts`:

```typescript
export enum AchievementType {
  // Order-based
  FIRST_ORDER = 'FIRST_ORDER',
  ORDERS_10 = 'ORDERS_10',
  ORDERS_50 = 'ORDERS_50',

  // Spending-based
  SPENT_1000 = 'SPENT_1000',
  SPENT_5000 = 'SPENT_5000',

  // Review-based
  FIRST_REVIEW = 'FIRST_REVIEW',
  REVIEWS_10 = 'REVIEWS_10',

  // Add your own
  MEMORY_MASTER = 'MEMORY_MASTER',
}
```

### Adding New Achievement

#### Step 1: Backend Configuration

On the backend, define the achievement with its trigger conditions:

```javascript
// Backend: models/Achievement.js
const achievements = [
  {
    type: 'MEMORY_MASTER',
    title: 'Memory Master',
    description: 'Complete 10 memory games',
    icon: 'brain',
    color: '#8B5CF6',
    targetValue: 10,
    coinReward: 200,
    tier: 'gold',
    category: 'games',
    checkCondition: (userStats) => userStats.memoryGamesCompleted >= 10,
  },
];
```

#### Step 2: Trigger Achievement Check

```typescript
import { useGamification } from '@/contexts/GamificationContext';

function GameCompletionHandler() {
  const { actions } = useGamification();

  const onGameComplete = async () => {
    // This will check all achievements and unlock any that are now eligible
    const newAchievements = await actions.triggerAchievementCheck(
      'GAME_COMPLETED',
      {
        gameType: 'memory',
        gamesCompleted: userStats.memoryGamesCompleted + 1,
      }
    );

    // Show notifications for newly unlocked achievements
    if (newAchievements.length > 0) {
      // Achievements are automatically shown via AchievementToastManager
      console.log('New achievements unlocked:', newAchievements);
    }
  };
}
```

#### Step 3: Display Achievement Progress

```typescript
import { useGamification } from '@/contexts/GamificationContext';

function AchievementProgress() {
  const { state } = useGamification();

  const memoryMasterAchievement = state.achievements.find(
    a => a.type === 'MEMORY_MASTER'
  );

  if (!memoryMasterAchievement) return null;

  const progress = memoryMasterAchievement.progress;
  const percentage = (progress / memoryMasterAchievement.targetValue) * 100;

  return (
    <View>
      <Text>{memoryMasterAchievement.title}</Text>
      <Text>{progress} / {memoryMasterAchievement.targetValue}</Text>
      <ProgressBar progress={percentage} />
    </View>
  );
}
```

### Achievement Triggers

Common trigger points in the app:

```typescript
// After order completion
await actions.triggerAchievementCheck('ORDER_PLACED', { orderId });

// After review submission
await actions.triggerAchievementCheck('REVIEW_SUBMITTED', { reviewId });

// After referral success
await actions.triggerAchievementCheck('REFERRAL_SUCCESS', { refereeId });

// After daily login
await actions.triggerAchievementCheck('DAILY_LOGIN', { streak });

// Custom game completion
await actions.triggerAchievementCheck('GAME_COMPLETED', {
  gameType: 'memory',
  score: 1000
});
```

---

## Challenge System

### Challenge Structure

Challenges are time-limited objectives with specific goals and rewards.

```typescript
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard';
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    vouchers?: any[];
  };
  status: 'active' | 'completed' | 'claimed' | 'expired';
  startDate: Date;
  endDate: Date;
}
```

### Displaying Active Challenges

```typescript
import { useGamification } from '@/contexts/GamificationContext';

function ChallengesSection() {
  const { state, actions } = useGamification();
  const activeChallenges = state.challenges.filter(
    c => c.status === 'active' || c.status === 'completed'
  );

  const handleClaimReward = async (challengeId: string) => {
    try {
      const response = await gamificationAPI.claimChallengeReward(challengeId);
      if (response.success) {
        showPointsNotification({
          amount: response.data.rewards.coins,
          type: 'earned',
          reason: 'Challenge completed!',
        });
        await actions.loadGamificationData(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  return (
    <View>
      {activeChallenges.map(challenge => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onClaimReward={handleClaimReward}
        />
      ))}
    </View>
  );
}
```

### Creating Custom Challenges

Custom challenges should be created on the backend, but you can trigger progress updates:

```typescript
// When user completes an action that contributes to a challenge
import gamificationTrigger from '@/services/gamificationTriggerService';

await gamificationTrigger.triggerEvent('CHALLENGE_PROGRESS', {
  challengeType: 'shopping_spree',
  increment: 1,
});
```

---

## Integration Points

### 1. Order Completion

```typescript
// services/orderApi.ts or app/checkout.tsx
import gamificationTrigger from '@/services/gamificationTriggerService';

async function completeOrder(orderData) {
  const response = await orderApi.createOrder(orderData);

  if (response.success) {
    // Award coins and check achievements
    await gamificationTrigger.onOrderPlaced(
      response.data.orderId,
      response.data.totalAmount,
      response.data.items
    );
  }

  return response;
}
```

### 2. Review Submission

```typescript
// services/reviewApi.ts
import gamificationTrigger from '@/services/gamificationTriggerService';

async function submitReview(reviewData) {
  const response = await reviewApi.createReview(reviewData);

  if (response.success) {
    await gamificationTrigger.onReviewSubmitted(
      response.data.reviewId,
      reviewData.rating,
      reviewData.productId
    );
  }

  return response;
}
```

### 3. Daily Login

```typescript
// app/_layout.tsx or app/index.tsx
import { useGamification } from '@/contexts/GamificationContext';

export default function RootLayout() {
  const { actions } = useGamification();

  useEffect(() => {
    // Trigger daily check-in
    actions.updateDailyStreak();
  }, []);

  return <App />;
}
```

### 4. Profile Completion

```typescript
// app/profile/edit.tsx
import gamificationTrigger from '@/services/gamificationTriggerService';

async function saveProfile(profileData) {
  const response = await profileApi.updateProfile(profileData);

  if (response.success) {
    // Check if profile completion milestone reached
    if (response.data.completionPercentage >= 80) {
      await gamificationTrigger.triggerEvent('PROFILE_COMPLETED', {
        completion: response.data.completionPercentage,
      });
    }
  }

  return response;
}
```

---

## Testing

### Unit Tests

```typescript
// __tests__/gamification/coinSystem.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { usePoints } from '@/hooks/usePoints';

describe('Coin System', () => {
  it('should award coins correctly', async () => {
    const { result } = renderHook(() => usePoints());

    await act(async () => {
      await result.current.earnPoints({
        amount: 100,
        source: 'test',
        description: 'Test coins',
      });
    });

    expect(result.current.balance.total).toBeGreaterThanOrEqual(100);
  });

  it('should prevent spending more than balance', async () => {
    const { result } = renderHook(() => usePoints());

    await expect(
      result.current.spendPoints({
        amount: 999999,
        purpose: 'test',
        description: 'Test spend',
      })
    ).rejects.toThrow('Insufficient balance');
  });
});
```

### Integration Tests

```typescript
// __tests__/gamification/gameFlow.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuizGame from '@/components/gamification/QuizGame';

describe('Quiz Game Flow', () => {
  it('should complete quiz and award coins', async () => {
    const onComplete = jest.fn();
    const { getByText } = render(
      <QuizGame onGameComplete={onComplete} />
    );

    // Answer questions
    fireEvent.press(getByText('Paris'));
    fireEvent.press(getByText('Submit'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
```

### Manual Testing Checklist

- [ ] Spin wheel awards coins correctly
- [ ] Quiz awards coins for correct answers
- [ ] Scratch card reveals prize
- [ ] Achievements unlock automatically
- [ ] Notifications appear for coin awards
- [ ] Coin balance updates in real-time
- [ ] Transaction history shows all transactions
- [ ] Leaderboard displays correct rankings
- [ ] Daily login awards streak bonus
- [ ] Challenge progress updates correctly

---

## Best Practices

### 1. Always Use Try-Catch

```typescript
try {
  await gamificationTrigger.onOrderPlaced(orderId, amount, items);
} catch (error) {
  console.error('Gamification error:', error);
  // Don't block user flow if gamification fails
}
```

### 2. Don't Block User Flow

```typescript
// Good: Fire and forget
completeOrder().then(() => {
  gamificationTrigger.onOrderPlaced(orderId, amount, items)
    .catch(console.error);
});

// Bad: Blocking user
await completeOrder();
await gamificationTrigger.onOrderPlaced(orderId, amount, items);
showSuccessScreen();
```

### 3. Cache Aggressively

```typescript
const { state } = useGamification();

// Cache is automatically managed by GamificationContext
// Data is cached for 10 minutes by default
// Force refresh when needed:
await actions.loadGamificationData(true);
```

### 4. Batch Updates

```typescript
// Good: Single API call
await pointsApi.earnPoints({
  amount: 150,
  source: 'order',
  description: 'Order + Review bonus',
});

// Bad: Multiple calls
await pointsApi.earnPoints({ amount: 100, source: 'order' });
await pointsApi.earnPoints({ amount: 50, source: 'review' });
```

### 5. Validate Before API Calls

```typescript
// Validate locally first
if (balance < rewardCost) {
  Alert.alert('Insufficient coins');
  return;
}

// Then make API call
await actions.spendCoins(rewardCost, 'Reward redemption');
```

### 6. Use TypeScript

```typescript
// Good: Type-safe
const response: ApiResponse<CoinBalance> = await pointsApi.getBalance();

// Bad: Any type
const response: any = await pointsApi.getBalance();
```

### 7. Log Important Events

```typescript
import { logEvent } from '@/services/analyticsService';

await gamificationTrigger.onOrderPlaced(orderId, amount, items);
logEvent('gamification_coins_awarded', {
  source: 'order',
  amount: coins,
  orderId,
});
```

---

## Common Patterns

### Pattern 1: Award Coins with Notification

```typescript
const awardCoinsWithNotification = async (
  amount: number,
  reason: string,
  icon?: string
) => {
  const { actions } = useGamification();

  await actions.awardCoins(amount, reason);

  showPointsNotification({
    amount,
    type: 'earned',
    reason,
    icon: icon || 'diamond',
  });
};
```

### Pattern 2: Check and Display Achievements

```typescript
const checkAndShowAchievements = async (eventType: string, data: any) => {
  const { actions } = useGamification();

  const newAchievements = await actions.triggerAchievementCheck(
    eventType,
    data
  );

  // Achievements automatically shown via AchievementToastManager
  // But you can add custom handling:
  if (newAchievements.length > 0) {
    analytics.logEvent('achievements_unlocked', {
      count: newAchievements.length,
      types: newAchievements.map(a => a.type),
    });
  }
};
```

### Pattern 3: Gamify User Action

```typescript
const gamifyAction = async (
  action: () => Promise<void>,
  coinsReward: number,
  achievementEvent: string
) => {
  // Perform action
  await action();

  // Award coins
  await awardCoinsWithNotification(coinsReward, 'Action completed');

  // Check achievements
  await checkAndShowAchievements(achievementEvent, {});
};
```

---

## Troubleshooting

### Issue: Coins not updating

**Solution:**
```typescript
// Force refresh
const { actions } = useGamification();
await actions.loadGamificationData(true);
```

### Issue: Achievements not unlocking

**Solution:**
```typescript
// Manually trigger recalculation
const response = await achievementApi.recalculateAchievements();
console.log('Recalculated achievements:', response.data);
```

### Issue: Notifications not showing

**Solution:**
```typescript
// Ensure PointsNotificationManager is in root layout
// Check app/_layout.tsx
<PointsNotificationManager />
```

---

## Resources

- [API Reference](./GAMIFICATION_API_REFERENCE.md)
- [User Guide](./USER_GUIDE_GAMES.md)
- Backend Documentation: https://docs.rezapp.com/gamification
- Support: dev-support@rezapp.com

---

**Last Updated:** November 3, 2025
