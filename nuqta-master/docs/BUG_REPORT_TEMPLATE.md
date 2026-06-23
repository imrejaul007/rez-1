# Bug Report Template

---

## Bug ID: [AUTO-GENERATED]

**Date Reported**: [YYYY-MM-DD]
**Reported By**: [Name/Email]
**Assigned To**: [Developer Name]
**Status**: ⬜ New | ⬜ In Progress | ⬜ Resolved | ⬜ Closed | ⬜ Deferred

---

## 1. Basic Information

### Bug Title
**[Provide a clear, concise title describing the issue]**

Example: "Cart total calculation incorrect when applying multiple coupons"

---

### Severity
⬜ **P0 - Critical** (App crashes, data loss, security issues, payment failures)
⬜ **P1 - High** (Major features broken, significant UX issues, blocks workflows)
⬜ **P2 - Medium** (Minor features broken, UI glitches, workarounds available)
⬜ **P3 - Low** (Cosmetic issues, typos, nice-to-have improvements)

---

### Priority
⬜ **Urgent** (Fix immediately, blocks release)
⬜ **High** (Fix in current sprint)
⬜ **Medium** (Fix in next sprint)
⬜ **Low** (Fix when time permits)

---

### Category
⬜ Functional Bug
⬜ UI/UX Issue
⬜ Performance Issue
⬜ Security Vulnerability
⬜ Data Integrity Issue
⬜ Accessibility Issue
⬜ Localization Issue
⬜ Integration Issue
⬜ Other: _____________

---

### Component/Feature
⬜ Authentication/Onboarding
⬜ Homepage
⬜ Search & Discovery
⬜ Product Pages
⬜ Shopping Cart
⬜ Checkout
⬜ Payment
⬜ Order Management
⬜ Store Pages
⬜ Bill Upload
⬜ Wallet
⬜ Earn Tab
⬜ Play Tab
⬜ Profile
⬜ Wishlist
⬜ Notifications
⬜ Reviews & Ratings
⬜ UGC & Social
⬜ Offers & Deals
⬜ Other: _____________

---

## 2. Environment Details

### Platform
⬜ iOS
⬜ Android
⬜ Both

---

### Device Information
**Device Model**: [e.g., iPhone 14, Samsung S22, Pixel 7]
**OS Version**: [e.g., iOS 17.1, Android 13]
**Screen Size**: [e.g., 6.1", 1170x2532]
**RAM**: [e.g., 6 GB]

---

### App Information
**App Version**: [e.g., 1.2.3]
**Build Number**: [e.g., 45]
**Environment**: ⬜ Production | ⬜ Staging | ⬜ Development
**Installation Method**: ⬜ App Store | ⬜ TestFlight | ⬜ APK

---

### Network Conditions
⬜ WiFi (fast)
⬜ 4G/LTE
⬜ 3G
⬜ 2G
⬜ Offline
⬜ Switching networks

---

### User Account Details
**User ID**: [If applicable]
**Account Type**: ⬜ New User | ⬜ Existing User | ⬜ Premium User
**Login Method**: ⬜ Phone | ⬜ Email | ⬜ Social Login

---

## 3. Bug Description

### Summary
**[Provide a clear, concise description of what's wrong]**

Example: "When a user applies two coupons to their cart (one for 10% off and one for free shipping), the total price becomes negative instead of showing the correct discounted amount."

---

### Expected Behavior
**[What should happen?]**

Example: "The cart should apply the 10% discount to eligible items and show free shipping, with the total being the correct positive value (original price - 10%)."

---

### Actual Behavior
**[What actually happens?]**

Example: "The cart shows a negative total value of -₹150 after applying both coupons."

---

### Impact on Users
**[How does this affect user experience?]**

Example: "Users cannot complete checkout when the total is negative. This blocks all purchases when multiple coupons are used together, affecting approximately 15% of transactions."

---

## 4. Steps to Reproduce

**[Provide detailed, numbered steps]**

1. Launch the app and login as a registered user
2. Add "Product A" (₹1000) to cart
3. Add "Product B" (₹500) to cart
4. Navigate to cart page
5. Apply coupon code "SAVE10" (10% off)
6. Observe: Total shows ₹1350 (correct)
7. Apply coupon code "FREESHIP" (free shipping)
8. Observe: Total now shows -₹150 (incorrect)

**Reproducibility**:
⬜ Always (100% of the time)
⬜ Often (75-99% of the time)
⬜ Sometimes (25-74% of the time)
⬜ Rarely (< 25% of the time)
⬜ Once (unable to reproduce)

---

## 5. Visual Evidence

### Screenshots
**[Attach screenshots showing the issue]**

- Screenshot 1: [Before the bug occurs - cart with first coupon]
- Screenshot 2: [Bug occurring - negative total after second coupon]
- Screenshot 3: [Any error messages displayed]

**Files**:
- [ ] Attached: screenshot_1.png
- [ ] Attached: screenshot_2.png
- [ ] Attached: screenshot_3.png

---

### Screen Recording
**[Attach video showing the bug]**

- Video showing complete reproduction steps
- Duration: [e.g., 45 seconds]

**File**:
- [ ] Attached: bug_video.mp4

---

### Console Logs
**[Attach relevant console output]**

```
[Paste console logs here]

Example:
[ERROR] CartCalculator:calculateTotal - Invalid coupon combination
[WARN] PriceService:applyDiscount - Total became negative: -150
[ERROR] CheckoutService - Cannot proceed with negative total
```

**File**:
- [ ] Attached: console_logs.txt

---

### Network Logs
**[Attach network request/response if relevant]**

```
Request:
POST /api/cart/apply-coupon
{
  "cartId": "123abc",
  "couponCode": "FREESHIP"
}

Response:
{
  "success": true,
  "total": -150,
  "error": null
}
```

**File**:
- [ ] Attached: network_logs.txt

---

## 6. Technical Details

### Error Messages
**[Copy exact error messages if any]**

```
[Paste error messages here]

Example:
Error: Total cannot be negative
  at CartCalculator.calculateTotal (CartCalculator.tsx:145)
  at CartContext.applyCoupon (CartContext.tsx:89)
```

---

### Stack Trace
**[Provide full stack trace if available]**

```
[Paste stack trace here]
```

**File**:
- [ ] Attached: stack_trace.txt

---

### Suspected Root Cause
**[If you have insights into why this might be happening]**

Example: "The `calculateTotal()` function seems to subtract the shipping discount twice when multiple coupons are applied, instead of checking if shipping is already free."

---

### Affected Code
**[If known, reference the suspected files/functions]**

- File: `frontend/contexts/CartContext.tsx`
- Function: `calculateTotal()` (lines 140-160)
- File: `frontend/utils/price-calculator.ts`
- Function: `applyMultipleCoupons()` (lines 45-70)

---

## 7. Additional Context

### Related Issues
**[Link any related bugs or feature requests]**

- Related to Bug #234: "Coupon validation not working"
- Duplicate of Bug #156: "Negative totals in checkout"
- Blocks Feature #789: "Multi-coupon support"

---

### Workaround
**[If there's a temporary workaround, describe it]**

Example: "Users can complete checkout by applying only one coupon at a time. Apply SAVE10, complete purchase, then use FREESHIP on next order."

---

### Regression
**[Did this work before? When did it break?]**

⬜ New feature (never worked)
⬜ Regression (worked in previous version)
⬜ Unknown

**Last Known Working Version**: [e.g., v1.1.5]
**First Broken Version**: [e.g., v1.2.0]

---

### User Impact Metrics
**[If available, provide data on impact]**

- Affected Users: [e.g., ~500 users/day]
- Error Rate: [e.g., 2.5% of cart operations]
- Support Tickets: [e.g., 15 tickets filed]
- Revenue Impact: [e.g., Estimated ₹50,000/day in blocked transactions]

---

### Browser/Webview Details
**[If relevant for web or webview components]**

- Browser: [e.g., Chrome, Safari]
- Version: [e.g., Chrome 119]
- Engine: [e.g., WebKit, Chromium]

---

## 8. Testing Notes

### Test Accounts Used
- Account 1: test.user1@example.com
- Account 2: test.user2@example.com

---

### Test Data
- Product IDs: PRD-001, PRD-002
- Coupon Codes: SAVE10, FREESHIP
- Cart ID: 123abc

---

### Special Conditions
**[Any specific setup required to reproduce]**

Example:
- Requires cart with at least 2 items
- Requires both percentage and shipping coupons
- Only happens when coupons applied in specific order

---

## 9. Fix Verification

### Acceptance Criteria
**[How to verify the fix is correct]**

- [ ] Cart total remains positive with multiple coupons
- [ ] Each coupon applies correctly in any order
- [ ] Price breakdown shows all discounts clearly
- [ ] Checkout can proceed with valid total
- [ ] No console errors during coupon application
- [ ] Unit tests pass for multi-coupon scenarios

---

### Test Cases to Run
**[Specific test cases to verify fix]**

1. Apply 10% off coupon first, then free shipping
2. Apply free shipping first, then 10% off
3. Apply three or more coupons together
4. Remove and re-apply coupons
5. Test with varying cart values (₹100, ₹1000, ₹10000)

---

### Regression Testing
**[Areas to check for regression]**

- [ ] Single coupon application still works
- [ ] Cart calculations without coupons correct
- [ ] Checkout flow not broken
- [ ] Order confirmation shows correct total
- [ ] Receipt displays discounts properly

---

## 10. Resolution

### Resolution Status
⬜ Fixed
⬜ Won't Fix
⬜ Duplicate
⬜ Cannot Reproduce
⬜ Works as Designed
⬜ Deferred to Future Release

---

### Fix Description
**[Developer to fill - how was the bug fixed?]**

Example: "Modified the `calculateTotal()` function to track which discounts have been applied. Added a check to prevent shipping discount from being applied multiple times. Updated coupon validation logic to ensure total never goes below zero."

---

### Files Changed
**[List of files modified in the fix]**

- [ ] `frontend/contexts/CartContext.tsx`
- [ ] `frontend/utils/price-calculator.ts`
- [ ] `frontend/types/cart.ts`
- [ ] `frontend/__tests__/CartContext.test.ts`

---

### Commit/PR Reference
**Commit Hash**: [e.g., abc123def456]
**Pull Request**: [e.g., #345]
**Branch**: [e.g., bugfix/cart-negative-total]

---

### Fixed in Version
**Version**: [e.g., 1.2.4]
**Build**: [e.g., 47]
**Release Date**: [e.g., 2025-01-20]

---

### Verified By
**Tester Name**: [Name]
**Verification Date**: [YYYY-MM-DD]
**Verification Status**: ⬜ Pass | ⬜ Fail

**Verification Notes**:
[Any notes about the fix verification]

---

## 11. Internal Notes

### Developer Notes
**[Space for developer comments during investigation]**

---

### QA Notes
**[Space for QA team notes during testing]**

---

### Product Notes
**[Space for product team notes about user impact, priority, etc.]**

---

## 12. Attachments

### Files Attached
- [ ] Screenshots (required)
- [ ] Screen recording (if applicable)
- [ ] Console logs (if applicable)
- [ ] Network logs (if applicable)
- [ ] Stack trace (if applicable)
- [ ] Database state (if applicable)
- [ ] Test data (if applicable)

---

## 13. Follow-up Actions

### Action Items
- [ ] Update unit tests to cover this scenario
- [ ] Add integration test for multi-coupon flow
- [ ] Update documentation about coupon limitations
- [ ] Add validation to prevent negative totals
- [ ] Monitor production metrics post-fix
- [ ] Create Jira ticket for backend validation
- [ ] Update API documentation

---

### Preventive Measures
**[How to prevent similar bugs in future]**

Example:
- Add automated tests for all coupon combinations
- Implement server-side validation for cart totals
- Add lint rule to check for negative value handling
- Include coupon testing in regression suite

---

## Document Metadata

**Template Version**: 1.0
**Last Updated**: 2025-01-15
**Created By**: QA Team
**Document Type**: Bug Report

---

## Quick Reference Guide

### When to Use Each Severity Level

**P0 - Critical**:
- App crashes on launch
- User data loss
- Payment processing broken
- Security breach
- Complete feature unavailable

**P1 - High**:
- Major features broken (can't add to cart, can't checkout)
- Significant data corruption
- Major performance degradation
- Widespread user impact (> 25% of users)

**P2 - Medium**:
- Minor features broken (filters don't work)
- UI elements misaligned
- Moderate performance issues
- Limited user impact (< 25% of users)
- Workarounds available

**P3 - Low**:
- Typos and text issues
- Minor UI inconsistencies
- Cosmetic issues
- Feature enhancements
- Documentation errors

---

### How to Write a Good Bug Title

❌ **Bad**: "App not working"
✅ **Good**: "App crashes when tapping checkout button with empty cart"

❌ **Bad**: "Button broken"
✅ **Good**: "Add to Cart button unresponsive on product detail page (iOS only)"

❌ **Bad**: "Login issue"
✅ **Good**: "OTP verification fails with error 'Invalid code' for valid OTPs on Android 13"

**Format**: `[Component] [Action] [Result/Error] [Condition if applicable]`

---

### Tips for Effective Bug Reports

1. **Be Specific**: Vague descriptions like "it doesn't work" don't help
2. **Provide Context**: Include device, OS, app version, network conditions
3. **Show, Don't Just Tell**: Screenshots and videos are worth 1000 words
4. **Number Your Steps**: Clear, numbered reproduction steps
5. **One Bug Per Report**: Don't combine multiple issues
6. **Check for Duplicates**: Search existing bugs before creating new ones
7. **Include Logs**: Console logs and error messages are crucial
8. **Describe Impact**: Help prioritize by explaining user impact
9. **Suggest Workarounds**: If you found a temporary solution
10. **Be Professional**: Stick to facts, avoid emotional language

---

## Example: Complete Bug Report

### Bug Title
Cart total shows negative value when applying coupon codes SAVE10 and FREESHIP together

### Severity: P1 - High
### Priority: Urgent
### Category: Functional Bug
### Component: Shopping Cart

### Environment
- Platform: Both iOS and Android
- Device: iPhone 14 (iOS 17.1), Samsung S22 (Android 13)
- App Version: 1.2.3
- Build: 45
- Environment: Production
- Network: WiFi

### Bug Description
**Summary**: When applying multiple coupon codes to the cart (SAVE10 for 10% off and FREESHIP for free shipping), the cart total becomes negative instead of showing the correct discounted price.

**Expected**: Cart should calculate: (Item Total - 10% discount) + ₹0 shipping = Positive total

**Actual**: Cart shows negative total of -₹150

**Impact**: Users cannot complete checkout, blocking ~15% of transactions where multiple coupons are used.

### Steps to Reproduce
1. Login as registered user (test.user1@example.com)
2. Add "Blue T-Shirt" (₹1000) to cart
3. Add "Black Jeans" (₹500) to cart
4. Navigate to cart page - Total shows ₹1500 + ₹100 shipping = ₹1600
5. Enter coupon "SAVE10" and tap Apply - Total shows ₹1350 + ₹100 shipping = ₹1450 ✓
6. Enter coupon "FREESHIP" and tap Apply - Total shows -₹150 ✗

**Reproducibility**: Always (100%)

### Screenshots
- [Attached: cart_before.png] - Cart with first coupon applied correctly
- [Attached: cart_negative.png] - Cart showing negative total after second coupon
- [Attached: console_error.png] - Console showing calculation error

### Console Logs
```
[ERROR] 2025-01-15 14:23:45 - CartCalculator:calculateTotal - Calculation resulted in negative value
[WARN] 2025-01-15 14:23:45 - CheckoutButton - Disabled due to invalid total: -150
```

### Suspected Root Cause
The `applyMultipleCoupons()` function likely subtracts the shipping amount twice or doesn't properly track which discounts have been applied.

### Affected Code
- `frontend/contexts/CartContext.tsx` - `calculateTotal()` function
- `frontend/utils/price-calculator.ts` - `applyMultipleCoupons()` function

### User Impact
- Affected Users: ~500 users/day attempting multi-coupon usage
- Error Rate: 100% when specific coupons combined
- Support Tickets: 23 tickets in last week
- Revenue Impact: Estimated ₹75,000/day in blocked transactions

### Workaround
Users can apply only one coupon per order. To get both benefits, they must make separate purchases or contact support for manual discount application.

### Attachments
- ✓ Screenshots attached (3 files)
- ✓ Screen recording attached (cart_bug_demo.mp4)
- ✓ Console logs attached (console_logs.txt)
- ✓ Network logs attached (api_responses.json)

---

**Reported By**: qa.tester@rezapp.com
**Date**: 2025-01-15
**Status**: New → Assigned to Dev Team

---

*End of Template*
