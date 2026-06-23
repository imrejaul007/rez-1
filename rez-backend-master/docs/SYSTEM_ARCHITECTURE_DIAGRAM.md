# Quiz & Trivia System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     REZ APP BACKEND SERVER                      │
│                      (user-backend/src)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Initializes
                                ▼
        ┌───────────────────────────────────────────────┐
        │           CRON JOB SCHEDULER                  │
        │         (node-cron, runs daily)               │
        └───────────────────────────────────────────────┘
                │                           │
                │                           │
        ┌───────▼────────┐          ┌──────▼────────┐
        │ Session Cleanup│          │  Coin Expiry  │
        │  00:00 Daily   │          │  01:00 Daily  │
        └───────┬────────┘          └──────┬────────┘
                │                           │
                │                           │
┌───────────────▼────────────────┐  ┌──────▼─────────────────────┐
│   GameSession Collection       │  │ CoinTransaction Collection │
│                                │  │                            │
│  • Find sessions > 24h         │  │  • Find expired coins      │
│  • Mark as 'expired'           │  │  • Group by user           │
│  • Delete sessions > 30 days   │  │  • Create expiry txn       │
│  • Log statistics              │  │  • Update balances         │
└────────────────────────────────┘  └──────┬─────────────────────┘
                                            │
                                            │ Triggers
                                            ▼
                                    ┌────────────────┐
                                    │  Notification  │
                                    │    Service     │
                                    │  (batched)     │
                                    └───────┬────────┘
                                            │
                                            │ Sends to
                                            ▼
                                    ┌────────────────┐
                                    │     Users      │
                                    │ (via SMS/Push) │
                                    └────────────────┘
```

## Database Schema

```
┌──────────────────────────────────────────────────────────────────┐
│                        MongoDB Collections                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐        ┌─────────────────────┐
│   QuizQuestion      │        │  TriviaQuestion     │
├─────────────────────┤        ├─────────────────────┤
│ _id                 │        │ _id                 │
│ question            │        │ question            │
│ options[]           │        │ options[]           │
│ correctAnswer       │        │ correctAnswer       │
│ category            │◄──────►│ category            │
│ difficulty          │  Both  │ difficulty          │
│ points              │  Used  │ points              │
│ explanation         │   by   │ funFact             │
│ imageUrl            │ Games  │ sourceUrl           │
│ tags[]              │        │ dateOfDay           │
│ isActive            │        │ isActive            │
│ usageCount          │        │ usageCount          │
│ correctAnswerCount  │        │ correctAnswerCount  │
│ incorrectAnswerCount│        │ incorrectAnswerCount│
│ createdAt           │        │ createdAt           │
│ updatedAt           │        │ updatedAt           │
└─────────────────────┘        └─────────────────────┘
         │                              │
         │ Used by                      │ Used by
         ▼                              ▼
┌─────────────────────┐        ┌─────────────────────┐
│    GameSession      │        │  CoinTransaction    │
├─────────────────────┤        ├─────────────────────┤
│ _id                 │        │ _id                 │
│ user               ◄┼────────┼► user               │
│ gameType            │ Links  │ type                │
│ sessionId           │   to   │ amount              │
│ status              │  User  │ balance             │
│ startedAt           │        │ source              │
│ completedAt         │        │ description         │
│ result              │        │ metadata            │
│ expiresAt           │        │ expiresAt           │
│ createdAt           │        │ createdAt           │
│ updatedAt           │        │ updatedAt           │
└─────────────────────┘        └─────────────────────┘
```

## Data Flow

### Quiz/Trivia Game Flow

```
┌──────────┐
│  User    │
│  Starts  │
│  Game    │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│  Create GameSession │
│  status: 'pending'  │
│  expiresAt: +24h    │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ Get Questions        │
│ QuizQuestion or      │
│ TriviaQuestion       │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ User Answers         │
│ - Update stats       │
│ - Calculate score    │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Award Coins          │
│ Create CoinTxn       │
│ type: 'earned'       │
│ expiresAt: +90 days  │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Complete Session     │
│ status: 'completed'  │
│ result: { won, pts } │
└──────────────────────┘
```

### Coin Expiry Flow

```
┌──────────────────────┐
│  Daily at 1:00 AM    │
│  Cron Job Triggers   │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Find Expired Coin Txns       │
│ WHERE:                       │
│   type = 'earned'            │
│   expiresAt <= NOW()         │
│   metadata.isExpired != true │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Group by User                │
│ Calculate total expired      │
│ per user                     │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ For Each User:               │
│ 1. Create expiry txn         │
│ 2. Deduct from balance       │
│ 3. Mark original txns        │
│ 4. Queue notification        │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Send Notifications (batched) │
│ - SMS via Twilio             │
│ - Push notifications         │
│ - Email (if configured)      │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Log Statistics               │
│ - Users affected             │
│ - Coins expired              │
│ - Notifications sent         │
└──────────────────────────────┘
```

### Session Cleanup Flow

```
┌──────────────────────┐
│  Daily at 00:00      │
│  Cron Job Triggers   │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Step 1: Expire Old Sessions  │
│ WHERE:                       │
│   status IN ['pending',      │
│               'playing']     │
│   createdAt < NOW() - 24h    │
│ SET status = 'expired'       │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Step 2: Delete Ancient       │
│         Sessions             │
│ WHERE:                       │
│   createdAt < NOW() - 30 days│
│ DELETE                       │
└────┬─────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Step 3: Log Statistics       │
│ - Expired count              │
│ - Deleted count              │
│ - Session distribution       │
│ - Game type breakdown        │
└──────────────────────────────┘
```

## Component Relationships

```
┌────────────────────────────────────────────────────────┐
│                  Backend Components                    │
└────────────────────────────────────────────────────────┘

┌──────────────┐      uses      ┌──────────────┐
│   Models     ├───────────────►│  Controllers │
│              │                 │  (optional)  │
│ • QuizQ      │                 └──────┬───────┘
│ • TriviaQ    │                        │
│ • GameSess   │                        │ exposes
│ • CoinTxn    │                        │
└──────┬───────┘                        ▼
       │                         ┌──────────────┐
       │                         │    Routes    │
       │ called by               │  (optional)  │
       │                         └──────┬───────┘
       │                                │
       ▼                                │
┌──────────────┐                        │
│  Cron Jobs   │                        │ serves
│              │                        │
│ • Cleanup    │                        ▼
│ • Expiry     │                 ┌──────────────┐
└──────┬───────┘                 │   Frontend   │
       │                         │     APIs     │
       │ writes to               └──────────────┘
       ▼
┌──────────────┐      notifies   ┌──────────────┐
│  Database    ├────────────────►│    Users     │
│  (MongoDB)   │                 │              │
└──────────────┘                 └──────────────┘
```

## File Structure

```
user-backend/
├── src/
│   ├── models/
│   │   ├── QuizQuestion.ts        ✨ NEW
│   │   ├── TriviaQuestion.ts      ✨ NEW
│   │   ├── GameSession.ts         (existing)
│   │   ├── CoinTransaction.ts     (existing)
│   │   └── index.ts               (updated)
│   │
│   ├── jobs/
│   │   ├── cleanupExpiredSessions.ts  ✨ NEW
│   │   ├── expireCoins.ts             ✨ NEW
│   │   ├── trialExpiryNotification.ts (existing)
│   │   └── reservationCleanup.ts      (existing)
│   │
│   ├── scripts/
│   │   ├── seedQuizQuestions.ts   ✨ NEW
│   │   └── seedTriviaQuestions.ts ✨ NEW
│   │
│   └── server.ts                  (updated)
│
├── QUIZ_TRIVIA_SYSTEM_DOCUMENTATION.md  ✨ NEW
├── AGENT_3_QUICK_REFERENCE.md           ✨ NEW
├── AGENT_3_DELIVERY_SUMMARY.md          ✨ NEW
├── PACKAGE_JSON_SCRIPTS.md              ✨ NEW
└── SYSTEM_ARCHITECTURE_DIAGRAM.md       ✨ NEW
```

## Cron Job Schedule

```
Timeline (Daily):

00:00 ─┬─ Session Cleanup Job
       │  • Expire sessions > 24h
       │  • Delete sessions > 30 days
       │  Duration: ~1 second
       │
01:00 ─┬─ Coin Expiry Job
       │  • Find expired coins
       │  • Process expirations
       │  • Send notifications
       │  Duration: ~2-5 seconds
       │
       │
... (Rest of day - jobs idle)
       │
       │
23:59 ─┴─ Wait for next midnight
```

## Statistics & Analytics

```
┌─────────────────────────────────────────────────────┐
│            Question Analytics (Real-time)           │
└─────────────────────────────────────────────────────┘

QuizQuestion / TriviaQuestion
├── usageCount: How many times asked
├── correctAnswerCount: How many correct
├── incorrectAnswerCount: How many incorrect
└── accuracyRate: Calculated percentage

Example:
{
  question: "What is COD in shopping?",
  usageCount: 150,
  correctAnswerCount: 135,
  incorrectAnswerCount: 15,
  accuracyRate: 90%  // 135/150 * 100
}

┌─────────────────────────────────────────────────────┐
│              Cleanup Statistics                     │
└─────────────────────────────────────────────────────┘

Session Cleanup (Daily Report)
├── Expired: Sessions marked as expired
├── Deleted: Sessions permanently removed
├── By Status: Count of each status
└── By Game Type: Active sessions per type

Coin Expiry (Daily Report)
├── Users Affected: Number of users
├── Coins Expired: Total coin amount
├── Notifications: Sent/Failed counts
└── Errors: Per-user error tracking
```

## Integration Points

```
┌────────────────────────────────────────────────┐
│         Future Integration Points             │
└────────────────────────────────────────────────┘

Frontend
    │
    ├─► Quiz Game Screen
    │   └─ GET /api/quiz/random
    │   └─ POST /api/quiz/answer
    │
    ├─► Trivia Game Screen
    │   └─ GET /api/trivia/daily
    │   └─ POST /api/trivia/answer
    │
    ├─► User Wallet Screen
    │   └─ GET /api/wallet/balance
    │   └─ GET /api/wallet/transactions
    │
    └─► Admin Dashboard
        └─ GET /api/admin/jobs/status
        └─ POST /api/admin/cleanup/trigger
        └─ GET /api/admin/analytics
```

---

## Legend

- ✨ NEW: Newly created by Agent 3
- (existing): Already existed in codebase
- (updated): Modified to integrate new features
- (optional): Suggested but not implemented

---

**This diagram shows the complete architecture of the Quiz & Trivia system**
**including data flows, relationships, and scheduled operations.**
