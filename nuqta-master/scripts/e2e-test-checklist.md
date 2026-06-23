# E2E Test Checklist - Phase 3 Integration

## Test Environment Setup

### Prerequisites
- [ ] Backend API running and accessible
- [ ] Test user accounts created (Free, Premium, VIP tiers)
- [ ] Test database seeded with sample data
- [ ] Payment gateway in sandbox mode
- [ ] Analytics disabled or in test mode
- [ ] Feature flags configured for testing

### Test User Accounts
```
Free Tier User:
  Email: test-free@rez.app
  Password: Test123!

Premium User:
  Email: test-premium@rez.app
  Password: Test123!

VIP User:
  Email: test-vip@rez.app
  Password: Test123!
```

---

## 1. Subscription Integration Tests

### 1.1 Checkout Flow with Subscription Benefits

#### Test Case: Free Tier User - Checkout
- [ ] Login as free tier user
- [ ] Add items to cart (total: ₹1000)
- [ ] Navigate to checkout
- [ ] Verify cashback multiplier shows "1x"
- [ ] Verify delivery fee is ₹50
- [ ] Verify "Upgrade to Premium" CTA is visible
- [ ] Click upgrade CTA, verify navigation to subscription page
- [ ] Calculate expected cashback: ₹1000 * 10% * 1 = ₹100
- [ ] Verify cashback shown matches expected
- [ ] Complete checkout
- [ ] Verify order placed successfully

**Expected Results:**
- ✅ 1x cashback multiplier displayed
- ✅ Delivery fee charged (₹50)
- ✅ Upgrade CTA shown
- ✅ Cashback calculated correctly

#### Test Case: Premium User - Checkout
- [ ] Login as premium tier user
- [ ] Add items to cart (total: ₹1000)
- [ ] Navigate to checkout
- [ ] Verify cashback multiplier shows "2x"
- [ ] Verify delivery fee is ₹0 (FREE badge shown)
- [ ] Verify "Premium Member" badge displayed
- [ ] Calculate expected cashback: ₹1000 * 10% * 2 = ₹200
- [ ] Verify cashback shown matches expected
- [ ] Complete checkout
- [ ] Verify order placed successfully

**Expected Results:**
- ✅ 2x cashback multiplier displayed
- ✅ Free delivery applied
- ✅ Premium badge shown
- ✅ Cashback calculation correct (2x)

#### Test Case: VIP User - Checkout
- [ ] Login as VIP tier user
- [ ] Add items to cart (total: ₹1000)
- [ ] Navigate to checkout
- [ ] Verify cashback multiplier shows "3x"
- [ ] Verify delivery fee is ₹0 (FREE badge shown)
- [ ] Verify "VIP Member" badge displayed
- [ ] Calculate expected cashback: ₹1000 * 10% * 3 = ₹300
- [ ] Verify cashback shown matches expected
- [ ] Complete checkout
- [ ] Verify order placed successfully

**Expected Results:**
- ✅ 3x cashback multiplier displayed
- ✅ Free delivery applied
- ✅ VIP badge shown
- ✅ Cashback calculation correct (3x)

---

### 1.2 Profile Page - Subscription Display

#### Test Case: Subscription Tier Display
**For Each Tier (Free, Premium, VIP):**
- [ ] Login as user
- [ ] Navigate to profile page
- [ ] Verify tier badge shows correct tier
- [ ] Verify tier benefits listed correctly
- [ ] For paid tiers: Verify days remaining shown
- [ ] Click "Manage Subscription" button
- [ ] Verify navigation to subscription management page

**Expected Results:**
- ✅ Correct tier displayed
- ✅ Benefits match subscription tier
- ✅ Days remaining accurate (paid tiers only)
- ✅ Management navigation works

---

### 1.3 Wallet Page - Subscription Benefits

#### Test Case: Cashback Multiplier Display
**For Each Tier:**
- [ ] Login as user
- [ ] Navigate to wallet page
- [ ] Verify cashback multiplier card shows correct value (1x/2x/3x)
- [ ] Verify tier description matches subscription
- [ ] For free tier: Verify upgrade banner shown
- [ ] For paid tiers: Verify subscription earnings section shown
- [ ] Check subscription savings amount
- [ ] Verify total matches backend data

**Expected Results:**
- ✅ Multiplier card displays correct rate
- ✅ Upgrade banner shown (free tier only)
- ✅ Subscription earnings tracked separately

---

### 1.4 Cart Page - Subscription Benefits

#### Test Case: Cart Price Calculation
**Setup:** Cart with ₹1500 worth of items

**For Free Tier:**
- [ ] Verify delivery fee: ₹50
- [ ] Verify cashback (1x): ₹1500 * 10% * 1 = ₹150
- [ ] Verify total: ₹1500 + ₹50 = ₹1550

**For Premium Tier:**
- [ ] Verify delivery fee: ₹0 (FREE badge shown)
- [ ] Verify cashback (2x): ₹1500 * 10% * 2 = ₹300
- [ ] Verify total: ₹1500 + ₹0 = ₹1500

**For VIP Tier:**
- [ ] Verify delivery fee: ₹0 (FREE badge shown)
- [ ] Verify cashback (3x): ₹1500 * 10% * 3 = ₹450
- [ ] Verify total: ₹1500 + ₹0 = ₹1500

**Expected Results:**
- ✅ Delivery fee correct for each tier
- ✅ Cashback multiplier applied correctly
- ✅ Total calculations accurate

---

### 1.5 Order Confirmation - Tier-Based Cashback

#### Test Case: Post-Order Cashback Display
**Setup:** Complete order worth ₹2000

**For Each Tier:**
- [ ] Complete checkout
- [ ] Navigate to order confirmation page
- [ ] Verify cashback amount shown matches tier multiplier
  - Free: ₹2000 * 10% * 1 = ₹200
  - Premium: ₹2000 * 10% * 2 = ₹400
  - VIP: ₹2000 * 10% * 3 = ₹600
- [ ] For free tier: Verify "Upgrade for 2x cashback" prompt shown
- [ ] Verify cashback added to wallet balance
- [ ] Check transaction history for cashback entry

**Expected Results:**
- ✅ Cashback amount correct for tier
- ✅ Upgrade prompt shown (free tier)
- ✅ Cashback credited to wallet
- ✅ Transaction recorded

---

## 2. Gamification Integration Tests

### 2.1 Order Placement Gamification

#### Test Case: Coin Award on Order
**Setup:** Complete order worth ₹1000

- [ ] Login as user
- [ ] Note current coin balance
- [ ] Complete order successfully
- [ ] Verify coins awarded: ₹1000 * 1% = 10 coins
- [ ] Check new coin balance = old balance + 10
- [ ] Verify coin transaction in wallet history
- [ ] Check if any achievements unlocked
- [ ] If first order: Verify "First Order" achievement unlocked

**Expected Results:**
- ✅ Coins calculated: 1% of order value
- ✅ Coins added to balance
- ✅ Transaction logged
- ✅ Relevant achievements checked

#### Test Case: Achievement Unlock on Order
**Setup:** New user account

- [ ] Login as new user
- [ ] Complete first order
- [ ] Verify "First Order" achievement unlocked
- [ ] Verify achievement toast notification appears
- [ ] Wait 5 seconds, verify toast auto-dismisses
- [ ] Navigate to achievements page
- [ ] Verify achievement shows as unlocked
- [ ] Verify unlock date recorded

**Expected Results:**
- ✅ Achievement unlocked
- ✅ Toast notification shown
- ✅ Auto-dismiss works
- ✅ Achievement page updated

---

### 2.2 Review Submission Gamification

#### Test Case: Coins for Review
- [ ] Login as user
- [ ] Navigate to product page
- [ ] Click "Write Review"
- [ ] Fill in review form (5 stars, comment)
- [ ] Submit review
- [ ] Verify success message shows "You earned 50 coins"
- [ ] Check coin balance increased by 50
- [ ] Navigate to achievements
- [ ] Check progress on "Write 10 Reviews" challenge

**Expected Results:**
- ✅ 50 coins awarded
- ✅ Success message shown
- ✅ Balance updated
- ✅ Challenge progress incremented

#### Test Case: Review Achievement
**Setup:** User with 9 existing reviews

- [ ] Submit 10th review
- [ ] Verify "Review Master" achievement unlocked
- [ ] Verify achievement toast shown
- [ ] Click toast, verify navigation to achievements page
- [ ] Verify achievement shows "10 Reviews" milestone

**Expected Results:**
- ✅ Achievement unlocked on 10th review
- ✅ Toast clickable
- ✅ Navigation works
- ✅ Milestone recorded

---

### 2.3 Referral Success Gamification

#### Test Case: Tier-Based Referral Rewards
**Setup:** Referrer with referral code

**For Free Tier Referee:**
- [ ] Share referral link
- [ ] New user signs up with code
- [ ] New user completes first purchase
- [ ] Verify referrer receives 100 coins
- [ ] Verify achievement toast shown
- [ ] Check "First Referral" achievement if first referral

**For Premium Tier Referee:**
- [ ] Premium user signs up with referral code
- [ ] Premium user completes first purchase
- [ ] Verify referrer receives 200 coins
- [ ] Verify tier bonus message shown

**For VIP Tier Referee:**
- [ ] VIP user signs up with referral code
- [ ] VIP user completes first purchase
- [ ] Verify referrer receives 500 coins
- [ ] Verify special VIP referral achievement unlocked

**Expected Results:**
- ✅ Free: 100 coins
- ✅ Premium: 200 coins
- ✅ VIP: 500 coins
- ✅ Tier-based achievements work

#### Test Case: Leaderboard Update
- [ ] After referral success, check leaderboard
- [ ] Verify referrer's position updated
- [ ] Verify referral count incremented
- [ ] Check "Top Referrer" achievement progress

**Expected Results:**
- ✅ Leaderboard updates in real-time
- ✅ Referral count accurate
- ✅ Achievement progress tracked

---

### 2.4 Daily Login Streak

#### Test Case: Streak Continuation
**Day 1:**
- [ ] Login to app
- [ ] Verify welcome message or streak notification
- [ ] Verify 10 coins awarded (base daily login)
- [ ] Check streak = 1 day

**Day 2 (within 24 hours):**
- [ ] Login to app
- [ ] Verify streak = 2 days
- [ ] Verify coins awarded: 10 + (2 * 5) = 20 coins
- [ ] Verify "2 Day Streak" badge shown

**Day 7 (consecutive):**
- [ ] Login to app
- [ ] Verify streak = 7 days
- [ ] Verify coins awarded: 10 + (7 * 5) = 45 coins
- [ ] Verify "7 Day Streak" achievement unlocked
- [ ] Verify streak milestone celebrated

**Day 8 (after 48+ hour gap):**
- [ ] Login to app
- [ ] Verify streak reset to 1 day
- [ ] Verify coins awarded: 10 coins (base only)

**Expected Results:**
- ✅ Streak increments on consecutive days
- ✅ Coins scale with streak (capped at 60)
- ✅ Streak resets after missed day
- ✅ Achievements unlock at milestones

---

### 2.5 Bill Upload Gamification

#### Test Case: Bill Upload Rewards
- [ ] Navigate to bill upload page
- [ ] Verify "Earn 100 coins + 5% cashback" message shown
- [ ] Select bill image from gallery
- [ ] Upload bill (amount: ₹2000)
- [ ] Wait for verification
- [ ] Verify success message shows:
  - 100 coins earned
  - ₹100 cashback (5% of ₹2000)
- [ ] Check coin balance increased by 100
- [ ] Check cashback added to wallet
- [ ] Navigate to achievements
- [ ] Verify "Bill Master" achievement progress updated

**Expected Results:**
- ✅ 100 coins awarded
- ✅ 5% cashback calculated correctly
- ✅ Both credited to wallet
- ✅ Achievement progress tracked

#### Test Case: Bill Upload Failure
- [ ] Upload invalid/blurry bill image
- [ ] Verify verification fails
- [ ] Verify NO coins awarded
- [ ] Verify error message shown
- [ ] Verify option to re-upload

**Expected Results:**
- ✅ Verification catches invalid bills
- ✅ No rewards for failed verification
- ✅ User can retry

---

## 3. Deep Linking & Referral Tests

### 3.1 Deep Link Handling

#### Test Case: Referral Link (rezapp://)
- [ ] Generate referral link: `rezapp://ref/ABC123`
- [ ] Click link on mobile device
- [ ] Verify app opens (or prompts to install)
- [ ] Verify referral code stored
- [ ] Verify welcome message shown with code
- [ ] Navigate to registration
- [ ] Verify referral code pre-filled

**Expected Results:**
- ✅ Deep link opens app
- ✅ Code captured and stored
- ✅ Welcome message shown
- ✅ Code pre-filled in signup

#### Test Case: Web Link (https://)
- [ ] Generate web link: `https://rez.app/ref/ABC123`
- [ ] Click link in browser
- [ ] If app installed: Verify app opens with code
- [ ] If app not installed: Verify web fallback
- [ ] Complete signup with referral code
- [ ] Verify referrer gets credited

**Expected Results:**
- ✅ Universal link works
- ✅ App/web fallback functional
- ✅ Attribution successful

#### Test Case: Deep Link - Product
- [ ] Click product link: `rezapp://product/12345`
- [ ] Verify app opens to product page
- [ ] Verify product ID: 12345
- [ ] Verify product details loaded

**Expected Results:**
- ✅ Direct navigation to product
- ✅ Correct product shown

---

### 3.2 Referral Code Attribution

#### Test Case: Sign-Up with Referral Code
- [ ] User A generates referral code
- [ ] User B clicks referral link
- [ ] User B signs up
- [ ] Verify referral code applied to User B
- [ ] User B completes first order
- [ ] Verify User A receives referral reward
- [ ] Verify User B receives sign-up bonus
- [ ] Check analytics for attribution data

**Expected Results:**
- ✅ Code attributed correctly
- ✅ Both users receive rewards
- ✅ Analytics track referral source

---

## 4. Achievement Toast Notification Tests

### 4.1 Toast Display

#### Test Case: Single Achievement Unlock
- [ ] Trigger achievement unlock (e.g., complete order)
- [ ] Verify toast slides in from top
- [ ] Verify achievement details shown:
  - Icon
  - Title
  - Description
- [ ] Verify toast auto-dismisses after 5 seconds
- [ ] Verify slide-out animation

**Expected Results:**
- ✅ Toast appears at top
- ✅ All details visible
- ✅ Auto-dismiss works
- ✅ Animations smooth

#### Test Case: Multiple Achievement Unlocks
- [ ] Trigger multiple achievements simultaneously
- [ ] Verify toasts show one at a time (queue)
- [ ] Verify first toast shows for 5 seconds
- [ ] Verify second toast appears after first dismisses
- [ ] Dismiss toast manually by clicking X
- [ ] Verify next toast appears immediately

**Expected Results:**
- ✅ Toasts queued properly
- ✅ No overlapping toasts
- ✅ Manual dismiss works
- ✅ Queue processes correctly

#### Test Case: Toast Interaction
- [ ] Achievement unlocked
- [ ] Click on toast (not X button)
- [ ] Verify navigation to achievements page
- [ ] Verify unlocked achievement highlighted
- [ ] Return to app
- [ ] Verify toast dismissed

**Expected Results:**
- ✅ Toast clickable
- ✅ Navigation works
- ✅ Correct achievement shown

---

## 5. Integration Testing Across Features

### 5.1 Complete Purchase Flow

#### Test Case: Free User → Premium Upgrade → Purchase
- [ ] Login as free tier user
- [ ] Add items to cart (₹3000)
- [ ] View cart: Verify 1x cashback, ₹50 delivery
- [ ] Navigate to checkout
- [ ] Click "Upgrade to Premium" CTA
- [ ] Complete subscription purchase (Premium)
- [ ] Return to checkout
- [ ] Refresh page
- [ ] Verify now shows:
  - 2x cashback multiplier
  - FREE delivery
  - Premium badge
- [ ] Complete order
- [ ] Verify gamification triggers:
  - Subscription upgrade achievement
  - Order placement coins
  - Premium tier bonus coins
- [ ] Check wallet: Verify 2x cashback credited

**Expected Results:**
- ✅ Subscription changes reflected immediately
- ✅ Benefits applied to ongoing checkout
- ✅ All gamification triggers fire
- ✅ Rewards calculated with new tier

---

### 5.2 Referral → Sign-Up → Order → Review

#### Test Case: Complete User Journey
**Step 1: Referral**
- [ ] User A shares referral link

**Step 2: Sign-Up**
- [ ] User B clicks link, code captured
- [ ] User B completes registration
- [ ] Verify code applied

**Step 3: First Order**
- [ ] User B places first order
- [ ] Verify User A receives referral reward
- [ ] Verify User B receives first-order coins
- [ ] Check achievements unlocked:
  - User B: "First Order"
  - User A: "First Referral" (if applicable)

**Step 4: Review**
- [ ] User B submits review
- [ ] Verify 50 coin reward
- [ ] Check "First Review" achievement

**Step 5: Daily Login**
- [ ] Next day, User B logs in
- [ ] Verify streak = 2 days
- [ ] Verify login coins awarded

**Expected Results:**
- ✅ All steps trigger gamification correctly
- ✅ Referral attribution works end-to-end
- ✅ Multiple triggers don't conflict
- ✅ All rewards credited

---

## 6. Error Handling & Edge Cases

### 6.1 API Failure Scenarios

#### Test Case: Subscription API Down
- [ ] Disconnect subscription API
- [ ] Login as user
- [ ] Navigate to checkout
- [ ] Verify graceful degradation:
  - Default to free tier (1x cashback)
  - Show delivery fee
  - No errors thrown
- [ ] Complete order successfully
- [ ] Verify order placed despite API failure

**Expected Results:**
- ✅ App doesn't crash
- ✅ Falls back to free tier defaults
- ✅ Core functionality works

#### Test Case: Gamification API Down
- [ ] Disconnect gamification API
- [ ] Complete order
- [ ] Verify order succeeds
- [ ] Verify no achievement toasts (expected)
- [ ] Verify no coins awarded (logged as pending)
- [ ] Reconnect API
- [ ] Verify pending rewards sync

**Expected Results:**
- ✅ Order not blocked by gamification failure
- ✅ Rewards queued for retry
- ✅ Sync works on reconnect

---

### 6.2 Edge Cases

#### Test Case: Subscription Expiry During Checkout
- [ ] Premium user with 1 hour remaining
- [ ] Start checkout
- [ ] Wait for subscription to expire
- [ ] Complete checkout
- [ ] Verify benefits applied match subscription state at time of order placement

**Expected Results:**
- ✅ Benefits locked at checkout start
- ✅ Or updated dynamically (based on business logic)

#### Test Case: Duplicate Achievement Unlock
- [ ] Trigger same achievement twice
- [ ] Verify only one unlock counted
- [ ] Verify only one toast shown
- [ ] Verify achievement page shows single unlock

**Expected Results:**
- ✅ Duplicate prevention works
- ✅ No duplicate notifications

---

## 7. Performance Testing

### 7.1 Load Testing

#### Test Case: Subscription Data Caching
- [ ] Login as user
- [ ] Navigate to profile (loads subscription)
- [ ] Note load time
- [ ] Navigate to checkout (should use cache)
- [ ] Verify load < 100ms (cached)
- [ ] Wait 5 minutes (cache expires)
- [ ] Navigate to wallet
- [ ] Verify fresh API call made

**Expected Results:**
- ✅ Cache improves performance
- ✅ Cache expiry works correctly
- ✅ Fresh data loaded when needed

#### Test Case: Achievement Toast Performance
- [ ] Unlock 5 achievements simultaneously
- [ ] Verify app remains responsive
- [ ] Verify toast queue processes smoothly
- [ ] Verify no frame drops during animations

**Expected Results:**
- ✅ No UI lag
- ✅ Animations smooth (60fps)
- ✅ Queue doesn't block main thread

---

## 8. Analytics Verification

### 8.1 Event Tracking

#### Test Case: Subscription Events
- [ ] Upgrade to Premium
- [ ] Verify analytics event: `subscription_upgraded`
- [ ] Check event properties:
  - `from_tier`: "free"
  - `to_tier`: "premium"
  - `user_id`: [user ID]
- [ ] Complete order with benefits
- [ ] Verify event: `premium_benefit_used`

**Expected Results:**
- ✅ All subscription events tracked
- ✅ Event properties correct
- ✅ User attribution accurate

#### Test Case: Gamification Events
- [ ] Unlock achievement
- [ ] Verify event: `achievement_unlocked`
- [ ] Earn coins
- [ ] Verify event: `coins_earned`
- [ ] Complete challenge
- [ ] Verify event: `challenge_completed`

**Expected Results:**
- ✅ All gamification events tracked
- ✅ Coin transactions logged
- ✅ Achievement data captured

---

## Test Summary Template

After completing all tests, fill out:

```
## Test Execution Summary

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

### Subscription Integration
- Total Tests: X
- Passed: X
- Failed: X
- Notes: [Any issues]

### Gamification Integration
- Total Tests: X
- Passed: X
- Failed: X
- Notes: [Any issues]

### Deep Linking
- Total Tests: X
- Passed: X
- Failed: X
- Notes: [Any issues]

### Achievement Toasts
- Total Tests: X
- Passed: X
- Failed: X
- Notes: [Any issues]

### Critical Bugs:
1. [Bug description]
2. [Bug description]

### Recommendations:
1. [Recommendation]
2. [Recommendation]

**Overall Status:** ✅ Pass / ❌ Fail / ⚠️ Pass with Issues
```

---

## Automation Scripts

### Run All Integration Tests
```bash
npm run test:integration

# Or specific suites
npm run test:subscription
npm run test:gamification
npm run test:deeplink
```

### Generate Test Report
```bash
npm run test:report
```

---

## Sign-Off

**QA Lead:** _____________________
**Date:** _____________________

**Product Manager:** _____________________
**Date:** _____________________

**Tech Lead:** _____________________
**Date:** _____________________
