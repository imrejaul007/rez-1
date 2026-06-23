# REFERRAL DATABASE SCHEMA - VISUAL GUIDE

## Quick Reference Diagrams

### 1. ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REFERRAL SYSTEM ERD                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │         USERS            │
                    ├──────────────────────────┤
                    │ _id (PK)                 │
                    │ phoneNumber (UNIQUE)     │
                    │ email (UNIQUE, SPARSE)   │
                    │ referral: {              │
                    │   referralCode (UNIQUE)  │◄────┐
                    │   referredBy             │     │
                    │   totalReferrals         │     │
                    │   referralEarnings       │     │
                    │ }                        │     │
                    │ referralTier             │     │
                    │ walletBalance            │     │
                    │ isPremium                │     │
                    └────────────┬─────────────┘     │
                                 │                   │
                                 │ 1:1               │
                                 │                   │
                    ┌────────────▼─────────────┐     │
                    │        WALLETS           │     │
                    ├──────────────────────────┤     │
                    │ _id (PK)                 │     │
                    │ user (FK → users._id)    │     │
                    │ balance: {               │     │
                    │   total                  │     │
                    │   available              │     │
                    │   locked                 │     │
                    │ }                        │     │
                    │ statistics: {            │     │
                    │   totalEarned            │     │
                    │   referralEarnings       │     │
                    │ }                        │     │
                    └──────────────────────────┘     │
                                                     │
                    ┌─────────────────────────┐      │
                    │      REFERRALS          │      │
                    ├─────────────────────────┤      │
                    │ _id (PK)                │      │
              ┌────►│ referrer (FK → users)   │      │
              │     │ referee (FK → users)    │──────┘
              │     │ referralCode            │
              │     │ status (ENUM)           │
              │     │ tier                    │
              │     │ rewards: {              │
              │     │   referrerAmount        │
              │     │   refereeDiscount       │
              │     │   milestoneBonus        │
              │     │   voucherCode           │
              │     │ }                       │
              │     │ referrerRewarded        │
              │     │ refereeRewarded         │
              │     │ milestoneRewarded       │
              │     │ expiresAt               │
              │     │ metadata: { ... }       │
              │     └──────────┬──────────────┘
              │                │
              │                │ 1:N
              │                │
              │     ┌──────────▼──────────────┐
              │     │     TRANSACTIONS        │
              │     ├─────────────────────────┤
              │     │ _id (PK)                │
              │     │ transactionId (UNIQUE)  │
              └─────┤ user (FK → users)       │
                    │ type (credit/debit)     │
                    │ amount                  │
                    │ source: {               │
                    │   type: 'referral'      │
                    │   reference (FK)        │
                    │ }                       │
                    │ balanceBefore           │
                    │ balanceAfter            │
                    └─────────────────────────┘

         ┌──────────────────────────────────────────┐
         │  RELATIONSHIPS SUMMARY                   │
         ├──────────────────────────────────────────┤
         │  User ←→ Wallet           = 1:1         │
         │  User → Referral          = 1:N         │
         │  User ← Referral          = 1:N         │
         │  User → Transaction       = 1:N         │
         │  Referral → Transaction   = 1:N         │
         └──────────────────────────────────────────┘
```

---

### 2. REFERRAL LIFECYCLE STATE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REFERRAL STATUS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   START     │
    └──────┬──────┘
           │
           │ User A shares referral code
           │
           ▼
    ┌─────────────┐
    │   PENDING   │◄──────────────┐
    └──────┬──────┘               │
           │                      │ 90 days pass
           │ User B signs up      │ without order
           │                      │
           ▼                      │
    ┌─────────────┐          ┌────────────┐
    │ REGISTERED  │          │  EXPIRED   │
    └──────┬──────┘          └────────────┘
           │                      ▲
           │ User B places        │
           │ first order (≥₹500)  │
           │                      │
           ▼                      │
    ┌─────────────┐               │
    │   ACTIVE    │───────────────┘
    └──────┬──────┘
           │
           │ Order delivered
           │ Rewards credited
           │
           ▼
    ┌─────────────┐
    │  QUALIFIED  │
    └──────┬──────┘
           │
           │ All milestones
           │ completed
           │
           ▼
    ┌─────────────┐
    │  COMPLETED  │
    └─────────────┘


    ┌────────────────────────────────────────┐
    │  REWARD DISTRIBUTION TIMELINE          │
    ├────────────────────────────────────────┤
    │                                        │
    │  T+0:  Referee signs up → PENDING     │
    │  T+1:  First order → ACTIVE           │
    │  T+2:  Order delivered → QUALIFIED    │
    │        ├─ Referee: ₹50 discount      │
    │        └─ Referrer: ₹50 credited     │
    │  T+3:  3rd order completed            │
    │        └─ Referrer: ₹20 bonus        │
    │  T+∞:  All rewards → COMPLETED        │
    │                                        │
    └────────────────────────────────────────┘
```

---

### 3. TIER PROGRESSION DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REFERRAL TIER SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    Qualified Referrals
          0         5        10        20                    50
          │─────────│─────────│─────────│─────────────────────│
          │         │         │         │                     │
          ▼         ▼         ▼         ▼                     ▼

    ┌──────────┐ ┌─────────┐ ┌────────┐ ┌───────────┐ ┌────────────┐
    │ STARTER  │ │   PRO   │ │  ELITE │ │ CHAMPION  │ │   LEGEND   │
    └──────────┘ └─────────┘ └────────┘ └───────────┘ └────────────┘

    Per Referral:  ₹50      ₹100       ₹150        ₹200          ₹300

    Tier Bonus:     -        ₹500      ₹1000       ₹2000         ₹5000

    Voucher:        -         -      ₹200 Amazon  ₹1000 Amazon  ₹5000 Amazon

    Premium:        -         -          -            -         Lifetime ✨


┌────────────────────────────────────────────────────────────────────────────┐
│                        TIER BENEFITS MATRIX                                │
├──────────┬─────────┬──────────┬──────────┬──────────┬─────────────────────┤
│   TIER   │ NEEDED  │ PER REF  │  BONUS   │ VOUCHER  │      EXTRAS        │
├──────────┼─────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ STARTER  │    0    │   ₹50    │    -     │    -     │ Basic rewards      │
│ PRO      │    5    │  ₹100    │  ₹500    │    -     │ Priority support   │
│ ELITE    │   10    │  ₹150    │  ₹1000   │  ₹200    │ Exclusive deals    │
│ CHAMPION │   20    │  ₹200    │  ₹2000   │ ₹1000    │ VIP badge          │
│ LEGEND   │   50    │  ₹300    │  ₹5000   │ ₹5000    │ Lifetime Premium ⭐│
└──────────┴─────────┴──────────┴──────────┴──────────┴─────────────────────┘

    Example Progression:

    User starts at STARTER (0 referrals)
              ↓ refers 5 friends
    Upgraded to PRO
    • ₹500 bonus credited instantly
    • Now earns ₹100 per new referral (up from ₹50)
              ↓ refers 5 more (total: 10)
    Upgraded to ELITE
    • ₹1000 bonus credited
    • ₹200 Amazon voucher
    • Earns ₹150 per referral
              ↓ continues...
```

---

### 4. INDEX STRUCTURE VISUALIZATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INDEX ARCHITECTURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    REFERRALS COLLECTION

    ┌─────────────────────────────────────────┐
    │  Single Field Indexes (Fast Lookups)   │
    ├─────────────────────────────────────────┤
    │  • referrer: 1                          │  ◄─── Find all my referrals
    │  • referee: 1                           │  ◄─── Check if I was referred
    │  • referralCode: 1                      │  ◄─── Validate code on signup
    │  • status: 1                            │  ◄─── Filter by status
    │  • expiresAt: 1                         │  ◄─── Find expired referrals
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │  Compound Indexes (Multi-field Queries) │
    ├─────────────────────────────────────────┤
    │  • { referrer: 1, status: 1 }           │  ◄─── My active referrals
    │  • { referee: 1, status: 1 }            │  ◄─── Referee status check
    │  • { status: 1, expiresAt: 1 }          │  ◄─── Cron: expire old refs
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │  Recommended Additional Indexes         │
    ├─────────────────────────────────────────┤
    │  • { status: 1, tier: 1, completedAt: -1 }         ◄─── Analytics
    │  • { metadata.ipAddress: 1, createdAt: -1 }        ◄─── Fraud detect
    │  • { createdAt: -1, status: 1 }                    ◄─── Time-series
    └─────────────────────────────────────────┘


    USERS COLLECTION

    ┌─────────────────────────────────────────┐
    │  Referral-Related Indexes               │
    ├─────────────────────────────────────────┤
    │  • referral.referralCode: 1             │  ◄─── Code validation (unique)
    │  • referral.referredBy: 1               │  ◄─── Find who referred user
    │  • referralTier: 1                      │  ◄─── Filter by tier
    │  • { referral.totalReferrals: -1,       │
    │      referral.referralEarnings: -1 }    │  ◄─── Leaderboard query
    └─────────────────────────────────────────┘


    TRANSACTIONS COLLECTION

    ┌─────────────────────────────────────────┐
    │  Referral Transaction Indexes           │
    ├─────────────────────────────────────────┤
    │  • { user: 1, createdAt: -1 }           │  ◄─── User transaction history
    │  • { source.type: 1, source.reference: 1 } ◄─── Find by referral ID
    │  • transactionId: 1                     │  ◄─── Lookup by ID (unique)
    └─────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐
    │  INDEX PERFORMANCE METRICS               │
    ├──────────────────────────────────────────┤
    │  Total Indexes: 15                       │
    │  Index Size: ~5-10% of data              │
    │  Index Hit Rate: 95%                     │
    │  Query Time: 15ms avg (with indexes)     │
    │  Query Time: 500ms+ avg (without)        │
    └──────────────────────────────────────────┘
```

---

### 5. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REFERRAL CREATION & REWARD FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

    1. REFERRAL CODE GENERATION
    ═════════════════════════════

    User A (Referrer)
         │
         │ GET /api/referral/code
         │
         ▼
    ┌─────────────┐
    │  Backend    │──► Check user.referral.referralCode
    └─────────────┘    │
         │             │ If exists → Return
         │             │ If not → Generate (e.g., REZ123ABC)
         ▼             │
    ┌─────────────┐    │
    │    User     │◄───┘
    │  Document   │    Update referral.referralCode
    └─────────────┘
         │
         ▼
    Return: { code: "REZ123ABC", link: "https://app.rez.com/invite/REZ123ABC" }


    2. REFEREE SIGNUP WITH CODE
    ════════════════════════════

    User B (Referee)
         │
         │ POST /api/auth/register
         │ Body: { phone, referralCode: "REZ123ABC" }
         │
         ▼
    ┌─────────────┐
    │  Backend    │──► Validate code exists
    └─────────────┘    │
         │             │ Find User A by referralCode
         │             │
         ▼             ▼
    ┌─────────────┐ ┌──────────────┐
    │   User B    │ │  Referral    │
    │   Created   │ │  Document    │
    └─────────────┘ └──────────────┘
                      • referrer: User A
                      • referee: User B
                      • status: PENDING
                      • expiresAt: now + 90 days


    3. FIRST ORDER & REWARD DISTRIBUTION
    ═════════════════════════════════════

    User B places order ≥₹500
         │
         │ Order delivered
         │
         ▼
    ┌─────────────┐
    │   Order     │
    │  Webhook    │──► POST /api/webhooks/order-completed
    └─────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │  referralService.processFirstOrder()        │
    ├─────────────────────────────────────────────┤
    │                                             │
    │  1. Find referral (referee: User B)         │
    │                                             │
    │  2. Update referral:                        │
    │     • status → ACTIVE                       │
    │     • refereeRewarded = true                │
    │     • metadata.refereeFirstOrder = {...}    │
    │                                             │
    │  3. Credit User A (referrer):               │
    │     ┌───────────────────────────────┐       │
    │     │ wallet.balance += ₹50         │       │
    │     │ referral.referralEarnings += ₹50│      │
    │     └───────────────────────────────┘       │
    │                                             │
    │  4. Create transaction:                     │
    │     ┌───────────────────────────────┐       │
    │     │ type: 'credit'                │       │
    │     │ amount: 50                    │       │
    │     │ source: { type: 'referral' }  │       │
    │     └───────────────────────────────┘       │
    │                                             │
    │  5. Check if completed:                     │
    │     if (referrerRewarded && refereeRewarded)│
    │       status → COMPLETED                    │
    │                                             │
    └─────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────┐
    │ Send Push   │──► "Your friend completed their first order!
    │ Notification│     ₹50 has been credited to your wallet"
    └─────────────┘


    4. MILESTONE BONUS (3rd Order)
    ═══════════════════════════════

    User B completes 3rd order
         │
         ▼
    referralService.processMilestoneBonus()
         │
         ├─► Check: orderCount === 3?
         │
         ├─► Find referral (milestoneRewarded = false)
         │
         ├─► Credit User A: wallet += ₹20
         │
         ├─► Create transaction (milestone_3)
         │
         └─► Update: milestoneRewarded = true
```

---

### 6. TIER UPGRADE FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TIER UPGRADE SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    AUTOMATIC CHECK (On Referral Completion)
    ═════════════════════════════════════════

    Referral status → COMPLETED
              │
              ▼
    ┌──────────────────────────────┐
    │ referralTierService.         │
    │ checkTierUpgrade(userId)     │
    └──────────────────────────────┘
              │
              ├─► Count qualified referrals
              │
              │   SELECT COUNT(*) FROM referrals
              │   WHERE referrer = userId
              │   AND status IN ('qualified', 'completed')
              │
              ▼
    ┌──────────────────────────────┐
    │ Calculate new tier            │
    ├──────────────────────────────┤
    │  0-4   → STARTER              │
    │  5-9   → PRO                  │
    │  10-19 → ELITE                │
    │  20-49 → CHAMPION             │
    │  50+   → LEGEND               │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │ Compare with current tier     │
    │ (stored in user.referralTier) │
    └──────────────────────────────┘
              │
              ├───► Same tier? → Exit
              │
              └───► Upgraded? → Continue

              ▼
    ┌──────────────────────────────┐
    │ Award tier rewards            │
    ├──────────────────────────────┤
    │                              │
    │  1. Tier Bonus Coins         │
    │     wallet += tierBonus      │
    │                              │
    │  2. Voucher (if applicable)  │
    │     Generate voucher code    │
    │     Store in user rewards    │
    │                              │
    │  3. Premium Access (LEGEND)  │
    │     isPremium = true         │
    │     premiumExpiresAt = ∞     │
    │                              │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │ Update user document          │
    │ • referralTier = newTier      │
    │ • walletBalance updated       │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │ Send celebration notification │
    │ "Congratulations! You're now  │
    │  a PRO member! ₹500 bonus    │
    │  credited to your wallet"     │
    └──────────────────────────────┘


    MANUAL CHECK (User Dashboard)
    ══════════════════════════════

    User opens referral page
              │
              ▼
    GET /api/referral/tier
              │
              ▼
    ┌──────────────────────────────┐
    │ Return current tier info:     │
    ├──────────────────────────────┤
    │ {                            │
    │   currentTier: "PRO",        │
    │   qualifiedReferrals: 7,     │
    │   nextTier: "ELITE",         │
    │   progress: 40%,             │
    │   referralsNeeded: 3         │
    │ }                            │
    └──────────────────────────────┘
              │
              ▼
    Display progress bar:

    PRO ████████░░░░░░░░░░ 40% → ELITE
        7/10 referrals (3 more needed)
```

---

### 7. ANALYTICS AGGREGATION PIPELINE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REFERRAL ANALYTICS QUERIES                                │
└─────────────────────────────────────────────────────────────────────────────┘

    1. LEADERBOARD QUERY
    ════════════════════

    db.referrals.aggregate([

      // Stage 1: Filter qualified referrals
      {
        $match: {
          status: { $in: ['qualified', 'completed'] }
        }
      },

      // Stage 2: Group by referrer
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 },
          lifetimeEarnings: {
            $sum: {
              $add: [
                '$rewards.referrerAmount',
                { $ifNull: ['$rewards.milestoneBonus', 0] }
              ]
            }
          }
        }
      },

      // Stage 3: Sort by referral count
      {
        $sort: { totalReferrals: -1 }
      },

      // Stage 4: Limit to top 100
      {
        $limit: 100
      },

      // Stage 5: Join with users
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },

      // Stage 6: Format output
      {
        $project: {
          rank: { $add: [{ $indexOfArray: ['$$ROOT', '$_id'] }, 1] },
          userId: '$_id',
          username: { $arrayElemAt: ['$user.profile.firstName', 0] },
          totalReferrals: 1,
          lifetimeEarnings: 1,
          tier: { $arrayElemAt: ['$user.referralTier', 0] }
        }
      }
    ])

    Output:
    [
      { rank: 1, userId: "...", username: "John", totalReferrals: 156, earnings: 23400, tier: "LEGEND" },
      { rank: 2, userId: "...", username: "Sarah", totalReferrals: 89, earnings: 13350, tier: "CHAMPION" },
      ...
    ]


    2. CONVERSION FUNNEL
    ════════════════════

    db.referrals.aggregate([

      // Group by status
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },

      // Format as funnel
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ])

    Visualization:

    PENDING     ████████████████████████████ 5000 (100%)
                     ↓
    REGISTERED  ██████████████████████ 3500 (70%)  ← 30% drop-off
                     ↓
    ACTIVE      ███████████████ 2625 (52.5%)       ← 25% drop-off
                     ↓
    QUALIFIED   ██████████ 1575 (31.5%)            ← 40% drop-off
                     ↓
    COMPLETED   ████ 1260 (25.2%)                  ← 20% drop-off


    3. TIME-SERIES ANALYSIS (Daily Referrals)
    ══════════════════════════════════════════

    db.referrals.aggregate([

      // Filter last 30 days
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },

      // Group by day
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalReferrals: { $sum: 1 },
          qualifiedReferrals: {
            $sum: {
              $cond: [
                { $in: ['$status', ['qualified', 'completed']] },
                1,
                0
              ]
            }
          }
        }
      },

      // Sort by date
      {
        $sort: { _id: 1 }
      }
    ])

    Chart:

    Referrals/Day
    200 ┤                                    ╭─╮
        │                               ╭────╯ ╰─╮
    150 ┤                          ╭────╯        │
        │                     ╭────╯             │
    100 ┤                ╭────╯                  ╰─╮
        │           ╭────╯                          ╰─╮
     50 ┤      ╭────╯                                 ╰──╮
        │ ─────╯                                         ╰──
      0 └┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴┴
        Jan 1    Jan 8    Jan 15   Jan 22   Jan 29


    4. TIER DISTRIBUTION
    ════════════════════

    db.users.aggregate([

      {
        $group: {
          _id: '$referralTier',
          count: { $sum: 1 }
        }
      }
    ])

    Pie Chart:

                STARTER (70%)
              ╱──────────────╲
            ╱                  ╲
          ╱                      ╲
        ╱          ◉◉◉             ╲
       │         ◉◉◉◉◉             │
       │       ◉◉◉◉◉◉◉             │ PRO (15%)
       │      ◉◉◉◉◉◉◉◉             │
       │       ◉◉◉◉◉               │
        ╲          ◉            ELITE (8%)
          ╲                      ╱
            ╲                  ╱ CHAMPION (5%)
              ╲──────────────╱
                LEGEND (2%)
```

---

### 8. FRAUD DETECTION SYSTEM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FRAUD DETECTION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    New Referral Created
            │
            ▼
    ┌────────────────────────────────────┐
    │  detectFraud(referral)             │
    └────────────────────────────────────┘
            │
            ├─────────────────────────────────┐
            │                                 │
            ▼                                 ▼
    ┌─────────────────┐            ┌──────────────────┐
    │ Check 1:        │            │ Check 2:         │
    │ Same IP?        │            │ High Velocity?   │
    │                 │            │                  │
    │ Referrer IP ==  │            │ >10 referrals    │
    │ Referee IP?     │            │ in 24 hours?     │
    └─────────────────┘            └──────────────────┘
            │                                 │
            │ Match? → FLAG: SAME_IP         │ Yes? → FLAG: HIGH_VELOCITY
            │                                 │
            ▼                                 ▼
    ┌─────────────────┐            ┌──────────────────┐
    │ Check 3:        │            │ Check 4:         │
    │ Email Alias?    │            │ Device Reuse?    │
    │                 │            │                  │
    │ Contains '+'?   │            │ Same deviceId    │
    │ (e.g., a+1@..)  │            │ multiple refs?   │
    └─────────────────┘            └──────────────────┘
            │                                 │
            │ Yes? → FLAG: EMAIL_ALIAS       │ Yes? → FLAG: DEVICE_REUSE
            │                                 │
            └─────────────┬───────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │  Aggregate Flags             │
            │                              │
            │  flags = [                   │
            │    'SAME_IP',                │
            │    'DEVICE_REUSE'            │
            │  ]                           │
            └──────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │  flags.length >= 2?          │
            └──────────────────────────────┘
                    │           │
                   Yes          No
                    │           │
                    ▼           ▼
        ┌──────────────────┐  ┌─────────────┐
        │ Mark for Review  │  │ Allow       │
        │                  │  │             │
        │ • Save flags     │  │ (Normal     │
        │ • Block reward   │  │  referral)  │
        │ • Notify admin   │  │             │
        └──────────────────┘  └─────────────┘


    FRAUD SCORE CALCULATION
    ═══════════════════════

    flags = []
    score = 0

    if (same_ip)          score += 40
    if (high_velocity)    score += 30
    if (email_alias)      score += 20
    if (device_reuse)     score += 40
    if (vpn_detected)     score += 25
    if (multiple_phones)  score += 35

    ┌─────────────────────────────────────┐
    │  FRAUD RISK LEVELS                  │
    ├─────────────────────────────────────┤
    │  0-30:   Low risk → Auto-approve    │
    │  31-60:  Medium → Flag for review   │
    │  61-100: High → Auto-block          │
    └─────────────────────────────────────┘
```

---

### 9. SCALABILITY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HORIZONTAL SCALING STRATEGY                               │
└─────────────────────────────────────────────────────────────────────────────┘

    CURRENT (0-10M referrals)
    ═════════════════════════

                        ┌─────────────────┐
                        │   Application   │
                        │     Servers     │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    MongoDB      │
                        │   (Single Node) │
                        │                 │
                        │  • 16GB RAM     │
                        │  • 100GB SSD    │
                        └─────────────────┘


    PHASE 2 (10-50M referrals)
    ══════════════════════════

                        ┌─────────────────┐
                        │   Application   │
                        │     Servers     │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │    PRIMARY      │───────│    REPLICA 1    │
          │                 │       │                 │
          │  • Writes only  │       │  • Reads only   │
          │  • Indexing     │       │  • Analytics    │
          └─────────────────┘       └─────────────────┘
                                             │
                                             │
                                    ┌─────────────────┐
                                    │    REPLICA 2    │
                                    │                 │
                                    │  • Reads only   │
                                    │  • Backup       │
                                    └─────────────────┘

          Read/Write Split:
          • User queries → Replicas (90% of traffic)
          • Mutations → Primary (10% of traffic)
          • Analytics → Replica 2 (heavy queries)


    PHASE 3 (50M+ referrals)
    ════════════════════════

                        ┌─────────────────┐
                        │   Application   │
                        │     Cluster     │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │   SHARD 1       │       │   SHARD 2       │
          │  (Users A-M)    │       │  (Users N-Z)    │
          │                 │       │                 │
          │  referrer:      │       │  referrer:      │
          │  ObjectId(A-M)  │       │  ObjectId(N-Z)  │
          └─────────────────┘       └─────────────────┘
                    │                         │
         ┌──────────┴──────────┐   ┌─────────┴──────────┐
         │                     │   │                    │
         ▼                     ▼   ▼                    ▼
    ┌────────┐         ┌────────┐ ┌────────┐    ┌────────┐
    │Primary │         │Replica │ │Primary │    │Replica │
    └────────┘         └────────┘ └────────┘    └────────┘

          Shard Key: { referrer: 1, _id: 1 }

          Benefits:
          • Linear scaling (add more shards)
          • All user's referrals on same shard
          • Parallel query execution

          Capacity: 100M+ referrals


    CACHING LAYER
    ═════════════

    ┌─────────────────────────────────────────────────┐
    │               Redis Cluster                     │
    ├─────────────────────────────────────────────────┤
    │                                                 │
    │  Cached Data:                                   │
    │  • User referral stats (TTL: 5 min)             │
    │  • Leaderboard (TTL: 1 hour)                    │
    │  • Tier info (TTL: 30 min)                      │
    │  • Valid referral codes (TTL: 1 hour)           │
    │                                                 │
    │  Cache Hit Rate: ~75%                           │
    │  Reduces DB load by: 3x                         │
    └─────────────────────────────────────────────────┘
              ▲                           │
              │ Cache miss                │ Cache hit (fast!)
              │                           │
        ┌─────┴──────────┐               ▼
        │   MongoDB      │         ┌──────────────┐
        │   (Backend)    │         │ Application  │
        └────────────────┘         └──────────────┘
```

---

## QUICK LOOKUP TABLES

### Status Codes Reference

| Status | Code | Description | Reward State |
|--------|------|-------------|--------------|
| PENDING | 0 | Referee signed up, no order yet | None |
| REGISTERED | 1 | Referee account created | None |
| ACTIVE | 2 | Referee placed first order | Reward credited |
| QUALIFIED | 3 | Order delivered, all criteria met | Complete |
| COMPLETED | 4 | All milestones done | All rewards given |
| EXPIRED | 5 | 90 days passed, no completion | None |

### Tier Thresholds

| Tier | Min Referrals | Per Referral | Tier Bonus | Voucher | Premium |
|------|---------------|--------------|------------|---------|---------|
| STARTER | 0 | ₹50 | - | - | - |
| PRO | 5 | ₹100 | ₹500 | - | - |
| ELITE | 10 | ₹150 | ₹1,000 | ₹200 | - |
| CHAMPION | 20 | ₹200 | ₹2,000 | ₹1,000 | - |
| LEGEND | 50 | ₹300 | ₹5,000 | ₹5,000 | ✅ |

### Collection Sizes (Estimated)

| Collection | Avg Doc Size | 1M Users | 10M Users | 100M Users |
|------------|--------------|----------|-----------|------------|
| referrals | 1.5KB | 750MB | 7.5GB | 75GB |
| users | 3KB | 3GB | 30GB | 300GB |
| transactions | 500B | 250MB | 2.5GB | 25GB |
| wallets | 800B | 400MB | 4GB | 40GB |
| **Total** | - | **4.4GB** | **44GB** | **440GB** |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Status**: Production Reference Guide
