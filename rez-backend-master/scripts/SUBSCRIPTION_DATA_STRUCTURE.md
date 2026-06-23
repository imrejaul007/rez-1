# Subscription Data Structure & Relationships

## 📊 Database Schema Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION                              │
├─────────────────────────────────────────────────────────────────┤
│ Core Fields                                                      │
│ ├─ _id: ObjectId                                                │
│ ├─ user: ObjectId ──────────────────────> USER Collection       │
│ ├─ tier: 'free' | 'premium' | 'vip'                            │
│ ├─ status: 'active' | 'trial' | 'grace_period' | etc.         │
│ ├─ billingCycle: 'monthly' | 'yearly'                          │
│ ├─ price: Number (₹0, ₹99, ₹299, ₹999, ₹2999)                │
│ ├─ startDate: Date                                              │
│ ├─ endDate: Date                                                │
│ ├─ autoRenew: Boolean                                           │
│ └─ paymentMethod: String                                        │
│                                                                  │
│ Trial Period (Optional)                                         │
│ └─ trialEndDate: Date                                           │
│                                                                  │
│ Razorpay Integration (Paid Tiers)                              │
│ ├─ razorpaySubscriptionId: String                              │
│ ├─ razorpayPlanId: String                                      │
│ └─ razorpayCustomerId: String                                  │
│                                                                  │
│ Benefits Object (Tier-Specific)                                │
│ ├─ cashbackMultiplier: Number (1x, 2x, 3x)                    │
│ ├─ freeDelivery: Boolean                                       │
│ ├─ prioritySupport: Boolean                                    │
│ ├─ exclusiveDeals: Boolean                                     │
│ ├─ unlimitedWishlists: Boolean                                 │
│ ├─ earlyFlashSaleAccess: Boolean                               │
│ ├─ personalShopper: Boolean                                    │
│ ├─ premiumEvents: Boolean                                      │
│ ├─ conciergeService: Boolean                                   │
│ ├─ birthdayOffer: Boolean                                      │
│ └─ anniversaryOffer: Boolean                                   │
│                                                                  │
│ Usage Stats (Tracking)                                          │
│ ├─ totalSavings: Number                                        │
│ ├─ ordersThisMonth: Number                                     │
│ ├─ ordersAllTime: Number                                       │
│ ├─ cashbackEarned: Number                                      │
│ ├─ deliveryFeesSaved: Number                                   │
│ ├─ exclusiveDealsUsed: Number                                  │
│ └─ lastUsedAt: Date                                            │
│                                                                  │
│ Grace Period Tracking                                           │
│ ├─ gracePeriodStartDate: Date                                  │
│ ├─ paymentRetryCount: Number                                   │
│ └─ lastPaymentRetryDate: Date                                  │
│                                                                  │
│ Cancellation                                                    │
│ ├─ cancellationDate: Date                                      │
│ ├─ cancellationReason: String                                  │
│ ├─ cancellationFeedback: String                                │
│ └─ reactivationEligibleUntil: Date                             │
│                                                                  │
│ Grandfathering                                                  │
│ ├─ isGrandfathered: Boolean                                    │
│ └─ grandfatheredPrice: Number                                  │
│                                                                  │
│ Upgrade/Downgrade                                               │
│ ├─ previousTier: String                                        │
│ ├─ upgradeDate: Date                                           │
│ ├─ downgradeScheduledFor: Date                                 │
│ └─ proratedCredit: Number                                      │
│                                                                  │
│ Metadata                                                        │
│ ├─ source: 'web' | 'app' | 'referral' | 'support'            │
│ ├─ campaign: String                                            │
│ └─ promoCode: String                                           │
│                                                                  │
│ Timestamps                                                      │
│ ├─ createdAt: Date                                             │
│ └─ updatedAt: Date                                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔗 Relationship Diagram

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐
│   USER   │ 1──────* │ SUBSCRIPTION │ *──────1 │ RAZORPAY    │
└──────────┘         └──────────────┘         └─────────────┘
     │                      │                        │
     │                      │                        │
  _id (PK)            user (FK)              subscriptionId
  phoneNumber          tier                    planId
  email                status                  customerId
  profile              benefits
  wallet               usage
     │                      │
     └──────────────────────┘
     User can have one
     active subscription
```

## 📦 Seeded Data Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEEDED SUBSCRIPTIONS (10)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FREE TIER (5 subscriptions)                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Sub 1: Active, 90 days old, monthly, source: app       │    │
│  │ Sub 2: Active, 45 days old, monthly, source: web       │    │
│  │ Sub 3: Active, 15 days old, monthly, source: app       │    │
│  │ Sub 4: Active, 5 days old, monthly, referral campaign  │    │
│  │ Sub 5: Active, 1 day old, monthly, source: app         │    │
│  └────────────────────────────────────────────────────────┘    │
│  Benefits: 1x cashback, standard delivery, basic features       │
│  Price: ₹0/month                                                │
│                                                                  │
│  PREMIUM TIER (3 subscriptions)                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Sub 6: Active, 60 days old, monthly, premium-launch    │    │
│  │ Sub 7: Trial, 3 days old, monthly, free-trial-2024     │    │
│  │ Sub 8: Grace Period, 180 days old, yearly, SAVE20      │    │
│  └────────────────────────────────────────────────────────┘    │
│  Benefits: 2x cashback, free delivery, priority support         │
│  Price: ₹99/month or ₹999/year                                  │
│                                                                  │
│  VIP TIER (2 subscriptions)                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Sub 9: Active, 120 days old, yearly, vip-exclusive     │    │
│  │ Sub 10: Active, 30 days old, monthly, upgrade-to-vip   │    │
│  └────────────────────────────────────────────────────────┘    │
│  Benefits: 3x cashback, concierge, personal shopper             │
│  Price: ₹299/month or ₹2999/year                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Subscription State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUBSCRIPTION LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────┘

        NEW USER
           │
           ▼
      ┌─────────┐
      │  FREE   │ ◄──────────────────────────┐
      └─────────┘                             │
           │                                  │
           │ Subscribe                        │
           ▼                                  │
      ┌─────────┐                             │
      │  TRIAL  │                             │
      └─────────┘                             │
           │                                  │
           │ 7 days expire                    │
           ▼                                  │
    ┌───────────┐                             │
    │  Payment  │                             │
    │  Required │                             │
    └───────────┘                             │
         │   │                                │
   Success│  │Failed                          │
         │   ▼                                │
         │  ┌──────────────┐                 │
         │  │ GRACE_PERIOD │                 │
         │  │   (3 days)   │                 │
         │  └──────────────┘                 │
         │        │   │                       │
         │  Success│  │Expired                │
         ▼        ▼   ▼                       │
    ┌─────────┐  ┌──────────┐                │
    │ ACTIVE  │  │ EXPIRED  │────────────────┘
    └─────────┘  └──────────┘
         │
         │ End Date
         ▼
    ┌─────────┐
    │ RENEW?  │
    └─────────┘
      Yes│  │No
         │  ▼
         │  ┌────────────┐
         │  │ CANCELLED  │
         │  └────────────┘
         │        │
         │        │ 30 days reactivation window
         │        ▼
         │  ┌──────────┐
         │  │ EXPIRED  │
         │  └──────────┘
         │
         └──────────► Back to ACTIVE
```

## 💰 Tier Comparison Matrix

```
┌──────────────────┬─────────┬──────────┬─────────┐
│    FEATURE       │  FREE   │ PREMIUM  │   VIP   │
├──────────────────┼─────────┼──────────┼─────────┤
│ Monthly Price    │   ₹0    │   ₹99    │  ₹299   │
│ Yearly Price     │   ₹0    │   ₹999   │ ₹2999   │
│ Cashback         │   1x    │   2x     │   3x    │
│ Free Delivery    │   ❌    │   ✅     │   ✅    │
│ Priority Support │   ❌    │   ✅     │   ✅    │
│ Exclusive Deals  │   ❌    │   ✅     │   ✅    │
│ Unlimited Lists  │   ❌    │   ✅     │   ✅    │
│ Early Sales      │   ❌    │   ✅     │   ✅    │
│ Personal Shopper │   ❌    │   ❌     │   ✅    │
│ Premium Events   │   ❌    │   ❌     │   ✅    │
│ Concierge        │   ❌    │   ❌     │   ✅    │
│ Birthday Offer   │   ❌    │   ✅     │   ✅    │
│ Anniversary      │   ❌    │   ❌     │   ✅    │
│ Max Savings      │   -     │ ₹3000/mo │ ₹10K/mo │
└──────────────────┴─────────┴──────────┴─────────┘
```

## 📈 Status Distribution (Seeded)

```
Total: 10 Subscriptions

Active (7):          ████████████████████████ 70%
Trial (1):           ███ 10%
Grace Period (2):    ██████ 20%

┌────────────────────────────────────────────┐
│ Status Breakdown                           │
├────────────────────────────────────────────┤
│ ✅ ACTIVE (7)                              │
│    - 5 FREE tier                           │
│    - 1 PREMIUM tier                        │
│    - 1 VIP tier                            │
│                                            │
│ 🎁 TRIAL (1)                               │
│    - 1 PREMIUM tier                        │
│    - 7-day trial period                    │
│    - 4 days remaining                      │
│                                            │
│ ⏰ GRACE_PERIOD (2)                        │
│    - 2 PREMIUM tier                        │
│    - 3-day grace period                    │
│    - 2 payment retry attempts              │
│    - 1 day remaining                       │
└────────────────────────────────────────────┘
```

## 🔄 Billing Cycle Distribution

```
Monthly (7):  ██████████████████████ 70%
Yearly (3):   █████████ 30%

┌────────────────────────────────────────────┐
│ Billing Breakdown                          │
├────────────────────────────────────────────┤
│ 📅 MONTHLY (7)                             │
│    - All 5 FREE subscriptions              │
│    - 1 PREMIUM subscription                │
│    - 1 VIP subscription                    │
│                                            │
│ 📅 YEARLY (3)                              │
│    - 2 PREMIUM subscriptions               │
│    - 1 VIP subscription                    │
│    - 16% discount applied                  │
└────────────────────────────────────────────┘
```

## 🎨 Benefits Distribution by Tier

```
FREE TIER BENEFITS:
┌────────────────────────────────────────────┐
│ • Cashback: 1x multiplier                  │
│ • Delivery: Standard rates apply           │
│ • Support: Standard queue                  │
│ • Deals: Regular offers only               │
│ • Wishlists: Limited to 5                  │
│ • Flash Sales: General access              │
└────────────────────────────────────────────┘

PREMIUM TIER BENEFITS:
┌────────────────────────────────────────────┐
│ • Cashback: 2x multiplier                  │
│ • Delivery: FREE on select stores          │
│ • Support: Priority queue                  │
│ • Deals: Exclusive premium offers          │
│ • Wishlists: Unlimited                     │
│ • Flash Sales: Early access (1hr before)   │
│ • Birthday: Special offers                 │
└────────────────────────────────────────────┘

VIP TIER BENEFITS:
┌────────────────────────────────────────────┐
│ • Cashback: 3x multiplier                  │
│ • Delivery: FREE on all stores             │
│ • Support: VIP priority queue              │
│ • Deals: Exclusive VIP offers              │
│ • Wishlists: Unlimited                     │
│ • Flash Sales: Earliest access (2hr)       │
│ • Birthday: Special offers + gift          │
│ • Anniversary: Special celebration         │
│ • Personal Shopper: Dedicated assistant    │
│ • Premium Events: Exclusive invites        │
│ • Concierge: 24/7 dedicated service        │
└────────────────────────────────────────────┘
```

## 📊 Usage Stats Tracking

```
┌────────────────────────────────────────────┐
│ USAGE STATISTICS (per subscription)        │
├────────────────────────────────────────────┤
│ totalSavings         │ ₹0 → ₹50,000+      │
│ ordersThisMonth      │ 0 → 100+            │
│ ordersAllTime        │ 0 → 1000+           │
│ cashbackEarned       │ ₹0 → ₹10,000+      │
│ deliveryFeesSaved    │ ₹0 → ₹5,000+       │
│ exclusiveDealsUsed   │ 0 → 50+             │
│ lastUsedAt           │ Date or null        │
└────────────────────────────────────────────┘

All seeded subscriptions start with zeros.
Stats update as orders are placed.
```

## 🔐 Razorpay Integration

```
FREE TIER:
┌────────────────────────────────────────────┐
│ No Razorpay integration required           │
│ ✗ razorpaySubscriptionId: null             │
│ ✗ razorpayPlanId: null                     │
│ ✗ razorpayCustomerId: null                 │
└────────────────────────────────────────────┘

PREMIUM & VIP TIERS:
┌────────────────────────────────────────────┐
│ Full Razorpay integration                  │
│ ✓ razorpaySubscriptionId: sub_XXXXX       │
│ ✓ razorpayPlanId: plan_XXXXX              │
│ ✓ razorpayCustomerId: cust_XXXXX          │
│                                            │
│ Mock IDs generated for seeded data         │
│ Format: prefix_randomstring                │
└────────────────────────────────────────────┘
```

## 📁 File Structure

```
user-backend/
├── src/
│   └── models/
│       ├── Subscription.ts ──────► Model Definition
│       └── User.ts ──────────────► User Model (FK)
│
├── scripts/
│   ├── seedSubscriptions.ts ─────► Main Seed Script
│   ├── README_SUBSCRIPTION_SEEDING.md ──► Full Docs
│   ├── SUBSCRIPTION_QUICK_START.md ─────► Quick Guide
│   ├── SUBSCRIPTION_SEED_SUMMARY.md ────► Summary
│   └── SUBSCRIPTION_DATA_STRUCTURE.md ──► This File
│
└── package.json ─────────────────► npm scripts
```

## 🧪 Testing Flow

```
1. SEED DATA
   └─► npm run seed:subscriptions

2. VERIFY IN MONGODB
   └─► db.subscriptions.find().pretty()

3. TEST APIS
   ├─► GET /api/subscriptions/user/:userId
   ├─► GET /api/subscriptions/tiers
   ├─► POST /api/subscriptions/subscribe
   ├─► POST /api/subscriptions/upgrade
   └─► POST /api/subscriptions/cancel

4. TEST METHODS
   ├─► subscription.isActive()
   ├─► subscription.getRemainingDays()
   ├─► subscription.calculateROI()
   └─► Subscription.getTierConfig('premium')

5. TEST LIFECYCLE
   ├─► Trial → Active conversion
   ├─► Grace period → Active recovery
   ├─► Upgrade/Downgrade flows
   └─► Cancellation & Reactivation
```

## 🎯 Key Model Methods

```typescript
// INSTANCE METHODS
subscription.isActive(): boolean
subscription.isInTrial(): boolean
subscription.isInGracePeriod(): boolean
subscription.canUpgrade(): boolean
subscription.canDowngrade(): boolean
subscription.calculateROI(): number
subscription.getRemainingDays(): number

// STATIC METHODS
Subscription.getTierConfig(tier): TierConfig
Subscription.calculateProratedAmount(...): number

// VIRTUAL PROPERTIES
subscription.daysRemaining: number
```

## 📝 Sample Document

```json
{
  "_id": "ObjectId(...)",
  "user": "ObjectId(...)",
  "tier": "premium",
  "status": "active",
  "billingCycle": "monthly",
  "price": 99,
  "startDate": "2024-09-01T00:00:00.000Z",
  "endDate": "2024-10-01T00:00:00.000Z",
  "autoRenew": true,
  "paymentMethod": "razorpay",

  "razorpaySubscriptionId": "sub_abc123xyz789",
  "razorpayPlanId": "plan_def456uvw012",
  "razorpayCustomerId": "cust_ghi789rst345",

  "benefits": {
    "cashbackMultiplier": 2,
    "freeDelivery": true,
    "prioritySupport": true,
    "exclusiveDeals": true,
    "unlimitedWishlists": true,
    "earlyFlashSaleAccess": true,
    "personalShopper": false,
    "premiumEvents": false,
    "conciergeService": false,
    "birthdayOffer": true,
    "anniversaryOffer": false
  },

  "usage": {
    "totalSavings": 0,
    "ordersThisMonth": 0,
    "ordersAllTime": 0,
    "cashbackEarned": 0,
    "deliveryFeesSaved": 0,
    "exclusiveDealsUsed": 0
  },

  "paymentRetryCount": 0,
  "isGrandfathered": false,
  "proratedCredit": 0,

  "metadata": {
    "source": "web",
    "campaign": "premium-launch"
  },

  "createdAt": "2024-09-01T00:00:00.000Z",
  "updatedAt": "2024-09-01T00:00:00.000Z"
}
```

---

**Documentation Version:** 1.0.0
**Last Updated:** 2025-01-XX
**Status:** Production Ready ✅
