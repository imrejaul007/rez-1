# Partner Profile - Complete Implementation Plan

## Executive Summary

The Partner Profile is a **tiered loyalty & rewards program** designed to convert customers into brand advocates. Current implementation is ~70% complete with critical gaps in earnings/payout, notifications, and referral dashboard.

---

## Business Model

**IMPORTANT:** Partner earnings are **store credit only** - users CANNOT withdraw to bank/UPI. All rewards go to in-app wallet and can only be used to purchase items within ReZ app. This keeps money in the ecosystem and encourages more purchases.

```
User Earns Reward → Added to ReZ Wallet → Can Only Spend in ReZ App
                                      ↓
                              ❌ NO External Withdrawal
```

---

## Gap Analysis Summary

| Gap | Severity | Current State | Impact |
|-----|----------|---------------|--------|
| No Wallet-Earnings Integration | 🔴 Critical | Earnings not shown in wallet | Users don't see rewards |
| Referral Dashboard 404 | 🔴 Critical | Button exists, route missing | Broken feature |
| No Progress Notifications | 🔴 Critical | No alerts | Users unaware of achievements |
| No Level Downgrade Warning | 🟡 High | Silent level loss | Frustrating UX |
| Transaction History Mock | 🟡 High | Hardcoded in backend | No real transaction tracking |
| No Partner Leaderboard UI | 🟡 Medium | API exists, no UI | Missing gamification |
| Hardcoded Tier Targets | 🟡 Medium | target: 5 hardcoded | Won't scale with tiers |
| No Real-time Task Updates | 🟢 Low | Manual refresh needed | Minor UX issue |

---

## Phase 1: Critical Fixes (Priority: URGENT)

### 1.1 Wallet-Earnings Integration (Store Credit System)

**Problem:** Users earn partner rewards but don't see them clearly in wallet. Need to show earnings and allow spending at checkout.

**Business Rule:** All partner earnings (cashback, milestone rewards, referral bonus, task rewards) go to ReZ Wallet as **store credit** - can ONLY be used to purchase within the app.

**Implementation:**

```
Files to Modify:
├── app/WalletScreen.tsx             # Add partner earnings section
├── components/wallet/WalletBalanceCard.tsx  # Show earnings breakdown
├── components/wallet/TransactionHistory.tsx # Add partner transaction types
├── app/checkout.tsx                 # Add "Use Wallet Balance" option

Files to Create:
├── components/wallet/EarningsBreakdown.tsx  # Partner earnings detail
├── components/wallet/UseWalletAtCheckout.tsx # Checkout integration
└── components/partner/EarningsCard.tsx      # Quick earnings summary
```

**UI Flow:**
```
User Claims Reward (milestone/task/referral)
         ↓
    Amount added to ReZ Wallet automatically
         ↓
    Shows in Wallet with breakdown:
    ┌─────────────────────────────────┐
    │  ReZ Wallet Balance: ₹1,250    │
    │  ├── Partner Cashback: ₹500    │
    │  ├── Milestone Rewards: ₹400   │
    │  ├── Referral Bonus: ₹250      │
    │  └── Task Rewards: ₹100        │
    │                                 │
    │  [Shop Now] [View History]      │
    └─────────────────────────────────┘
         ↓
    At Checkout → "Use ₹1,250 wallet balance?"
         ↓
    Applied to order total
```

**Data Structure:**
```typescript
interface WalletBalance {
  total: number;
  breakdown: {
    partnerCashback: number;
    milestoneRewards: number;
    referralBonus: number;
    taskRewards: number;
    promotionalCredits: number;
  };
  canUseForPurchase: boolean; // Always true for store credit
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  source: 'partner_cashback' | 'milestone_reward' | 'referral_bonus' | 'task_reward' | 'purchase' | 'refund';
  amount: number;
  description: string;
  orderId?: string;
  createdAt: string;
}
```

**Checkout Integration:**
```typescript
// At checkout, show wallet option
{walletBalance > 0 && (
  <WalletPaymentOption
    balance={walletBalance}
    onApply={(amount) => applyWalletCredit(amount)}
    maxApplicable={Math.min(walletBalance, orderTotal)}
  />
)}
```

---

### 1.2 Referral Dashboard Route

**Problem:** Button navigates to `/referral/dashboard` which doesn't exist.

**Implementation:**

```
Files to Create:
├── app/referral/dashboard.tsx       # Full referral dashboard
├── app/referral/leaderboard.tsx     # Referral leaderboard
├── app/referral/history.tsx         # Detailed referral history
└── components/referral/
    ├── TierProgressCard.tsx
    ├── LeaderboardList.tsx
    ├── ReferralStatsGrid.tsx
    └── EarningsBreakdown.tsx
```

**Dashboard Sections:**
1. **Tier Progress Card** - Shows current tier, progress to next
2. **Statistics Grid** - Total referrals, earnings, conversion rate
3. **Leaderboard Preview** - Top 5 referrers
4. **Earnings Breakdown** - By referral, by tier bonus
5. **Referral History** - All referrals with status

**API Integration:**
```typescript
// Already exists - just need to call:
GET /api/referral/statistics
GET /api/referral/leaderboard
GET /api/referral/history
```

---

### 1.3 Notification System for Partner Events

**Problem:** Users don't know when they achieve milestones or level up.

**Implementation:**

```
Files to Modify:
├── contexts/NotificationContext.tsx  # Add partner event handlers
├── services/notificationService.ts   # Add partner notification types
└── user-backend/src/services/notificationService.ts

Files to Create:
├── components/notifications/
    ├── MilestoneAchievedNotification.tsx
    ├── LevelUpNotification.tsx
    ├── RewardClaimedNotification.tsx
    └── LevelDowngradeWarning.tsx
```

**Notification Types:**
```typescript
type PartnerNotification =
  | { type: 'MILESTONE_ACHIEVED'; milestone: string; reward: string }
  | { type: 'LEVEL_UP'; newLevel: string; benefits: string[] }
  | { type: 'LEVEL_DOWNGRADE_WARNING'; daysRemaining: number; ordersNeeded: number }
  | { type: 'REWARD_CLAIMED'; reward: string; value: number }
  | { type: 'REFERRAL_CONVERTED'; referralName: string; bonus: number }
  | { type: 'TASK_COMPLETED'; task: string; reward: string }
  | { type: 'OFFER_EXPIRING'; offer: string; expiresIn: string };
```

**Trigger Points:**
| Event | When to Trigger | Notification |
|-------|-----------------|--------------|
| Milestone Hit | After order #5, #10, #15, #20 | "You've hit X orders! Claim your reward" |
| Level Up | Orders threshold reached | "Congratulations! You're now Influencer" |
| 7 Days Warning | 7 days before level reset | "Complete 3 more orders to keep Partner status" |
| Reward Claimed | After claim API success | "₹50 added to your wallet" |
| Referral Converted | When referred user makes 1st order | "Your referral made their first order!" |

---

### 1.4 Level Downgrade Warning System

**Problem:** Users silently lose their level if they don't meet requirements.

**Implementation:**

**Backend Changes:**
```typescript
// Add to user-backend/src/services/partnerService.ts

async checkLevelStatus(userId: string): Promise<LevelStatus> {
  const partner = await this.getPartner(userId);
  const daysRemaining = this.calculateDaysRemaining(partner);
  const ordersNeeded = partner.level.requirements.orders - partner.ordersThisLevel;

  return {
    isAtRisk: daysRemaining <= 7 && ordersNeeded > 0,
    daysRemaining,
    ordersNeeded,
    willDowngradeTo: partner.level.level > 1 ? this.getPreviousLevel(partner.level.level) : null
  };
}

// Add cron job to check daily and send notifications
```

**Frontend Changes:**
```typescript
// Add warning banner to Partner Profile page
{levelStatus.isAtRisk && (
  <LevelWarningBanner
    daysRemaining={levelStatus.daysRemaining}
    ordersNeeded={levelStatus.ordersNeeded}
    currentLevel={currentLevel}
    downgradeLevel={levelStatus.willDowngradeTo}
  />
)}
```

---

## Phase 2: Important Features

### 2.1 Real Transaction History

**Problem:** Backend has mock transaction data.

**Backend Changes:**
```typescript
// user-backend/src/models/PartnerTransaction.ts (NEW)

const PartnerTransactionSchema = new Schema({
  partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  type: {
    type: String,
    enum: ['milestone_reward', 'task_reward', 'level_bonus', 'referral_bonus', 'cashback', 'payout'],
    required: true
  },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'credited', 'debited', 'failed'],
    default: 'pending'
  },
  description: String,
  metadata: {
    milestoneId: String,
    taskId: String,
    orderId: String,
    referralId: String,
    payoutId: String
  },
  createdAt: { type: Date, default: Date.now },
  processedAt: Date
});
```

**API Endpoint:**
```typescript
// GET /api/partner/transactions
router.get('/transactions', async (req, res) => {
  const { page = 1, limit = 20, type, startDate, endDate } = req.query;

  const transactions = await PartnerTransaction.find({
    partnerId: req.user.partnerId,
    ...(type && { type }),
    ...(startDate && endDate && {
      createdAt: { $gte: startDate, $lte: endDate }
    })
  })
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);

  return res.json({ success: true, data: { transactions } });
});
```

---

### 2.2 Partner Leaderboard UI

**Problem:** API exists, no UI.

**Implementation:**
```
Files to Create:
├── app/partner/leaderboard.tsx
└── components/partner/
    ├── LeaderboardCard.tsx
    ├── LeaderboardItem.tsx
    └── MyRankCard.tsx
```

**UI Design:**
```
┌─────────────────────────────────────┐
│  🏆 Partner Leaderboard             │
├─────────────────────────────────────┤
│  Your Rank: #42 of 1,234            │
│  ┌─────────────────────────────┐    │
│  │ Keep shopping! 3 more       │    │
│  │ orders to reach #35         │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  🥇 #1  Priya S.     152 orders     │
│  🥈 #2  Rahul K.     148 orders     │
│  🥉 #3  Anita M.     143 orders     │
│      #4  Vikram P.   139 orders     │
│      #5  Neha R.     135 orders     │
│  ...                                │
│      #42 You         89 orders      │
└─────────────────────────────────────┘
```

---

### 2.3 Partner Statistics Dashboard

**Problem:** `/api/partner/stats` endpoint exists but unused.

**Implementation:**
```typescript
// Add to Partner Profile page

const [stats, setStats] = useState<PartnerStats | null>(null);

useEffect(() => {
  partnerApi.getStats().then(res => {
    if (res.success) setStats(res.data);
  });
}, []);

// Display:
<StatsGrid>
  <StatCard title="Total Orders" value={stats.totalOrders} icon="bag" />
  <StatCard title="Total Spent" value={`₹${stats.totalSpent}`} icon="cash" />
  <StatCard title="Cashback Earned" value={`₹${stats.totalCashback}`} icon="gift" />
  <StatCard title="Your Rank" value={`#${stats.rank}`} icon="trophy" />
  <StatCard title="Referrals" value={stats.referralCount} icon="people" />
  <StatCard title="Reviews" value={stats.reviewCount} icon="star" />
</StatsGrid>
```

---

### 2.4 Fix Hardcoded Values

**Locations to Fix:**

1. **Referral Tier Target** (`app/referral.tsx:541`)
```typescript
// BEFORE (hardcoded)
target: 5,
nextTier: 'PRO',

// AFTER (dynamic)
target: referralTierConfig?.nextTierThreshold || stats?.nextTierRequirement || 5,
nextTier: referralTierConfig?.nextTierName || 'PRO',
```

2. **Level Cards Fallback** (`app/profile/partner.tsx:318-322`)
```typescript
// BEFORE (hardcoded fallback)
return [
  { level: 1, name: 'Partner', orders: 15, days: 44 },
  ...
];

// AFTER (fetch from API or use cached)
const cachedLevels = await AsyncStorage.getItem('partnerLevels');
if (cachedLevels) return JSON.parse(cachedLevels);
return partnerLevels; // Only as last resort
```

---

## Phase 3: Nice-to-Have Features

### 3.1 Real-time Task Progress Updates

**Implementation Options:**

**Option A: WebSocket (Recommended)**
```typescript
// services/partnerSocket.ts
const socket = io(BACKEND_URL + '/partner');

socket.on('task_progress_update', (data) => {
  dispatch({ type: 'UPDATE_TASK_PROGRESS', payload: data });
});

socket.on('milestone_achieved', (data) => {
  showNotification('Milestone Achieved!', data.milestone);
  dispatch({ type: 'MILESTONE_ACHIEVED', payload: data });
});
```

**Option B: Polling (Simpler)**
```typescript
// Poll every 30 seconds when on partner page
useEffect(() => {
  const interval = setInterval(() => {
    partnerApi.getTasks().then(updateTasks);
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

---

### 3.2 Gamification Animations

**Level Up Animation:**
```typescript
// components/animations/LevelUpCelebration.tsx
import LottieView from 'lottie-react-native';

export const LevelUpCelebration = ({ newLevel, onComplete }) => (
  <Modal visible animationType="fade">
    <View style={styles.container}>
      <LottieView
        source={require('@/assets/animations/confetti.json')}
        autoPlay
        loop={false}
        onAnimationFinish={onComplete}
      />
      <Text style={styles.title}>Congratulations!</Text>
      <Text style={styles.subtitle}>You're now {newLevel.name}!</Text>
      <View style={styles.benefitsList}>
        {newLevel.benefits.map(benefit => (
          <BenefitItem key={benefit.id} benefit={benefit} />
        ))}
      </View>
      <Button title="Awesome!" onPress={onComplete} />
    </View>
  </Modal>
);
```

---

### 3.3 Voucher Management Integration

**Problem:** Claimed offers generate vouchers but no dedicated management.

**Implementation:**
```
Files to Create:
├── app/vouchers/partner.tsx         # Partner vouchers list
└── components/voucher/
    ├── PartnerVoucherCard.tsx
    └── VoucherDetailsModal.tsx
```

**Integration with My Vouchers:**
```typescript
// In app/my-vouchers.tsx, add tab or section for Partner Vouchers
<Tab.Screen name="Partner" component={PartnerVouchers} />
```

---

## Implementation Timeline

### Week 1: Critical Fixes (Phase 1) ✅ COMPLETED
| Day | Task | Priority | Status |
|-----|------|----------|--------|
| 1-2 | Wallet-Earnings Integration & Checkout | 🔴 Critical | ✅ Done |
| 3 | Referral Dashboard Route | 🔴 Critical | ✅ Already Existed |
| 4-5 | Notification System + Level Warning | 🔴 Critical | ✅ Done |

### Week 2: High Priority (Phase 2) ✅ COMPLETED
| Day | Task | Priority | Status |
|-----|------|----------|--------|
| 1-2 | Add getStats to partnerApi | 🟡 High | ✅ Done |
| 3-4 | Partner Leaderboard UI (app/partner/leaderboard.tsx) | 🟡 Medium | ✅ Done |
| 5 | Partner Statistics Dashboard | 🟡 Medium | ✅ Done |
| 5 | Fix Hardcoded Values (referral tier targets) | 🟡 Medium | ✅ Done |

### Week 3: Polish (Phase 3) ✅ COMPLETED
| Day | Task | Priority | Status |
|-----|------|----------|--------|
| 1 | Real-time Task Updates (Polling) | 🟢 Low | ✅ Done |
| 1 | Level Up Celebration Animation | 🟢 Low | ✅ Done |
| 2 | Voucher Management Integration | 🟢 Low | ✅ Done |
| 3-5 | Testing & Bug Fixes | - | Ready for Testing |

**Phase 3 Deliverables:**
- `hooks/usePartnerProgress.ts` - Real-time polling hook with app state awareness
- `components/partner/LevelUpCelebration.tsx` - Animated celebration modal with confetti
- `components/voucher/PartnerVouchersSection.tsx` - Partner vouchers display
- Updated `app/my-vouchers.tsx` with "Partner" tab
- Updated `app/profile/partner.tsx` with RefreshControl and level-up detection

---

## File Structure After Implementation

```
frontend/
├── app/
│   ├── profile/
│   │   └── partner.tsx              # ✅ Exists (enhance with warning banner)
│   ├── referral/
│   │   ├── index.tsx                # ✅ Exists
│   │   ├── dashboard.tsx            # 🆕 NEW - Full referral dashboard
│   │   ├── leaderboard.tsx          # 🆕 NEW - Referral rankings
│   │   └── history.tsx              # 🆕 NEW - Referral history detail
│   ├── checkout.tsx                 # ✅ Exists (add wallet payment option)
│   └── partner/
│       └── leaderboard.tsx          # 🆕 NEW - Partner rankings
├── components/
│   ├── partner/
│   │   ├── LevelWarningBanner.tsx   # 🆕 NEW - Downgrade warning
│   │   ├── LeaderboardCard.tsx      # 🆕 NEW
│   │   ├── StatsGrid.tsx            # 🆕 NEW
│   │   └── EarningsCard.tsx         # 🆕 NEW - Quick earnings view
│   ├── wallet/
│   │   ├── EarningsBreakdown.tsx    # 🆕 NEW - Partner earnings detail
│   │   └── UseWalletAtCheckout.tsx  # 🆕 NEW - Checkout integration
│   ├── referral/
│   │   ├── TierProgressCard.tsx     # 🆕 NEW
│   │   └── LeaderboardList.tsx      # 🆕 NEW
│   └── notifications/
│       ├── PartnerNotifications.tsx  # 🆕 NEW - All partner notifications
│       └── LevelWarningToast.tsx     # 🆕 NEW
└── services/
    └── partnerSocket.ts             # 🆕 NEW (optional - for real-time)

user-backend/
├── src/
│   ├── models/
│   │   └── PartnerTransaction.ts    # 🆕 NEW - Real transaction tracking
│   ├── services/
│   │   └── partnerService.ts        # ✅ Exists (add level check)
│   └── routes/
│       └── partnerRoutes.ts         # ✅ Exists (add wallet integration)
```

---

## API Endpoints Summary

### Existing (Need UI)
| Endpoint | Status | Action |
|----------|--------|--------|
| `GET /api/partner/stats` | ✅ Backend Ready | Create Stats Dashboard UI |
| `GET /api/referral/leaderboard` | ✅ Backend Ready | Create Leaderboard UI |
| `POST /api/partner/payout/request` | ✅ Backend Ready | Create Withdrawal UI |

### Need to Create
| Endpoint | Purpose |
|----------|---------|
| `GET /api/partner/transactions` | Real transaction history |
| `GET /api/partner/level-status` | Check downgrade risk |
| `POST /api/partner/notifications/preferences` | Notification settings |

---

## Success Metrics

After implementation, track:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Partner Retention Rate | +20% | % of partners maintaining level |
| Payout Requests | Track | Number of withdrawal requests |
| Notification CTR | >30% | Click-through on partner notifications |
| Referral Conversion | +15% | Referrals making first order |
| Level Upgrades | Track | Users moving to higher tiers |
| Task Completion Rate | +25% | Tasks completed vs started |

---

## Quick Wins (Can Do Now)

1. **Fix Referral Dashboard 404** - Create page with stats and leaderboard
2. **Add Level Warning in Partner Profile** - Simple banner component
3. **Show Partner Stats** - Just call existing API and display
4. **Add Wallet Balance at Checkout** - Show "Use ₹X from wallet" option

---

## Questions for Product

1. **Wallet Usage:** Can wallet be partially used? (e.g., ₹500 wallet + ₹1000 card for ₹1500 order)
2. **Wallet Expiry:** Do wallet credits expire? (Suggested: 12 months)
3. **Level Reset:** Is it automatic or manual admin action?
4. **Notification Frequency:** Max notifications per day? (Suggested: 3-5)
5. **Leaderboard Visibility:** Show real names or anonymized?
6. **Minimum Order for Wallet:** Is there a minimum order value to use wallet? (Suggested: No minimum)
