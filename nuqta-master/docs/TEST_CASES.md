# Comprehensive Test Cases

Complete test case documentation for all REZ app features.

## Authentication

### TC-AUTH-001: OTP Generation
**Description:** User requests OTP for login/registration
**Preconditions:** Valid phone number
**Steps:**
1. Enter phone number (+1234567890)
2. Tap "Send OTP"
3. Verify OTP sent message
**Expected Result:** OTP sent successfully, SMS received
**Priority:** Critical

### TC-AUTH-002: OTP Verification Success
**Description:** User enters correct OTP
**Steps:**
1. Enter valid OTP (123456)
2. Tap "Verify"
**Expected Result:** User logged in, redirected to home
**Priority:** Critical

### TC-AUTH-003: OTP Verification Failure
**Description:** User enters incorrect OTP
**Steps:**
1. Enter invalid OTP (000000)
2. Tap "Verify"
**Expected Result:** Error message shown, user remains on OTP screen
**Priority:** High

### TC-AUTH-004: OTP Expiration
**Description:** OTP expires after 5 minutes
**Steps:**
1. Request OTP
2. Wait 5+ minutes
3. Try to verify
**Expected Result:** "OTP expired" error, option to resend
**Priority:** High

### TC-AUTH-005: Rate Limiting
**Description:** Prevent OTP spam
**Steps:**
1. Request OTP 3 times in 1 minute
**Expected Result:** Rate limit error after 3rd attempt
**Priority:** Medium

---

## Product Browsing

### TC-PROD-001: View Product List
**Description:** Browse product catalog
**Steps:**
1. Open app
2. Navigate to Products
**Expected Result:** Grid of products displayed
**Priority:** Critical

### TC-PROD-002: Product Search
**Description:** Search for products
**Steps:**
1. Tap search icon
2. Enter "iPhone"
3. Submit search
**Expected Result:** Relevant products displayed
**Priority:** Critical

### TC-PROD-003: Product Filtering
**Description:** Filter products by price
**Steps:**
1. Open filters
2. Set price range 500-1000
3. Apply
**Expected Result:** Only products in range shown
**Priority:** High

### TC-PROD-004: Product Sorting
**Description:** Sort products
**Steps:**
1. Open sort menu
2. Select "Price: Low to High"
**Expected Result:** Products sorted correctly
**Priority:** Medium

---

## Shopping Cart

### TC-CART-001: Add to Cart
**Description:** Add product to cart
**Steps:**
1. View product details
2. Select quantity: 2
3. Tap "Add to Cart"
**Expected Result:** Product added, badge updated, success message
**Priority:** Critical

### TC-CART-002: Update Quantity
**Description:** Change item quantity in cart
**Steps:**
1. Open cart
2. Increment quantity on item
**Expected Result:** Quantity updated, total recalculated
**Priority:** High

### TC-CART-003: Remove Item
**Description:** Remove item from cart
**Steps:**
1. Open cart
2. Tap remove icon
3. Confirm
**Expected Result:** Item removed, totals updated
**Priority:** High

### TC-CART-004: Cart Persistence
**Description:** Cart persists after app restart
**Steps:**
1. Add items to cart
2. Close app
3. Reopen app
**Expected Result:** Cart items still present
**Priority:** Medium

### TC-CART-005: Out of Stock Handling
**Description:** Handle item becoming out of stock
**Steps:**
1. Add item to cart
2. Item goes out of stock
3. Try to checkout
**Expected Result:** Warning shown, item flagged
**Priority:** High

---

## Checkout Process

### TC-CHECK-001: Complete Checkout
**Description:** Full checkout flow
**Steps:**
1. Add items to cart
2. Proceed to checkout
3. Select address
4. Select payment method
5. Apply coupon "SAVE10"
6. Place order
**Expected Result:** Order created, confirmation shown
**Priority:** Critical

### TC-CHECK-002: Add New Address
**Description:** Add delivery address during checkout
**Steps:**
1. Start checkout
2. Tap "Add New Address"
3. Fill form
4. Save
**Expected Result:** Address saved and selected
**Priority:** High

### TC-CHECK-003: Payment Card
**Description:** Pay with credit card
**Steps:**
1. Enter card details
2. Submit payment
**Expected Result:** Payment processed, order confirmed
**Priority:** Critical

### TC-CHECK-004: Payment Failure
**Description:** Handle declined payment
**Steps:**
1. Enter invalid card
2. Submit
**Expected Result:** Error shown, retry option available
**Priority:** High

### TC-CHECK-005: Apply Coupon
**Description:** Use discount coupon
**Steps:**
1. Enter coupon "SAVE10"
2. Apply
**Expected Result:** 10% discount applied to total
**Priority:** Medium

### TC-CHECK-006: Invalid Coupon
**Description:** Try invalid coupon
**Steps:**
1. Enter "INVALID"
2. Apply
**Expected Result:** "Invalid coupon" error shown
**Priority:** Low

---

## Order Management

### TC-ORDER-001: View Orders
**Description:** View order history
**Steps:**
1. Navigate to Profile > Orders
**Expected Result:** List of all orders displayed
**Priority:** High

### TC-ORDER-002: Order Details
**Description:** View order details
**Steps:**
1. Tap on order
**Expected Result:** Full order details shown
**Priority:** High

### TC-ORDER-003: Track Order
**Description:** Track order status
**Steps:**
1. Open order details
2. View tracking info
**Expected Result:** Current status and timeline shown
**Priority:** High

### TC-ORDER-004: Cancel Order
**Description:** Cancel pending order
**Steps:**
1. Open order
2. Tap "Cancel Order"
3. Confirm
**Expected Result:** Order cancelled, refund initiated
**Priority:** High

### TC-ORDER-005: Cannot Cancel Shipped Order
**Description:** Prevent cancelling shipped orders
**Steps:**
1. Try to cancel shipped order
**Expected Result:** Cancel button disabled, message shown
**Priority:** Medium

---

## Social Media Earnings

### TC-SOCIAL-001: Submit Instagram Post
**Description:** Submit post for earnings
**Steps:**
1. Navigate to Earn > Instagram
2. Enter post URL
3. Submit
**Expected Result:** Submission received, pending verification
**Priority:** Critical

### TC-SOCIAL-002: Duplicate Submission
**Description:** Prevent duplicate posts
**Steps:**
1. Submit post URL
2. Try to submit same URL again
**Expected Result:** "Already submitted" error
**Priority:** High

### TC-SOCIAL-003: Rate Limiting
**Description:** Enforce submission limits
**Steps:**
1. Submit 3 posts in 1 day
2. Try to submit 4th
**Expected Result:** Daily limit error shown
**Priority:** High

### TC-SOCIAL-004: Track Earnings
**Description:** View earned amount
**Steps:**
1. Navigate to Earnings
**Expected Result:** All earnings displayed with status
**Priority:** Medium

---

## Group Buying

### TC-GROUP-001: Join Group Deal
**Description:** Join active group deal
**Steps:**
1. Browse group deals
2. Select deal
3. Join with quantity 1
**Expected Result:** Successfully joined, progress updated
**Priority:** Critical

### TC-GROUP-002: Group Completion
**Description:** Complete group when minimum reached
**Steps:**
1. Group reaches minimum participants
**Expected Result:** All participants notified, orders created
**Priority:** Critical

### TC-GROUP-003: Group Failure
**Description:** Handle failed group deal
**Steps:**
1. Group expires without minimum
**Expected Result:** All participants refunded, notified
**Priority:** High

### TC-GROUP-004: Leave Group
**Description:** Leave active group
**Steps:**
1. Open active participation
2. Leave group
3. Confirm
**Expected Result:** Left successfully, refunded
**Priority:** Medium

### TC-GROUP-005: Cannot Leave Completed Group
**Description:** Prevent leaving completed group
**Steps:**
1. Try to leave completed group
**Expected Result:** Leave option disabled
**Priority:** Low

---

## Referral System

### TC-REF-001: Generate Referral Code
**Description:** Create referral link
**Steps:**
1. Navigate to Referrals
2. Tap "Share Code"
**Expected Result:** Unique code generated, share options shown
**Priority:** High

### TC-REF-002: Use Referral Code
**Description:** Sign up with referral code
**Steps:**
1. New user enters referral code during registration
2. Complete registration
**Expected Result:** Both users receive bonus
**Priority:** High

### TC-REF-003: Track Referrals
**Description:** View referral statistics
**Steps:**
1. Navigate to Referrals
**Expected Result:** Number of referrals and earnings shown
**Priority:** Medium

---

## Profile Management

### TC-PROF-001: Edit Profile
**Description:** Update profile information
**Steps:**
1. Navigate to Profile
2. Edit name and email
3. Save
**Expected Result:** Profile updated successfully
**Priority:** High

### TC-PROF-002: Change Password
**Description:** Update password
**Steps:**
1. Go to Settings > Security
2. Change password
3. Confirm
**Expected Result:** Password updated, logged out
**Priority:** High

### TC-PROF-003: Manage Addresses
**Description:** Add/edit/delete addresses
**Steps:**
1. Go to Addresses
2. Perform operations
**Expected Result:** All operations work correctly
**Priority:** Medium

### TC-PROF-004: Payment Methods
**Description:** Manage saved cards
**Steps:**
1. Go to Payment Methods
2. Add/remove cards
**Expected Result:** Cards managed correctly
**Priority:** Medium

---

## Edge Cases & Error Scenarios

### TC-EDGE-001: Network Failure
**Description:** Handle offline mode
**Steps:**
1. Disconnect internet
2. Try to browse products
**Expected Result:** Offline message shown, cached data displayed
**Priority:** High

### TC-EDGE-002: Session Expiry
**Description:** Handle expired session
**Steps:**
1. Wait for session to expire
2. Try to perform action
**Expected Result:** Redirected to login
**Priority:** High

### TC-EDGE-003: Concurrent Requests
**Description:** Handle multiple simultaneous requests
**Steps:**
1. Trigger multiple API calls
**Expected Result:** All handled correctly, no race conditions
**Priority:** Medium

### TC-EDGE-004: Large Cart
**Description:** Handle cart with many items
**Steps:**
1. Add 50+ items to cart
**Expected Result:** Cart loads smoothly, checkout works
**Priority:** Medium

### TC-EDGE-005: Special Characters
**Description:** Handle special characters in input
**Steps:**
1. Enter name with emojis and special chars
2. Save
**Expected Result:** Handled correctly or validation error
**Priority:** Low

---

## Performance Test Cases

### TC-PERF-001: App Launch Time
**Description:** App should launch quickly
**Steps:**
1. Launch app (cold start)
**Expected Result:** < 3 seconds to interactive
**Priority:** High

### TC-PERF-002: Search Response Time
**Description:** Search results load quickly
**Steps:**
1. Perform search
**Expected Result:** Results shown in < 1 second
**Priority:** High

### TC-PERF-003: Checkout Performance
**Description:** Checkout completes quickly
**Steps:**
1. Complete full checkout
**Expected Result:** < 5 seconds total
**Priority:** Medium

### TC-PERF-004: Large List Scrolling
**Description:** Smooth scrolling with many items
**Steps:**
1. Scroll through 100+ products
**Expected Result:** 60 FPS maintained
**Priority:** Medium

---

## Security Test Cases

### TC-SEC-001: XSS Prevention
**Description:** Prevent cross-site scripting
**Steps:**
1. Enter `<script>alert('xss')</script>` in input
**Expected Result:** Script not executed, sanitized
**Priority:** Critical

### TC-SEC-002: SQL Injection Prevention
**Description:** Prevent SQL injection
**Steps:**
1. Enter `'; DROP TABLE users--` in search
**Expected Result:** Treated as string, no DB impact
**Priority:** Critical

### TC-SEC-003: Token Validation
**Description:** Validate authentication tokens
**Steps:**
1. Modify auth token
2. Make request
**Expected Result:** Request rejected, logged out
**Priority:** Critical

---

## Accessibility Test Cases

### TC-A11Y-001: Screen Reader Support
**Description:** App works with screen readers
**Steps:**
1. Enable VoiceOver/TalkBack
2. Navigate app
**Expected Result:** All elements properly labeled
**Priority:** High

### TC-A11Y-002: Keyboard Navigation
**Description:** Navigate with keyboard only
**Steps:**
1. Use tab to navigate
**Expected Result:** All interactive elements accessible
**Priority:** Medium

### TC-A11Y-003: Color Contrast
**Description:** Sufficient color contrast
**Steps:**
1. Review UI colors
**Expected Result:** Meet WCAG AA standards
**Priority:** Medium

---

## Test Data

### Valid Test Data
- Phone: +1234567890
- Email: test@example.com
- OTP: 123456
- Coupon: SAVE10 (10% off)
- Card: 4242 4242 4242 4242

### Invalid Test Data
- Phone: invalid
- Email: not-an-email
- OTP: 000000
- Coupon: INVALID
- Card: 0000 0000 0000 0000

---

**Total Test Cases:** 60+
**Last Updated:** 2024-01-27
