# Gamification Security Documentation

## Overview

This document outlines the comprehensive security measures implemented for the gamification system in the REZ App. The security layer protects against common attack vectors, prevents abuse, and ensures fair play.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Error Boundaries](#error-boundaries)
3. [Input Validation](#input-validation)
4. [Rate Limiting](#rate-limiting)
5. [Authentication Guards](#authentication-guards)
6. [Security Middleware](#security-middleware)
7. [Anti-Cheat Measures](#anti-cheat-measures)
8. [Implementation Guide](#implementation-guide)
9. [Testing Security](#testing-security)
10. [Best Practices](#best-practices)

---

## Security Architecture

### Defense in Depth

The security system implements multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  - Error Boundaries                                          │
│  - Visual Feedback                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 Authentication Layer                         │
│  - Token Validation                                          │
│  - Session Management                                        │
│  - Automatic Redirects                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Validation Layer                           │
│  - Input Sanitization                                        │
│  - Type Checking                                             │
│  - Range Validation                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 Rate Limiting Layer                          │
│  - Cooldown Timers                                           │
│  - Attempt Tracking                                          │
│  - Block Management                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Security Middleware                         │
│  - Pattern Detection                                         │
│  - Suspicious Activity Logging                               │
│  - Session Verification                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     API Layer                                │
│  - Server-side Validation                                    │
│  - Database Integrity                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Boundaries

### GameErrorBoundary Component

**Location:** `components/common/GameErrorBoundary.tsx`

**Purpose:** Catches and handles React errors in game components, preventing app crashes and detecting suspicious behavior.

### Features

1. **Error Catching**
   - Catches all React component errors
   - Provides fallback UI
   - Logs errors to monitoring service

2. **Anti-Cheat Detection**
   - Tracks error frequency
   - Detects repeated identical errors
   - Flags suspicious patterns

3. **User Experience**
   - User-friendly error messages
   - Recovery options (Try Again, Return to Games)
   - Visual feedback for different error types

### Usage

```tsx
import GameErrorBoundary from '@/components/common/GameErrorBoundary';

function GameComponent() {
  return (
    <GameErrorBoundary
      gameName="Spin Wheel"
      onReturnToGames={() => router.push('/games')}
      onReset={() => resetGameState()}
    >
      {/* Your game component */}
    </GameErrorBoundary>
  );
}
```

### Error Thresholds

- **Max Errors:** 5 errors within 1 minute triggers warning
- **Identical Errors:** 3 identical errors suggests tampering
- **Actions:** User account flagged for review

---

## Input Validation

### GameValidation Utility

**Location:** `utils/gameValidation.ts`

**Purpose:** Validates and sanitizes all game-related inputs before processing.

### Validation Functions

#### 1. Coin Amount Validation

```typescript
validateCoinAmount(amount: number): boolean
```

- Checks if value is a number
- Ensures it's a positive integer
- Enforces maximum limit (1,000,000)
- Throws `ValidationError` if invalid

#### 2. Quiz Answer Validation

```typescript
validateQuizAnswer(answer: number, maxOptions: number): boolean
```

- Validates answer is within range (0 to maxOptions-1)
- Ensures it's an integer
- Prevents out-of-range manipulation

#### 3. User/Game ID Validation

```typescript
validateUserId(userId: string): boolean
validateGameId(gameId: string): boolean
```

- Validates MongoDB ObjectId format (24 hex characters)
- Prevents invalid ID injection
- Ensures proper string format

#### 4. Input Sanitization

```typescript
sanitizeString(input: string): string
sanitizeObject<T>(obj: T): T
```

- Removes script tags (XSS prevention)
- Strips HTML tags
- Removes SQL injection attempts
- Recursively sanitizes objects

### Usage Example

```typescript
import { GameValidation } from '@/utils/gameValidation';

// Validate coin amount
try {
  GameValidation.validateCoinAmount(rewardAmount);
  // Proceed with reward
} catch (error) {
  console.error('Invalid coin amount:', error.message);
}

// Sanitize user input
const cleanData = GameValidation.sanitizeObject(userInput);
```

### Validation Errors

The `ValidationError` class provides:
- Error message
- Field name
- Error code

Error codes:
- `INVALID_TYPE` - Wrong data type
- `EMPTY_VALUE` - Empty required field
- `INVALID_FORMAT` - Incorrect format
- `OUT_OF_RANGE` - Value out of bounds
- `NEGATIVE_VALUE` - Negative number not allowed
- `EXCEEDS_LIMIT` - Exceeds maximum
- `NOT_INTEGER` - Must be whole number

---

## Rate Limiting

### GameRateLimiter Utility

**Location:** `utils/gameRateLimiter.ts`

**Purpose:** Prevents spam clicking and abuse by enforcing cooldowns and attempt limits.

### Rate Limit Configurations

```typescript
GAME_RATE_LIMITS = {
  SPIN_WHEEL: {
    maxAttempts: 1,
    windowMs: 24 hours,
    cooldownMs: 24 hours,
  },
  SCRATCH_CARD: {
    maxAttempts: 3,
    windowMs: 24 hours,
    cooldownMs: 8 hours,
  },
  QUIZ_START: {
    maxAttempts: 5,
    windowMs: 1 hour,
    cooldownMs: 5 minutes,
  },
  QUIZ_ANSWER: {
    maxAttempts: 30,
    windowMs: 10 minutes,
    cooldownMs: 2 seconds,
  },
}
```

### Rate Limit Process

```
User Action
    ↓
Check Rate Limit ────► Blocked? ──Yes──► Show Cooldown Message
    │                                            ↓
    No                                      Deny Action
    ↓
Allow Action
    ↓
Record Attempt
    ↓
Update Cooldown
```

### Usage

```typescript
import gameRateLimiter from '@/utils/gameRateLimiter';

// Check if action is allowed
const result = await gameRateLimiter.checkRateLimit(userId, 'SPIN_WHEEL');

if (!result.allowed) {
  Alert.alert(
    'Cooldown Active',
    `Please wait ${gameRateLimiter.formatRemainingTime(result.cooldownRemaining)}`
  );
  return;
}

// Perform action
await performSpinWheel();

// Record attempt
await gameRateLimiter.recordAttempt(userId, 'SPIN_WHEEL');
```

### Hook Usage

```typescript
import { useGameRateLimiter } from '@/utils/gameRateLimiter';

function GameComponent() {
  const { checkLimit, recordAttempt, getCooldown, formatTime } =
    useGameRateLimiter(userId, 'SCRATCH_CARD');

  const handleAction = async () => {
    const result = await checkLimit();
    if (!result.allowed) {
      alert(`Cooldown: ${formatTime(result.cooldownRemaining)}`);
      return;
    }

    await performAction();
    await recordAttempt();
  };
}
```

### Rate Limit Results

```typescript
interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  cooldownRemaining: number;
  reason?: 'BLOCKED' | 'COOLDOWN' | 'MAX_ATTEMPTS_EXCEEDED';
}
```

---

## Authentication Guards

### GameAuthGuard Utility

**Location:** `utils/gameAuthGuard.ts`

**Purpose:** Ensures all game routes require valid authentication.

### Features

1. **Token Validation**
   - Validates JWT structure
   - Checks expiration
   - Automatic refresh when needed

2. **Session Management**
   - Tracks last activity
   - Enforces session timeout (30 minutes)
   - Auto-logout on inactivity

3. **Automatic Redirects**
   - Redirects to login if unauthenticated
   - Preserves return path
   - Handles token expiration

### Usage in Components

```typescript
import gameAuthGuard from '@/utils/gameAuthGuard';

function GamePage() {
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await gameAuthGuard.requireAuth('spin-wheel');
      if (isAuth) {
        loadGameData();
      }
    };
    checkAuth();
  }, []);
}
```

### Hook Usage

```typescript
import { useGameAuthGuard } from '@/utils/gameAuthGuard';

function GameComponent() {
  const { requireAuth, getToken, getUserId, isAuthenticated } = useGameAuthGuard();

  const initialize = async () => {
    if (await requireAuth('scratch-card')) {
      const token = await getToken();
      const userId = await getUserId();
      // Proceed with game
    }
  };
}
```

### Authentication Flow

```
User Access Game
    ↓
Check Token Exists ──No──► Redirect to Login
    │                            ↓
   Yes                     Save Return Path
    ↓
Validate Token ──Invalid──► Clear Auth → Redirect
    │                                        ↓
   Valid                              Show Login Page
    ↓
Check Session Timeout ──Expired──► Clear Auth → Redirect
    │
   Active
    ↓
Update Activity
    ↓
Allow Access
```

---

## Security Middleware

### GameSecurityMiddleware Utility

**Location:** `utils/gameSecurityMiddleware.ts`

**Purpose:** Comprehensive security checks and anti-cheat measures.

### Security Checks

1. **Authentication** - Verify user is logged in
2. **Rate Limiting** - Check cooldowns and limits
3. **Suspicious Activity** - Detect abuse patterns
4. **Data Validation** - Validate all inputs
5. **Session Verification** - Verify game sessions

### Usage

```typescript
import gameSecurityMiddleware from '@/utils/gameSecurityMiddleware';

async function performGameAction(userId: string, action: string, data: any) {
  // Perform security check
  const securityCheck = await gameSecurityMiddleware.performSecurityCheck(
    userId,
    action,
    data
  );

  if (!securityCheck.allowed) {
    handleSecurityViolation(securityCheck.reason);
    return;
  }

  // Action is secure, proceed
  await executeAction(data);
}
```

### Game Session Management

```typescript
// Create session (provably fair)
const session = await gameSecurityMiddleware.createGameSession(userId, gameId);

// Play game with session
const result = await playGame(session);

// Verify result
const verification = await gameSecurityMiddleware.verifyGameResult(
  session.sessionId,
  result
);

if (!verification.isValid) {
  console.warn('Invalid game result:', verification.reason);
  // Flag user
}
```

### Suspicious Activity Detection

The middleware tracks:
- Multiple errors
- Invalid data submissions
- Suspicious reward amounts
- Rapid game completion
- Rate limit violations

Thresholds:
- **5 activities** in 1 hour → Flag user
- **2 high severity** activities → Block user
- **Suspicious timing** → Verify results

---

## Anti-Cheat Measures

### 1. Server-Side Verification

All game results MUST be verified server-side:

```typescript
// Frontend submits game session, not result
POST /api/gamification/spin-wheel
{
  sessionId: "session_123...",
  clientSeed: "user_random_seed"
}

// Backend calculates result using server seed
// Returns verified result
```

### 2. Session Tokens

Each game creates a unique session:

```typescript
const session = {
  sessionId: "unique_id",
  gameId: "spin_wheel",
  userId: "user_123",
  startTime: 1234567890,
  serverSeed: "crypto_random_seed"
};
```

### 3. Timing Verification

Games have minimum completion times:

```typescript
const gameTime = Date.now() - session.startTime;
if (gameTime < MINIMUM_GAME_TIME) {
  // Flag as suspicious - game completed too fast
}
```

### 4. Reward Validation

Rewards are checked against expected ranges:

```typescript
if (result.coinsEarned > MAX_GAME_REWARD) {
  // Impossible reward amount - reject
}
```

### 5. Pattern Detection

The system tracks:
- Repeated errors
- Rapid requests
- Identical submissions
- Unusual behavior patterns

---

## Implementation Guide

### Step 1: Wrap Components with Error Boundaries

```tsx
import GameErrorBoundary from '@/components/common/GameErrorBoundary';

export default function GamePage() {
  return (
    <GameErrorBoundary
      gameName="Your Game"
      onReturnToGames={() => router.push('/games')}
      onReset={() => resetState()}
    >
      {/* Your game component */}
    </GameErrorBoundary>
  );
}
```

### Step 2: Add Authentication Check

```tsx
import gameAuthGuard from '@/utils/gameAuthGuard';

useEffect(() => {
  const init = async () => {
    const isAuth = await gameAuthGuard.requireAuth('game-name');
    if (isAuth) {
      initializeGame();
    }
  };
  init();
}, []);
```

### Step 3: Implement Rate Limiting

```typescript
import gameRateLimiter from '@/utils/gameRateLimiter';

const handleGameAction = async () => {
  const userId = await gameAuthGuard.getUserId();
  if (!userId) return;

  // Check rate limit
  const rateLimitResult = await gameRateLimiter.checkRateLimit(
    userId,
    'GAME_ACTION'
  );

  if (!rateLimitResult.allowed) {
    Alert.alert(
      'Cooldown Active',
      `Wait ${gameRateLimiter.formatRemainingTime(rateLimitResult.cooldownRemaining)}`
    );
    return;
  }

  // Perform action
  await performAction();

  // Record attempt
  await gameRateLimiter.recordAttempt(userId, 'GAME_ACTION');
};
```

### Step 4: Validate Inputs

```typescript
import { GameValidation } from '@/utils/gameValidation';

try {
  GameValidation.validateQuizAnswer(userAnswer, 4);
  const cleanData = GameValidation.sanitizeObject(formData);
  await submitAnswer(cleanData);
} catch (error) {
  Alert.alert('Invalid Input', error.message);
}
```

### Step 5: Use Security Middleware

```typescript
import gameSecurityMiddleware from '@/utils/gameSecurityMiddleware';

const performSecureAction = async (action: string, data: any) => {
  const userId = await gameAuthGuard.getUserId();
  if (!userId) return;

  const securityCheck = await gameSecurityMiddleware.performSecurityCheck(
    userId,
    action,
    data
  );

  if (!securityCheck.allowed) {
    console.warn('Security check failed:', securityCheck.reason);
    return;
  }

  // Proceed with action
  await executeAction(data);
};
```

---

## Testing Security

### Test Checklist

#### Error Boundaries

- [ ] Component errors are caught
- [ ] Fallback UI is displayed
- [ ] Reset functionality works
- [ ] Multiple errors trigger warning
- [ ] Error logs are created

#### Authentication

- [ ] Unauthenticated users redirected
- [ ] Expired tokens are handled
- [ ] Session timeout works
- [ ] Activity updates correctly
- [ ] Return path is preserved

#### Rate Limiting

- [ ] Cooldowns are enforced
- [ ] Attempts are counted
- [ ] Blocked users cannot proceed
- [ ] Time formatting is correct
- [ ] Cache persists across sessions

#### Input Validation

- [ ] Invalid inputs are rejected
- [ ] XSS attempts are sanitized
- [ ] SQL injection is prevented
- [ ] Type checking works
- [ ] Range validation functions

#### Security Middleware

- [ ] Suspicious activity is detected
- [ ] Patterns are flagged
- [ ] Session verification works
- [ ] Timing checks function
- [ ] Reward validation occurs

### Manual Testing

1. **Try to access game without login**
   - Should redirect to sign-in page

2. **Spam click game button**
   - Should show cooldown message after limit

3. **Submit invalid data**
   - Should reject with error message

4. **Force component error**
   - Should show error boundary UI

5. **Try to claim excessive reward**
   - Should flag as suspicious

### Automated Testing

```typescript
// Example test
describe('Game Security', () => {
  it('should enforce rate limits', async () => {
    const userId = 'test_user';
    const action = 'TEST_ACTION';

    // Should allow first attempt
    let result = await gameRateLimiter.checkRateLimit(userId, action);
    expect(result.allowed).toBe(true);

    // Record attempt
    await gameRateLimiter.recordAttempt(userId, action);

    // Should block second immediate attempt
    result = await gameRateLimiter.checkRateLimit(userId, action);
    expect(result.allowed).toBe(false);
  });
});
```

---

## Best Practices

### 1. Always Validate on Both Sides

```typescript
// Frontend validation (UX)
if (!GameValidation.validateCoinAmount(amount)) {
  Alert.alert('Invalid amount');
  return;
}

// Backend validation (Security)
// Server should also validate before processing
```

### 2. Use Error Boundaries Everywhere

```tsx
// Wrap all game components
<GameErrorBoundary gameName="...">
  <GameComponent />
</GameErrorBoundary>
```

### 3. Check Auth Before Every Action

```typescript
// Always verify authentication
const isAuth = await gameAuthGuard.isAuthenticated();
if (!isAuth.isAuthenticated) {
  // Handle unauthenticated state
}
```

### 4. Implement Proper Cooldowns

```typescript
// Use appropriate cooldown for action
const config = {
  maxAttempts: 3,
  windowMs: 60000, // 1 minute
  cooldownMs: 5000, // 5 seconds
};
```

### 5. Log Suspicious Activity

```typescript
// Always log suspicious patterns
await gameSecurityMiddleware.logSuspiciousActivity(
  userId,
  'SUSPICIOUS_BEHAVIOR',
  { details },
  'high'
);
```

### 6. Sanitize All Inputs

```typescript
// Never trust user input
const clean = GameValidation.sanitizeObject(userInput);
```

### 7. Use Server-Side Verification

```typescript
// Never calculate rewards client-side
// Let server determine outcomes
const result = await api.spinWheel({ sessionId });
```

### 8. Monitor and Review

- Check error logs regularly
- Review flagged users
- Analyze suspicious patterns
- Update thresholds as needed

---

## Security Checklist

### Frontend Security

- [x] Error boundaries on all game pages
- [x] Input validation before submission
- [x] Rate limiting on all actions
- [x] Authentication checks on mount
- [x] Session timeout handling
- [x] Suspicious activity logging
- [x] Token validation
- [x] Data sanitization

### Backend Security (To Implement)

- [ ] Server-side validation
- [ ] Rate limiting middleware
- [ ] CORS configuration
- [ ] Helmet.js security headers
- [ ] Request size limits
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure session management
- [ ] Database query validation

### Monitoring (To Implement)

- [ ] Error tracking (Sentry)
- [ ] Analytics dashboard
- [ ] Suspicious user alerts
- [ ] Rate limit violations log
- [ ] Failed auth attempts log
- [ ] Performance monitoring
- [ ] Audit trail

---

## Common Attack Vectors & Mitigations

### 1. Spam Clicking

**Attack:** Rapidly clicking game buttons to exploit timing issues

**Mitigation:**
```typescript
// Rate limiting with cooldowns
await gameRateLimiter.checkRateLimit(userId, action);
```

### 2. Token Manipulation

**Attack:** Modifying or replaying authentication tokens

**Mitigation:**
```typescript
// Token validation with expiration
const isValid = await gameAuthGuard.validateToken(token);
```

### 3. Input Injection

**Attack:** SQL injection, XSS via input fields

**Mitigation:**
```typescript
// Input sanitization
const clean = GameValidation.sanitizeObject(input);
```

### 4. Result Manipulation

**Attack:** Modifying client-side game results

**Mitigation:**
```typescript
// Server-side result calculation
// Session-based verification
await gameSecurityMiddleware.verifyGameResult(sessionId, result);
```

### 5. Timing Exploits

**Attack:** Completing games impossibly fast

**Mitigation:**
```typescript
// Minimum game time enforcement
if (gameTime < MINIMUM_TIME) {
  flagAsSuspicious();
}
```

---

## Support & Maintenance

### Updating Rate Limits

Edit `utils/gameRateLimiter.ts`:

```typescript
export const GAME_RATE_LIMITS = {
  YOUR_ACTION: {
    maxAttempts: 10,
    windowMs: 60000,
    cooldownMs: 5000,
  },
};
```

### Adding New Validations

Add to `utils/gameValidation.ts`:

```typescript
export function validateNewField(value: any): boolean {
  // Your validation logic
}
```

### Monitoring Logs

Check console for security warnings:

```
[GameErrorBoundary] Suspicious activity detected
[GameSecurityMiddleware] User flagged for review
[GameRateLimiter] Rate limit exceeded
```

---

## Conclusion

The gamification security system provides comprehensive protection through:

- **Error Boundaries** - Graceful error handling
- **Input Validation** - Data integrity
- **Rate Limiting** - Abuse prevention
- **Authentication Guards** - Access control
- **Security Middleware** - Pattern detection
- **Anti-Cheat** - Fair play enforcement

All layers work together to create a secure gaming environment while maintaining a smooth user experience.

---

## Quick Reference

### Import Paths

```typescript
// Error Boundary
import GameErrorBoundary from '@/components/common/GameErrorBoundary';

// Validation
import { GameValidation } from '@/utils/gameValidation';

// Rate Limiting
import gameRateLimiter from '@/utils/gameRateLimiter';

// Authentication
import gameAuthGuard from '@/utils/gameAuthGuard';

// Security Middleware
import gameSecurityMiddleware from '@/utils/gameSecurityMiddleware';
```

### Common Patterns

```typescript
// Secure game action
const performSecureGameAction = async () => {
  // 1. Check auth
  if (!(await gameAuthGuard.requireAuth('game'))) return;

  // 2. Get user ID
  const userId = await gameAuthGuard.getUserId();
  if (!userId) return;

  // 3. Check rate limit
  const rateLimit = await gameRateLimiter.checkRateLimit(userId, 'ACTION');
  if (!rateLimit.allowed) {
    showCooldownMessage(rateLimit.cooldownRemaining);
    return;
  }

  // 4. Validate input
  try {
    GameValidation.validateCoinAmount(amount);
  } catch (error) {
    showError(error.message);
    return;
  }

  // 5. Perform action
  const result = await performAction();

  // 6. Record attempt
  await gameRateLimiter.recordAttempt(userId, 'ACTION');

  return result;
};
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-03
**Author:** Agent 9 - Security Engineer
