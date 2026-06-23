# Gamification Seed Script - Complete Overview

## Quick Reference

**File**: `C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend\scripts\seedGamification.ts`

**Run Command**:
```bash
npx ts-node scripts/seedGamification.ts
```

**Prerequisites**: At least 10 users in database

---

## What Gets Created

| Collection | Count | Description |
|------------|-------|-------------|
| **Challenges** | 15 | 5 daily + 5 weekly + 5 monthly |
| **UserChallengeProgress** | 30 | 10 completed + 15 in-progress + 5 pending |
| **ScratchCards** | 20 | 10 unrevealed + 10 revealed |
| **CoinTransactions** | 50 | 25 earned + 25 spent |
| **MiniGames** | 15 | 5 spin wheel + 5 scratch card + 5 quiz |

---

## 1. Challenges (15)

### Daily Challenges (5)
| Challenge | Action | Target | Reward | Difficulty |
|-----------|--------|--------|--------|------------|
| Daily Check-In | login_streak | 1 | 10 coins | Easy |
| Store Explorer | visit_stores | 3 | 15 coins + 1.2x multiplier | Easy |
| Social Sharer | share_deals | 2 | 20 coins | Medium |
| Category Curious | explore_categories | 5 | 25 coins | Medium |
| Favorites Collector | add_favorites | 3 | 15 coins | Easy |

### Weekly Challenges (5)
| Challenge | Action | Target | Reward | Difficulty |
|-----------|--------|--------|--------|------------|
| Weekly Shopper | order_count | 3 | 100 coins + 1.5x multiplier | Medium |
| Big Spender | spend_amount | ₹2000 | 200 coins + 2.0x multiplier | Hard |
| Review Master | review_count | 5 | 75 coins | Medium |
| Receipt Hunter | upload_bills | 10 | 150 coins + 1.3x multiplier | Hard |
| Local Hero | visit_stores | 5 | 120 coins | Medium |

### Monthly Challenges (5)
| Challenge | Action | Target | Reward | Difficulty |
|-----------|--------|--------|--------|------------|
| Mega Shopper | order_count | 15 | 500 coins + 2.5x multiplier | Hard |
| Influencer | refer_friends | 5 | 1000 coins + 3.0x multiplier | Hard |
| Loyalty Champion | login_streak | 7 | 300 coins + 1.8x multiplier | Medium |
| Premium Spender | spend_amount | ₹10,000 | 800 coins + 3.0x multiplier | Hard |
| Community Star | review_count | 20 | 400 coins | Hard |

**Challenge Features**:
- ✅ Active status
- ✅ Participant counts (45-200 users)
- ✅ Completion rates (20-80%)
- ✅ Featured flags
- ✅ Badges for special challenges
- ✅ Cashback multipliers

---

## 2. User Challenge Progress (30)

### Distribution
```
Completed (10):     ████████████████████ 33%
In Progress (15):   ██████████████████████████████ 50%
Pending (5):        ██████████ 17%
```

### Completed Progress Features
- Progress = Target (100% complete)
- Completion date set
- Rewards claimed
- Progress history with timestamps
- Source tracking for each progress increment

### In-Progress Features
- Progress: 30-90% of target
- Partial progress history
- Multiple progress events
- Recent activity timestamps

### Pending Features
- Zero progress
- Recently started
- Ready for user action

---

## 3. Scratch Cards (20)

### Prize Types
| Type | Value | Count | Description |
|------|-------|-------|-------------|
| 🏷️ Discount | 10% | 4 | 10% off next purchase |
| 🏷️ Discount | 25% | 4 | 25% off next purchase |
| 💰 Cashback | ₹50 | 4 | ₹50 cashback on order |
| 💎 Coins | 100 | 4 | 100 REZ coins |
| 🎁 Voucher | ₹200 | 4 | ₹200 shopping voucher |

### Status Distribution
```
Unrevealed (10):  ██████████████████████ 50%
Revealed (10):    ██████████████████████ 50%
  - Claimed (7):  ███████████████ 35%
  - Unclaimed (3): ███████ 15%
```

### Features
- ✅ 24-hour expiry from creation
- ✅ 2 cards expiring within 2 hours (for testing)
- ✅ User-specific assignment
- ✅ Claim tracking
- ✅ Auto-expire via TTL index

---

## 4. Coin Transactions (50)

### Earning Sources (25 transactions)
| Source | Amount Range | Description |
|--------|--------------|-------------|
| 🎯 Challenge | 50-200 | Challenge completion rewards |
| 👥 Referral | 100-300 | Friend referral bonuses |
| 🛒 Order | 25-75 | Purchase rewards |
| ⭐ Review | 10-30 | Product review rewards |
| 📄 Bill Upload | 15-40 | Receipt upload rewards |
| 🌅 Daily Login | 5-15 | Daily login bonuses |
| 🎡 Spin Wheel | 50-250 | Spin wheel prizes |
| 🎫 Scratch Card | 100-300 | Scratch card prizes |

### Spending Sources (25 transactions)
| Source | Amount Range | Description |
|--------|--------------|-------------|
| 🎮 Purchase | 20-100 | Mini-game entry fees |
| 🎁 Redemption | 100-500 | Reward redemptions |

### Transaction Features
- ✅ Chronological order maintained
- ✅ Balance calculated after each transaction
- ✅ No negative balances
- ✅ Metadata tracking (challenge IDs, game IDs, etc.)
- ✅ User wallet balances automatically updated
- ✅ Statistics updated (totalEarned, totalSpent)

### Balance Example Flow
```
Initial: 0 coins
+100 (Challenge) → 100 coins
+50 (Daily Login) → 150 coins
-20 (Mini-game) → 130 coins
+200 (Referral) → 330 coins
-100 (Redemption) → 230 coins
Final: 230 coins
```

---

## 5. Mini Games (15 instances)

### Game Types
| Type | Count | Description |
|------|-------|-------------|
| 🎡 Spin Wheel | 5 | Random prize wheel |
| 🎫 Scratch Card | 5 | Reveal hidden prizes |
| 🧠 Quiz | 5 | Answer questions for rewards |

### Status Distribution
```
Completed (9):  ███████████████████████████ 60%
Active (5):     █████████████████ 33%
Expired (1):    ███ 7%
```

### Difficulty Levels
- Easy: Quick, low-stakes games
- Medium: Moderate challenge
- Hard: High-stakes, complex games

### Rewards
| Game Type | Reward Range | Win Rate |
|-----------|--------------|----------|
| Spin Wheel | 50-500 coins | 60% |
| Scratch Card | 50-500 coins | 60% |
| Quiz | 50-500 coins | 60% (based on score) |

### Features
- ✅ 24-hour expiry from start
- ✅ Difficulty-based rewards
- ✅ Completion tracking
- ✅ Game-specific metadata
  - Spin Wheel: segment, prize
  - Scratch Card: revealed cells, winning prize
  - Quiz: questions, score, correct answers

---

## Database Relationships

```
User (existing)
  ├── UserChallengeProgress (30)
  │     └── Challenge (15)
  ├── ScratchCard (20)
  ├── CoinTransaction (50)
  │     └── Challenge (metadata)
  ├── MiniGame (15)
  └── Wallet (updated with coin balances)
```

---

## Wallet Integration

### Before Seeding
```json
{
  "balance": {
    "available": 0,
    "total": 0
  },
  "statistics": {
    "totalEarned": 0,
    "totalSpent": 0
  }
}
```

### After Seeding (Example User)
```json
{
  "balance": {
    "available": 450,
    "total": 450
  },
  "statistics": {
    "totalEarned": 650,
    "totalSpent": 200
  }
}
```

---

## Seed Execution Details

### Phase 1: Connection & Validation
- Connect to MongoDB
- Fetch users (minimum 1 required)
- Verify prerequisites

### Phase 2: Cleanup
- Clear existing challenges
- Clear existing user challenge progress
- Clear existing scratch cards
- Clear existing coin transactions
- Clear existing mini games

### Phase 3: Seeding
1. **Challenges**: Create 15 challenges with varied types and difficulties
2. **Progress**: Create 30 progress records linked to users and challenges
3. **Scratch Cards**: Create 20 cards with random prizes
4. **Transactions**: Create 50 transactions maintaining chronological balance
5. **Mini Games**: Create 15 game instances with varied states

### Phase 4: Finalization
- Update user wallet balances
- Calculate statistics
- Display summary report

### Phase 5: Reporting
- Collection counts
- Status distributions
- Sample data examples
- Verification queries

---

## Testing Scenarios Enabled

### Challenge System
✅ View available challenges (all types)
✅ Filter by difficulty (easy, medium, hard)
✅ Track progress on multiple challenges
✅ Complete challenges and claim rewards
✅ View completion history
✅ Check participant counts
✅ Featured challenge banner

### Scratch Card System
✅ View unrevealed cards
✅ Scratch and reveal prizes
✅ Claim prizes
✅ Expiry warnings (2 cards expire soon)
✅ Various prize types (discount, cashback, coins, vouchers)

### Coin System
✅ View transaction history
✅ Earning sources (8 different types)
✅ Spending uses (2 types)
✅ Balance tracking
✅ Chronological order
✅ Filter by source/type
✅ Wallet balance display

### Mini-Game System
✅ Start new games
✅ Complete games with rewards
✅ View active games
✅ Game expiry handling
✅ Three game types
✅ Difficulty levels
✅ Reward distribution

---

## Data Quality Features

### Realism
- ✅ Date ranges make sense (past → present → future)
- ✅ Progress increments gradually
- ✅ Completion rates vary by difficulty
- ✅ Random variations in amounts and timing
- ✅ Balanced distribution across users

### Consistency
- ✅ Balances never go negative
- ✅ Completed challenges have claimed rewards
- ✅ Transaction timestamps are chronological
- ✅ Expired items have past expiry dates
- ✅ Progress doesn't exceed targets

### Variety
- ✅ Multiple challenge types
- ✅ Different prize types
- ✅ Various earning sources
- ✅ Mixed completion statuses
- ✅ Diverse user participation

---

## Performance Considerations

### Indexing
All models have proper indexes for:
- User lookups
- Date range queries
- Status filtering
- Challenge type filtering

### Query Optimization
- Populated references for sample data
- Efficient aggregations for statistics
- Batch inserts for large datasets

---

## Maintenance

### Re-running
```bash
# Safe to run multiple times
npx ts-node scripts/seedGamification.ts

# Will clear and recreate all gamification data
# Will NOT affect: users, orders, products, stores
```

### Cleanup Only
```javascript
// MongoDB Shell
db.challenges.deleteMany({})
db.userchallengeprogressions.deleteMany({})
db.scratchcards.deleteMany({})
db.cointransactions.deleteMany({})
db.minigames.deleteMany({})
```

---

## Integration Checklist

- [x] Challenge model imported
- [x] UserChallengeProgress model imported
- [x] ScratchCard model imported
- [x] CoinTransaction model imported
- [x] MiniGame model imported
- [x] User model imported
- [x] Wallet model imported
- [x] Store model imported (for challenge requirements)
- [x] Proper TypeScript types
- [x] Error handling
- [x] Detailed logging
- [x] Statistics reporting
- [x] Sample data display
- [x] Wallet balance updates
- [x] Transaction balance tracking
- [x] Chronological ordering

---

## Success Criteria

After running the seed:

1. ✅ **15 challenges** exist in database
2. ✅ **30 progress records** with varied statuses
3. ✅ **20 scratch cards** (10 revealed, 10 unrevealed)
4. ✅ **50 coin transactions** with proper balance tracking
5. ✅ **15 mini-game instances** with varied states
6. ✅ **User wallets** updated with coin balances
7. ✅ **No errors** in console
8. ✅ **Sample data** displayed correctly
9. ✅ **Statistics** match expected distributions
10. ✅ **Relationships** properly established

---

## File Summary

**Created Files**:
1. `scripts/seedGamification.ts` - Main seed script (780 lines)
2. `scripts/README_GAMIFICATION_SEEDING.md` - Detailed documentation
3. `scripts/GAMIFICATION_SEED_OVERVIEW.md` - This overview

**Modified Files**: None (wallet updates happen at runtime)

**Location**: `C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend\scripts\`

---

## Quick Start

```bash
# Navigate to backend
cd "C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend"

# Ensure users exist (seed if needed)
npx ts-node src/scripts/seedSimple.ts

# Run gamification seed
npx ts-node scripts/seedGamification.ts

# Expected completion time: 10-30 seconds
```

---

## Support & Troubleshooting

See `README_GAMIFICATION_SEEDING.md` for:
- Detailed troubleshooting steps
- Error resolution guides
- Verification queries
- Integration tips
