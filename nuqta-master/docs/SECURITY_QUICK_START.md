# Gamification Security - Quick Start Guide

## 5-Minute Implementation Guide

This guide shows you how to secure a game component in 5 minutes.

---

## Step 1: Wrap with Error Boundary (1 minute)

```tsx
import GameErrorBoundary from '@/components/common/GameErrorBoundary';

export default function MyGame() {
  return (
    <GameErrorBoundary
      gameName="My Game"
      onReturnToGames={() => router.push('/games')}
      onReset={() => resetGameState()}
    >
      {/* Your game component */}
    </GameErrorBoundary>
  );
}
```

---

## Step 2: Add Authentication (1 minute)

```tsx
import gameAuthGuard from '@/utils/gameAuthGuard';

export default function MyGame() {
  useEffect(() => {
    const init = async () => {
      const isAuth = await gameAuthGuard.requireAuth('my-game');
      if (isAuth) {
        loadGameData();
      }
    };
    init();
  }, []);
}
```

---

## Step 3: Add Rate Limiting (2 minutes)

```tsx
import gameRateLimiter from '@/utils/gameRateLimiter';

const handleGameAction = async () => {
  // Get user ID
  const userId = await gameAuthGuard.getUserId();
  if (!userId) return;

  // Check rate limit
  const result = await gameRateLimiter.checkRateLimit(userId, 'MY_GAME_ACTION');

  if (!result.allowed) {
    Alert.alert(
      'Cooldown Active',
      `Please wait ${gameRateLimiter.formatRemainingTime(result.cooldownRemaining)}`
    );
    return;
  }

  // Perform action
  await performGameAction();

  // Record attempt
  await gameRateLimiter.recordAttempt(userId, 'MY_GAME_ACTION');
};
```

---

## Step 4: Validate Inputs (1 minute)

```tsx
import { GameValidation } from '@/utils/gameValidation';

const handleSubmit = async () => {
  try {
    // Validate inputs
    GameValidation.validateCoinAmount(rewardAmount);
    GameValidation.validateQuizAnswer(userAnswer, 4);

    // Sanitize data
    const cleanData = GameValidation.sanitizeObject(formData);

    // Submit
    await submitData(cleanData);
  } catch (error) {
    Alert.alert('Invalid Input', error.message);
  }
};
```

---

## Complete Example

```tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import GameErrorBoundary from '@/components/common/GameErrorBoundary';
import gameAuthGuard from '@/utils/gameAuthGuard';
import gameRateLimiter from '@/utils/gameRateLimiter';
import { GameValidation } from '@/utils/gameValidation';

export default function MySecureGame() {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step 2: Authentication
  useEffect(() => {
    const init = async () => {
      const isAuth = await gameAuthGuard.requireAuth('my-game');
      if (isAuth) {
        await loadGameData();
      }
    };
    init();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const data = await fetchGameData();
      setGameData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 & 4: Rate Limiting + Validation
  const handlePlayGame = async () => {
    const userId = await gameAuthGuard.getUserId();
    if (!userId) return;

    // Check rate limit
    const rateLimitResult = await gameRateLimiter.checkRateLimit(
      userId,
      'PLAY_GAME'
    );

    if (!rateLimitResult.allowed) {
      Alert.alert(
        'Cooldown Active',
        `Wait ${gameRateLimiter.formatRemainingTime(rateLimitResult.cooldownRemaining)}`
      );
      return;
    }

    try {
      // Validate inputs
      GameValidation.validateCoinAmount(gameData.bet);

      // Play game
      const result = await playGame(gameData);

      // Record attempt
      await gameRateLimiter.recordAttempt(userId, 'PLAY_GAME');

      // Show result
      Alert.alert('Success', `You won ${result.coins} coins!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Step 1: Error Boundary wrapping
  return (
    <GameErrorBoundary
      gameName="My Secure Game"
      onReturnToGames={() => router.push('/games')}
      onReset={() => loadGameData()}
    >
      <View>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <TouchableOpacity onPress={handlePlayGame}>
            <Text>Play Game</Text>
          </TouchableOpacity>
        )}
      </View>
    </GameErrorBoundary>
  );
}
```

---

## Rate Limit Configurations

Add custom rate limits in `utils/gameRateLimiter.ts`:

```typescript
export const GAME_RATE_LIMITS = {
  MY_GAME_ACTION: {
    maxAttempts: 10,        // Max 10 attempts
    windowMs: 60 * 60 * 1000, // Within 1 hour
    cooldownMs: 5000,       // 5 seconds between attempts
  },
};
```

---

## Validation Examples

### Validate Coin Amount
```typescript
GameValidation.validateCoinAmount(100); // ✅ Valid
GameValidation.validateCoinAmount(-10); // ❌ Throws error
GameValidation.validateCoinAmount(1000000000); // ❌ Throws error
```

### Validate Quiz Answer
```typescript
GameValidation.validateQuizAnswer(2, 4); // ✅ Valid (0-3)
GameValidation.validateQuizAnswer(5, 4); // ❌ Throws error
GameValidation.validateQuizAnswer(1.5, 4); // ❌ Throws error
```

### Sanitize Input
```typescript
const dirty = {
  name: "<script>alert('xss')</script>John",
  amount: "100"
};
const clean = GameValidation.sanitizeObject(dirty);
// Result: { name: "John", amount: "100" }
```

---

## Common Patterns

### Pattern 1: Secure Button Click

```tsx
const handleSecureClick = async () => {
  const userId = await gameAuthGuard.getUserId();
  if (!userId) return;

  const rateLimit = await gameRateLimiter.checkRateLimit(userId, 'BUTTON_CLICK');
  if (!rateLimit.allowed) {
    showCooldown(rateLimit.cooldownRemaining);
    return;
  }

  await performAction();
  await gameRateLimiter.recordAttempt(userId, 'BUTTON_CLICK');
};
```

### Pattern 2: Form Submission

```tsx
const handleSecureSubmit = async (formData: any) => {
  try {
    // Sanitize
    const clean = GameValidation.sanitizeObject(formData);

    // Validate
    GameValidation.validateCoinAmount(clean.amount);

    // Submit
    await submitForm(clean);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Pattern 3: API Call with Auth

```tsx
const secureApiCall = async () => {
  const token = await gameAuthGuard.getToken();
  if (!token) return;

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
```

---

## Troubleshooting

### "User not authenticated"
```tsx
// Check if user is logged in
const authResult = await gameAuthGuard.isAuthenticated();
console.log('Auth status:', authResult);

// If false, redirect to login
if (!authResult.isAuthenticated) {
  router.push('/sign-in');
}
```

### "Rate limit exceeded"
```tsx
// Check cooldown status
const userId = await gameAuthGuard.getUserId();
const cooldown = await gameRateLimiter.getCooldownInfo(userId, 'ACTION');

console.log('Cooldown:', {
  isOnCooldown: cooldown.isOnCooldown,
  remainingMs: cooldown.remainingMs,
  nextAvailable: new Date(cooldown.nextAvailableTime)
});
```

### "Validation error"
```tsx
try {
  GameValidation.validateCoinAmount(amount);
} catch (error) {
  console.log('Validation failed:', {
    field: error.field,
    code: error.code,
    message: error.message
  });
}
```

---

## Testing Your Implementation

### 1. Test Authentication
- Access game without login → Should redirect
- Access game with login → Should load

### 2. Test Rate Limiting
- Click button rapidly → Should show cooldown
- Wait for cooldown → Should work again

### 3. Test Validation
- Submit invalid data → Should show error
- Submit valid data → Should succeed

### 4. Test Error Boundary
- Force an error → Should show error UI
- Click "Try Again" → Should recover

---

## Security Checklist

- [ ] Error boundary added
- [ ] Authentication check on mount
- [ ] Rate limiting on actions
- [ ] Input validation before submit
- [ ] Data sanitization applied
- [ ] Token included in API calls
- [ ] Error handling implemented
- [ ] User feedback provided

---

## Next Steps

1. ✅ Implement basic security (this guide)
2. 📚 Read full documentation (GAMIFICATION_SECURITY.md)
3. 🧪 Test thoroughly
4. 🚀 Deploy with confidence

---

## Quick Links

- **Full Documentation:** [GAMIFICATION_SECURITY.md](./GAMIFICATION_SECURITY.md)
- **Error Boundary:** `components/common/GameErrorBoundary.tsx`
- **Validation Utils:** `utils/gameValidation.ts`
- **Rate Limiter:** `utils/gameRateLimiter.ts`
- **Auth Guard:** `utils/gameAuthGuard.ts`
- **Security Middleware:** `utils/gameSecurityMiddleware.ts`

---

**Need Help?** Check the full documentation for detailed explanations and advanced features.
