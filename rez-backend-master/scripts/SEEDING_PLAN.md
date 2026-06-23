# COMPREHENSIVE DATABASE SEEDING PLAN

## Executive Summary
Based on database analysis, we have **704 documents across 63 collections**. Many critical collections are empty or underpopulated. This plan addresses all gaps.

---

## Current Database State

### ✅ Well-Populated Collections (No Action Needed)
- **transactions**: 178 documents
- **wishlists**: 160 documents
- **activities**: 41 documents
- **userachievements**: 36 documents
- **faqs**: 32 documents
- **storeanalytics**: 32 documents
- **usercashbacks**: 28 documents
- **products**: 16 documents
- **wallets**: 16 documents
- **projects**: 16 documents
- **categories**: 10 documents

### ⚠️ Underpopulated Collections (Need More Data)
- **users**: 3 → Need 20+ (for testing)
- **stores**: 5 → Need 20+ (variety)
- **orders**: 9 → Need 30+ (order flow testing)
- **reviews**: 5 → Need 30+ (ratings/reviews)
- **products**: 16 → Need 50+ (catalog variety)
- **coupons**: 8 → Need 20+ (promotions)
- **offers**: 5 → Need 30+ (offers system)

### ❌ CRITICAL - Empty Collections (MUST SEED)
1. **subscriptions**: 0 ❌ (Just built subscription system)
2. **referrals**: 0 ❌ (Just built referral system)
3. **challenges**: 0 ❌ (Just built gamification)
4. **scratchcards**: 0 ❌ (Gamification feature)
5. **events**: 0 ❌ (Events system)
6. **eventbookings**: 0 ❌ (Event bookings)
7. **notifications**: 0 ❌ (User notifications)
8. **cointransactions**: 0 ❌ (Coin economy)
9. **flashsales**: 0 ❌ (Flash sales feature)
10. **bills**: 0 ❌ (PayBill feature)
11. **follows**: 0 ❌ (Social features)
12. **favorites**: 0 ❌ (User favorites)
13. **payments**: 0 ❌ (Payment records)
14. **userchallengeprogresses**: 0 ❌ (Challenge progress)
15. **stocknotifications**: 0 ❌ (Stock alerts)

---

## Seeding Strategy

### Phase 1: Foundation (Expand Existing)
**Goal**: Increase base data to support relationships
1. **Users**: 3 → 20 users
   - Mix of regular users, merchants, admins
   - With verified phone numbers
   - Complete profiles
   - Wallets initialized

2. **Stores**: 5 → 20 stores
   - Multiple categories (Fashion, Food, Electronics, Books, etc.)
   - Different locations across Mumbai
   - With proper ratings and analytics

3. **Products**: 16 → 50 products
   - Distributed across all stores
   - Various price ranges
   - Different stock levels
   - Rich product data

4. **Categories**: 10 → 15 categories
   - Ensure all types covered (going_out, home_delivery, earn, play)

---

### Phase 2: Subscriptions System (NEW - Priority)
**Goal**: Seed subscription tiers and user subscriptions
1. **Subscriptions**: 0 → 10
   - Free tier: 5 users
   - Premium tier: 3 users (active)
   - VIP tier: 2 users (active)
   - Mix of trial, active, cancelled states
   - Razorpay integration data (mock)

---

### Phase 3: Referral System (NEW - Priority)
**Goal**: Create referral network
1. **Referrals**: 0 → 15
   - Link users with referral relationships
   - Track successful referrals
   - Calculate referral rewards
   - Update user.referral stats

---

### Phase 4: Gamification (NEW - Priority)
**Goal**: Populate gamification features
1. **Challenges**: 0 → 15
   - Daily challenges (5)
   - Weekly challenges (5)
   - Monthly challenges (5)
   - Mix of: spending, referral, social, achievement types

2. **UserChallengeProgress**: 0 → 30
   - Link users to challenges
   - Various completion states

3. **ScratchCards**: 0 → 20
   - Active cards for users
   - Mix of revealed/unrevealed
   - Different reward types

4. **CoinTransactions**: 0 → 50
   - Earning coins (challenges, purchases)
   - Spending coins (rewards, mini-games)
   - Balance updates

---

### Phase 5: Social Features
**Goal**: Enable social interactions
1. **Follows**: 0 → 30
   - User follow relationships
   - Bidirectional follows

2. **Favorites**: 0 → 40
   - Favorite stores
   - Favorite products

---

### Phase 6: Events System
**Goal**: Populate events and bookings
1. **Events**: 0 → 10
   - Mix of past, ongoing, upcoming events
   - Different types (workshop, sale, experience)
   - With pricing and capacity

2. **EventBookings**: 0 → 15
   - User bookings for events
   - Various statuses (confirmed, pending, cancelled)

---

### Phase 7: Commerce Expansion
**Goal**: Expand order and transaction flow
1. **Orders**: 9 → 40
   - More order variety
   - Different statuses
   - Payment methods

2. **Reviews**: 5 → 40
   - Product reviews
   - Store reviews
   - Various ratings

3. **Payments**: 0 → 30
   - Payment records for orders
   - Different payment methods

---

### Phase 8: Promotions & Sales
**Goal**: Populate promotional features
1. **FlashSales**: 0 → 8
   - Active flash sales
   - Products with discounts
   - Time-limited offers

2. **Coupons**: 8 → 25
   - Various coupon types
   - Store-specific and global
   - Expiry dates

3. **Offers**: 5 → 30
   - Cashback offers
   - Discount offers
   - Category-specific offers

---

### Phase 9: Wallet & Bills
**Goal**: Financial features
1. **Bills**: 0 → 20
   - Electricity bills
   - Mobile recharges
   - Other utility bills
   - Various statuses

2. **CoinTransactions**: (from Phase 4)
   - Additional coin flow
   - Link to purchases and rewards

---

### Phase 10: Notifications
**Goal**: User engagement
1. **Notifications**: 0 → 50
   - Order updates
   - Promotional notifications
   - System notifications
   - Achievement unlocks

2. **StockNotifications**: 0 → 15
   - Product back-in-stock alerts
   - Price drop alerts

---

## Implementation Order

```
1. seedUsers (expand from 3 to 20)
2. seedCategories (expand from 10 to 15)
3. seedStores (expand from 5 to 20)
4. seedProducts (expand from 16 to 50)
5. seedSubscriptions (NEW - 0 to 10)
6. seedReferrals (NEW - 0 to 15)
7. seedChallenges (NEW - 0 to 15)
8. seedUserChallengeProgress (NEW - 0 to 30)
9. seedScratchCards (NEW - 0 to 20)
10. seedCoinTransactions (NEW - 0 to 50)
11. seedFollows (NEW - 0 to 30)
12. seedFavorites (NEW - 0 to 40)
13. seedEvents (NEW - 0 to 10)
14. seedEventBookings (NEW - 0 to 15)
15. seedOrders (expand from 9 to 40)
16. seedReviews (expand from 5 to 40)
17. seedPayments (NEW - 0 to 30)
18. seedFlashSales (NEW - 0 to 8)
19. seedCoupons (expand from 8 to 25)
20. seedOffers (expand from 5 to 30)
21. seedBills (NEW - 0 to 20)
22. seedNotifications (NEW - 0 to 50)
23. seedStockNotifications (NEW - 0 to 15)
```

---

## Execution Commands

### Full Comprehensive Seed
```bash
npm run seed:comprehensive
```

### Individual Phase Seeds
```bash
npm run seed:subscriptions       # Phase 2
npm run seed:referrals           # Phase 3
npm run seed:gamification        # Phase 4
npm run seed:social              # Phase 5
npm run seed:events-system       # Phase 6
npm run seed:commerce            # Phase 7
npm run seed:promotions          # Phase 8
npm run seed:wallet-bills        # Phase 9
npm run seed:notifications-all   # Phase 10
```

---

## Expected Final State

After comprehensive seeding:

| Collection | Current | Target | Status |
|-----------|---------|--------|--------|
| **users** | 3 | 20 | 🔄 Expand |
| **stores** | 5 | 20 | 🔄 Expand |
| **products** | 16 | 50 | 🔄 Expand |
| **categories** | 10 | 15 | 🔄 Expand |
| **orders** | 9 | 40 | 🔄 Expand |
| **reviews** | 5 | 40 | 🔄 Expand |
| **subscriptions** | 0 | 10 | ✨ NEW |
| **referrals** | 0 | 15 | ✨ NEW |
| **challenges** | 0 | 15 | ✨ NEW |
| **userchallengeprogresses** | 0 | 30 | ✨ NEW |
| **scratchcards** | 0 | 20 | ✨ NEW |
| **cointransactions** | 0 | 50 | ✨ NEW |
| **follows** | 0 | 30 | ✨ NEW |
| **favorites** | 0 | 40 | ✨ NEW |
| **events** | 0 | 10 | ✨ NEW |
| **eventbookings** | 0 | 15 | ✨ NEW |
| **payments** | 0 | 30 | ✨ NEW |
| **flashsales** | 0 | 8 | ✨ NEW |
| **coupons** | 8 | 25 | 🔄 Expand |
| **offers** | 5 | 30 | 🔄 Expand |
| **bills** | 0 | 20 | ✨ NEW |
| **notifications** | 0 | 50 | ✨ NEW |
| **stocknotifications** | 0 | 15 | ✨ NEW |

**Total Documents**: 704 → **~1,200+**

---

## Success Metrics

After seeding, verify:
✅ All API endpoints return data
✅ Relationships are intact (refs exist)
✅ No orphaned documents
✅ Analytics are calculated
✅ Indexes are created
✅ Frontend can fetch and display all data

---

## Notes

1. **Referential Integrity**: All foreign keys will point to existing documents
2. **Realistic Data**: Use faker.js for realistic names, addresses, etc.
3. **Date Ranges**: Spread data across past 6 months for analytics
4. **Geospatial**: Use real Mumbai coordinates for location data
5. **Status Variety**: Mix of active/inactive, completed/pending states
6. **Performance**: Batch insert for large collections
7. **Idempotency**: Check existing data before inserting

---

## Priority Order (If Time Limited)

### 🔥 CRITICAL (Must Have)
1. Subscriptions (new feature, just built API)
2. Referrals (new feature, just built API)
3. Challenges & Gamification (new feature, just built API)
4. More Users (need for testing)
5. More Stores & Products (need variety)

### 🌟 IMPORTANT (Should Have)
6. Events & Bookings
7. Social (Follows/Favorites)
8. Notifications
9. Payments
10. More Orders & Reviews

### ⭐ NICE TO HAVE
11. Flash Sales
12. Bills
13. Stock Notifications
14. Expanded Coupons/Offers

---

**Created**: 2025-10-24
**Last Updated**: 2025-10-24
**Status**: Ready for execution
