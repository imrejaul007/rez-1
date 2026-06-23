# Gamification Seed - Quick Start Guide

## TL;DR

```bash
cd "C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend"
npx ts-node scripts/seedGamification.ts
```

## What You Get

| Item | Count |
|------|-------|
| Challenges | 15 (5 daily, 5 weekly, 5 monthly) |
| User Progress | 30 (10 done, 15 doing, 5 todo) |
| Scratch Cards | 20 (10 unscratched, 10 scratched) |
| Coin Transactions | 50 (25 earned, 25 spent) |
| Mini Games | 15 (3 types × 5 each) |

## Before Running

✅ MongoDB running
✅ Users exist (at least 1)
✅ `.env` configured

Need users? Run: `npx ts-node src/scripts/seedSimple.ts`

## Output Preview

```
🎮 Starting Gamification Seed...
📡 Connecting to MongoDB... ✅
👥 Found 10 users ✅
🗑️  Clearing existing data... ✅
📋 Created 15 challenges ✅
🎯 Created 30 progress records ✅
🎫 Created 20 scratch cards ✅
💰 Created 50 transactions ✅
💳 Updated wallets ✅
🎮 Created 15 mini-games ✅
✅ Gamification Seed Complete!
```

## Challenge Examples

**Daily**: Login (10 coins), Visit 3 Stores (15 coins)
**Weekly**: 3 Orders (100 coins), 5 Reviews (75 coins)
**Monthly**: 5 Referrals (1000 coins), 15 Orders (500 coins)

## Prize Examples

**Scratch Cards**: 10% off, ₹50 cashback, 100 coins, ₹200 voucher
**Mini-Games**: Spin Wheel, Scratch Card, Quiz (50-500 coins)

## Coin Sources

**Earn**: Challenges, Referrals, Orders, Reviews, Bills, Login, Games
**Spend**: Game Entries, Reward Redemption

## Verify

```javascript
// MongoDB Shell
db.challenges.countDocuments()        // 15
db.userchallengeprogressions.countDocuments() // 30
db.scratchcards.countDocuments()      // 20
db.cointransactions.countDocuments()  // 50
db.minigames.countDocuments()         // 15
```

## Troubleshooting

**"No users found"**: Run `npx ts-node src/scripts/seedSimple.ts`
**Connection error**: Check MongoDB is running & `.env` is correct
**Module error**: Run `npm install`

## Re-run Anytime

Script is safe to run multiple times - clears old data first.

## Documentation

📖 **Detailed Guide**: `scripts/README_GAMIFICATION_SEEDING.md`
📊 **Data Overview**: `scripts/GAMIFICATION_SEED_OVERVIEW.md`
✅ **Complete Summary**: `GAMIFICATION_SEED_COMPLETE.md`

---

**Time**: ~10-30 seconds | **Safe**: ✅ | **Idempotent**: ✅
