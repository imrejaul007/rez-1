# Subscription System Quick Start Guide

## 🚀 Quick Start

### 1. Run the Seed Script

```bash
# Using npm script (recommended)
npm run seed:subscriptions

# Or directly with ts-node
npx ts-node scripts/seedSubscriptions.ts
```

### 2. Verify Seeding

```bash
# Connect to MongoDB and check
mongosh rez-app
db.subscriptions.countDocuments()  # Should return 10
```

## 📋 What You Get

### 10 Subscriptions Created:
- **5x FREE** tier (all active)
- **3x PREMIUM** tier (1 active, 1 trial, 1 grace_period)
- **2x VIP** tier (both active)

## 🎯 Key Features Seeded

### Subscription Tiers
| Tier | Monthly Price | Yearly Price | Cashback | Free Delivery |
|------|---------------|--------------|----------|---------------|
| FREE | ₹0 | ₹0 | 1x | ❌ |
| PREMIUM | ₹99 | ₹999 | 2x | ✅ |
| VIP | ₹299 | ₹2999 | 3x | ✅ |

### Subscription Statuses
- **Active** - Paid and active subscription
- **Trial** - 7-day trial period (new premium/vip users)
- **Grace Period** - 3-day payment grace period

## 🔍 Quick Checks

### Check All Subscriptions
```javascript
// MongoDB Shell
db.subscriptions.find().pretty()
```

### Check By Tier
```javascript
db.subscriptions.find({ tier: "premium" }).pretty()
db.subscriptions.find({ tier: "vip" }).pretty()
```

### Check By Status
```javascript
db.subscriptions.find({ status: "trial" }).pretty()
db.subscriptions.find({ status: "grace_period" }).pretty()
```

### Get Subscriptions with User Info
```javascript
db.subscriptions.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "userInfo"
    }
  },
  { $limit: 5 }
]).pretty()
```

## 🧪 Test API Endpoints

### Get User Subscription
```bash
GET /api/subscriptions/user/:userId
```

### Get Available Tiers
```bash
GET /api/subscriptions/tiers
```

### Subscribe to Tier
```bash
POST /api/subscriptions/subscribe
{
  "tier": "premium",
  "billingCycle": "monthly"
}
```

### Upgrade Subscription
```bash
POST /api/subscriptions/upgrade
{
  "newTier": "vip",
  "billingCycle": "yearly"
}
```

### Cancel Subscription
```bash
POST /api/subscriptions/cancel
{
  "reason": "Too expensive",
  "feedback": "Great service but out of budget"
}
```

## 💡 Common Use Cases

### 1. Test Trial Conversion
```javascript
// Find trial subscription
const trialSub = await Subscription.findOne({ status: 'trial' });

// Convert to active (simulate successful payment)
trialSub.status = 'active';
trialSub.trialEndDate = undefined;
await trialSub.save();
```

### 2. Test Upgrade Flow
```javascript
// User on FREE wants to upgrade to PREMIUM
const freeSub = await Subscription.findOne({
  tier: 'free',
  status: 'active'
});

// Calculate prorated amount
const proratedAmount = Subscription.calculateProratedAmount(
  'free',
  'premium',
  freeSub.endDate,
  'monthly'
);

console.log(`Prorated amount: ₹${proratedAmount}`);
```

### 3. Test Grace Period
```javascript
// Find subscription in grace period
const graceSub = await Subscription.findOne({
  status: 'grace_period'
});

// Check if still in grace period
const isInGrace = graceSub.isInGracePeriod();
console.log(`In grace period: ${isInGrace}`);
console.log(`Payment retries: ${graceSub.paymentRetryCount}`);
```

### 4. Calculate ROI
```javascript
// Get any active subscription
const sub = await Subscription.findOne({
  status: 'active',
  tier: { $ne: 'free' }
});

// Calculate ROI
const roi = sub.calculateROI();
console.log(`ROI: ${roi.toFixed(2)}%`);
```

### 5. Check Remaining Days
```javascript
const sub = await Subscription.findOne({ status: 'active' });
const daysLeft = sub.getRemainingDays();
console.log(`Days remaining: ${daysLeft}`);
```

## 📊 Sample Data Structure

```javascript
{
  "_id": ObjectId("..."),
  "user": ObjectId("..."),
  "tier": "premium",
  "status": "active",
  "billingCycle": "monthly",
  "price": 99,
  "startDate": ISODate("2024-11-01"),
  "endDate": ISODate("2024-12-01"),
  "autoRenew": true,
  "paymentMethod": "razorpay",

  // Razorpay Integration
  "razorpaySubscriptionId": "sub_abc123...",
  "razorpayPlanId": "plan_xyz789...",
  "razorpayCustomerId": "cust_def456...",

  // Benefits
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

  // Usage Tracking
  "usage": {
    "totalSavings": 0,
    "ordersThisMonth": 0,
    "ordersAllTime": 0,
    "cashbackEarned": 0,
    "deliveryFeesSaved": 0,
    "exclusiveDealsUsed": 0
  },

  // Metadata
  "metadata": {
    "source": "web",
    "campaign": "premium-launch"
  },

  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## 🛠️ Troubleshooting

### Problem: Script fails with "No users found"
**Solution:**
```bash
# Create users first using auth API or seed users
# Register users via: POST /api/auth/register
```

### Problem: Duplicate key error
**Solution:**
```javascript
// Clear existing subscriptions manually
db.subscriptions.deleteMany({})
// Then rerun the seed script
```

### Problem: MONGODB_URI not found
**Solution:**
```bash
# Check .env file exists and has:
MONGODB_URI=mongodb://localhost:27017/rez-app
```

## 📚 Related Documentation
- Full README: `README_SUBSCRIPTION_SEEDING.md`
- Model Definition: `src/models/Subscription.ts`
- API Controller: `src/controllers/subscriptionController.ts`

## 🎉 Success Indicators

After running the seed script, you should see:

1. ✅ 10 subscriptions created
2. ✅ Proper tier distribution (5 FREE, 3 PREMIUM, 2 VIP)
3. ✅ Different subscription statuses (active, trial, grace_period)
4. ✅ All benefits correctly assigned based on tier
5. ✅ Mock Razorpay IDs for paid subscriptions
6. ✅ Usage stats initialized to zeros
7. ✅ Metadata with source and campaign info

## 🔗 Next Steps

1. Test subscription APIs with Postman/Thunder Client
2. Implement subscription upgrade/downgrade logic
3. Add payment gateway integration (Razorpay)
4. Test trial-to-paid conversion flow
5. Implement subscription renewal webhooks
6. Add subscription analytics dashboard
7. Test grace period payment retry logic
8. Implement cancellation and reactivation flows

## 📞 Need Help?

Check these resources:
- MongoDB queries: See examples above
- API testing: Use included Postman collection
- Issues: Review error logs in console output
- Model methods: Check `src/models/Subscription.ts`
