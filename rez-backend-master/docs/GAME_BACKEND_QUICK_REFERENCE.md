# Game Backend - Quick Reference Guide

## Models

### QuizQuestion
```typescript
QuizQuestion.getRandomQuestions(5)                    // Get 5 random questions
QuizQuestion.getQuestionsByDifficulty('easy', 10)     // Get easy questions
QuizQuestion.getQuestionsByCategory('shopping', 5)    // Get shopping questions
QuizQuestion.updateQuestionStats(questionId, true)    // Update stats
```

### TriviaQuestion
```typescript
TriviaQuestion.getDailyTrivia()                       // Get today's trivia
TriviaQuestion.getRandomTrivia(3)                     // Get 3 random trivia
TriviaQuestion.getTriviaByCategory('science', 5)      // Get science trivia
TriviaQuestion.assignDailyTrivia(new Date())          // Assign daily trivia
```

### GameSession
```typescript
GameSession.expireSessions()                          // Expire old sessions
session.complete({ won: true, prize: {...} })         // Complete session
```

### CoinTransaction
```typescript
CoinTransaction.getUserBalance(userId)                // Get user balance
CoinTransaction.createTransaction(...)                // Create transaction
CoinTransaction.expireOldCoins(userId, 90)           // Expire coins
```

---

## API Endpoints

**Base URL:** `/api/gamification`

### Quiz/Trivia
```http
POST   /quiz/start                  # Start quiz
POST   /quiz/:quizId/answer         # Submit answer
GET    /quiz/:quizId/progress       # Get progress
POST   /quiz/:quizId/complete       # Complete quiz
```

### Spin Wheel
```http
POST   /spin-wheel/create           # Create spin session
POST   /spin-wheel/spin             # Spin the wheel
GET    /spin-wheel/eligibility      # Check if eligible
```

### Scratch Card
```http
POST   /scratch-card/create         # Create scratch card
POST   /scratch-card/scratch        # Scratch the card
POST   /scratch-card/:id/claim      # Claim prize
```

### Coins
```http
GET    /coins/balance               # Get balance
GET    /coins/transactions          # Get transaction history
POST   /coins/award                 # Award coins (admin)
POST   /coins/deduct                # Deduct coins (admin)
```

### Challenges
```http
GET    /challenges                  # Get all challenges
GET    /challenges/active           # Get active challenge
GET    /challenges/my-progress      # Get user progress
POST   /challenges/:id/claim        # Claim reward
```

### Leaderboard
```http
GET    /leaderboard?type=coins&period=weekly    # Get leaderboard
GET    /leaderboard/rank/:userId                # Get user rank
```

### Streaks
```http
GET    /streaks                     # Get current user streak (JWT)
GET    /streak/:userId              # Get user streak
POST   /streak/increment            # Increment streak
```

### Stats
```http
GET    /stats                       # Get complete gamification stats
```

---

## Cron Jobs

### Session Cleanup
- **Schedule:** Daily at midnight (00:00)
- **Function:** `initializeSessionCleanupJob()`
- **File:** `src/jobs/cleanupExpiredSessions.ts`
- **Actions:**
  - Expires sessions older than 24 hours
  - Deletes sessions older than 30 days

### Coin Expiry
- **Schedule:** Daily at 1:00 AM
- **Function:** `initializeCoinExpiryJob()`
- **File:** `src/jobs/expireCoins.ts`
- **Actions:**
  - Finds expired coin transactions
  - Creates expiry transactions
  - Sends notifications to users

---

## Database Stats

### QuizQuestion Collection
- **Total:** 50 questions
- **Categories:** 8 (general, shopping, technology, food, fashion, sports, lifestyle, entertainment)
- **Difficulties:** Easy (21), Medium (22), Hard (7)

### TriviaQuestion Collection
- **Total:** 1 question (30 ready in seed script)
- **Categories:** 10 (history, science, geography, pop_culture, movies, music, art, literature, nature, random)

### GameSession Collection
- **Status:** Ready for use (0 sessions currently)
- **Game Types:** spin_wheel, scratch_card, quiz, daily_trivia

---

## Common Commands

### Seed Data
```bash
cd user-backend
npx ts-node src/scripts/seedQuizQuestions.ts
npx ts-node src/scripts/seedTriviaQuestions.ts
```

### Verify Production Readiness
```bash
npx ts-node src/scripts/verifyGameProduction.ts
```

### Manual Cron Job Triggers
```typescript
import { triggerManualSessionCleanup } from './jobs/cleanupExpiredSessions';
import { triggerManualCoinExpiry } from './jobs/expireCoins';

await triggerManualSessionCleanup();
await triggerManualCoinExpiry();
```

---

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
PORT=5001
API_PREFIX=/api
```

---

## Testing

### Run All Tests
```bash
npm test
```

### Test Database Connection
```bash
npx ts-node src/scripts/verifyGameProduction.ts
```

### Check Model Exports
```typescript
import { QuizQuestion, TriviaQuestion, GameSession, CoinTransaction } from './models';
```

---

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **404** - Not Found
- **500** - Internal Server Error

---

## Authentication

All `/api/gamification` endpoints require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

---

## Production Checklist

- [x] Models created and exported
- [x] Database connection verified
- [x] Cron jobs initialized
- [x] API routes registered
- [x] Static methods tested
- [x] Seed scripts available
- [ ] Populate more trivia questions (optional)

---

## Support

**Documentation:** `user-backend/GAME_BACKEND_PRODUCTION_READY_REPORT.md`
**Verification Report:** `user-backend/GAME_PRODUCTION_VERIFICATION_REPORT.json`

---

**Status:** ✅ 100% Production Ready
