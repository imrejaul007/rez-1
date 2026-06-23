# Gamification API Routes Map

## Complete Route Structure

```
/api/gamification (All routes require authentication)
│
├── /challenges
│   ├── GET  /                      → getChallenges()
│   ├── GET  /active                → getActiveChallenge()
│   ├── GET  /my-progress           → getMyChallengeProgress() ✨ NEW
│   └── POST /:id/claim             → claimChallengeReward()
│
├── /achievements
│   ├── GET  /                      → getAchievements()
│   ├── GET  /user/:userId          → getUserAchievements()
│   └── POST /unlock                → unlockAchievement()
│
├── /badges
│   ├── GET  /                      → getBadges()
│   └── GET  /user/:userId          → getUserBadges()
│
├── /leaderboard
│   ├── GET  /                      → getLeaderboard()
│   └── GET  /rank/:userId          → getUserRank()
│
├── /coins
│   ├── GET  /balance               → getCoinBalance()
│   ├── GET  /transactions          → getCoinTransactions()
│   ├── POST /award                 → awardCoins()
│   └── POST /deduct                → deductCoins()
│
├── /streak
│   ├── GET  /:userId               → getDailyStreak()
│   └── POST /increment             → incrementStreak()
│
├── /streaks
│   └── GET  /                      → getCurrentUserStreak() ✨ NEW (JWT-based)
│
├── /spin-wheel
│   ├── POST /create                → createSpinWheel()
│   ├── POST /spin                  → spinWheel()
│   └── GET  /eligibility           → getSpinWheelEligibility()
│
├── /scratch-card
│   ├── POST /create                → createScratchCard()
│   ├── POST /scratch               → scratchCard()
│   └── POST /:id/claim             → claimScratchCard()
│
├── /quiz
│   ├── POST /start                 → startQuiz()
│   ├── POST /:quizId/answer        → submitQuizAnswer()
│   ├── GET  /:quizId/progress      → getQuizProgress()
│   └── POST /:quizId/complete      → completeQuiz()
│
└── /stats
    └── GET  /                      → getGamificationStats() ✨ NEW
```

## New Endpoints Summary

### ✨ 1. My Challenge Progress
```
GET /api/gamification/challenges/my-progress
```
**Purpose**: Get all user's challenges with statistics
**Auth**: JWT (from token)
**Response**:
```json
{
  "challenges": [...],
  "stats": { "completed": 5, "active": 2, "expired": 1, "totalCoinsEarned": 1500 }
}
```

---

### ✨ 2. Current User Streak
```
GET /api/gamification/streaks
```
**Purpose**: Get login streak (no userId needed)
**Auth**: JWT (from token)
**Response**:
```json
{
  "streak": 7,
  "lastLogin": "2025-11-03T08:00:00Z",
  "type": "login",
  "longestStreak": 14
}
```

---

### ✨ 3. Gamification Stats
```
GET /api/gamification/stats
```
**Purpose**: Complete gamification overview
**Auth**: JWT (from token)
**Response**:
```json
{
  "gamesPlayed": 50,
  "gamesWon": 35,
  "totalCoins": 5000,
  "achievements": 12,
  "streak": 7,
  "rank": 15,
  "allRanks": { "spending": 15, "reviews": 8, ... }
}
```

---

## Authentication Flow

```
Client Request
    ↓
Authorization: Bearer <JWT_TOKEN>
    ↓
authenticate Middleware
    ↓
Extract user from token → req.user
    ↓
Controller (no userId param needed)
    ↓
Service layer with userId
    ↓
Database query
    ↓
Response
```

---

## Quick Reference Table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/challenges/my-progress` | GET | ✅ | User's challenge progress + stats |
| `/streaks` | GET | ✅ | Current user's login streak |
| `/stats` | GET | ✅ | Complete gamification statistics |

---

## Code Locations

| Component | File Path |
|-----------|-----------|
| Challenge Progress Controller | `src/controllers/gamificationController.ts` (Line 407) |
| Streaks Controller | `src/controllers/streakController.ts` (Line 113) |
| Stats Controller | `src/controllers/gamificationController.ts` (Line 444) |
| Routes Registration | `src/routes/unifiedGamificationRoutes.ts` |
| Tests | `src/__tests__/gamification-new-endpoints.test.ts` |
| Documentation | `docs/NEW_GAMIFICATION_ENDPOINTS.md` |

---

## Usage in Frontend

```typescript
// Import
import { gamificationApi } from '@/services';

// Usage
const progress = await gamificationApi.getMyProgress();
const streak = await gamificationApi.getStreak();
const stats = await gamificationApi.getStats();
```

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: November 3, 2025
