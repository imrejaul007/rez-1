# UGC Content Creator Users Seed Script

## Overview
This script creates 19 realistic content creator users for UGC video generation in the Rez app.

## File Location
`user-backend/src/scripts/seed-user-creators.ts` (TypeScript)

## What It Creates

### Total Users: 19 Content Creators

#### 1. Fashion Influencers (6 users)
- **Priya Sharma** - Fashion blogger & sustainable fashion advocate (Score: 8.5, Premium)
- **Ananya Verma** - Street style & vintage fashion (Score: 9.2, Premium)
- **Kavya Patel** - Designer wear & runway trends (Score: 7.8)
- **Riya Mehta** - Indo-western fusion & bridal specialist (Score: 8.9, Premium)
- **Sneha Reddy** - Minimalist fashion advocate (Score: 8.1)
- **Ishita Singh** - Affordable fashion & budget styling (Score: 7.5)

#### 2. Beauty Creators (5 users)
- **Neha Gupta** - Certified makeup artist & reviewer (Score: 9.0, Premium)
- **Divya Nair** - Skincare enthusiast & natural beauty (Score: 8.7, Premium)
- **Simran Kaur** - Bridal makeup specialist (Score: 8.4)
- **Pooja Iyer** - Beauty blogger & product junkie (Score: 7.9)
- **Aisha Khan** - DIY beauty recipes (Score: 7.2)

#### 3. Lifestyle Bloggers (4 users)
- **Rahul Desai** - Travel & food vlogger (Score: 8.8, Premium, Male)
- **Arjun Malhotra** - Fitness & wellness coach (Score: 8.3, Premium, Male)
- **Meera Joshi** - Mom blogger & parenting tips (Score: 7.6, Female)
- **Aarav Chopra** - Urban lifestyle & city life (Score: 7.4, Male)

#### 4. Tech Reviewers (4 users)
- **Karthik Rao** - Tech reviewer & gadget geek (Score: 9.1, Premium, Male)
- **Rohan Bhatt** - Mobile tech & camera specialist (Score: 8.6, Premium, Male)
- **Vikram Kumar** - Gaming tech & PC builds (Score: 8.2, Male)
- **Siddharth Menon** - Budget tech reviews (Score: 7.7, Male)

## User Attributes

Each user includes:

### Profile Information
- ✅ Unique Indian phone number (+91XXXXXXXXXX)
- ✅ Complete profile (firstName, lastName, avatar, bio)
- ✅ Age range: 22-32 years
- ✅ Gender diversity (11 female, 8 male)
- ✅ Varied locations across 10 Indian cities
- ✅ Verified account status
- ✅ Unique username (e.g., "priyasharma_official")

### Engagement & Tier
- ✅ Engagement scores: 7.2 - 9.2
- ✅ Referral tiers: STARTER, BRONZE, SILVER, GOLD, PLATINUM
- ✅ Premium status (8 premium users, 11 regular)

### Wallet Details
- ✅ Balance (calculated from engagement)
- ✅ Total earned (engagement * 1000 + premium bonus)
- ✅ Total spent (~30% of earnings)
- ✅ Pending amount

### Other Details
- ✅ Interests array matching their category
- ✅ Last login (random within last 7 days)
- ✅ Account creation date (random within last 6 months)
- ✅ Location with coordinates for geo queries
- ✅ Preferences (notifications, theme, language)

## Database Configuration

```javascript
MONGODB_URI: mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/
DB_NAME: test
```

## How to Run

### Option 1: Using npm script (Recommended)
```bash
cd user-backend
npm run seed:creators
```

### Option 2: Direct Execution
```bash
cd user-backend
ts-node src/scripts/seed-user-creators.ts
```

### Option 3: Import in another script
```typescript
import { seedUserCreators, CREATOR_PROFILES } from './seed-user-creators';

async function myScript() {
  const users = await seedUserCreators();
  console.log('Created users:', users.length);
}
```

## Features

### Error Handling
- ✅ Connection timeout handling (10s)
- ✅ Duplicate user detection (skips if exists)
- ✅ Individual user error catching
- ✅ Graceful disconnection on errors

### Progress Logging
- ✅ Real-time creation progress (e.g., "[1/19] Created...")
- ✅ Category emoji indicators (👗💄🌟📱)
- ✅ Premium status indicators (⭐)
- ✅ City and engagement score display

### Summary Statistics
After completion, displays:
- ✅ Total users created
- ✅ Category breakdown
- ✅ Gender demographics
- ✅ Premium user count
- ✅ Referral tier distribution
- ✅ Top 5 city distribution
- ✅ Sample user IDs for reference

## Export

The script exports:
```javascript
export { CREATOR_PROFILES, seedUserCreators };
```

This allows other scripts (like UGC video seeding) to:
1. Reference the creator profiles
2. Get user IDs for video assignment
3. Use the created users array

## Sample Output

```
🚀 Starting UGC Content Creator Users seeding...
📍 Database: cluster0.aulqar3.mongodb.net/test
🔌 Connecting to MongoDB...
✅ Connected to MongoDB successfully

👥 Creating UGC content creator users...

✅ [1/19] Created: 👗 Priya Sharma | Mumbai | Score: 8.5 | ⭐ Premium
✅ [2/19] Created: 👗 Ananya Verma | Delhi | Score: 9.2 | ⭐ Premium
...

================================================================================
📊 UGC Content Creator Users Seeding Summary
================================================================================

📈 Total Users Created: 19/19
❌ Errors: 0

📁 Category Breakdown:
   👗 Fashion Influencers: 6
   💄 Beauty Creators: 5
   🌟 Lifestyle Bloggers: 4
   📱 Tech Reviewers: 4

👥 Demographics:
   Female: 11
   Male: 8

⭐ Premium Users: 8

🏆 Referral Tier Distribution:
   PLATINUM: 3
   GOLD: 4
   SILVER: 3
   BRONZE: 3
   STARTER: 6
```

## Next Steps After Running

1. **Run UGC Video Seeding**
   ```bash
   node src/scripts/seed-ugc-videos.js
   ```

2. **Test API Endpoints**
   ```bash
   GET /api/users
   GET /api/users?userType=creator
   GET /api/users/:userId
   ```

3. **Verify in Database**
   ```javascript
   db.users.find({ userType: 'creator' }).count()
   db.users.find({ isPremium: true })
   ```

## Phone Number Range
- Base: +919000000000 - +919999999999
- Pattern: +91(9000000000 + index * 12345)

## Cities Covered
Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Lucknow

## Referral Tier Logic
- **PLATINUM**: Score >= 9.0
- **GOLD**: Score >= 8.5
- **SILVER**: Score >= 8.0
- **BRONZE**: Score >= 7.5
- **STARTER**: Score < 7.5

## Wallet Calculation
```javascript
baseEarnings = engagementScore * 1000
premiumBonus = isPremium ? 2000 : 0
totalEarned = baseEarnings + premiumBonus
totalSpent = totalEarned * 0.3 (30%)
balance = totalEarned - totalSpent
pendingAmount = engagementScore * 100
```

## Safety Features
- ✅ Checks for existing users before creating
- ✅ Option to preserve existing creator data
- ✅ Commented deleteMany to prevent accidental deletion
- ✅ Graceful error handling per user
- ✅ Database disconnection in finally block

## Use Cases
1. **UGC Video Assignment**: Assign videos to these realistic creator profiles
2. **Testing**: Test user-related features with diverse profiles
3. **Demo Data**: Show realistic creator ecosystem
4. **Analytics**: Test engagement scoring and tier systems
5. **Referral System**: Test referral earnings and tier upgrades

## Maintenance
To add more creators:
1. Add profile to `CREATOR_PROFILES` array
2. Ensure category is one of: fashion, beauty, lifestyle, tech
3. Run script again (will skip duplicates)

## Troubleshooting

### Connection Issues
- Check MONGODB_URI in .env
- Verify network access to MongoDB Atlas
- Check firewall/VPN settings

### Duplicate Key Errors
- Script automatically skips existing users
- Check phoneNumber uniqueness
- Verify referralCode generation

### Model Not Found
- Script registers User model dynamically
- No need to import model separately
- Works with existing User schema
