# Package.json Script Additions

Add these convenience scripts to your `package.json` for easy access to seed and testing functions.

## Suggested Scripts

Add to the `"scripts"` section of `user-backend/package.json`:

```json
{
  "scripts": {
    // ... existing scripts ...

    // Seed Scripts
    "seed:quiz": "ts-node src/scripts/seedQuizQuestions.ts",
    "seed:trivia": "ts-node src/scripts/seedTriviaQuestions.ts",
    "seed:games": "npm run seed:quiz && npm run seed:trivia",

    // Manual Job Triggers (for testing)
    "test:cleanup": "ts-node -e \"import('./src/jobs/cleanupExpiredSessions').then(m => m.triggerManualSessionCleanup())\"",
    "test:expire-coins": "ts-node -e \"import('./src/jobs/expireCoins').then(m => m.triggerManualCoinExpiry())\"",
    "test:preview-expiry": "ts-node -e \"import('./src/jobs/expireCoins').then(m => m.previewUpcomingExpirations(7).then(console.log))\"",

    // Job Status
    "jobs:status": "ts-node -e \"import('./src/jobs/cleanupExpiredSessions').then(m => console.log('Session Cleanup:', m.default.getStatus())); import('./src/jobs/expireCoins').then(m => console.log('Coin Expiry:', m.default.getStatus()))\""
  }
}
```

## Usage

After adding the scripts, you can use them like this:

### Seeding

```bash
# Seed quiz questions
npm run seed:quiz

# Seed trivia questions
npm run seed:trivia

# Seed both at once
npm run seed:games
```

### Testing Jobs

```bash
# Manually trigger session cleanup
npm run test:cleanup

# Manually trigger coin expiry
npm run test:expire-coins

# Preview upcoming coin expirations (next 7 days)
npm run test:preview-expiry

# Check job status
npm run jobs:status
```

## Alternative: Direct Commands

If you prefer not to add scripts, you can run directly:

```bash
# Seed quiz
npx ts-node src/scripts/seedQuizQuestions.ts

# Seed trivia
npx ts-node src/scripts/seedTriviaQuestions.ts

# Manual cleanup
npx ts-node -e "import('./src/jobs/cleanupExpiredSessions').then(m => m.triggerManualSessionCleanup())"

# Manual coin expiry
npx ts-node -e "import('./src/jobs/expireCoins').then(m => m.triggerManualCoinExpiry())"
```

## Development Workflow

### Initial Setup

```bash
# 1. Seed the database with questions
npm run seed:games

# 2. Start the server (jobs will auto-start)
npm run dev
```

### Testing

```bash
# Test session cleanup
npm run test:cleanup

# Test coin expiry
npm run test:expire-coins

# Preview what coins will expire soon
npm run test:preview-expiry
```

### Monitoring

```bash
# Check if jobs are running
npm run jobs:status
```

## Expected Output

### seed:quiz
```
🌱 Starting quiz questions seeding...
✅ Database connected
🗑️ Cleared 0 existing quiz questions
✅ Successfully seeded 50 quiz questions

📊 Quiz Questions Statistics:
[Table showing category/difficulty breakdown]

📈 Category Breakdown:
[Table showing questions per category]

✅ Quiz questions seeding completed successfully!
```

### seed:trivia
```
🌱 Starting trivia questions seeding...
✅ Database connected
🗑️ Cleared 0 existing trivia questions
✅ Successfully seeded 30 trivia questions

📊 Trivia Questions Statistics:
[Table showing category/difficulty breakdown]

📈 Category Breakdown:
[Table showing questions per category]

✅ Trivia questions seeding completed successfully!
```

### test:cleanup
```
🧹 [SESSION CLEANUP] Manual cleanup triggered
🧹 [SESSION CLEANUP] Running expired session cleanup...
⏰ [SESSION CLEANUP] Marked 5 sessions as expired
🗑️ [SESSION CLEANUP] Deleted 10 old sessions
✅ [SESSION CLEANUP] Manual cleanup completed: {
  duration: '123ms',
  expiredCount: 5,
  deletedCount: 10,
  totalProcessed: 15
}
```

### test:expire-coins
```
💰 [COIN EXPIRY] Manual expiry triggered
💰 [COIN EXPIRY] Running coin expiry job...
💰 [COIN EXPIRY] Found 8 expired coin transactions
👥 [COIN EXPIRY] Processing expiry for 5 users
✅ [COIN EXPIRY] Manual expiry completed: {
  duration: '456ms',
  usersAffected: 5,
  totalCoinsExpired: 150,
  notificationsSent: 5
}
```

### test:preview-expiry
```
{
  totalCoins: 350,
  usersAffected: 12,
  expirationsByDate: [
    { date: 2025-11-04T00:00:00.000Z, coins: 100, users: 4 },
    { date: 2025-11-05T00:00:00.000Z, coins: 150, users: 5 },
    { date: 2025-11-06T00:00:00.000Z, coins: 100, users: 3 }
  ]
}
```

---

## Notes

- All scripts assume you're in the `user-backend` directory
- Make sure your `.env` is configured with database connection
- Jobs will run automatically when server starts - manual triggers are for testing only
- Use `test:preview-expiry` to see upcoming expirations without actually expiring coins

---

**Recommendation**: Add at least the seed scripts to package.json for convenience.
