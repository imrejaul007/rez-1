# Gamification API Reference

Complete API documentation for the REZ app gamification system including endpoints, request/response formats, error codes, and usage examples.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Spin Wheel API](#spin-wheel-api)
4. [Scratch Card API](#scratch-card-api)
5. [Quiz Game API](#quiz-game-api)
6. [Challenges API](#challenges-api)
7. [Achievements API](#achievements-api)
8. [Leaderboard API](#leaderboard-api)
9. [Points/Coins API](#pointscoins-api)
10. [Error Codes](#error-codes)
11. [WebSocket Events](#websocket-events)

---

## Overview

Base URL: `https://api.rezapp.com/api`

All endpoints require authentication unless specified otherwise. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## Authentication

Authentication is handled via JWT tokens obtained during login. The token must be included in all gamification API requests.

### Required Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Spin Wheel API

### 1. Spin the Wheel

**Endpoint:** `POST /gamification/spin-wheel`

**Description:** Spins the wheel and awards a random prize to the user.

**Request:**
```typescript
POST /gamification/spin-wheel
Authorization: Bearer <token>

// No body required
```

**Response:**
```typescript
{
  success: true,
  data: {
    result: {
      segment: {
        id: "seg_1",
        label: "100 Coins",
        value: 100,
        color: "#8B5CF6",
        icon: "diamond",
        type: "coins"
      },
      prize: {
        type: "coins",
        value: 100,
        description: "100 REZ Coins"
      },
      rotation: 1980  // Final rotation angle in degrees
    },
    coinsAdded: 100,
    newBalance: 1250
  }
}
```

**Error Codes:**
- `SPIN_COOLDOWN`: User must wait before spinning again
- `SPIN_LIMIT_REACHED`: Daily spin limit reached
- `INSUFFICIENT_LEVEL`: User level too low to access spin wheel

---

### 2. Check Spin Eligibility

**Endpoint:** `GET /gamification/spin-wheel/eligibility`

**Description:** Checks if the user can spin the wheel and when the next spin is available.

**Request:**
```typescript
GET /gamification/spin-wheel/eligibility
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    canSpin: false,
    nextSpinAt: "2025-11-04T10:30:00Z",
    remainingCooldown: 3600  // seconds until next spin
  }
}
```

---

## Scratch Card API

### 1. Create Scratch Card

**Endpoint:** `POST /gamification/scratch-card`

**Description:** Creates a new scratch card for the user.

**Request:**
```typescript
POST /gamification/scratch-card
Authorization: Bearer <token>

// No body required
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "card_abc123",
    userId: "user_xyz789",
    prize: {
      id: "prize_1",
      type: "coin",
      value: 100,
      title: "100 REZ Coins",
      description: "Earn 100 REZ coins to your wallet",
      icon: "diamond",
      color: "#8B5CF6"
    },
    isScratched: false,
    isRedeemed: false,
    expiresAt: "2025-11-10T00:00:00Z",
    createdAt: "2025-11-03T10:00:00Z"
  }
}
```

**Error Codes:**
- `CARD_LIMIT_REACHED`: Maximum active cards reached
- `INSUFFICIENT_PROFILE`: Profile completion below 80%

---

### 2. Scratch Card

**Endpoint:** `POST /gamification/scratch-card/:cardId/scratch`

**Description:** Scratches the card and reveals the prize.

**Request:**
```typescript
POST /gamification/scratch-card/card_abc123/scratch
Authorization: Bearer <token>

// No body required
```

**Response:**
```typescript
{
  success: true,
  data: {
    card: {
      id: "card_abc123",
      isScratched: true,
      isRedeemed: false,
      // ... other card details
    },
    prize: {
      type: "coin",
      value: 100,
      // ... prize details
    },
    coinsAdded: 100
  }
}
```

**Error Codes:**
- `CARD_NOT_FOUND`: Card does not exist
- `CARD_ALREADY_SCRATCHED`: Card has already been scratched
- `CARD_EXPIRED`: Card has expired

---

### 3. Check Eligibility

**Endpoint:** `GET /gamification/scratch-card/eligibility`

**Description:** Checks if user can create a new scratch card.

**Request:**
```typescript
GET /gamification/scratch-card/eligibility
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    canCreate: true,
    reason: "Profile completion requirement met",
    nextAvailableAt: null
  }
}
```

---

## Quiz Game API

### 1. Start Quiz

**Endpoint:** `POST /gamification/quiz/start`

**Description:** Starts a new quiz game with specified difficulty and category.

**Request:**
```typescript
POST /gamification/quiz/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "difficulty": "medium",  // optional: easy, medium, hard
  "category": "general"    // optional: general, tech, sports, etc.
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "quiz_abc123",
    userId: "user_xyz789",
    questions: [
      {
        id: "q1",
        question: "What is the capital of France?",
        options: ["London", "Paris", "Berlin", "Madrid"],
        correctAnswer: 1,  // 0-indexed
        difficulty: "easy",
        category: "geography",
        timeLimit: 30  // seconds
      },
      // ... more questions
    ],
    currentQuestionIndex: 0,
    score: 0,
    coinsEarned: 0,
    startedAt: "2025-11-03T10:00:00Z",
    isCompleted: false
  }
}
```

**Error Codes:**
- `ACTIVE_QUIZ_EXISTS`: User already has an active quiz
- `INVALID_DIFFICULTY`: Invalid difficulty level
- `INVALID_CATEGORY`: Invalid category

---

### 2. Submit Quiz Answer

**Endpoint:** `POST /gamification/quiz/answer`

**Description:** Submits an answer for the current quiz question.

**Request:**
```typescript
POST /gamification/quiz/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "quiz_abc123",
  "questionId": "q1",
  "answer": 1  // 0-indexed answer
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    isCorrect: true,
    coinsEarned: 10,
    currentScore: 10,
    nextQuestion: {
      id: "q2",
      question: "What year did World War II end?",
      options: ["1943", "1944", "1945", "1946"],
      correctAnswer: 2,
      difficulty: "medium",
      category: "history",
      timeLimit: 30
    },
    gameCompleted: false,
    totalCoins: 10
  }
}
```

**If quiz completed:**
```typescript
{
  success: true,
  data: {
    isCorrect: true,
    coinsEarned: 10,
    currentScore: 50,
    gameCompleted: true,
    totalCoins: 50,
    achievementsUnlocked: ["quiz_master"]
  }
}
```

**Error Codes:**
- `QUIZ_NOT_FOUND`: Quiz game not found
- `INVALID_QUESTION`: Question ID does not match current question
- `TIME_EXPIRED`: Time limit exceeded
- `QUIZ_ALREADY_COMPLETED`: Quiz has already been completed

---

### 3. Get Current Quiz

**Endpoint:** `GET /gamification/quiz/current`

**Description:** Retrieves the user's current active quiz game.

**Request:**
```typescript
GET /gamification/quiz/current
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "quiz_abc123",
    // ... quiz details
  }
}
```

**Returns `null` if no active quiz:**
```typescript
{
  success: true,
  data: null
}
```

---

## Challenges API

### 1. Get All Challenges

**Endpoint:** `GET /gamification/challenges`

**Description:** Retrieves all active challenges for the user.

**Request:**
```typescript
GET /gamification/challenges
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "challenge_1",
      title: "Shopping Spree",
      description: "Make 5 purchases this week",
      type: "weekly",
      difficulty: "medium",
      progress: {
        current: 2,
        target: 5,
        percentage: 40
      },
      rewards: {
        coins: 200,
        badges: ["shopper"],
        vouchers: []
      },
      status: "active",
      startDate: "2025-11-01T00:00:00Z",
      endDate: "2025-11-08T00:00:00Z",
      icon: "cart",
      color: "#10B981"
    },
    // ... more challenges
  ]
}
```

**Challenge Types:**
- `daily`: Resets every 24 hours
- `weekly`: Resets every week
- `special`: One-time special event challenges

**Challenge Status:**
- `active`: Challenge in progress
- `completed`: Target reached, reward available
- `claimed`: Reward has been claimed
- `expired`: Challenge time expired

---

### 2. Get Challenge Details

**Endpoint:** `GET /gamification/challenges/:challengeId`

**Description:** Retrieves detailed information about a specific challenge.

**Request:**
```typescript
GET /gamification/challenges/challenge_1
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "challenge_1",
    title: "Shopping Spree",
    // ... full challenge details
    progressHistory: [
      { date: "2025-11-01", value: 1 },
      { date: "2025-11-02", value: 2 }
    ],
    estimatedCompletion: "2025-11-06"
  }
}
```

---

### 3. Claim Challenge Reward

**Endpoint:** `POST /gamification/claim-reward`

**Description:** Claims the reward for a completed challenge.

**Request:**
```typescript
POST /gamification/claim-reward
Authorization: Bearer <token>
Content-Type: application/json

{
  "challengeId": "challenge_1"
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    challenge: {
      id: "challenge_1",
      status: "claimed",
      // ... challenge details
    },
    rewards: {
      coins: 200,
      badges: ["shopper"],
      vouchers: [
        {
          id: "voucher_1",
          type: "discount",
          value: 10,
          code: "SHOP10"
        }
      ]
    },
    newBalance: 1450
  }
}
```

**Error Codes:**
- `CHALLENGE_NOT_FOUND`: Challenge does not exist
- `CHALLENGE_NOT_COMPLETED`: Challenge not yet completed
- `REWARD_ALREADY_CLAIMED`: Reward has already been claimed
- `CHALLENGE_EXPIRED`: Challenge has expired

---

## Achievements API

### 1. Get All Achievements

**Endpoint:** `GET /gamification/achievements`

**Description:** Retrieves all achievements with user progress.

**Request:**
```typescript
GET /gamification/achievements
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "ach_1",
      title: "First Order",
      description: "Complete your first order",
      icon: "trophy",
      badge: "first_order_badge",
      tier: "bronze",
      coinReward: 50,
      unlockedAt: "2025-11-01T10:00:00Z",
      isUnlocked: true,
      progress: {
        current: 1,
        target: 1
      },
      category: "shopping",
      createdAt: "2025-10-01T00:00:00Z",
      updatedAt: "2025-11-01T10:00:00Z"
    },
    // ... more achievements
  ]
}
```

**Achievement Tiers:**
- `bronze`: Basic achievements
- `silver`: Intermediate achievements
- `gold`: Advanced achievements
- `platinum`: Expert achievements
- `diamond`: Legendary achievements

**Achievement Categories:**
- `shopping`: Purchase-related achievements
- `social`: Social interaction achievements
- `referral`: Referral program achievements
- `engagement`: App engagement achievements
- `special`: Limited-time special achievements

---

### 2. Unlock Achievement

**Endpoint:** `POST /gamification/achievements/:achievementId/unlock`

**Description:** Manually triggers achievement unlock (usually done automatically by the system).

**Request:**
```typescript
POST /gamification/achievements/ach_1/unlock
Authorization: Bearer <token>

// No body required
```

**Response:**
```typescript
{
  success: true,
  data: {
    achievement: {
      id: "ach_1",
      isUnlocked: true,
      unlockedAt: "2025-11-03T10:00:00Z",
      // ... achievement details
    },
    coinsEarned: 50,
    newBalance: 1300
  }
}
```

**Error Codes:**
- `ACHIEVEMENT_NOT_FOUND`: Achievement does not exist
- `ALREADY_UNLOCKED`: Achievement already unlocked
- `REQUIREMENTS_NOT_MET`: Achievement requirements not satisfied

---

## Leaderboard API

### 1. Get Leaderboard

**Endpoint:** `GET /gamification/leaderboard`

**Description:** Retrieves the leaderboard rankings for a specified period.

**Request:**
```typescript
GET /gamification/leaderboard?period=monthly&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `all-time` (default: `monthly`)
- `limit`: Number of entries to return (default: 50, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    period: "monthly",
    entries: [
      {
        rank: 1,
        userId: "user_xyz789",
        username: "johndoe",
        fullName: "John Doe",
        avatar: "https://api.rezapp.com/avatars/user_xyz789.jpg",
        coins: 5000,
        level: 15,
        tier: "premium",
        achievements: 45,
        isCurrentUser: false
      },
      // ... more entries
    ],
    userRank: {
      rank: 42,
      userId: "current_user_id",
      username: "currentuser",
      fullName: "Current User",
      coins: 1250,
      level: 8,
      tier: "free",
      achievements: 12,
      isCurrentUser: true
    },
    totalUsers: 10000,
    updatedAt: "2025-11-03T10:00:00Z"
  }
}
```

---

## Points/Coins API

### 1. Get Coin Balance

**Endpoint:** `GET /gamification/coins/balance`

**Description:** Retrieves the user's current coin balance and statistics.

**Request:**
```typescript
GET /gamification/coins/balance
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    balance: 1250,
    lifetimeEarned: 5000,
    lifetimeSpent: 3750
  }
}
```

---

### 2. Get Coin Transactions

**Endpoint:** `GET /gamification/coins/transactions`

**Description:** Retrieves paginated transaction history.

**Request:**
```typescript
GET /gamification/coins/transactions?page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```typescript
{
  success: true,
  data: {
    transactions: [
      {
        id: "txn_1",
        type: "earned",
        amount: 100,
        source: "order",
        description: "Order #12345 completed",
        metadata: {
          orderId: "order_12345",
          orderAmount: 10000
        },
        createdAt: "2025-11-03T10:00:00Z"
      },
      {
        id: "txn_2",
        type: "spent",
        amount: 50,
        source: "redemption",
        description: "Redeemed for discount voucher",
        metadata: {
          voucherId: "voucher_1"
        },
        createdAt: "2025-11-02T15:30:00Z"
      },
      // ... more transactions
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8
    }
  }
}
```

**Transaction Types:**
- `earned`: Coins earned
- `spent`: Coins spent
- `expired`: Coins expired
- `refunded`: Coins refunded

**Transaction Sources:**
- `spin-wheel`: From spin wheel game
- `scratch-card`: From scratch card game
- `quiz`: From quiz game
- `challenge`: From completing challenge
- `achievement`: From unlocking achievement
- `referral`: From referral program
- `purchase`: From making purchases
- `bonus`: Manual bonus/admin credit

---

### 3. Get Gamification Stats

**Endpoint:** `GET /gamification/stats`

**Description:** Retrieves comprehensive gamification statistics for the user.

**Request:**
```typescript
GET /gamification/stats
Authorization: Bearer <token>
```

**Response:**
```typescript
{
  success: true,
  data: {
    totalCoins: 1250,
    coinsEarnedToday: 50,
    coinsEarnedThisWeek: 300,
    coinsEarnedThisMonth: 1000,
    level: 8,
    experiencePoints: 4500,
    nextLevelXP: 5000,
    achievementsUnlocked: 12,
    totalAchievements: 50,
    challengesCompleted: 25,
    activeChallenges: 3,
    currentStreak: 7,
    longestStreak: 30,
    rank: 42,
    totalUsers: 10000
  }
}
```

---

## Error Codes

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - User doesn't have permission
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

### Application Error Codes

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `TOKEN_EXPIRED`: Token has expired

#### Spin Wheel Errors
- `SPIN_COOLDOWN`: Must wait before spinning again
- `SPIN_LIMIT_REACHED`: Daily spin limit reached
- `INSUFFICIENT_LEVEL`: User level too low

#### Scratch Card Errors
- `CARD_NOT_FOUND`: Card does not exist
- `CARD_ALREADY_SCRATCHED`: Card already scratched
- `CARD_EXPIRED`: Card has expired
- `CARD_LIMIT_REACHED`: Maximum active cards reached
- `INSUFFICIENT_PROFILE`: Profile completion below threshold

#### Quiz Errors
- `QUIZ_NOT_FOUND`: Quiz game not found
- `ACTIVE_QUIZ_EXISTS`: User already has active quiz
- `INVALID_QUESTION`: Question ID mismatch
- `TIME_EXPIRED`: Question time limit exceeded
- `QUIZ_ALREADY_COMPLETED`: Quiz already completed
- `INVALID_DIFFICULTY`: Invalid difficulty level
- `INVALID_CATEGORY`: Invalid category

#### Challenge Errors
- `CHALLENGE_NOT_FOUND`: Challenge does not exist
- `CHALLENGE_NOT_COMPLETED`: Challenge not yet completed
- `REWARD_ALREADY_CLAIMED`: Reward already claimed
- `CHALLENGE_EXPIRED`: Challenge has expired

#### Achievement Errors
- `ACHIEVEMENT_NOT_FOUND`: Achievement does not exist
- `ALREADY_UNLOCKED`: Achievement already unlocked
- `REQUIREMENTS_NOT_MET`: Achievement requirements not met

#### Coin/Points Errors
- `INSUFFICIENT_BALANCE`: Not enough coins
- `INVALID_AMOUNT`: Invalid amount specified
- `TRANSACTION_FAILED`: Transaction processing failed

---

## WebSocket Events

For real-time updates, connect to the WebSocket endpoint:

```
wss://api.rezapp.com/ws
```

### Connection

```javascript
const ws = new WebSocket('wss://api.rezapp.com/ws');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: '<your-jwt-token>'
}));
```

### Events

#### 1. Achievement Unlocked
```typescript
{
  type: 'achievement_unlocked',
  data: {
    achievementId: 'ach_1',
    title: 'First Order',
    coinReward: 50,
    tier: 'bronze'
  }
}
```

#### 2. Coins Updated
```typescript
{
  type: 'coins_updated',
  data: {
    oldBalance: 1200,
    newBalance: 1250,
    change: 50,
    reason: 'Order completed'
  }
}
```

#### 3. Challenge Progress
```typescript
{
  type: 'challenge_progress',
  data: {
    challengeId: 'challenge_1',
    progress: {
      current: 3,
      target: 5,
      percentage: 60
    }
  }
}
```

#### 4. Level Up
```typescript
{
  type: 'level_up',
  data: {
    newLevel: 9,
    oldLevel: 8,
    rewards: {
      coins: 100,
      features: ['premium_games']
    }
  }
}
```

#### 5. Leaderboard Position Changed
```typescript
{
  type: 'leaderboard_update',
  data: {
    oldRank: 45,
    newRank: 42,
    period: 'monthly'
  }
}
```

---

## Rate Limits

- **Spin Wheel**: 1 spin per hour, max 5 per day
- **Scratch Card**: 1 card per day (if profile 80%+ complete)
- **Quiz**: 3 active quizzes per day
- **API Requests**: 100 requests per minute per user
- **WebSocket**: 1 connection per user

---

## Best Practices

### 1. Error Handling
```typescript
try {
  const response = await gamificationAPI.spinWheel();
  if (response.success) {
    // Handle success
  }
} catch (error) {
  if (error.response?.data?.error?.code === 'SPIN_COOLDOWN') {
    // Show cooldown message
  } else {
    // Generic error handling
  }
}
```

### 2. Optimistic Updates
```typescript
// Update UI immediately
updateLocalBalance(newBalance);

// Then sync with server
try {
  await gamificationAPI.awardCoins(amount);
} catch (error) {
  // Revert on error
  revertLocalBalance();
}
```

### 3. Caching
```typescript
// Cache leaderboard for 5 minutes
const cachedLeaderboard = await cache.get('leaderboard_monthly');
if (cachedLeaderboard && Date.now() - cachedLeaderboard.timestamp < 300000) {
  return cachedLeaderboard.data;
}
```

### 4. Pagination
```typescript
// Load more transactions
const loadMore = async () => {
  const nextPage = currentPage + 1;
  const response = await gamificationAPI.getCoinTransactions(nextPage, 20);
  setTransactions([...transactions, ...response.data.transactions]);
  setCurrentPage(nextPage);
};
```

---

## Testing Endpoints

### Development Environment

Use the following test credentials for development:

```
Base URL: https://dev-api.rezapp.com/api
Test User: testuser@rezapp.com
Test Token: (obtain via login endpoint)
```

### Postman Collection

Import our Postman collection for easy API testing:
[Download Postman Collection](https://api.rezapp.com/docs/postman-collection.json)

---

## Support

For API support and bug reports:
- Email: api-support@rezapp.com
- Slack: #gamification-api
- Documentation: https://docs.rezapp.com/gamification

---

**Last Updated:** November 3, 2025
**Version:** 1.0.0
