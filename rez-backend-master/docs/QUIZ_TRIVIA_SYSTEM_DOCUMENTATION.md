# Quiz & Trivia System Documentation

## Overview

This document provides comprehensive documentation for the Quiz and Trivia question system implemented in the backend. The system includes two new models for managing quiz and trivia questions, along with automated cron jobs for maintaining game sessions and coin expiration.

---

## Table of Contents

1. [Models](#models)
   - [QuizQuestion Model](#quizquestion-model)
   - [TriviaQuestion Model](#triviaquestion-model)
2. [Cron Jobs](#cron-jobs)
   - [Session Cleanup Job](#session-cleanup-job)
   - [Coin Expiry Job](#coin-expiry-job)
3. [Seed Data](#seed-data)
4. [API Integration](#api-integration)
5. [Configuration](#configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Models

### QuizQuestion Model

**Location**: `user-backend/src/models/QuizQuestion.ts`

#### Schema Structure

```typescript
{
  question: string;          // The quiz question text (10-500 chars)
  options: string[];         // Answer options (2-6 options)
  correctAnswer: number;     // Index of correct answer (0-based)
  category: string;          // Quiz category
  difficulty: string;        // easy | medium | hard
  points: number;            // Points awarded (1-100)
  explanation?: string;      // Optional explanation after answering
  imageUrl?: string;         // Optional question image
  tags?: string[];          // Tags for filtering
  isActive: boolean;        // Is question active
  usageCount: number;       // How many times used
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Categories

- `general` - General knowledge
- `shopping` - Shopping and retail
- `fashion` - Fashion and style
- `food` - Food and cuisine
- `technology` - Technology and gadgets
- `entertainment` - Entertainment and media
- `sports` - Sports and athletics
- `lifestyle` - Lifestyle and wellness

#### Difficulty Levels & Points

| Difficulty | Default Points |
|-----------|---------------|
| Easy      | 10            |
| Medium    | 20            |
| Hard      | 30            |

#### Static Methods

##### `getRandomQuestions(count, category?, difficulty?)`

Retrieves random quiz questions for a quiz session.

```typescript
const questions = await QuizQuestion.getRandomQuestions(10, 'shopping', 'medium');
```

**Parameters:**
- `count` (number): Number of questions to retrieve
- `category` (string, optional): Filter by category
- `difficulty` (string, optional): Filter by difficulty

**Returns:** Array of quiz questions

##### `getQuestionsByDifficulty(difficulty, limit?)`

Get questions filtered by difficulty level.

```typescript
const easyQuestions = await QuizQuestion.getQuestionsByDifficulty('easy', 5);
```

##### `getQuestionsByCategory(category, limit?)`

Get questions filtered by category.

```typescript
const foodQuestions = await QuizQuestion.getQuestionsByCategory('food', 10);
```

##### `updateQuestionStats(questionId, isCorrect)`

Update statistics when a question is answered.

```typescript
await QuizQuestion.updateQuestionStats(questionId, true);
```

##### `getQuestionAccuracyRate(questionId)`

Get the accuracy rate for a specific question.

```typescript
const accuracy = await QuizQuestion.getQuestionAccuracyRate(questionId);
// Returns percentage (0-100)
```

#### Virtual Properties

- `accuracyRate` - Calculated accuracy rate as a percentage

#### Indexes

- `{ category: 1, difficulty: 1, isActive: 1 }` - For efficient filtering
- `{ difficulty: 1, isActive: 1, usageCount: 1 }` - For balanced question selection
- `{ tags: 1, isActive: 1 }` - For tag-based queries

---

### TriviaQuestion Model

**Location**: `user-backend/src/models/TriviaQuestion.ts`

#### Schema Structure

```typescript
{
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;          // Different categories than quiz
  difficulty: string;
  points: number;
  funFact?: string;         // Interesting fact about the answer
  imageUrl?: string;
  sourceUrl?: string;       // Source of the trivia
  tags?: string[];
  dateOfDay?: Date;         // If assigned as daily trivia
  isActive: boolean;
  usageCount: number;
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Categories

- `history` - Historical events and facts
- `science` - Scientific knowledge
- `geography` - Geography and locations
- `pop_culture` - Popular culture
- `movies` - Films and cinema
- `music` - Music and artists
- `art` - Art and artists
- `literature` - Books and authors
- `nature` - Natural world
- `random` - Miscellaneous trivia

#### Difficulty Levels & Points

| Difficulty | Default Points |
|-----------|---------------|
| Easy      | 15            |
| Medium    | 25            |
| Hard      | 35            |

#### Static Methods

##### `getDailyTrivia(date?)`

Get or assign the daily trivia question.

```typescript
const dailyTrivia = await TriviaQuestion.getDailyTrivia();
```

**Auto-assignment:** If no trivia is assigned for the date, one will be automatically selected and assigned.

##### `getRandomTrivia(count?, category?)`

Get random trivia questions (excludes daily trivia).

```typescript
const trivia = await TriviaQuestion.getRandomTrivia(5, 'science');
```

##### `getTriviaByCategory(category, limit?)`

Get trivia filtered by category.

```typescript
const historyTrivia = await TriviaQuestion.getTriviaByCategory('history', 10);
```

##### `updateTriviaStats(triviaId, isCorrect)`

Update statistics when trivia is answered.

```typescript
await TriviaQuestion.updateTriviaStats(triviaId, true);
```

##### `assignDailyTrivia(date)`

Manually assign a trivia question to a specific date.

```typescript
const assigned = await TriviaQuestion.assignDailyTrivia(new Date());
```

#### Key Differences from Quiz

1. **Daily Trivia Feature**: Can be assigned to specific dates
2. **Fun Facts**: Includes interesting facts about answers
3. **Different Categories**: More knowledge-focused categories
4. **Higher Points**: Rewards more points per difficulty level

---

## Cron Jobs

### Session Cleanup Job

**Location**: `user-backend/src/jobs/cleanupExpiredSessions.ts`

#### Purpose

Automatically cleans up expired and old game sessions to maintain database health.

#### Schedule

**Daily at midnight (00:00)** - `0 0 * * *`

#### What It Does

1. **Expire Sessions**: Marks sessions older than 24 hours as 'expired'
2. **Delete Old Sessions**: Permanently deletes sessions older than 30 days
3. **Log Statistics**: Provides detailed cleanup reports

#### Configuration

```typescript
const EXPIRY_HOURS = 24;    // Sessions older than this are expired
const DELETE_DAYS = 30;      // Sessions older than this are deleted
const CRON_SCHEDULE = '0 0 * * *';  // Daily at midnight
```

#### Functions

##### `startSessionCleanup()`

Start the cleanup job.

```typescript
import { startSessionCleanup } from './jobs/cleanupExpiredSessions';
startSessionCleanup();
```

##### `stopSessionCleanup()`

Stop the cleanup job.

##### `getSessionCleanupStatus()`

Get current job status.

```typescript
const status = getSessionCleanupStatus();
// Returns: { running, executing, schedule, config }
```

##### `triggerManualSessionCleanup()`

Manually trigger cleanup (for testing).

```typescript
const stats = await triggerManualSessionCleanup();
```

#### Cleanup Statistics

The job logs:
- Number of sessions expired
- Number of sessions deleted
- Current session counts by status
- Active sessions by game type
- Execution duration
- Any errors encountered

#### Example Log Output

```
🧹 [SESSION CLEANUP] Running expired session cleanup...
📅 [SESSION CLEANUP] Expiry cutoff: 2025-11-02T00:00:00.000Z
📅 [SESSION CLEANUP] Delete cutoff: 2025-10-04T00:00:00.000Z
⏰ [SESSION CLEANUP] Marked 15 sessions as expired
🗑️ [SESSION CLEANUP] Deleted 42 old sessions
📊 [SESSION CLEANUP] Current session counts by status:
   - completed: 1234
   - expired: 89
   - playing: 5
   - pending: 2
🎮 [SESSION CLEANUP] Active sessions by game type:
   - quiz: 3
   - daily_trivia: 2
   - spin_wheel: 1
   - scratch_card: 1
✅ [SESSION CLEANUP] Cleanup completed: {
  duration: '234ms',
  expiredCount: 15,
  deletedCount: 42,
  totalProcessed: 57
}
```

---

### Coin Expiry Job

**Location**: `user-backend/src/jobs/expireCoins.ts`

#### Purpose

Manages the expiration of user coins and sends notifications to affected users.

#### Schedule

**Daily at 1:00 AM** - `0 1 * * *`

#### What It Does

1. **Find Expired Coins**: Identifies coin transactions with `expiresAt` in the past
2. **Create Expiry Transactions**: Deducts expired coins from user balances
3. **Update Records**: Marks original transactions as expired
4. **Send Notifications**: Notifies users about expired coins (in batches)
5. **Log Statistics**: Provides detailed expiry reports

#### Configuration

```typescript
const CRON_SCHEDULE = '0 1 * * *';           // Daily at 1:00 AM
const NOTIFICATION_BATCH_SIZE = 50;          // Batch notifications
```

#### Functions

##### `startCoinExpiryJob()`

Start the coin expiry job.

```typescript
import { startCoinExpiryJob } from './jobs/expireCoins';
startCoinExpiryJob();
```

##### `stopCoinExpiryJob()`

Stop the coin expiry job.

##### `getCoinExpiryJobStatus()`

Get current job status.

```typescript
const status = getCoinExpiryJobStatus();
// Returns: { running, executing, schedule, config }
```

##### `triggerManualCoinExpiry()`

Manually trigger coin expiry (for testing).

```typescript
const stats = await triggerManualCoinExpiry();
```

##### `previewUpcomingExpirations(daysAhead)`

Preview coins that will expire in the next N days.

```typescript
const preview = await previewUpcomingExpirations(7);
// Returns: { totalCoins, usersAffected, expirationsByDate[] }
```

#### Expiry Process

1. **Find Expired Transactions**
   ```sql
   type: 'earned'
   expiresAt: <= now
   metadata.isExpired: != true
   ```

2. **Group by User**
   - Calculate total expired amount per user
   - Track which transactions expired

3. **Create Expiry Transactions**
   - Type: 'expired'
   - Source: 'expiry'
   - Deducts from user balance
   - Includes metadata about expired transactions

4. **Mark Original Transactions**
   ```javascript
   metadata: {
     isExpired: true,
     expiredAt: Date,
     expiryTransactionId: ObjectId
   }
   ```

5. **Send Notifications**
   - Batched to avoid overwhelming system
   - Personalized messages
   - Includes new balance

#### Notification Format

```
Title: Coins Expired
Message: Hi {firstName}, {amount} coins have expired from your account.
         Your new balance is {newBalance} coins.
         Earn and use coins before they expire!
```

#### Example Log Output

```
💰 [COIN EXPIRY] Running coin expiry job...
💰 [COIN EXPIRY] Found 23 expired coin transactions
👥 [COIN EXPIRY] Processing expiry for 15 users
   ✓ User 6543...: 50 coins expired, new balance: 120
   ✓ User 7891...: 30 coins expired, new balance: 85
   ...
   📧 Notification sent to user 6543...
   📧 Notification sent to user 7891...
✅ [COIN EXPIRY] Expiry job completed: {
  duration: '1234ms',
  usersAffected: 15,
  totalCoinsExpired: 450,
  transactionsCreated: 15,
  notificationsSent: 15,
  notificationsFailed: 0
}
📈 [COIN EXPIRY] 450 coins expired from 15 users, 15 notifications sent
```

---

## Seed Data

### Seeding Quiz Questions

**Script**: `user-backend/src/scripts/seedQuizQuestions.ts`

#### Features

- **50 diverse questions** across all categories
- Balanced difficulty distribution
- Real-world, engaging questions
- Explanations included

#### Running the Seed Script

```bash
cd user-backend
npm run seed:quiz
# or
npx ts-node src/scripts/seedQuizQuestions.ts
```

#### What It Does

1. Connects to database
2. Clears existing quiz questions
3. Inserts 50 new questions
4. Shows statistics by category and difficulty
5. Displays summary tables

#### Example Output

```
🌱 Starting quiz questions seeding...
✅ Database connected
🗑️ Cleared 0 existing quiz questions
✅ Successfully seeded 50 quiz questions

📊 Quiz Questions Statistics:
┌─────────┬────────────┬──────┐
│ category│ difficulty │ count│
├─────────┼────────────┼──────┤
│ fashion │ easy       │ 2    │
│ fashion │ medium     │ 2    │
│ food    │ easy       │ 2    │
│ food    │ medium     │ 2    │
│ general │ easy       │ 3    │
│ general │ medium     │ 3    │
│ general │ hard       │ 2    │
│ shopping│ easy       │ 3    │
│ shopping│ medium     │ 2    │
│ shopping│ hard       │ 1    │
...
└─────────┴────────────┴──────┘

📈 Category Breakdown:
┌─────────────┬───────────┬────────────┐
│ category    │ questions │ totalPoints│
├─────────────┼───────────┼────────────┤
│ general     │ 10        │ 190        │
│ shopping    │ 8         │ 150        │
│ technology  │ 6         │ 120        │
...
└─────────────┴───────────┴────────────┘
```

---

### Seeding Trivia Questions

**Script**: `user-backend/src/scripts/seedTriviaQuestions.ts`

#### Features

- **30 interesting trivia questions**
- Fun facts for each answer
- Knowledge-focused categories
- Source URLs for verification

#### Running the Seed Script

```bash
cd user-backend
npm run seed:trivia
# or
npx ts-node src/scripts/seedTriviaQuestions.ts
```

#### Similar Output Format

Shows statistics and category breakdown like quiz seeding.

---

## API Integration

### Recommended API Endpoints (To Be Implemented)

#### Quiz Endpoints

```typescript
// Get random quiz questions
GET /api/quiz/random?count=10&category=shopping&difficulty=medium

// Submit quiz answer
POST /api/quiz/answer
{
  questionId: string;
  userAnswer: number;
  sessionId: string;
}

// Get quiz statistics
GET /api/quiz/stats/:questionId
```

#### Trivia Endpoints

```typescript
// Get daily trivia
GET /api/trivia/daily

// Get random trivia
GET /api/trivia/random?count=5&category=science

// Submit trivia answer
POST /api/trivia/answer
{
  triviaId: string;
  userAnswer: number;
}
```

#### Admin Endpoints

```typescript
// Trigger manual session cleanup
POST /api/admin/cleanup/sessions

// Trigger manual coin expiry
POST /api/admin/expire/coins

// Preview upcoming expirations
GET /api/admin/coins/expiry-preview?days=7

// Get job statuses
GET /api/admin/jobs/status
```

---

## Configuration

### Environment Variables

No additional environment variables required. The jobs use existing MongoDB connection and notification services.

### Customizing Schedules

To change cron schedules, edit the job files:

**Session Cleanup** (`cleanupExpiredSessions.ts`):
```typescript
const CRON_SCHEDULE = '0 0 * * *';  // Midnight daily
const EXPIRY_HOURS = 24;
const DELETE_DAYS = 30;
```

**Coin Expiry** (`expireCoins.ts`):
```typescript
const CRON_SCHEDULE = '0 1 * * *';  // 1:00 AM daily
const NOTIFICATION_BATCH_SIZE = 50;
```

### Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of Week (0-7) (Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 0 * * *` - Daily at midnight
- `0 1 * * *` - Daily at 1:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours

---

## Monitoring & Maintenance

### Logs to Monitor

Both jobs log comprehensive information:

- **Start/Stop Events**: Job initialization and shutdown
- **Execution Logs**: Each run with timestamps
- **Statistics**: Counts and metrics for each operation
- **Errors**: Detailed error messages with context
- **Performance**: Execution duration

### Health Checks

Check job status programmatically:

```typescript
import sessionCleanup from './jobs/cleanupExpiredSessions';
import coinExpiry from './jobs/expireCoins';

const sessionStatus = sessionCleanup.getStatus();
const coinStatus = coinExpiry.getStatus();

console.log('Session Cleanup:', sessionStatus);
console.log('Coin Expiry:', coinStatus);
```

### Manual Interventions

#### Trigger Session Cleanup

```typescript
import { triggerManualSessionCleanup } from './jobs/cleanupExpiredSessions';

const stats = await triggerManualSessionCleanup();
console.log(`Cleaned up ${stats.totalProcessed} sessions`);
```

#### Trigger Coin Expiry

```typescript
import { triggerManualCoinExpiry } from './jobs/expireCoins';

const stats = await triggerManualCoinExpiry();
console.log(`Expired ${stats.totalCoinsExpired} coins from ${stats.usersAffected} users`);
```

#### Preview Upcoming Expirations

```typescript
import { previewUpcomingExpirations } from './jobs/expireCoins';

const preview = await previewUpcomingExpirations(7);
console.log(`${preview.totalCoins} coins will expire in next 7 days`);
console.log(`Affecting ${preview.usersAffected} users`);

preview.expirationsByDate.forEach(exp => {
  console.log(`${exp.date}: ${exp.coins} coins, ${exp.users} users`);
});
```

### Database Indexes

All models have optimized indexes for efficient queries. Monitor index performance:

```javascript
// MongoDB shell
db.quizquestions.getIndexes()
db.triviaquestions.getIndexes()
db.gamesessions.getIndexes()
db.cointransactions.getIndexes()
```

### Performance Considerations

1. **Session Cleanup**: Runs quickly, typically < 1 second
2. **Coin Expiry**: May take longer with many users, uses batching
3. **Notifications**: Batched to avoid overwhelming notification service
4. **Database Queries**: Optimized with indexes and aggregation

---

## Best Practices

### Quiz/Trivia Management

1. **Regular Updates**: Add new questions periodically
2. **Review Statistics**: Monitor accuracy rates
3. **Balance Distribution**: Ensure even category/difficulty spread
4. **Deactivate Poor Questions**: Use `isActive: false` for problematic questions

### Coin Expiry

1. **Set Reasonable Expiry Dates**: Typically 90-365 days
2. **Monitor Notifications**: Ensure users receive expiry warnings
3. **Preview Before Expiry**: Use preview function to anticipate impact
4. **Handle Edge Cases**: Test with users who have no coins

### Session Management

1. **Monitor Session Buildup**: Check session counts regularly
2. **Adjust Timeouts**: Modify EXPIRY_HOURS if needed
3. **Analyze Session Patterns**: Use statistics to understand user behavior

---

## Troubleshooting

### Jobs Not Running

**Check:**
1. Server initialization completed successfully
2. MongoDB connection is active
3. No errors in startup logs
4. Job status shows `running: true`

**Solution:**
```typescript
// Manually restart jobs
import sessionCleanup from './jobs/cleanupExpiredSessions';
import coinExpiry from './jobs/expireCoins';

sessionCleanup.stop();
coinExpiry.stop();

sessionCleanup.start();
coinExpiry.start();
```

### Notifications Not Sending

**Check:**
1. Push notification service configured
2. User has valid phone/email
3. Notification preferences enabled
4. No errors in notification logs

### High Error Rates

**Monitor:**
1. Error logs for patterns
2. Database connection stability
3. Memory usage during job execution
4. Network connectivity for notifications

---

## Summary

This quiz and trivia system provides:

✅ **2 New Models**: QuizQuestion and TriviaQuestion with seed data
✅ **2 Cron Jobs**: Session cleanup and coin expiry automation
✅ **Comprehensive Statistics**: Track usage and accuracy
✅ **Automated Maintenance**: Keep database clean and healthy
✅ **User Notifications**: Keep users informed about coin expiry
✅ **Flexible Configuration**: Easy to customize schedules and parameters
✅ **Production Ready**: Error handling, logging, and monitoring built-in

The system is now fully integrated into the server and will run automatically.

---

**Last Updated**: November 3, 2025
**Version**: 1.0.0
**Author**: Agent 3 - Backend Database Architect
