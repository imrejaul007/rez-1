# Gamification Seeding Guide

## Overview

The `seedGamification.ts` script comprehensively seeds all gamification-related collections with realistic test data.

## What It Seeds

### 1. Challenges (15 total)
- **5 Daily Challenges**: Quick, easy tasks like login, visit stores, share deals
- **5 Weekly Challenges**: Medium-term goals like complete orders, write reviews
- **5 Monthly Challenges**: Long-term achievements like referrals, spending targets

Each challenge includes:
- Title, description, and icon
- Requirements (action type, target, optional stores/categories)
- Rewards (coins, badges, cashback multipliers)
- Difficulty level (easy, medium, hard)
- Participant and completion counts
- Active status and dates

### 2. User Challenge Progress (30 records)
- **10 Completed**: Full progress with rewards claimed
- **15 In Progress**: Partial progress (30-90% complete)
- **5 Pending**: No progress yet

Each record includes:
- Progress tracking with history
- Start/completion dates
- Reward claim status

### 3. Scratch Cards (20 cards)
- **10 Unrevealed**: Fresh cards waiting to be scratched
- **10 Revealed**: Already scratched, some claimed

Prizes include:
- Discounts (10%, 25%)
- Cashback (₹50)
- Coins (100)
- Vouchers (₹200)

### 4. Coin Transactions (50 transactions)
- **25 Earning Transactions**:
  - Challenge completions
  - Referral bonuses
  - Purchase rewards
  - Review rewards
  - Bill upload rewards
  - Daily login bonuses
  - Mini-game prizes

- **25 Spending Transactions**:
  - Mini-game entries
  - Reward redemptions

Features:
- Chronological order maintained
- User wallet balances automatically updated
- Transaction metadata included
- Balance tracking across all transactions

### 5. Mini Games (15 instances)
- **Spin Wheel**: 5 instances
- **Scratch Card**: 5 instances
- **Quiz Game**: 5 instances

Statuses:
- Completed with rewards
- Active (in progress)
- Expired

## Prerequisites

Before running the script, ensure you have:

1. MongoDB running and connected
2. At least 10 users seeded in the database
3. Some stores seeded (optional, for challenge store requirements)
4. Environment variables configured (`.env` file)

```env
MONGODB_URI=mongodb://localhost:27017/rez-app
```

## How to Run

### Option 1: Direct Execution
```bash
cd C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npx ts-node scripts/seedGamification.ts
```

### Option 2: Via npm script (if added to package.json)
```bash
npm run seed:gamification
```

## Execution Flow

1. **Connection**: Connects to MongoDB
2. **Validation**: Checks for existing users (requires at least 1)
3. **Cleanup**: Clears all existing gamification data
4. **Seeding**:
   - Creates 15 challenges (5 daily, 5 weekly, 5 monthly)
   - Creates 30 user challenge progress records
   - Creates 20 scratch cards (10 revealed, 10 unrevealed)
   - Creates 50 coin transactions (25 earned, 25 spent)
   - Creates 15 mini-game instances
5. **Update**: Updates user wallet balances based on transactions
6. **Report**: Displays comprehensive statistics and sample data

## Expected Output

```
🎮 Starting Gamification Seed...
═══════════════════════════════════════════════════════

📡 Connecting to MongoDB...
✅ Connected to MongoDB

👥 Fetching users...
✅ Found 10 users

🗑️  Clearing existing gamification data...
✅ Cleared existing data

📋 Seeding Challenges...
✅ Created 15 challenges

🎯 Seeding User Challenge Progress...
✅ Created 30 user challenge progress records
   - Completed: 10
   - In Progress: 15
   - Pending: 5

🎫 Seeding Scratch Cards...
✅ Created 20 scratch cards
   - Unrevealed: 10
   - Revealed: 10
   - Claimed: 7

💰 Seeding Coin Transactions...
✅ Created 50 coin transactions
   - Earned: 25
   - Spent: 25

💳 Updating user wallet balances...
✅ Updated wallet balances

🎮 Seeding Mini Games...
✅ Created 15 mini-game instances
   - Spin Wheel: 5
   - Scratch Card: 5
   - Quiz: 5
   - Completed: 9
   - Active: 5
   - Expired: 1

═══════════════════════════════════════════════════════
📊 GAMIFICATION SEED SUMMARY
═══════════════════════════════════════════════════════

✅ Challenges: 15
✅ User Challenge Progress: 30
✅ Scratch Cards: 20
✅ Coin Transactions: 50
✅ Mini Games: 15

═══════════════════════════════════════════════════════
✅ Gamification Seed Complete!
═══════════════════════════════════════════════════════
```

## Data Characteristics

### Realistic Distribution
- Various difficulty levels (easy, medium, hard)
- Different time frames (daily, weekly, monthly)
- Mixed completion statuses
- Chronological transaction history
- Balanced earning/spending patterns

### User Engagement
- Multiple users participate in challenges
- Progress history shows incremental completion
- Some challenges are more popular than others
- Realistic completion rates (50-80%)

### Wallet Integration
- Coin transactions update actual wallet balances
- Balances tracked chronologically
- No negative balances allowed
- Statistics updated (totalEarned, totalSpent)

## Verification

After running the script, you can verify the data:

### Check Challenges
```javascript
// MongoDB Shell or Compass
db.challenges.find({ active: true }).count()
// Should return 15
```

### Check User Progress
```javascript
db.userchallengeprogressions.aggregate([
  { $group: { _id: "$completed", count: { $sum: 1 } } }
])
```

### Check Coin Balances
```javascript
db.cointransactions.aggregate([
  { $group: {
    _id: "$user",
    latestBalance: { $last: "$balance" },
    totalEarned: { $sum: { $cond: [{ $eq: ["$type", "earned"] }, "$amount", 0] } }
  }}
])
```

## Troubleshooting

### Error: "No users found"
**Solution**: Seed users first
```bash
npx ts-node src/scripts/seedSimple.ts
```

### Error: "Connection refused"
**Solution**: Ensure MongoDB is running
```bash
# Windows
net start MongoDB

# Check connection
mongosh
```

### Error: "Module not found"
**Solution**: Install dependencies
```bash
npm install
```

### TypeScript Errors
**Solution**: Ensure TypeScript and ts-node are installed
```bash
npm install -D typescript ts-node @types/node
```

## Re-running the Script

The script is **idempotent** - it can be run multiple times safely:
- Clears existing gamification data on each run
- Does NOT affect users, stores, or other collections
- Resets wallet coin balances to reflect new transactions

## Integration with Other Seeds

### Recommended Seeding Order:
1. `seedSimple.ts` - Basic data (users, stores, products)
2. `seedOrders.ts` - Order history
3. `seedGamification.ts` - Gamification data
4. `seedAllData.ts` - Everything else

### Standalone Usage:
The gamification seed can run independently if users exist in the database.

## Next Steps

After seeding, test the gamification features:
1. Login as a seeded user
2. View available challenges
3. Check coin balance
4. Scratch a card
5. Play a mini-game
6. View progress on challenges

## Notes

- All dates are relative to the current date
- Random variations ensure realistic test data
- Some cards/challenges are intentionally expiring soon for testing
- Transaction history is chronologically ordered
- Wallet balances are automatically calculated

## Support

For issues or questions:
- Check the console output for detailed error messages
- Verify MongoDB connection string in `.env`
- Ensure all dependencies are installed
- Check that user collection has data

## File Location

```
user-backend/
├── scripts/
│   ├── seedGamification.ts          (This script)
│   └── README_GAMIFICATION_SEEDING.md (This file)
├── src/
│   └── models/
│       ├── Challenge.ts
│       ├── UserChallengeProgress.ts
│       ├── ScratchCard.ts
│       ├── CoinTransaction.ts
│       ├── MiniGame.ts
│       ├── User.ts
│       └── Wallet.ts
```
