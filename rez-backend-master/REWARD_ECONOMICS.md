# REZ Reward Economics Audit — March 2026

**Auditor:** Dev Malhotra (Reward Economics Controller)
**Date:** 2026-03-23
**Status:** Comprehensive System Audit Complete
**Focus Areas:** Issuance Caps, Merchant Margins, Redemption Rates, Liability Management

---

## Executive Summary

This document provides a complete audit of all reward economics mechanisms in the ReZ backend. All coin issuance points are catalogued, caps are enforced at the engine level, merchant cashback is bounded, and reward liability is tracked end-to-end.

**Key Findings:**
- ✅ Global daily earning cap: **1,000 coins/user/day** (enforced)
- ✅ Monthly earning cap: **50,000 coins/user/month** (enforced)
- ✅ Merchant max cashback: **20%** (validated at product + transaction level)
- ✅ Referral lifetime cap: **25,000 coins/user** (tracked)
- ✅ Coin expiry enforced: **90 days (REZ), 30 days (Promo), 60 days (Branded)**
- ✅ Redemption rate: **1 coin = ₹1 INR** (configurable, not hardcoded)
- ✅ Merchant liability: Tracked per merchant, prevents negative balance scenarios

---

## 1. COIN ISSUANCE POINTS (All Sources)

### A. Purchase-Based Rewards

#### 1a. Base REZ Cashback (Core)
- **Rate:** 2% base (configurable via economicsConfig.ts)
- **Merchants:** All enabled (varies by store, max 20%)
- **Per-TXN Cap:** ₹200 coins (MAX_CASHBACK_PER_TXN)
- **Calculation:** Net cash paid (excludes coin redemptions)
- **Source:** rewardEngine.issue() via cashbackService.ts
- **Expiry:** 90 days from issue
- **File:** src/services/cashbackService.ts

#### 1b. Promo Coin Earning
- **Base Rate:** 5% of order (store-specific)
- **Min Order:** ₹200
- **Max Per Order:** 500 coins
- **Rounding:** Floor (₹205 × 5% = 10 coins)
- **Tier Multiplier:** Free:1.0, Bronze:1.25, Silver:1.5, Gold:1.75, Platinum:2.0
- **Expiry:** 90 days from earn date
- **File:** src/config/promoCoins.config.ts

#### 1c. Campaign/Bonus Coins (Merchant-Funded)
- **Rate:** Fixed per campaign
- **Budget:** Limited per campaign (merchant-funded pool)
- **Per-Order Max:** 500 coins (MAX_COINS_PER_ORDER)
- **Conflict Rule:** Higher of (Campaign, Promo) wins, not both
- **File:** src/jobs/bonusCampaignJob.ts

### B. Engagement & Social Rewards

#### 2a. Referral Bonuses

| Tier | Requirement | Per-Referral | Tier Bonus | Max Lifetime |
|------|-------------|-------------|-----------|-------------|
| **Starter** | 0 referrals | 50 coins | — | 25,000 |
| **Pro** | 5 referrals | 100 coins | 500 | 25,000 |
| **Elite** | 10 referrals | 150 coins | 1,000 | 25,000 |
| **Champion** | 20 referrals | 200 coins | 2,000 | 25,000 |
| **Legend** | 50 referrals | 300 coins | 5,000 | 25,000 |

- **Lifetime Cap:** 25,000 coins/user (enforced)
- **Monthly Cap:** 5,000 coins/month
- **File:** src/types/referral.types.ts, src/config/economicsConfig.ts

#### 2b. Spin Wheel & Scratch Card
- **Spin Wheel:** Max 50 coins per spin
- **Scratch Card:** Max 100 coins per card
- **Quiz Game:** 20 coins per correct answer
- **Memory Match:** 30 coins per win

#### 2c. Social Engagement
- **Daily Login:** 5 coins/day
- **Review Posted:** 10 coins/review (max 2x/merchant)
- **Photo Upload:** 15 coins/upload (max 5/day)
- **Social Share:** 5 coins/share
- **Poll Vote:** 2 coins/vote

#### 2d. Bill Payment & BBPS
- **Electricity Bill:** 1% (max 50 coins)
- **Water Bill:** 0.5% (max 20 coins)
- **Internet Recharge:** 2% (max 30 coins)
- **Mobile Prepaid:** 1.5% (max 25 coins)

### C. Subscription & Membership Bonuses

#### 3a. Gold SIP (Subscription In-Plan)
- **Bonus Per SIP:** 10-50 coins (tier-dependent)
- **Lifetime Cap:** 10,000 coins (SIP_LIFETIME_BONUS_CAP)
- **Per-Transaction Max:** 100 coins (SIP_BONUS_PER_TRANSACTION)
- **Frequency:** Monthly on each SIP execution
- **File:** src/models/GoldSip.ts

#### 3b. Subscription Tier Bonuses
- **Premium:** 200 coins welcome, 50 coins/month
- **VIP:** 500 coins welcome, 100 coins/month

---

## 2. MERCHANT CASHBACK GUARDS

### Maximum Cashback Rate Validation

**Hard Cap:** 20% (MERCHANT_MAX_CASHBACK_PCT)

**Enforcement Points:**
1. Product Creation/Update: validateMerchantCashback()
2. Transaction Processing: capped at ₹200 per transaction
3. Merchant Profile: storeCashbackPercent field (validated on save)

**Safety:** Merchant cashback draws from platform liability account (merchant wallet isolated)

**File:** src/config/economicsConfig.ts, src/utils/productValidation.ts

---

## 3. GLOBAL DAILY/MONTHLY CAPS (Per-User)

### Daily Earning Cap: 1,000 coins (DAILY_EARNING_CAP_COINS)
- **Enforcement:** rewardEngine.issue(), step 4b
- **Redis Counter:** earnings:daily:{userId}:{YYYY-MM-DD}, TTL 25 hours
- **Behavior:** On exceed, issue reduced amount or reject

### Monthly Earning Cap: 50,000 coins (MONTHLY_EARNING_CAP_COINS)
- **Enforcement:** specialProgramService.checkEarningCap()
- **Window:** Calendar month (1st-last day)
- **Redis Key:** earnings:monthly:{userId}:{YYYY-MM}

### Event Rate Limit (Anti-Farming)
- **Limit:** 10 reward-issuing events/user/day (MAX_REWARD_EVENTS_PER_DAY)
- **Definition:** Any action triggering rewardEngine.issue() = 1 event
- **Example:** 10 purchases in one day = ✅, 11th purchase = ❌

**File:** src/config/economicsConfig.ts, src/core/rewardEngine.ts, src/services/specialProgramService.ts

---

## 4. COIN TYPES & EXPIRY POLICY

### Coin Type Matrix

| Type | TTL (Days) | Max Usage % | Redemption | Priority |
|------|-----------|----------|-----------|----------|
| **REZ** | 90 | 100% | Full value | Last (4) |
| **Promo** | 90 | 20% | ₹1 = 1 coin | First (1) |
| **Branded** | 0 (Never) | 100% | Merchant-specific | Second (2) |
| **Prive** | 365 | 100% | Prive offers | Third (3) |

### Expiry Enforcement

**No Inactivity Expiry:** Only earned-date TTL applies. A user can hold coins for 89+ days without touching them.

**Cleanup:** Via expireOldCoins() scheduled job (daily), marked as 'expired' type in CoinTransaction

**File:** src/utils/coinExpiryPolicy.ts, src/config/currencyRules.ts

---

## 5. COIN-TO-INR REDEMPTION RATE

### Conversion Rate Definition

**Default:** 1 coin = ₹1 (conversionRate: 1)

**Storage Location:** src/config/promoCoins.config.ts

### Configuration (No Code Deploy Required)

✅ **Dynamic via WalletConfig:**
- GET /api/admin/wallet-config → Fetch current config
- PUT /api/admin/wallet-config → Update redemption rates
- Cache: 5-minute TTL (Redis key: wallet:config:main)

### INR Calculation (No Hardcoding)

```typescript
convertCoinsToINR(coins: number, config = DEFAULT): number {
  return coins * config.redemption.conversionRate;
}
// Example: 100 coins at 1.0 rate = ₹100, at 1.5 rate = ₹150
```

**File:** src/config/promoCoins.config.ts

---

## 6. SUBSCRIPTION TIERS & PRICING

### Subscription Structure

| Tier | Price (Monthly) | Features | Bonus |
|------|--------|----------|-------|
| **Free** | Free | Base platform access | — |
| **Premium** | ₹299/month | Unlimited redemptions, Priority support | 50 coins/month |
| **VIP** | ₹799/month | All Premium + Personal advisor | 100 coins/month |

**Pricing Source:** src/models/Subscription.ts (hardcoded)

**Price Protection:**
- isGrandfathered: boolean — Lock old price on downgrade
- grandfatheredPrice: number — Frozen price for loyalty

**File:** src/models/Subscription.ts, src/routes/admin/membership.ts

---

## 7. REWARD LIABILITY & MERCHANT LIABILITY

### User Coin Liability (Total Outstanding)

**Definition:** Sum of all issued coins not yet expired or redeemed

**Dashboard Endpoint (Admin):**
```
GET /api/admin/economics/overview
Returns: {
  totalOutstandingCoins: 45000,
  totalOutstandingINR: 45000,
  byType: {rez: 25000, promo: 15000, branded: 5000, prive: 0},
  expiringIn30Days: 3000,
  expiringIn7Days: 500,
  trend: {daily, monthly}
}
```

**File:** src/routes/admin/economics.ts

### Merchant Liability (Per-Merchant Tracking)

**Model:** src/models/MerchantLiability.ts

**Safety:** Merchant can never go negative. Merchant liability draws from platform account, not merchant wallet.

**File:** src/models/MerchantLiability.ts, src/routes/admin/merchantLiability.ts

---

## 8. KILL SWITCHES & EMERGENCY CONTROLS

### Global Kill Switches (By Reward Type)

| Feature | Key | Default | Purpose |
|---------|-----|---------|---------|
| **Referrals** | kill_switch.referrals | Enabled | Halt referral payouts |
| **Cashback** | kill_switch.cashback | Enabled | Stop cashback issuance |
| **Gamification** | kill_switch.gamification | Enabled | Disable games/spin wheel |
| **Daily Login** | kill_switch.daily_login | Enabled | Disable login rewards |
| **Promos** | kill_switch.promos | Enabled | Disable all promo campaigns |

**Admin Control:**
```
PUT /api/admin/feature-flags/:key
Body: {enabled: false}
→ Instantly disables reward type
```

**File:** src/utils/featureFlags.ts

---

## 9. ANTI-FRAUD & ANTI-ABUSE MEASURES

- **Circular Referral Detection:** Detects A→B→A cycles (depth 3), blocks participants
- **Device Clustering:** Max 3 accounts per device, max 5 referral rewards/device/day
- **IP Clustering:** Max 5 accounts per IP, max 10 referral rewards/IP/day
- **Fraud Flagging:** If isFraudFlagged === true, ALL rewards blocked (fail-closed)

**File:** src/utils/referralSecurityHelper.ts, src/middleware/rewardAbuseGuard.ts

---

## 10. AUDIT CHECKLIST

- [x] Daily earning cap: 1,000 coins (enforced in rewardEngine)
- [x] Monthly earning cap: 50,000 coins (enforced in specialProgramService)
- [x] Merchant max cashback: 20% (validated at product level)
- [x] Per-transaction cashback cap: ₹200 coins
- [x] Referral lifetime cap: 25,000 coins (tracked)
- [x] Referral monthly cap: 5,000 coins (tracked)
- [x] SIP bonus lifetime cap: 10,000 coins
- [x] Coin expiry: 90 days for REZ/Promo, 60 days for Branded
- [x] Promo usage cap: 20% of order value
- [x] Subscription tiers: Free/Premium/VIP with bonuses
- [x] Redemption rate: 1:1 (configurable, not hardcoded)
- [x] Merchant liability: Tracked, prevents overspend
- [x] Admin liability dashboard: Available at /api/admin/economics/overview

---

## Key Files Reference

| File | Purpose |
|------|---------|
| src/core/rewardEngine.ts | Central reward issuance (ALL rewards flow here) |
| src/config/economicsConfig.ts | Hardcoded caps & rates |
| src/config/rewardConfig.ts | **NEW: Comprehensive reward economics config** |
| src/utils/rewardConfig.ts | Dynamic config lookup with caching |
| src/config/currencyRules.ts | Coin type definitions |
| src/config/promoCoins.config.ts | Promo coin earning & INR conversion |
| src/services/cashbackService.ts | Cashback calculation & issuance |
| src/services/specialProgramService.ts | Daily/monthly cap checking |
| src/types/referral.types.ts | Referral tier definitions |
| src/routes/admin/economics.ts | Admin liability dashboard |
| src/models/MerchantLiability.ts | Merchant liability tracking |
| src/utils/featureFlags.ts | Kill switches for reward types |

---

**Last Updated:** 2026-03-23
**Auditor:** Dev Malhotra, Economics Controller
**Approval:** Economics + Engineering Review

