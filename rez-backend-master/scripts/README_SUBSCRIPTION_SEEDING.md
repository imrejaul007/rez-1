# Subscription Seeding Script

## Overview
This script seeds the database with 10 sample subscription records across different tiers (FREE, PREMIUM, VIP) with various statuses.

## Prerequisites
- MongoDB connection must be configured in `.env`
- At least 10 users must exist in the database
- Run user seeding first if needed

## Usage

### Run the seed script:
```bash
npx ts-node scripts/seedSubscriptions.ts
```

### Or with npm script (if configured):
```bash
npm run seed:subscriptions
```

## What Gets Seeded

### Tier Distribution:
- **5 FREE tier subscriptions** - All active status
- **3 PREMIUM tier subscriptions** - Mix of active, trial, and grace_period
- **2 VIP tier subscriptions** - All active status

### Status Types:
- **Active** - Fully paid and active subscriptions
- **Trial** - In trial period (7 days)
- **Grace Period** - Payment failed, in grace period (3 days)

### Data Included for Each Subscription:

#### Core Fields:
- `user` - Linked to existing user from User collection
- `tier` - Subscription level (free/premium/vip)
- `status` - Current subscription status
- `billingCycle` - monthly or yearly
- `price` - Based on tier and billing cycle
- `startDate` - When subscription started
- `endDate` - When subscription expires

#### Benefits (Tier-specific):
- `cashbackMultiplier` - 1x (FREE), 2x (PREMIUM), 3x (VIP)
- `freeDelivery` - Premium and VIP only
- `prioritySupport` - Premium and VIP only
- `exclusiveDeals` - Premium and VIP only
- `unlimitedWishlists` - Premium and VIP only
- `earlyFlashSaleAccess` - Premium and VIP only
- `personalShopper` - VIP only
- `premiumEvents` - VIP only
- `conciergeService` - VIP only
- `birthdayOffer` - Premium and VIP
- `anniversaryOffer` - VIP only

#### Usage Stats (Initialized to zeros):
- `totalSavings` - 0
- `ordersThisMonth` - 0
- `ordersAllTime` - 0
- `cashbackEarned` - 0
- `deliveryFeesSaved` - 0
- `exclusiveDealsUsed` - 0

#### Razorpay Integration (for paid tiers):
- `razorpaySubscriptionId` - Mock subscription ID
- `razorpayPlanId` - Mock plan ID
- `razorpayCustomerId` - Mock customer ID

#### Metadata:
- `source` - web, app, or referral
- `campaign` - Marketing campaign name (if applicable)
- `promoCode` - Promotional code (if applicable)

## Subscription Tier Pricing

### FREE Tier:
- Monthly: ₹0
- Yearly: ₹0

### PREMIUM Tier:
- Monthly: ₹99
- Yearly: ₹999 (16% discount)

### VIP Tier:
- Monthly: ₹299
- Yearly: ₹2999 (16% discount)

## Sample Output

```
🚀 Starting Subscription Seeding Process...

📡 Connecting to MongoDB...
✅ Connected to MongoDB

✅ Found 10 users in database
📊 Current subscriptions in database: 0

🌱 Creating subscription records...

✅ [1/10] Created FREE subscription for John (active)
✅ [2/10] Created FREE subscription for Sarah (active)
✅ [3/10] Created FREE subscription for Mike (active)
🎁 [4/10] Created FREE subscription for Emma (active)
✅ [5/10] Created FREE subscription for David (active)
✅ [6/10] Created PREMIUM subscription for Lisa (active)
🎁 [7/10] Created PREMIUM subscription for Tom (trial)
⏰ [8/10] Created PREMIUM subscription for Anna (grace_period)
✅ [9/10] Created VIP subscription for Robert (active)
✅ [10/10] Created VIP subscription for Maria (active)

================================================================================
📋 SUBSCRIPTION SEEDING SUMMARY
================================================================================

📊 Tier Distribution:
   FREE:    5 subscriptions
   PREMIUM: 3 subscriptions
   VIP:     2 subscriptions
   TOTAL:   10 subscriptions

🔍 Status Distribution:
   Active:       7 subscriptions
   Trial:        1 subscriptions
   Grace Period: 1 subscriptions

✅ SUBSCRIPTION SEEDING COMPLETED SUCCESSFULLY!
```

## Testing the Seeded Data

### API Endpoints to Test:
1. `GET /api/subscriptions/user/:userId` - Get user's subscription
2. `GET /api/subscriptions/tiers` - List available tiers
3. `POST /api/subscriptions/upgrade` - Test upgrade flow
4. `POST /api/subscriptions/downgrade` - Test downgrade flow
5. `POST /api/subscriptions/cancel` - Test cancellation

### Verification Queries:

#### Check subscriptions by tier:
```javascript
// In MongoDB shell or Compass
db.subscriptions.find({ tier: "premium" }).pretty()
```

#### Check active subscriptions:
```javascript
db.subscriptions.find({ status: "active" }).pretty()
```

#### Check trial subscriptions:
```javascript
db.subscriptions.find({ status: "trial" }).pretty()
```

#### Get subscription with user details:
```javascript
db.subscriptions.aggregate([
  { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDetails" } }
])
```

## Troubleshooting

### Error: "No users found in database"
**Solution:** Create users first:
```bash
# Option 1: Use auth API to register users
# Option 2: Run user seed script if available
npx ts-node scripts/seedUsers.ts
```

### Error: "MONGODB_URI not found"
**Solution:** Ensure `.env` file has the MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/rez-app
```

### Error: "Duplicate key error"
**Solution:** The script automatically clears existing subscriptions. If the error persists, manually clear:
```javascript
db.subscriptions.deleteMany({})
```

## Next Steps After Seeding

1. **Test Subscription Benefits:**
   - Verify cashback multipliers are applied correctly in orders
   - Test free delivery for premium/VIP users
   - Check exclusive deals visibility

2. **Test Subscription Lifecycle:**
   - Trial to paid conversion
   - Subscription renewal
   - Upgrade/downgrade flows
   - Cancellation and reactivation

3. **Test Grace Period:**
   - Payment retry logic
   - Grace period expiration
   - Status transitions

4. **Test Usage Tracking:**
   - Order placement updates usage stats
   - Savings calculations are accurate
   - ROI calculations work correctly

## Related Files
- **Model:** `src/models/Subscription.ts` - Subscription model definition
- **Controller:** `src/controllers/subscriptionController.ts` - Subscription API logic
- **Routes:** `src/routes/subscriptionRoutes.ts` - Subscription endpoints

## Notes
- Free tier subscriptions don't have Razorpay IDs (no payment required)
- Trial subscriptions have a 7-day trial period
- Grace period lasts 3 days with up to 3 payment retries
- All usage stats start at 0 and should be updated as orders are placed
- Subscription benefits are automatically applied based on tier configuration
