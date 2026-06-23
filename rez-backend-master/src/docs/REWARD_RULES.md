# REZ Reward Rules — Single Source of Truth

Last Updated: 2026-03-23
Version: 1.0
Engine: LogicWeaver Contradiction & Loop Detector

---

## Executive Summary

This document defines the ONLY official reward calculation rules for the REZ platform. It resolves 5 major contradictions found in the legacy system and establishes deterministic rules for all reward stacking scenarios.

**Key Changes:**
1. ✅ Coin expiry: **Earned-date TTL only** (no inactivity expiry)
2. ✅ Campaign vs Promo: **Higher value wins** (not stackable)
3. ✅ Cashback basis: **Net cash paid** (excludes coin-redeemed amounts)
4. ✅ Fraud flag: **Blocks ALL rewards** (fail-closed)
5. ✅ Daily cap: **10 events max per user per day** (prevents farming)

---

## Priority-Based Reward Calculation

When multiple rewards could apply to a single transaction, apply them in this strict order:

### PRIORITY 1 (Highest): Fraud Block
- **Rule:** If `isFraudFlagged === true`, STOP. Return 0 coins. No exceptions.
- **Reason:** Prevents fraudsters from earning rewards
- **Failure Mode:** Fail-closed (block if fraud system fails)
- **Example:**
  ```
  Transaction: ₹1000 order
  User: isFraudFlagged = true
  Result: 0 coins, 0 cashback, blocked
  ```

### PRIORITY 2: Campaign Coins (Merchant-Funded)
- **Amount:** Fixed per campaign (e.g., "50 coins")
- **Budget:** Limited (merchant-funded pool)
- **Stacking:** NOT stackable with Promo coins (see conflict resolution below)
- **Rule:** Take the HIGHER value between Campaign and Promo, not both

### PRIORITY 3: Promo Coins (Platform-Funded)
- **Amount:** Fixed per promo (e.g., "30 coins")
- **Budget:** Limited (platform liability)
- **User Limit:** Max per-user usage (e.g., 2x per user)
- **Stacking:** NOT stackable with Campaign coins
- **Conflict Rule:**
  ```
  IF (campaign.coins >= promo.coins) AND (campaign.budget > 0)
    THEN issue campaign.coins, skip promo
  ELSE IF (promo.userUsageCount < promo.maxUsagePerUser)
    THEN issue promo.coins, skip campaign
  ELSE
    THEN issue neither
  ```

### PRIORITY 4: Cashback (Percentage-Based, Stackable with Coins)
- **Basis:** Net cash paid = `total_amount - coins_redeemed_value`
- **Rate:** 0-5% (varies by merchant/category)
- **Cap:** Max ₹200 per transaction
- **Stacking:** YES, stackable with REZ coins, campaign, promo
- **Rule:** `cashback_INR = MIN(cashable_amount × rate, ₹200)`
- **Contradiction Fix:** Cashback calculated on NET cash, not total bill
  - **Old Bug:** Bill ₹100, redeem ₹50 coins, cashback on ₹100 (infinite loop!)
  - **New Rule:** Cashback on ₹50 only (the cash actually paid)

### PRIORITY 5: Base REZ Coins (Core Platform Currency)
- **Rate:** 1 coin per ₹100 spent
- **Formula:** `coins = floor(amount × 0.01)`
- **Applies To:** Orders, bookings, reviews
- **Does NOT Apply To:** BBPS (bills, recharges)
- **Stacking:** YES, stackable with campaign, promo, cashback

### PRIORITY 6: Loyalty Multiplier (Highest Stacking)
- **Applies To:** Base REZ coins only (NOT campaign/promo/cashback)
- **Multipliers:**
  - Bronze: 1.0× (no bonus)
  - Silver: 1.2× (+20%)
  - Gold: 1.5× (+50%)
  - Platinum: 2.0× (double)
- **Formula:** `final_coins = floor(base_coins × multiplier)`
- **Tier Change Rule:** Multiplier affects EARNING rate only, not existing coin value
  - Example: Earn 100 coins at Platinum (2×), then downgrade to Silver. Those 100 coins still redeemable at 1:1, expiry unchanged.

---

## Stacking Matrix

| Reward Type | + Campaign | + Promo | + Cashback | + Loyalty | Notes |
|------------|-----------|---------|-----------|-----------|-------|
| Campaign   | ❌ CONFLICT | ❌ CONFLICT | ✅ YES | ❌ N/A | Higher value wins |
| Promo      | ❌ CONFLICT | ❌ N/A | ✅ YES | ❌ N/A | Higher value wins |
| Cashback   | ✅ YES | ✅ YES | ❌ N/A | ✅ YES (but see note) | Base = net cash |
| Base REZ   | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Loyalty multiplies REZ only |

**Special Notes:**
- **Campaign + Promo conflict:** Not additive. Evaluate both; issue the higher value. If both tied, pick campaign (merchant-funded preference).
- **Loyalty + Cashback:** Loyalty does NOT multiply cashback. Loyalty multiplies base REZ coins only.
- **Trial + Cashback:** Trial coins are separate pool. If user uses trial coins for redemption, cashback basis is net cash (same rule).

---

## Daily Reward Cap (Anti-Farming)

**Rule:** Max 10 reward-issuing events per user per calendar day.

- **Event:** Any transaction that results in coin issuance (order, referral, game prize, etc.)
- **Limit:** 10 events/day (hard cap)
- **Window:** Midnight to midnight (user's local timezone)
- **Breach:** 11th event rejected with reason "Daily reward cap exceeded"
- **Purpose:** Prevents bot farming (50 tiny purchases = 50 events)

**Example:**
```
User A: Makes 10 purchases (₹100 each) → Events 1-10 ✅ Each earns coins
User A: Makes 11th purchase (₹100) → Event 11 ❌ Rejected, "cap exceeded"
User A: Next day (new calendar day) → Event 1 of new day ✅ Allowed again
```

---

## Coin Expiry Policies

**MAJOR CONTRADICTION RESOLVED:**
Old system had BOTH per-coin TTL AND inactivity-based expiry. Now: **Only earned-date TTL applies. NO inactivity expiry.**

| Coin Type | Expiry Date | Inactivity Expiry | Example |
|-----------|-----------|-----------------|---------|
| REZ | 90 days from earned | ❌ NO | Earn on Mar 1 → Expires May 31 (regardless of activity) |
| Promo | MIN(30 days from earned, campaign end) | ❌ NO | Campaign ends Apr 1, coins expire Apr 1 even if issued May |
| Branded | 60 days from earned | ❌ NO | Merchant coin expires 60 days from issue date |
| Trial | 7 days from trial completion | ❌ NO | Trial ends Mar 15 → Coins expire Mar 22 |

**Tier Downgrade Impact:**
- ❌ Does NOT re-expire coins
- ❌ Does NOT reduce coin value
- ✅ Does affect FUTURE coin earning rate
- Example: Earn 100 coins at Platinum. Downgrade to Silver. Coins still valid, same expiry date.

---

## Fraud Detection & Blocking

### Fraud Block (Priority 1)
Checked before any reward calculation:
```
IF user.isFraudFlagged == true
  THEN block all rewards, return reason
  ELSE continue to next priority
```

### Circular Referral Detection
Prevents A→B→A reward loops:
```
IF refereeId previously referred referrerId
  THEN block referral reward, flag both accounts
  ELSE allow referral
```

### Triple-Spend Detection
Prevents: Earn coins → Redeem coins → Earn coins again on redeemed discount:
```
IF user redeemed coins in last 24h
  AND now making new purchase with discount from redemption
  THEN flag for manual review, reduce or skip cashback
```

### Circular Referral Ring Detection (Multi-Level)
Finds cycles like A→B→C→D→A:
```
FOR EACH referral chain up to depth 10:
  IF cycle detected (back to original user)
    THEN block all participants, flag all accounts
```

---

## Key Calculations (For Engineering)

### REZ Coins from Purchase
```typescript
function calculateREZCoins(transactionAmount: number, tier: string): number {
  const baseCoins = Math.floor(transactionAmount * 0.01); // 1 coin per ₹100
  const multipliers = { bronze: 1.0, silver: 1.2, gold: 1.5, platinum: 2.0 };
  return Math.floor(baseCoins * multipliers[tier]);
}
// Example: ₹5000 at Platinum = floor(50 × 2.0) = 100 coins
```

### Cashback (Net of Coin Redemption)
```typescript
function calculateCashback(
  transactionAmount: number,
  coinsRedeemedValue: number,
  cashbackRate: number
): number {
  const cashableAmount = Math.max(0, transactionAmount - coinsRedeemedValue);
  const rawCashback = cashableAmount * cashbackRate;
  return Math.min(rawCashback, 200); // Cap at ₹200
}
// Example: Bill ₹1000, redeem 500-coin (₹500 value), 5% cashback
//          = (1000 - 500) × 0.05 = ₹25
```

### Campaign vs Promo (Conflict Resolution)
```typescript
function resolveCampaignPromoConflict(campaign, promo) {
  if (campaign.budget <= 0) return promo.coins; // Campaign out of budget
  if (promo.usageCount >= promo.maxUsagePerUser) return campaign.coins; // Promo used up
  return Math.max(campaign.coins, promo.coins); // Take higher value
}
```

### Expiry Date
```typescript
function getExpiryDate(earnedAt: Date, coinType: string): Date {
  const ttlDays = { rez: 90, promo: 30, branded: 60, trial: 7 }[coinType];
  const expiry = new Date(earnedAt);
  expiry.setDate(expiry.getDate() + ttlDays);
  return expiry;
}
// Example: REZ coin earned Mar 1 → Expires May 30 (90 days later)
```

---

## Contradictions Found & Fixed

| # | Contradiction | Impact | Fix |
|---|---|---|---|
| 1 | Per-coin expiry + inactivity expiry | Coins could expire twice | Removed inactivity expiry. Only earned-date TTL applies. |
| 2 | Campaign + Promo both apply | Double rewards for merchants | Only higher value applies (not sum). |
| 3 | Cashback on total bill after coin redemption | Infinite coin loop | Cashback basis = net cash (bill - coin value). |
| 4 | Tier downgrade affects coin value | Users lose existing coins | Tier only affects earning rate, not redemption value. |
| 5 | No daily cap on reward events | Bot farming (50 purchases/min) | Max 10 events/day per user. |

---

## Testing Checklist

- [ ] Fraud flag blocks all rewards (Priority 1)
- [ ] Campaign vs Promo: higher value wins (not sum)
- [ ] Cashback = net cash paid (not total bill)
- [ ] Loyalty multiplier applies only to REZ coins
- [ ] Daily cap: 11th event rejected
- [ ] Coin expiry: earned-date TTL only
- [ ] Circular referral A→B→A blocked
- [ ] Tier downgrade: doesn't re-expire coins
- [ ] Trial coins + cashback: separate pools

---

## Implementation Notes

- **Rule Engine:** `src/utils/ruleEngine.ts`
- **Loop Guard:** `src/middleware/rewardLoopGuard.ts`
- **Expiry Policy:** `src/utils/coinExpiryPolicy.ts`
- **Config Cache:** `src/utils/rewardConfig.ts` (5-min TTL)
- **Reward Engine:** `src/core/rewardEngine.ts` (uses rule engine)

**Redis Keys:**
- `reward:daily:{userId}:{YYYY-MM-DD}` — Daily event counter (25h TTL)
- `reward:issued:{idempotencyKey}` — Dedup cache (5min TTL)

---

## Contact

- **Author:** LogicWeaver (Contradiction Detector)
- **Last Review:** 2026-03-23
- **Approval:** Engineering Lead + Compliance

For questions or updates, refer to the Rule Engine code directly (source of truth).
