# Features Quick Reference Guide

Quick access guide for all completed features.

---

## 1. Subscription Plans
**Path:** `app/subscription/plans.tsx`

### How to Use:
1. Navigate to subscription page from profile
2. Toggle between Monthly/Yearly billing
3. Click "Have a Promo Code?" to apply discount
4. Select plan and click "Upgrade Now"
5. Confirm purchase in dialog

### Promo Codes:
- `SAVE10` - 10% off
- `SAVE20` - 20% off
- `WELCOME` - 15% off
- `FIRST` - 25% off

### Features:
- Monthly/Yearly toggle with savings display
- Promo code application
- Purchase confirmation
- Cancellation flow
- Current plan indicator
- Feature comparison table

---

## 2. Scratch Cards
**Path:** `app/scratch-card.tsx`

### How to Use:
1. Complete 80% of your profile
2. Navigate to scratch card page
3. Click "Scratch Card" button
4. Prize is revealed
5. Click "Claim Prize" to add to wallet/vouchers

### Requirements:
- Profile completion ≥ 80%
- One scratch per milestone

### Prize Types:
- **Discount** - 10% off (→ Home)
- **Cashback** - ₹50 (→ Wallet)
- **REZ Coins** - 100 coins (→ Wallet)
- **Voucher** - ₹200 (→ My Vouchers)

---

## 3. My Services
**Path:** `app/my-services.tsx`

### How to Use:
1. Navigate from profile menu
2. View your service submissions
3. Pull down to refresh
4. Click "+" to create new content
5. View status and rewards

### Service Types:
- Video projects
- Content creation
- Reviews

### Status Indicators:
- **Active** (Blue) - Under review
- **Completed** (Green) - Approved & paid
- **Pending** (Orange) - Submitted
- **Cancelled** (Red) - Rejected

### Mock Data:
If backend unavailable, shows sample services with info banner.

---

## 4. Cashback
**Path:** `app/account/cashback.tsx`

### How to Use:
1. Navigate to Cashback from account settings
2. View total earned at top
3. Switch between tabs: All/Pending/Credited/Expired
4. Tap "Ready to Redeem" to claim pending cashback
5. Pull down to refresh

### Features:
- Total earnings display
- Pending cashback counter
- Transaction history
- One-click redemption
- Active campaigns display
- Source tracking (order/referral/promo)

### Tabs:
- **All** - Complete history
- **Pending** - Waiting to be credited
- **Credited** - Already in wallet
- **Expired** - Past expiry date

---

## 5. Addresses
**Path:** `app/account/addresses.tsx`

### How to Use:

#### Add Address:
1. Click "+" button in header
2. Select address type (Home/Office/Other)
3. Fill in all required fields (*)
4. Add delivery instructions (optional)
5. Check "Set as default" if needed
6. Click "Add Address"

#### Edit Address:
1. Click pencil icon on address card
2. Modify desired fields
3. Click "Update Address"

#### Delete Address:
1. Click trash icon on address card
2. Confirm deletion

#### Set Default:
1. Click "Set as Default" button on non-default address
2. Confirm action

### Address Types:
- **Home** 🏠 - Green
- **Office** 🏢 - Blue
- **Other** 📍 - Gray

### Required Fields:
- Address Type
- Address Title
- Street Address
- City
- State
- Postal Code

---

## Navigation Paths

### From Profile:
- `My Services` → app/my-services.tsx
- `Cashback` → app/account/cashback.tsx
- `Addresses` → app/account/addresses.tsx
- `Scratch Card` → app/scratch-card.tsx
- `Subscription` → app/subscription/plans.tsx

---

## Common Issues & Solutions

### Scratch Card Not Available:
- **Issue:** Card is locked
- **Solution:** Complete profile to 80%
- **Check:** Profile edit page shows completion %

### My Services Shows Sample Data:
- **Issue:** Info banner says "Showing sample data"
- **Solution:** Backend may be down, data is mocked
- **Action:** Pull to refresh when backend is back

### Promo Code Not Working:
- **Issue:** "Invalid Code" message
- **Solution:** Use exact codes: SAVE10, SAVE20, WELCOME, FIRST
- **Note:** Case-insensitive but must be exact spelling

### Address Not Saving:
- **Issue:** Modal doesn't close
- **Solution:** Fill all required fields (marked with *)
- **Check:** Postal code must be numeric

### Cashback Not Showing:
- **Issue:** Empty list
- **Solution:** Pull down to refresh
- **Check:** Ensure you're authenticated

---

## API Endpoints Used

### Subscription:
- `POST /subscriptions/subscribe` - Subscribe to plan
- `POST /subscriptions/cancel` - Cancel subscription
- `GET /subscriptions/current` - Get current subscription

### Scratch Cards:
- `POST /scratch-cards/create` - Create new card
- `POST /scratch-cards/:id/claim` - Claim prize
- `GET /scratch-cards/eligibility` - Check eligibility

### My Services:
- `GET /projects/my-submissions` - Get user's submissions

### Cashback:
- `GET /cashback/summary` - Get cashback summary
- `GET /cashback/history` - Get transaction history
- `POST /cashback/redeem` - Redeem cashback
- `GET /cashback/campaigns` - Get active campaigns

### Addresses:
- `GET /addresses` - Get all addresses
- `POST /addresses` - Create address
- `PUT /addresses/:id` - Update address
- `DELETE /addresses/:id` - Delete address
- `PATCH /addresses/:id/default` - Set default

---

## Testing Checklist

### Subscription Plans:
- [ ] Toggle billing cycle
- [ ] Apply promo code
- [ ] Subscribe to plan
- [ ] View comparison table
- [ ] Cancel subscription

### Scratch Cards:
- [ ] Complete profile to 80%
- [ ] Scratch card
- [ ] Claim prize
- [ ] Verify wallet credit

### My Services:
- [ ] View services list
- [ ] Create new service
- [ ] Check status colors
- [ ] Refresh data

### Cashback:
- [ ] View total earned
- [ ] Switch tabs
- [ ] Redeem cashback
- [ ] View campaigns
- [ ] Check transaction details

### Addresses:
- [ ] Add new address
- [ ] Edit address
- [ ] Delete address
- [ ] Set default
- [ ] Validate form fields

---

## Error Messages Reference

### Success Messages:
- ✅ "Subscription Activated!"
- ✅ "Prize Claimed!"
- ✅ "Address added successfully"
- ✅ "Address updated successfully"
- ✅ "Cashback redeemed successfully!"

### Error Messages:
- ❌ "Please enter a promo code"
- ❌ "This promo code is not valid"
- ❌ "Please complete at least 80% of your profile"
- ❌ "Please enter street address"
- ❌ "No cashback is ready for redemption yet"

### Info Messages:
- ℹ️ "Not authenticated. Showing sample data."
- ℹ️ "Unable to load services. Showing sample data."
- ℹ️ "No services found. Showing sample data."

---

## Keyboard Shortcuts (Web)

- `Esc` - Close modals
- `Enter` - Submit forms (in modals)
- `Tab` - Navigate form fields

---

## Mobile Gestures

- **Pull Down** - Refresh data (Services, Cashback, Addresses)
- **Swipe** - Scroll content
- **Tap** - Select/Activate
- **Long Press** - Context actions (where applicable)

---

## Performance Tips

1. **Cashback:** Filter by specific status instead of "All" for faster loading
2. **Addresses:** Delete unused addresses to improve load time
3. **Services:** Refresh only when needed, data is cached
4. **Scratch Cards:** Wait for animation to complete before claiming

---

## Feature Availability

| Feature | Authentication Required | Backend Required | Offline Mode |
|---------|------------------------|------------------|--------------|
| Subscription Plans | Yes | Yes | No |
| Scratch Cards | Yes | Yes | No |
| My Services | Recommended | Optional (mock) | Limited |
| Cashback | Yes | Yes | No |
| Addresses | Yes | Yes | No |

---

## Support Contacts

For feature-specific issues:
- **Subscriptions** → Contact billing support
- **Scratch Cards** → Contact rewards team
- **Services** → Contact content team
- **Cashback** → Contact finance team
- **Addresses** → Contact account support

---

**Last Updated:** October 27, 2025

**Version:** 1.0 - All Features Complete
