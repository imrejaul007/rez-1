# REFERRAL DATABASE - QUICK REFERENCE CARD

**For Developers**: Quick lookup guide for database operations

---

## 🔍 COLLECTIONS AT A GLANCE

### referrals
```javascript
{
  referrer: ObjectId,        // Who shared
  referee: ObjectId,         // Who signed up
  referralCode: String,      // Code used
  status: String,            // pending/active/qualified/completed/expired
  tier: String,              // STARTER/PRO/ELITE/CHAMPION/LEGEND
  rewards: {
    referrerAmount: 50,      // ₹ for referrer
    refereeDiscount: 50,     // ₹ discount for referee
    milestoneBonus: 20       // ₹ after 3rd order
  },
  expiresAt: Date,           // 90 days from creation
  metadata: { ... }
}
```

### users.referral
```javascript
{
  referralCode: "REZ123ABC",    // Unique code
  referredBy: "REZ456DEF",      // Who referred me
  totalReferrals: 15,           // Count
  referralEarnings: 1250        // Total ₹ earned
}
```

---

## 📋 COMMON QUERIES

### Get User's Referral Stats
```javascript
const stats = await referralService.getReferralStats(userId)
// Returns: { totalReferrals, completedReferrals, totalEarnings, ... }
```

### Get Referral History
```javascript
const history = await Referral.find({ referrer: userId })
  .populate('referee', 'phoneNumber profile.firstName')
  .sort({ createdAt: -1 })
```

### Check if User Was Referred
```javascript
const referral = await Referral.findOne({
  referee: userId
})
```

### Validate Referral Code
```javascript
const user = await User.findOne({
  'referral.referralCode': code
})
```

### Get Leaderboard
```javascript
const topReferrers = await User.find({
  'referral.totalReferrals': { $gt: 0 }
})
  .sort({ 'referral.totalReferrals': -1 })
  .limit(100)
```

---

## 🔄 STATUS FLOW

```
PENDING → REGISTERED → ACTIVE → QUALIFIED → COMPLETED
                           ↓
                       EXPIRED
```

**Triggers**:
- **PENDING**: User signs up with code
- **REGISTERED**: Account verified
- **ACTIVE**: First order placed (≥₹500)
- **QUALIFIED**: Order delivered, rewards credited
- **COMPLETED**: All milestones done
- **EXPIRED**: 90 days passed without completion

---

## 💰 REWARD AMOUNTS

| Event | Referrer Gets | Referee Gets | Condition |
|-------|---------------|--------------|-----------|
| Signup | ₹0 | ₹0 | Just signed up |
| First Order | ₹50-300* | ₹50 discount | Order ≥₹500 |
| 3rd Order | ₹20 bonus | - | Milestone |
| Tier Upgrade | ₹500-5000** | - | Reach tier |

*Amount depends on tier (STARTER: ₹50, PRO: ₹100, ELITE: ₹150, CHAMPION: ₹200, LEGEND: ₹300)
**Tier bonus (PRO: ₹500, ELITE: ₹1000, CHAMPION: ₹2000, LEGEND: ₹5000)

---

## 🎯 TIER THRESHOLDS

```
0 refs  → STARTER   (₹50/ref)
5 refs  → PRO       (₹100/ref + ₹500 bonus)
10 refs → ELITE     (₹150/ref + ₹1000 bonus + ₹200 voucher)
20 refs → CHAMPION  (₹200/ref + ₹2000 bonus + ₹1000 voucher)
50 refs → LEGEND    (₹300/ref + ₹5000 bonus + ₹5000 voucher + Lifetime Premium)
```

---

## 🔑 IMPORTANT INDEXES

### On referrals
```javascript
{ referrer: 1 }                    // Find my referrals
{ referee: 1 }                     // Check if referred
{ referralCode: 1 }                // Validate code
{ referrer: 1, status: 1 }         // My active referrals
{ status: 1, expiresAt: 1 }        // Expire old referrals
```

### On users
```javascript
{ 'referral.referralCode': 1 }           // Code validation
{ 'referral.totalReferrals': -1 }        // Leaderboard
```

---

## 📞 API ENDPOINTS

### Frontend API Calls

```javascript
// Get user's referral data
GET /api/referral/data

// Get referral history (paginated)
GET /api/referral/history?page=1&limit=20

// Get referral statistics
GET /api/referral/statistics

// Generate referral link
POST /api/referral/generate-link

// Share referral (track)
POST /api/referral/share
Body: { platform: 'whatsapp' }

// Claim pending rewards
POST /api/referral/claim-rewards

// Get leaderboard
GET /api/referral/leaderboard?period=month

// Tier system
GET /api/referral/tier
GET /api/referral/rewards
POST /api/referral/claim-reward
GET /api/referral/leaderboard
POST /api/referral/generate-qr
GET /api/referral/milestones
GET /api/referral/check-upgrade
POST /api/referral/validate-code
POST /api/referral/apply-code
```

---

## 🔐 FRAUD CHECKS

When creating a referral, check for:
```javascript
✓ Same IP for referrer & referee
✓ High velocity (>10 refs in 24h)
✓ Email alias (contains '+')
✓ Device reuse (same deviceId)
✓ VPN/proxy detection
```

**Auto-flag if 2+ red flags detected**

---

## 📊 ANALYTICS QUERIES

### Total Referrals by Status
```javascript
db.referrals.aggregate([
  { $group: {
    _id: '$status',
    count: { $sum: 1 }
  }}
])
```

### Conversion Rate
```javascript
const total = await Referral.countDocuments()
const completed = await Referral.countDocuments({
  status: 'completed'
})
const conversionRate = (completed / total) * 100
```

### Top Referrers
```javascript
db.users.find({
  'referral.totalReferrals': { $gt: 0 }
})
.sort({ 'referral.totalReferrals': -1 })
.limit(10)
```

---

## 🛠️ COMMON OPERATIONS

### Create Referral (Signup)
```javascript
const referral = await Referral.create({
  referrer: referrerId,
  referee: refereeId,
  referralCode: code,
  status: 'PENDING',
  metadata: {
    shareMethod: 'whatsapp',
    signupSource: 'mobile',
    ipAddress: req.ip
  }
})
```

### Process First Order
```javascript
await referralService.processFirstOrder({
  refereeId: userId,
  orderId: order._id,
  orderAmount: order.total
})
// Automatically:
// 1. Updates referral status → ACTIVE
// 2. Credits referrer's wallet
// 3. Creates transaction record
// 4. Checks tier upgrade
```

### Check Tier Upgrade
```javascript
const { upgraded, oldTier, newTier } =
  await referralTierService.checkTierUpgrade(userId)

if (upgraded) {
  // Award tier bonuses
  await referralTierService.awardTierRewards(userId, newTier)
}
```

### Mark Expired Referrals (Cron)
```javascript
// Run daily
await referralService.markExpiredReferrals()
// Updates status: pending/active → expired (if >90 days)
```

---

## ⚡ PERFORMANCE TIPS

### Use Indexes
```javascript
// GOOD ✅
await Referral.find({ referrer: userId, status: 'active' })

// BAD ❌
await Referral.find({ 'metadata.shareMethod': 'whatsapp' })
```

### Cache Hot Data
```javascript
// Cache user stats for 5 minutes
const cacheKey = `referral:stats:${userId}`
let stats = await redis.get(cacheKey)

if (!stats) {
  stats = await referralService.getReferralStats(userId)
  await redis.setex(cacheKey, 300, JSON.stringify(stats))
}
```

### Paginate Large Results
```javascript
// GOOD ✅
const referrals = await Referral.find({ referrer: userId })
  .sort({ createdAt: -1 })
  .limit(20)
  .skip((page - 1) * 20)

// BAD ❌
const allReferrals = await Referral.find({ referrer: userId })
```

### Use Lean Queries
```javascript
// GOOD ✅ (returns plain JS objects, faster)
const referrals = await Referral.find({ ... }).lean()

// OK (returns Mongoose documents with methods)
const referrals = await Referral.find({ ... })
```

---

## 🚨 ERROR HANDLING

### Common Errors

```javascript
// User already referred
if (existingReferral) {
  throw new Error('User already has a referral relationship')
}

// Invalid code
const referrer = await User.findOne({ 'referral.referralCode': code })
if (!referrer) {
  throw new Error('Invalid referral code')
}

// Self-referral
if (referrerId.equals(refereeId)) {
  throw new Error('Cannot refer yourself')
}

// Expired referral
if (referral.expiresAt < new Date()) {
  throw new Error('Referral code expired')
}
```

---

## 📦 BULK OPERATIONS

### Update Multiple Referrals
```javascript
// Update all pending referrals older than 90 days
await Referral.updateMany(
  {
    status: 'pending',
    createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
  },
  {
    $set: { status: 'expired' }
  }
)
```

### Recalculate User Stats
```javascript
// Sync user.referral.totalReferrals with actual count
const actualCount = await Referral.countDocuments({
  referrer: userId,
  status: { $in: ['qualified', 'completed'] }
})

await User.updateOne(
  { _id: userId },
  { $set: { 'referral.totalReferrals': actualCount } }
)
```

---

## 🔍 DEBUGGING QUERIES

### Check Referral Status
```javascript
const referral = await Referral.findById(referralId)
console.log({
  status: referral.status,
  referrerRewarded: referral.referrerRewarded,
  refereeRewarded: referral.refereeRewarded,
  createdAt: referral.createdAt,
  expiresAt: referral.expiresAt,
  isExpired: referral.expiresAt < new Date()
})
```

### Verify Wallet Balance
```javascript
const wallet = await Wallet.findOne({ user: userId })
const transactions = await Transaction.find({
  user: userId,
  'source.type': 'referral',
  status: 'completed'
})

const totalFromTransactions = transactions.reduce(
  (sum, t) => sum + t.amount, 0
)

console.log({
  walletBalance: wallet.balance.total,
  transactionTotal: totalFromTransactions,
  match: wallet.balance.total === transactionTotal
})
```

---

## 📈 MONITORING METRICS

### Key Metrics to Track

```javascript
// Query performance
db.setProfilingLevel(2)  // Log all queries
db.system.profile.find({ millis: { $gt: 100 } })  // Slow queries

// Collection stats
db.referrals.stats()
// Returns: { count, size, avgObjSize, storageSize, ... }

// Index usage
db.referrals.aggregate([
  { $indexStats: {} }
])
```

### Alert Thresholds

- Query time > 100ms
- Write rate > 100/sec
- Collection size > 10GB
- Index size > 2GB
- Cache hit rate < 60%

---

## 🔄 MIGRATION SCRIPTS

### Add New Field to Existing Referrals
```javascript
// Example: Add tier field to old referrals
await Referral.updateMany(
  { tier: { $exists: false } },
  { $set: { tier: 'STARTER' } }
)
```

### Backfill User Tiers
```javascript
const users = await User.find({
  'referral.totalReferrals': { $gt: 0 }
})

for (const user of users) {
  const qualifiedCount = await Referral.countDocuments({
    referrer: user._id,
    status: { $in: ['qualified', 'completed'] }
  })

  const tier = calculateTier(qualifiedCount)
  user.referralTier = tier
  await user.save()
}
```

---

## 🧪 TEST DATA

### Create Test Referral
```javascript
const testReferral = await Referral.create({
  referrer: referrerId,
  referee: refereeId,
  referralCode: 'TEST123',
  status: 'pending',
  tier: 'STARTER',
  rewards: {
    referrerAmount: 50,
    refereeDiscount: 50,
    milestoneBonus: 20
  },
  metadata: {
    shareMethod: 'test',
    signupSource: 'test'
  }
})
```

### Cleanup Test Data
```javascript
// Delete test referrals
await Referral.deleteMany({
  'metadata.shareMethod': 'test'
})
```

---

## 📚 USEFUL COMMANDS

### MongoDB Shell

```javascript
// Count referrals by status
db.referrals.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Find users with most referrals
db.users.find({ 'referral.totalReferrals': { $gt: 0 } })
  .sort({ 'referral.totalReferrals': -1 })
  .limit(10)

// Check index usage
db.referrals.getIndexes()
db.referrals.explain('executionStats').find({ referrer: ObjectId('...') })
```

---

## 🆘 TROUBLESHOOTING

### Referral Not Created
1. Check if user already has referral: `Referral.findOne({ referee: userId })`
2. Verify referral code exists: `User.findOne({ 'referral.referralCode': code })`
3. Check for self-referral: `referrerId !== refereeId`

### Reward Not Credited
1. Check referral status: Should be 'active' or 'qualified'
2. Verify referrerRewarded flag: Should be `true`
3. Check transaction record: `Transaction.find({ 'source.type': 'referral' })`
4. Verify wallet balance updated: Compare before/after amounts

### Tier Not Upgrading
1. Count qualified referrals: Only 'qualified'/'completed' count
2. Check stored tier: `user.referralTier`
3. Manually trigger upgrade check: `referralTierService.checkTierUpgrade(userId)`

### Leaderboard Not Updating
1. Check cache: May be cached for 1 hour
2. Force refresh: Clear Redis cache key `referral:leaderboard:*`
3. Recalculate stats: Run reconciliation job

---

## 🔗 USEFUL LINKS

- **Full Docs**: `REFERRAL_DATABASE_ARCHITECTURE.md`
- **Visual Guide**: `REFERRAL_DATABASE_SCHEMA_VISUAL.md`
- **Summary**: `REFERRAL_DATABASE_SUMMARY.md`
- **Backend Model**: `user-backend/src/models/Referral.ts`
- **Frontend Types**: `frontend/types/referral.types.ts`
- **Service**: `user-backend/src/services/referralService.ts`

---

**Quick Reference Card v1.0** | Last Updated: 2025-11-03
