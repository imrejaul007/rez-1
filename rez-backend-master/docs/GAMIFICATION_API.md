# Gamification API Documentation

Complete API documentation for the Unified Gamification System.

**Base URL:** `/api/gamification`

All endpoints require authentication via Bearer token.

---

## Table of Contents

1. [Challenges](#challenges)
2. [Achievements](#achievements)
3. [Badges](#badges)
4. [Leaderboard](#leaderboard)
5. [Coins System](#coins-system)
6. [Daily Streak](#daily-streak)
7. [Mini-Games](#mini-games)
   - [Spin Wheel](#spin-wheel)
   - [Scratch Card](#scratch-card)
   - [Quiz Game](#quiz-game)

---

## Challenges

### Get All Challenges

Get active challenges, optionally filtered by type.

**Endpoint:** `GET /api/gamification/challenges`

**Query Parameters:**
- `type` (optional): Filter by challenge type (`daily` | `weekly` | `monthly` | `special`)

**Response:**
```json
{
  "success": true,
  "message": "Challenges retrieved successfully",
  "data": [
    {
      "_id": "challenge_id",
      "type": "daily",
      "title": "Daily Shopper",
      "description": "Complete 5 orders today",
      "requirements": {
        "action": "order_count",
        "target": 5
      },
      "rewards": {
        "coins": 100,
        "badges": []
      },
      "difficulty": "easy",
      "startDate": "2025-10-24T00:00:00.000Z",
      "endDate": "2025-10-24T23:59:59.999Z",
      "active": true
    }
  ]
}
```

---

### Get Active Challenges for User

Get user's active challenge progress.

**Endpoint:** `GET /api/gamification/challenges/active`

**Response:**
```json
{
  "success": true,
  "message": "Active challenges retrieved successfully",
  "data": [
    {
      "challenge": { /* challenge object */ },
      "progress": 3,
      "target": 5,
      "completed": false,
      "startedAt": "2025-10-24T08:00:00.000Z"
    }
  ]
}
```

---

### Claim Challenge Reward

Claim rewards after completing a challenge.

**Endpoint:** `POST /api/gamification/challenges/:id/claim`

**Response:**
```json
{
  "success": true,
  "message": "Challenge reward claimed successfully",
  "data": {
    "challenge": { /* challenge object */ },
    "rewards": {
      "coins": 100
    }
  }
}
```

---

## Achievements

### Get All Achievement Definitions

Get all available achievement definitions.

**Endpoint:** `GET /api/gamification/achievements`

**Response:**
```json
{
  "success": true,
  "message": "Achievement definitions retrieved successfully",
  "data": [
    {
      "type": "FIRST_ORDER",
      "category": "ORDERS",
      "title": "First Order",
      "description": "Completed your first order",
      "icon": "cart",
      "color": "#10B981",
      "requirement": {
        "metric": "totalOrders",
        "target": 1
      },
      "reward": {
        "coins": 50
      },
      "order": 1,
      "isActive": true
    }
  ]
}
```

---

### Get User Achievements

Get a user's achievement progress.

**Endpoint:** `GET /api/gamification/achievements/user/:userId`

**Response:**
```json
{
  "success": true,
  "message": "User achievements retrieved successfully",
  "data": [
    {
      "_id": "achievement_id",
      "user": "user_id",
      "type": "FIRST_ORDER",
      "title": "First Order",
      "description": "Completed your first order",
      "icon": "cart",
      "color": "#10B981",
      "unlocked": true,
      "progress": 100,
      "unlockedDate": "2025-10-15T10:30:00.000Z",
      "currentValue": 1,
      "targetValue": 1
    }
  ]
}
```

---

### Unlock Achievement

Manually unlock an achievement (for achievements that meet requirements).

**Endpoint:** `POST /api/gamification/achievements/unlock`

**Request Body:**
```json
{
  "achievementId": "achievement_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Achievement unlocked successfully",
  "data": { /* achievement object */ }
}
```

---

## Badges

### Get All Badges

Get all badge definitions (achievements with badge rewards).

**Endpoint:** `GET /api/gamification/badges`

**Response:**
```json
{
  "success": true,
  "message": "Badges retrieved successfully",
  "data": [
    {
      "type": "FREQUENT_BUYER",
      "title": "Frequent Buyer",
      "description": "Completed 100+ orders",
      "icon": "medal",
      "color": "#F59E0B",
      "reward": {
        "coins": 1000,
        "badge": "frequent_buyer_badge"
      }
    }
  ]
}
```

---

### Get User Badges

Get badges unlocked by a specific user.

**Endpoint:** `GET /api/gamification/badges/user/:userId`

**Response:**
```json
{
  "success": true,
  "message": "User badges retrieved successfully",
  "data": [ /* array of unlocked achievements with badges */ ]
}
```

---

## Leaderboard

### Get Leaderboard

Get leaderboard rankings for different metrics.

**Endpoint:** `GET /api/gamification/leaderboard`

**Query Parameters:**
- `type` (optional): Leaderboard type (`spending` | `reviews` | `referrals` | `cashback` | `coins`)
- `period` (optional): Time period (`daily` | `weekly` | `monthly` | `all-time`)
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": [
    {
      "rank": 1,
      "userId": "user_id",
      "userName": "John Doe",
      "userAvatar": "avatar_url",
      "totalCoins": 15000,
      "transactionCount": 50
    }
  ]
}
```

---

### Get User Rank

Get a specific user's rank across all leaderboards.

**Endpoint:** `GET /api/gamification/leaderboard/rank/:userId`

**Query Parameters:**
- `period` (optional): Time period (`daily` | `weekly` | `monthly` | `all-time`)

**Response:**
```json
{
  "success": true,
  "message": "User rank retrieved successfully",
  "data": {
    "spending": { "rank": 5, "value": 25000 },
    "reviews": { "rank": 12, "value": 45 },
    "referrals": { "rank": 3, "value": 10 },
    "coins": { "rank": 8, "value": 12500 }
  }
}
```

---

## Coins System

### Get Coin Balance

Get user's current coin balance.

**Endpoint:** `GET /api/gamification/coins/balance`

**Response:**
```json
{
  "success": true,
  "message": "Coin balance retrieved successfully",
  "data": {
    "balance": 5000
  }
}
```

---

### Get Coin Transactions

Get user's coin transaction history.

**Endpoint:** `GET /api/gamification/coins/transactions`

**Query Parameters:**
- `type` (optional): Transaction type (`earned` | `spent` | `expired` | `refunded` | `bonus`)
- `source` (optional): Transaction source (`spin_wheel` | `quiz_game` | `achievement` | etc.)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "message": "Coin transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "transaction_id",
        "type": "earned",
        "amount": 100,
        "balance": 5100,
        "source": "spin_wheel",
        "description": "Won 100 coins from Spin Wheel",
        "createdAt": "2025-10-24T10:30:00.000Z",
        "displayAmount": 100
      }
    ],
    "total": 150,
    "balance": 5000
  }
}
```

---

### Award Coins

Award coins to the authenticated user.

**Endpoint:** `POST /api/gamification/coins/award`

**Request Body:**
```json
{
  "amount": 100,
  "source": "admin",
  "description": "Bonus coins for being awesome",
  "metadata": {
    "reason": "promotional_bonus"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coins awarded successfully",
  "data": {
    "transactionId": "transaction_id",
    "amount": 100,
    "newBalance": 5100,
    "source": "admin",
    "description": "Bonus coins for being awesome"
  }
}
```

---

### Deduct Coins

Deduct coins from the authenticated user.

**Endpoint:** `POST /api/gamification/coins/deduct`

**Request Body:**
```json
{
  "amount": 50,
  "source": "purchase",
  "description": "Purchased discount voucher",
  "metadata": {
    "productId": "voucher_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coins deducted successfully",
  "data": {
    "transactionId": "transaction_id",
    "amount": 50,
    "newBalance": 5050,
    "source": "purchase",
    "description": "Purchased discount voucher"
  }
}
```

---

## Daily Streak

### Get User Streaks

Get user's streak statistics.

**Endpoint:** `GET /api/gamification/streak/:userId`

**Response:**
```json
{
  "success": true,
  "message": "Daily streaks retrieved successfully",
  "data": {
    "login": {
      "currentStreak": 7,
      "longestStreak": 15,
      "lastUpdated": "2025-10-24T08:00:00.000Z"
    }
  }
}
```

---

### Increment Streak

Update user's streak (typically called on login).

**Endpoint:** `POST /api/gamification/streak/increment`

**Request Body:**
```json
{
  "type": "login"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Streak updated successfully",
  "data": {
    "currentStreak": 8,
    "milestoneReached": false
  }
}
```

---

## Mini-Games

### Spin Wheel

#### Create Spin Wheel Session

Create a new spin wheel session.

**Endpoint:** `POST /api/gamification/spin-wheel/create`

**Response:**
```json
{
  "success": true,
  "message": "Spin wheel session created successfully",
  "data": {
    "sessionId": "session_id",
    "expiresAt": "2025-10-24T11:05:00.000Z",
    "prizes": [
      {
        "segment": 1,
        "prize": "50 Coins",
        "color": "#10B981"
      }
    ]
  }
}
```

---

#### Spin the Wheel

Spin the wheel and get a prize.

**Endpoint:** `POST /api/gamification/spin-wheel/spin`

**Request Body:**
```json
{
  "sessionId": "session_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Spin completed successfully",
  "data": {
    "sessionId": "session_id",
    "prize": "100 Coins",
    "segment": 2,
    "type": "coins",
    "value": 100,
    "reward": {
      "coins": 100
    }
  }
}
```

---

#### Check Spin Wheel Eligibility

Check if user can spin the wheel.

**Endpoint:** `GET /api/gamification/spin-wheel/eligibility`

**Response:**
```json
{
  "success": true,
  "message": "Eligibility checked successfully",
  "data": {
    "eligible": true
  }
}
```

or

```json
{
  "success": true,
  "message": "Eligibility checked successfully",
  "data": {
    "eligible": false,
    "nextAvailableAt": "2025-10-25T10:00:00.000Z",
    "reason": "Cooldown active. Next spin available at ..."
  }
}
```

---

### Scratch Card

#### Create Scratch Card

Create a new scratch card session.

**Endpoint:** `POST /api/gamification/scratch-card/create`

**Response:**
```json
{
  "success": true,
  "message": "Scratch card created successfully",
  "data": {
    "sessionId": "session_id",
    "gridSize": 3,
    "totalCells": 9,
    "expiresAt": "2025-10-24T11:10:00.000Z",
    "cells": [
      { "revealed": false },
      { "revealed": false }
      // ... 9 cells total
    ]
  }
}
```

---

#### Scratch a Cell

Scratch a specific cell to reveal its content.

**Endpoint:** `POST /api/gamification/scratch-card/scratch`

**Request Body:**
```json
{
  "sessionId": "session_id",
  "cellIndex": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cell scratched successfully",
  "data": {
    "sessionId": "session_id",
    "cellIndex": 4,
    "cellData": {
      "index": 4,
      "prize": "200 Coins",
      "type": "coins",
      "value": 200,
      "revealed": true
    },
    "scratchedCells": [4],
    "won": false,
    "prize": null,
    "completed": false,
    "allCellsRevealed": false
  }
}
```

---

#### Claim Scratch Card

Reveal all cells and claim the prize.

**Endpoint:** `POST /api/gamification/scratch-card/:id/claim`

**Response:**
```json
{
  "success": true,
  "message": "Scratch card claimed successfully",
  "data": {
    "sessionId": "session_id",
    "grid": [ /* all 9 cells with revealed: true */ ],
    "winningCells": [0, 4, 8],
    "winningPrize": {
      "type": "coins",
      "value": 200,
      "label": "200 Coins"
    },
    "completed": true
  }
}
```

---

### Quiz Game

#### Start Quiz

Start a new quiz session.

**Endpoint:** `POST /api/gamification/quiz/start`

**Request Body:**
```json
{
  "difficulty": "easy",
  "questionCount": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz started successfully",
  "data": {
    "quizId": "quiz_id",
    "questions": [
      {
        "id": "q1",
        "question": "What is the capital of India?",
        "options": ["Mumbai", "Delhi", "Kolkata", "Chennai"],
        "difficulty": "easy",
        "category": "Geography"
      }
    ],
    "timeLimit": 30,
    "totalQuestions": 5
  }
}
```

---

#### Submit Quiz Answer

Submit an answer for a specific question.

**Endpoint:** `POST /api/gamification/quiz/:quizId/answer`

**Request Body:**
```json
{
  "questionIndex": 0,
  "answer": 1,
  "timeSpent": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Correct answer!",
  "data": {
    "correct": true,
    "coinsEarned": 20,
    "currentScore": 20,
    "correctAnswer": 1,
    "completed": false
  }
}
```

---

#### Get Quiz Progress

Get current progress of an active quiz.

**Endpoint:** `GET /api/gamification/quiz/:quizId/progress`

**Response:**
```json
{
  "success": true,
  "message": "Quiz progress retrieved successfully",
  "data": {
    "quizId": "quiz_id",
    "status": "active",
    "difficulty": "easy",
    "currentQuestion": 2,
    "totalQuestions": 5,
    "score": 40,
    "correctAnswers": 2,
    "answers": [ /* array of submitted answers */ ],
    "expiresAt": "2025-10-24T11:30:00.000Z"
  }
}
```

---

#### Complete Quiz

Force complete the quiz and claim rewards.

**Endpoint:** `POST /api/gamification/quiz/:quizId/complete`

**Response:**
```json
{
  "success": true,
  "message": "Quiz completed successfully",
  "data": {
    "quizId": "quiz_id",
    "status": "completed",
    "difficulty": "easy",
    "currentQuestion": 5,
    "totalQuestions": 5,
    "score": 100,
    "correctAnswers": 5,
    "completedAt": "2025-10-24T11:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

All gamification endpoints are subject to rate limiting to prevent abuse.

---

## Gamification Triggers

The system automatically triggers gamification events for:

- `order_placed` - Awards 50 coins
- `review_submitted` - Awards 20 coins
- `referral_success` - Awards 100 coins
- `login` - Awards 10 coins, updates login streak
- `bill_uploaded` - Awards 100 coins
- `video_created` - Awards 50 coins
- `project_completed` - Awards 75 coins
- `offer_redeemed` - Awards 25 coins

These triggers also:
- Update challenge progress
- Check and unlock achievements
- Update daily streaks

---

## Testing

Use the provided test script to verify all endpoints:

```bash
npx ts-node scripts/test-gamification.ts
```

---

## Support

For questions or issues, contact the development team.
