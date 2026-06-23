# Referrals Seeding Script

## Overview
This script seeds the database with 15 realistic referral relationships, creates referral reward transactions, and updates user referral statistics. It establishes a comprehensive referral network with various statuses and tier-based rewards.

## Prerequisites
- MongoDB connection must be configured in `.env`
- At least 2 users must exist in the database (ideally 10+ for best results)
- Run user seeding first if needed
- Transaction model must be available for reward tracking

## Usage

### Run the seed script:
```bash
npx ts-node scripts/seedReferrals.ts
```

### Or with npm script (if configured):
```bash
npm run seed:referrals
```

## What Gets Seeded

### Referral Distribution:
- **10 COMPLETED referrals** - Successfully completed with rewards paid
- **3 PENDING referrals** - Referee signed up, awaiting first order
- **2 QUALIFIED referrals** - Referee qualified, rewards being processed

### Status Types:
- **COMPLETED** - Fully completed referrals with all rewards distributed
- **PENDING** - Referee registered but hasn't placed first order yet
- **QUALIFIED** - Referee met qualification criteria, waiting for final processing
- **REGISTERED** - Referee signed up (used for intermediate states)
- **ACTIVE** - Referee placed first order (transitional status)
- **EXPIRED** - Referral expired after 90 days without completion

### Data Included for Each Referral:

#### Core Fields:
- `referrer` - User who shared the referral code (ObjectId)
- `referee` - User who used the referral code (ObjectId)
- `referralCode` - The code that was used
- `status` - Current referral status
- `tier` - Referrer's tier level (affects rewards)
- `rewards` - Reward amounts (object with referrerAmount, refereeDiscount, milestoneBonus)

#### Reward Flags:
- `referrerRewarded` - Whether referrer received their reward
- `refereeRewarded` - Whether referee received their discount
- `milestoneRewarded` - Whether milestone bonus was given (after 3rd order)

#### Qualification Criteria:
- `minOrders` - Minimum orders required (default: 1)
- `minSpend` - Minimum spend required (default: ₹500)
- `timeframeDays` - Days to complete qualification (default: 30)

#### Timestamps:
- `registeredAt` - When referee registered
- `qualifiedAt` - When referee met qualification criteria
- `completedAt` - When referral was fully completed
- `expiresAt` - When referral expires (90 days from creation)

#### Metadata:
- `shareMethod` - How the referral was shared (whatsapp, sms, email, copy, qr, etc.)
- `sharedAt` - When the referral link was shared
- `signupSource` - web or mobile
- `deviceId` - Device identifier
- `refereeFirstOrder` - Details of referee's first order (orderId, amount, completedAt)
- `milestoneOrders` - Referee's order count and total spending

## Tier-Based Reward Structure

### STARTER Tier (Default):
- Referrer Reward: ₹50
- Referee Discount: ₹50
- Milestone Bonus: ₹20

### BRONZE Tier:
- Referrer Reward: ₹75
- Referee Discount: ₹60
- Milestone Bonus: ₹30

### SILVER Tier:
- Referrer Reward: ₹100
- Referee Discount: ₹75
- Milestone Bonus: ₹40

### GOLD Tier:
- Referrer Reward: ₹150
- Referee Discount: ₹100
- Milestone Bonus: ₹50

### PLATINUM Tier:
- Referrer Reward: ₹200
- Referee Discount: ₹125
- Milestone Bonus: ₹75

### DIAMOND Tier:
- Referrer Reward: ₹250
- Referee Discount: ₹150
- Milestone Bonus: ₹100

## User Updates

For each referral, the script updates:

### Referrer Updates:
- `referral.totalReferrals` - Incremented by 1
- `referral.referredUsers` - Referee added to array
- `referral.referralEarnings` - Increased by reward amount (for completed referrals)
- `wallet.balance` - Credited with referral reward (for completed referrals)
- `wallet.totalEarned` - Updated with earnings

### Referee Updates:
- `referral.referredBy` - Set to referrer's referral code

## Transaction Creation

For each COMPLETED or QUALIFIED referral, the script creates:

### Transaction Fields:
- `type` - 'credit' (earning for referrer)
- `category` - 'earning'
- `amount` - Tier-based referral reward
- `currency` - 'INR'
- `description` - "Referral reward from [referee name] ([tier] tier)"
- `source.type` - 'referral'
- `source.reference` - Referee's user ID
- `source.metadata.referralInfo` - Contains referredUser and level
- `status.current` - 'completed'
- `balanceBefore` - Referrer's balance before reward
- `balanceAfter` - Referrer's balance after reward
- `isReversible` - false (rewards cannot be reversed)

## Sample Output

```
🌱 Starting Referrals Seed...

📡 Connecting to MongoDB...
✅ Connected to MongoDB

👥 Fetching users...
✅ Found 15 users

🗑️  Clearing existing referrals...
✅ Cleared existing referrals

🔗 Creating referral relationships...
📝 Inserting 15 referrals...
✅ Created 15 referrals

👥 Updating user referral stats...
✅ Updated 20 users

💰 Creating 12 referral reward transactions...
✅ Created 12 transactions

📊 Referral Statistics:
   completed: 10 referrals, ₹750 total rewards
   pending: 3 referrals, ₹0 total rewards
   qualified: 2 referrals, ₹150 total rewards

📊 Tier Distribution:
   STARTER: 8 referrals, avg ₹50.00 reward
   BRONZE: 3 referrals, avg ₹75.00 reward
   SILVER: 2 referrals, avg ₹100.00 reward
   GOLD: 2 referrals, avg ₹150.00 reward

📋 Sample Referrals:

   1. Referral #abc123
      Referrer: John Doe (JOHN2024)
      Referee: Jane Smith
      Status: completed
      Tier: STARTER
      Reward: ₹50
      Referrer Rewarded: Yes
      Created: 10/15/2024

   2. Referral #def456
      Referrer: Mike Johnson (MIKE2024)
      Referee: Sarah Williams
      Status: pending
      Tier: BRONZE
      Reward: ₹75
      Referrer Rewarded: No
      Created: 10/20/2024

   3. Referral #ghi789
      Referrer: Emily Brown (EMILY2024)
      Referee: David Lee
      Status: qualified
      Tier: SILVER
      Reward: ₹100
      Referrer Rewarded: Yes
      Created: 10/18/2024

🔍 Verifying no self-referrals...
✅ No self-referrals found

🏆 Top Referrers:
   1. John Doe
      Code: JOHN2024
      Tier: STARTER
      Total Referrals: 3
      Earnings: ₹150

   2. Mike Johnson
      Code: MIKE2024
      Tier: BRONZE
      Total Referrals: 2
      Earnings: ₹150

   3. Emily Brown
      Code: EMILY2024
      Tier: SILVER
      Total Referrals: 2
      Earnings: ₹200

✅ Referrals Seed Complete!

📝 Summary:
   - Created 15 referral relationships
   - Updated 20 users
   - Created 12 reward transactions
   - No self-referrals detected

💡 Tip: Users can now track their referrals and earnings through the app!
```

## Testing the Seeded Data

### API Endpoints to Test:
1. `GET /api/referrals/user/:userId` - Get user's referrals
2. `GET /api/referrals/stats/:userId` - Get referral statistics
3. `POST /api/referrals/share` - Test sharing referral code
4. `POST /api/referrals/apply` - Apply a referral code during signup
5. `GET /api/referrals/leaderboard` - View top referrers

### Verification Queries:

#### Check all referrals for a user:
```javascript
// In MongoDB shell or Compass
db.referrals.find({ referrer: ObjectId("USER_ID") }).pretty()
```

#### Check referrals by status:
```javascript
db.referrals.find({ status: "completed" }).pretty()
```

#### Check user referral stats:
```javascript
db.users.find(
  { "referral.totalReferrals": { $gt: 0 } },
  {
    "profile.firstName": 1,
    "profile.lastName": 1,
    "referral.referralCode": 1,
    "referral.totalReferrals": 1,
    "referral.referralEarnings": 1
  }
).sort({ "referral.totalReferrals": -1 })
```

#### Get referral transactions:
```javascript
db.transactions.find({
  "source.type": "referral",
  "status.current": "completed"
}).pretty()
```

#### Verify no self-referrals:
```javascript
db.referrals.find({
  $expr: { $eq: ["$referrer", "$referee"] }
})
// Should return 0 documents
```

#### Get referrals with user details:
```javascript
db.referrals.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "referrer",
      foreignField: "_id",
      as: "referrerDetails"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "referee",
      foreignField: "_id",
      as: "refereeDetails"
    }
  },
  {
    $project: {
      referralCode: 1,
      status: 1,
      tier: 1,
      "rewards.referrerAmount": 1,
      "referrerDetails.profile.firstName": 1,
      "referrerDetails.referral.referralCode": 1,
      "refereeDetails.profile.firstName": 1,
      completedAt: 1
    }
  }
])
```

## Troubleshooting

### Error: "Need at least 2 users to create referrals"
**Solution:** Create users first:
```bash
# Register users via API or run user seed script
npx ts-node src/scripts/seedDatabase.ts
```

### Error: "MONGODB_URI not found"
**Solution:** Ensure `.env` file has the MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/rez-app
```

### Error: "Duplicate referral code"
**Solution:** The script uses existing user referral codes. Ensure users have unique codes:
```javascript
db.users.find({ "referral.referralCode": { $exists: true } })
```

### Self-referral detected
**Solution:** The script includes validation to prevent self-referrals. If this error occurs, check the user selection logic.

## Validation Rules

The script ensures:

1. **No Self-Referrals** - A user cannot refer themselves
2. **Valid Users** - Both referrer and referee must exist in the database
3. **Unique Relationships** - Each referral relationship is unique
4. **Proper Timestamps** - Dates follow logical progression (created → registered → qualified → completed)
5. **Tier-Based Rewards** - Rewards match the referrer's tier level
6. **Wallet Balance** - User wallets are updated only for completed/qualified referrals
7. **Transaction Integrity** - Transactions are created only for successful referrals

## Next Steps After Seeding

1. **Test Referral Flow:**
   - Generate and share referral codes
   - Apply referral codes during signup
   - Track referral status transitions
   - Verify reward distribution

2. **Test Reward System:**
   - Check wallet balance updates
   - Verify transaction creation
   - Test milestone bonuses (after 3rd order)
   - Validate tier-based reward amounts

3. **Test Expiration:**
   - Wait 90 days or manually update `expiresAt`
   - Run expiration cleanup job
   - Verify expired referrals don't get rewarded

4. **Test Referral Tiers:**
   - Upgrade user to higher tier
   - Create new referrals
   - Verify higher reward amounts
   - Check tier progression benefits

5. **Test Analytics:**
   - View referral leaderboard
   - Calculate conversion rates
   - Track total referral earnings
   - Analyze referral performance by tier

## Related Files
- **Model:** `src/models/Referral.ts` - Referral model definition
- **User Model:** `src/models/User.ts` - User with referral fields
- **Transaction Model:** `src/models/Transaction.ts` - Transaction for rewards
- **Controller:** `src/controllers/referralController.ts` - Referral API logic (if exists)
- **Routes:** `src/routes/referralRoutes.ts` - Referral endpoints (if exists)

## Notes
- Referrals expire after 90 days if not completed
- Only COMPLETED and QUALIFIED referrals generate transactions
- Rewards are tier-based and increase with referrer's level
- Milestone bonuses are given after referee's 3rd order
- The script prevents duplicate referrals and self-referrals
- User wallet balances are updated atomically with transactions
- All referrals include realistic metadata (share method, device info, etc.)
- Transaction records are immutable (isReversible: false)

## Business Logic

### Referral Lifecycle:
1. **Shared** - Referrer shares their code
2. **Registered** - Referee signs up using the code
3. **Pending** - Waiting for referee's first order
4. **Active** - Referee placed first order
5. **Qualified** - Referee met qualification criteria (minOrders, minSpend)
6. **Completed** - All rewards distributed
7. **Expired** - 90 days passed without completion

### Qualification Criteria:
- Referee must place at least 1 order
- Order total must be ≥ ₹500
- Must complete within 30 days of registration

### Reward Distribution Timeline:
1. **Instant Discount** - Referee gets discount on first order
2. **Post-Order Reward** - Referrer gets reward after referee's first successful order
3. **Milestone Bonus** - Both get bonus after referee's 3rd order

## Performance Considerations
- Script uses batch operations for insertMany
- User updates are performed one at a time to avoid race conditions
- Indexes on referrer, referee, status, and referralCode ensure fast queries
- Transaction creation is done in bulk for efficiency
- The script includes progress logging for large datasets
