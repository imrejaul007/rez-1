# Coupons Feature - Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### 1. Seed Test Data
```bash
cd user-backend
npm run seed:coupons
```

This creates:
- ✅ 8 test coupons (7 active, 1 expired)
- ✅ 5 user coupon records
- ✅ Various discount types and conditions

### 2. Start Backend
```bash
cd user-backend
npm run dev
# Server runs on http://localhost:5001
```

### 3. Test API
```bash
# Get all coupons
curl http://localhost:5001/api/coupons

# Get featured coupons
curl http://localhost:5001/api/coupons/featured
```

### 4. View Frontend
Navigate to: `/account/coupons`

---

## 📁 File Structure

```
Frontend:
├── app/account/coupons.tsx          # Main page
└── services/couponApi.ts            # API client

Backend:
├── models/
│   ├── Coupon.ts                    # Coupon schema
│   └── UserCoupon.ts                # User coupon schema
├── controllers/couponController.ts  # Route handlers
├── services/couponService.ts        # Business logic
├── routes/couponRoutes.ts          # API routes
└── scripts/seedCoupons.ts          # Seed script
```

---

## 🎫 Test Coupons Available

| Code | Type | Discount | Min Order | Notes |
|------|------|----------|-----------|-------|
| WELCOME10 | % | 10% off | ₹500 | New users, Featured |
| FEST2025 | ₹ | ₹500 off | ₹2000 | Limited 1000 uses |
| TECH20 | % | 20% off | ₹1000 | Electronics only |
| WEEKEND30 | % | 30% off | ₹1000 | Weekend special |
| GOLD25 | % | 25% off | ₹1500 | Gold members only |

---

## 🔌 API Endpoints

### Public (No Auth)
```bash
GET  /api/coupons                    # List all
GET  /api/coupons/featured          # Featured only
GET  /api/coupons/search?q=welcome  # Search
GET  /api/coupons/:id               # Details
```

### Authenticated (Requires Token)
```bash
GET    /api/coupons/my-coupons      # User's coupons
POST   /api/coupons/:id/claim       # Claim coupon
POST   /api/coupons/validate        # Validate for cart
POST   /api/coupons/best-offer      # Auto-suggest
DELETE /api/coupons/:id             # Remove coupon
```

---

## 💡 Common Operations

### Claim a Coupon
```typescript
import couponService from '@/services/couponApi';

const response = await couponService.claimCoupon(couponId);
if (response.success) {
  console.log('Claimed:', response.data.userCoupon);
}
```

### Validate for Cart
```typescript
const cartData = {
  items: [{ product: '123', quantity: 1, price: 1000 }],
  subtotal: 1000
};

const result = await couponService.validateCoupon({
  couponCode: 'WELCOME10',
  cartData
});

if (result.success) {
  console.log('Discount:', result.data.discount); // 100
}
```

### Get Best Offer
```typescript
const bestOffer = await couponService.getBestOffer({ cartData });
if (bestOffer.data) {
  console.log('Best coupon:', bestOffer.data.coupon.couponCode);
  console.log('Saves:', bestOffer.data.discount);
}
```

---

## 🎨 UI Components

### Tab States
- **Available**: All active, claimable coupons
- **My Coupons**: User's claimed & available coupons
- **Expired**: User's expired coupons

### Card Features
- Gradient background (purple)
- Coupon code badge
- Discount value (large text)
- Title & description
- Min order requirement
- Validity date
- Claim/Remove button
- Status badges

### Special Indicators
- ⭐ Featured badge
- 🆕 New badge
- ⚠️ Expiring soon banner (< 3 days)

---

## 🔧 Customization

### Add New Coupon (Backend)
```typescript
await Coupon.create({
  couponCode: 'MYNEW20',
  title: 'My New 20% Off',
  description: 'Special discount',
  discountType: 'PERCENTAGE',
  discountValue: 20,
  minOrderValue: 500,
  maxDiscountCap: 1000,
  validFrom: new Date(),
  validTo: new Date('2025-12-31'),
  usageLimit: { totalUsage: 0, perUser: 1, usedCount: 0 },
  applicableTo: {
    categories: [],
    products: [],
    stores: [],
    userTiers: ['all']
  },
  autoApply: true,
  autoApplyPriority: 7,
  status: 'active',
  termsAndConditions: ['Valid for all users'],
  createdBy: adminId,
  tags: ['special'],
  isFeatured: true,
  isNewlyAdded: true
});
```

### Modify Frontend Colors
In `coupons.tsx`:
```typescript
// Change gradient
colors={['#YOUR_COLOR_1', '#YOUR_COLOR_2']}

// Change tab active color
borderBottomColor: '#YOUR_COLOR'
```

---

## 🐛 Troubleshooting

### Issue: "No coupons available"
**Solution:** Run `npm run seed:coupons`

### Issue: "Coupon not found" error
**Solution:** Check coupon exists and is active:
```bash
curl http://localhost:5001/api/coupons
```

### Issue: Can't claim coupon
**Reasons:**
- Already claimed (check UserCoupon collection)
- Usage limit reached
- Coupon expired
- Not authenticated

### Issue: Validation fails
**Check:**
- Min order value met?
- Coupon still active?
- User eligible (tier)?
- Product/category matches?

---

## 📊 Database Queries

### View All Coupons
```javascript
db.coupons.find({ status: 'active' })
```

### View User's Coupons
```javascript
db.usercoupons.find({ user: ObjectId('USER_ID') })
  .populate('coupon')
```

### Check Coupon Usage
```javascript
db.coupons.findOne({ couponCode: 'WELCOME10' })
  .select('claimCount usageCount')
```

### Find Expiring Coupons
```javascript
db.usercoupons.find({
  status: 'available',
  expiryDate: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 3*24*60*60*1000)
  }
})
```

---

## 🧪 Testing Scenarios

### Test Case 1: Claim New Coupon
1. View available coupons
2. Click "Claim" on WELCOME10
3. Check My Coupons tab
4. Verify coupon appears as "Available"

### Test Case 2: Validate Coupon
1. Add items to cart (₹1000)
2. Apply WELCOME10
3. Verify 10% discount (₹100)
4. Check max cap not exceeded

### Test Case 3: Expired Coupon
1. Go to Expired tab
2. Check EXPIRED10 appears
3. Verify can't use it
4. Check styling is different

### Test Case 4: Auto-Apply
1. Create cart with ₹2000
2. Call best-offer endpoint
3. Verify FEST2025 suggested (₹500 off)
4. Apply automatically

---

## 📈 Analytics & Monitoring

### Track These Metrics
- Coupon view count
- Claim rate (claims / views)
- Usage rate (uses / claims)
- Popular coupons
- Expired unused coupons
- Discount amount saved

### Add Tracking
```typescript
// In couponApi.ts
await apiClient.post('/coupons/track-view', { couponId });

// In controller
await coupon.incrementViewCount();
```

---

## 🚢 Deployment Checklist

- [ ] Run `npm run seed:coupons` in production DB
- [ ] Update EXPO_PUBLIC_PROD_API_URL in frontend
- [ ] Test all endpoints in production
- [ ] Verify authentication works
- [ ] Check coupon expiry cron job
- [ ] Monitor error logs
- [ ] Set up analytics
- [ ] Configure push notifications

---

## 📚 Additional Resources

### Models Documentation
- [Coupon Model](../user-backend/src/models/Coupon.ts)
- [UserCoupon Model](../user-backend/src/models/UserCoupon.ts)

### API Documentation
- [Controller](../user-backend/src/controllers/couponController.ts)
- [Service](../user-backend/src/services/couponService.ts)
- [Routes](../user-backend/src/routes/couponRoutes.ts)

### Frontend Documentation
- [Page](./app/account/coupons.tsx)
- [API Service](./services/couponApi.ts)

---

## 🆘 Need Help?

1. Check full analysis: `COUPONS_PRODUCTION_ANALYSIS.md`
2. Review seed script: `../user-backend/src/scripts/seedCoupons.ts`
3. Test API: `curl http://localhost:5001/api/coupons`
4. Check logs: Backend terminal for errors

---

## ✅ Quick Verification

Run these commands to verify everything works:

```bash
# 1. Seed data
npm run seed:coupons

# 2. Check API
curl http://localhost:5001/api/coupons | json_pp

# 3. Count coupons
curl http://localhost:5001/api/coupons | grep -o "couponCode" | wc -l
# Should return: 7 (active coupons)

# 4. Check featured
curl http://localhost:5001/api/coupons/featured | grep -o "isFeatured" | wc -l
# Should return: 5
```

**All working? You're ready to go! 🎉**
