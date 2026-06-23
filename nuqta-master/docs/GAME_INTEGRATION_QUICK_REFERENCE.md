# Game Integration Quick Reference

## 🎮 Enhanced Components

### 1. SpinWheelGame

```tsx
import SpinWheelGame from '@/components/gamification/SpinWheelGame';

<SpinWheelGame
  segments={WHEEL_SEGMENTS}
  spinsRemaining={3}
  onSpinComplete={(result) => console.log('Won:', result)}
  onCoinsEarned={(coins) => console.log('Earned:', coins)}
  onError={(error) => console.error(error)}
/>
```

**Features**:
- ✅ Eligibility checking with cooldown
- ✅ Wallet balance auto-update
- ✅ Loading states (checking, spinning)
- ✅ Error handling
- ✅ Success alerts

---

### 2. ScratchCardGame

```tsx
import ScratchCardGame from '@/components/gamification/ScratchCardGame';

<ScratchCardGame
  onReveal={(prize) => console.log('Prize:', prize)}
  onCoinsEarned={(coins) => console.log('Earned:', coins)}
  onError={(error) => console.error(error)}
/>
```

**Features**:
- ✅ Eligibility checking
- ✅ "Not Available" empty state
- ✅ Card creation flow
- ✅ Scratch reveal animation
- ✅ Wallet balance auto-update
- ✅ Error handling

---

### 3. QuizGame

```tsx
import QuizGame from '@/components/gamification/QuizGame';

<QuizGame
  difficulty="medium"
  category="general"
  onGameComplete={(score, coins) => {
    console.log(`Score: ${score}, Coins: ${coins}`);
  }}
/>
```

**Features**:
- ✅ Timer system (30s per question)
- ✅ Real-time scoring
- ✅ Question progression
- ✅ Feedback alerts
- ✅ Wallet integration

---

## 📱 Game Pages

### Spin Wheel Page
**Route**: `/games/spin-wheel`

**File**: `app/games/spin-wheel.tsx`

### Quiz Page
**Route**: `/games/quiz`

**File**: `app/games/quiz.tsx`

### Scratch Card Page
**Route**: `/scratch-card`

**File**: `app/scratch-card.tsx`

### Games Hub
**Route**: `/games`

**File**: `app/games/index.tsx`

---

## 🔌 API Endpoints

### Spin Wheel
```typescript
// Check eligibility
GET /gamification/spin-wheel/eligibility
Response: { canSpin: boolean, nextSpinAt?: string }

// Perform spin
POST /gamification/spin-wheel
Response: { result: SpinWheelResult, coinsAdded: number, newBalance: number }
```

### Scratch Card
```typescript
// Check eligibility
GET /gamification/scratch-card/eligibility
Response: { canCreate: boolean, nextAvailableAt?: string }

// Create card
POST /gamification/scratch-card
Response: { id: string, prize: ScratchCardPrize }

// Scratch card
POST /gamification/scratch-card/:id/scratch
Response: { card: ScratchCardData, prize: any, coinsAdded: number }
```

### Quiz
```typescript
// Start quiz
POST /gamification/quiz/start
Body: { difficulty?: string, category?: string }
Response: { id: string, questions: QuizQuestion[] }

// Submit answer
POST /gamification/quiz/answer
Body: { gameId: string, questionId: string, answer: number }
Response: { isCorrect: boolean, coinsEarned: number, nextQuestion?: QuizQuestion }
```

---

## 🎯 Context Integration

### Using Gamification Context

```tsx
import { useGamification } from '@/contexts/GamificationContext';

function MyComponent() {
  const { state, actions } = useGamification();

  // Get coin balance
  const balance = state.coinBalance.total;

  // Refresh data
  const refresh = async () => {
    await actions.loadGamificationData(true);
  };

  // Award coins
  const awardCoins = async (amount: number) => {
    await actions.awardCoins(amount, 'Game reward');
  };

  return <View>...</View>;
}
```

---

## 🎨 Loading States

### SpinWheelGame
```tsx
// Initial load
<ActivityIndicator /> + "Loading spin wheel..."

// During spin
<ActivityIndicator /> + "Spinning..."
```

### ScratchCardGame
```tsx
// Initial load
<ActivityIndicator /> + "Checking availability..."

// Creating
<ActivityIndicator /> + "Creating..."

// Scratching
<ActivityIndicator /> + "SCRATCHING..."
```

### QuizGame
```tsx
// Loading quiz
"Loading quiz..."

// Submitting answer
"Submitting..."
```

---

## 🚫 Empty States

### SpinWheelGame
- Cooldown warning banner (yellow)
- "Come Back Later" button
- "No Spins Left" button
- Contextual instructions

### ScratchCardGame
- Full-screen "Not Available"
- Next available time
- "Check Again" button

### Games Hub
- "Coming Soon" badges
- "Locked" badges
- Disabled game cards

---

## ⚠️ Error Handling

All components use try-catch blocks:

```tsx
try {
  const response = await gamificationAPI.spinWheel();
  if (response.success) {
    // Handle success
  }
} catch (error: any) {
  const message = error.response?.data?.message ||
                  error.message ||
                  'Failed to perform action';
  Alert.alert('Error', message);
  onError?.(message);
}
```

---

## 🔄 Wallet Integration

After earning coins:

```tsx
// 1. Update context
await gamificationActions.loadGamificationData(true);

// 2. Trigger callback
onCoinsEarned?.(coinsAmount);

// 3. Show alert
Alert.alert('Success!', `You earned ${coinsAmount} coins!`);
```

---

## 📊 Type Definitions

```typescript
// SpinWheelSegment
interface SpinWheelSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
  type: 'coins' | 'discount' | 'cashback' | 'voucher' | 'nothing';
}

// ScratchCardPrize
interface ScratchCardPrize {
  id: string;
  type: 'discount' | 'cashback' | 'coin' | 'voucher' | 'nothing';
  value: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// QuizQuestion
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
}
```

---

## 🧪 Testing Commands

```bash
# No changes to backend/frontend needed!
# All components integrate with existing APIs

# Just test the flows:
1. Open /games/spin-wheel
2. Tap "SPIN NOW"
3. Check wallet balance updates
4. Verify cooldown message

1. Open /scratch-card
2. Tap "Create Scratch Card"
3. Tap to scratch
4. Check prize and balance

1. Open /games/quiz
2. Answer questions
3. Check score and coins
4. Verify completion flow
```

---

## 📝 Implementation Checklist

- [x] SpinWheelGame enhanced with API integration
- [x] ScratchCardGame enhanced with API integration
- [x] QuizGame analyzed (already perfect)
- [x] Gamification Dashboard analyzed (uses real APIs)
- [x] Loading states added to all components
- [x] Empty states added for all scenarios
- [x] Error handling implemented everywhere
- [x] Wallet integration complete
- [x] Individual game pages exist and work
- [x] Context integration complete
- [x] Documentation created

---

## 🎯 Quick Navigation

| What | Where |
|------|-------|
| Spin Wheel Component | `components/gamification/SpinWheelGame.tsx` |
| Scratch Card Component | `components/gamification/ScratchCardGame.tsx` |
| Quiz Component | `components/gamification/QuizGame.tsx` |
| Spin Wheel Page | `app/games/spin-wheel.tsx` |
| Quiz Page | `app/games/quiz.tsx` |
| Scratch Card Page | `app/scratch-card.tsx` |
| Games Hub | `app/games/index.tsx` |
| Dashboard | `app/gamification/index.tsx` |
| API Service | `services/gamificationApi.ts` |
| Context | `contexts/GamificationContext.tsx` |
| Types | `types/gamification.types.ts` |

---

## 🚀 Production Ready

All game components are now:
- ✅ Fully integrated with backend APIs
- ✅ Connected to wallet system
- ✅ Using proper loading states
- ✅ Handling errors gracefully
- ✅ Showing empty states when needed
- ✅ Maintaining smooth animations
- ✅ Following app design patterns

**No dummy data remaining!**

---

**Quick Reference Generated by Agent 6**
