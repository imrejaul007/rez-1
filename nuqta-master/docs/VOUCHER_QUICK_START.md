# Voucher & Coupon System - Quick Start Guide

## 🚀 Quick Integration (5 minutes)

### Step 1: Import the Modal
Add to your `app/checkout.tsx` imports:

```typescript
import VoucherSelectionModal from '@/components/voucher/VoucherSelectionModal';
```

### Step 2: Add State Variables
Add these to your component:

```typescript
// Add to checkout.tsx (around line 30)
const [showVoucherModal, setShowVoucherModal] = useState(false);
const [appliedVoucher, setAppliedVoucher] = useState<any>(null); // Use VoucherOption type
```

### Step 3: Add Handler Functions
Add these handler functions:

```typescript
// Add to checkout.tsx (around line 120)
const handleApplyVoucher = async (voucher: any) => {
  try {
    console.log('💳 [Checkout] Applying voucher:', voucher.code);

    // Prepare cart data for validation
    const cartData = {
      items: state.items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: state.billSummary.itemTotal,
    };

    // Validate based on type
    const response = voucher.type === 'coupon'
      ? await couponService.validateCoupon({ couponCode: voucher.code, cartData })
      : await couponService.validateVoucherCode(voucher.code, cartData);

    if (response.success && response.data) {
      console.log('💳 [Checkout] Voucher valid, discount:', response.data.discount);

      // Store applied voucher
      setAppliedVoucher(voucher);

      // Apply to promo code state (reuse existing logic)
      const promoCode = {
        id: voucher.id,
        code: voucher.code,
        description: voucher.description,
        discount: voucher.value,
        discountType: voucher.discountType,
        minOrderValue: voucher.minOrderValue,
        maxDiscount: voucher.maxDiscount || 0,
        isActive: true,
        validUntil: voucher.expiryDate,
      };

      handlers.handlePromoCodeApply(voucher.code);

      Alert.alert(
        'Success!',
        `${voucher.code} applied! You saved ₹${response.data.discount}`
      );
    } else {
      Alert.alert('Error', response.error || `Failed to apply ${voucher.type}`);
    }
  } catch (error) {
    console.error('💳 [Checkout] Voucher application error:', error);
    Alert.alert('Error', 'Failed to validate voucher');
  }
};

const handleRemoveVoucher = () => {
  console.log('💳 [Checkout] Removing voucher');
  setAppliedVoucher(null);
  handlers.removePromoCode?.();
  Alert.alert('Removed!', 'Voucher/coupon removed');
};
```

### Step 4: Update the Apply Button
Replace the existing "Apply Coupon" button (around line 229-248) with:

```typescript
{/* Apply Promocode Section */}
<View style={styles.section}>
  <ThemedText style={styles.sectionTitle}>Apply Voucher or Coupon</ThemedText>

  {state.appliedPromoCode || appliedVoucher ? (
    <View style={styles.appliedPromoCard}>
      <View style={styles.appliedPromoContent}>
        <Ionicons
          name={appliedVoucher?.type === 'voucher' ? 'ticket' : 'pricetag'}
          size={20}
          color="#22C55E"
        />
        <View style={styles.appliedPromoText}>
          <ThemedText style={styles.appliedPromoTitle}>
            {state.appliedPromoCode?.code || appliedVoucher?.code} Applied
          </ThemedText>
          <ThemedText style={styles.appliedPromoSubtitle}>
            You saved ₹{state.billSummary.promoDiscount}
          </ThemedText>
        </View>
      </View>
      <View style={styles.appliedPromoActions}>
        <TouchableOpacity
          onPress={() => setShowVoucherModal(true)}
          style={styles.changePromoButton}
        >
          <ThemedText style={styles.changePromoText}>Change</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRemoveVoucher}
          style={styles.removePromoButton}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.promoCodeCard}
      onPress={() => setShowVoucherModal(true)}
      activeOpacity={0.7}
    >
      <View style={styles.promoCodeContent}>
        <View>
          <ThemedText style={styles.promoCodeTitle}>
            Apply Voucher or Coupon
          </ThemedText>
          <ThemedText style={styles.promoCodeSubtitle}>
            Get instant savings on your order
          </ThemedText>
        </View>
        <Ionicons name="ticket" size={20} color="#8B5CF6" />
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  )}

  {/* ... existing coin toggles below ... */}
</View>
```

### Step 5: Add the Modal
Add this before the closing `</View>` tag at the end of your return statement:

```typescript
{/* Voucher Selection Modal */}
<VoucherSelectionModal
  visible={showVoucherModal}
  cartTotal={state.billSummary.itemTotal}
  currentVoucher={appliedVoucher}
  onClose={() => setShowVoucherModal(false)}
  onApply={handleApplyVoucher}
  onRemove={handleRemoveVoucher}
/>

{/* ... existing Promo Code Modal or remove it if replacing ... */}
```

### Step 6: Import couponService (if not already)
Ensure this is in your imports at the top:

```typescript
import couponService from '@/services/couponApi';
```

---

## ✅ That's It!

Your voucher and coupon system is now integrated! Test by:

1. ✅ Navigate to `/checkout`
2. ✅ Click "Apply Voucher or Coupon"
3. ✅ See your available coupons and vouchers
4. ✅ Notice the "Best Offer" banner (if applicable)
5. ✅ Click a voucher/coupon to apply
6. ✅ See discount in bill summary
7. ✅ Place order successfully

---

## 🎨 Optional: Enhanced UI

### Add Import for Alert
```typescript
import { Alert } from 'react-native';
```

### Add Better Success Messages
```typescript
Alert.alert(
  '🎉 Voucher Applied!',
  `You saved ₹${response.data.discount} with ${voucher.code}`,
  [
    { text: 'OK', style: 'default' }
  ]
);
```

### Add Voucher Type Icon
```typescript
<Ionicons
  name={appliedVoucher?.type === 'voucher' ? 'ticket' : 'pricetag'}
  size={20}
  color="#22C55E"
/>
```

---

## 🔧 Troubleshooting

### Issue: Modal Not Opening
**Solution**: Check if `showVoucherModal` state is properly defined and being set to `true`

```typescript
console.log('Modal visible:', showVoucherModal);
```

### Issue: Vouchers Not Loading
**Solution**: Check authentication and API connectivity

```typescript
// Add to handleApplyVoucher
console.log('Auth token:', !!authState.token);
console.log('Cart data:', cartData);
```

### Issue: Discount Not Applied
**Solution**: Verify handlers.handlePromoCodeApply is working

```typescript
// Test if existing promo code logic works first
handlers.handlePromoCodeApply('TEST123');
```

### Issue: Best Offer Not Showing
**Solution**: Ensure cart total meets min order for at least one voucher

```typescript
console.log('Cart Total:', state.billSummary.itemTotal);
console.log('Vouchers loaded:', vouchers.length);
```

---

## 📱 Testing Checklist

- [ ] Modal opens when button clicked
- [ ] Vouchers load successfully
- [ ] Coupons load successfully
- [ ] Tabs work (All, Coupons, Vouchers)
- [ ] Manual code entry works
- [ ] Best offer banner shows (if applicable)
- [ ] Ineligible vouchers are grayed out
- [ ] Eligible vouchers show savings
- [ ] Apply voucher updates bill summary
- [ ] Remove voucher clears discount
- [ ] Order creation includes voucher code
- [ ] Alert messages show correctly

---

## 🎯 Next Steps

1. **Test with Real Data**: Use actual vouchers from backend
2. **Analytics**: Track which vouchers are most used
3. **A/B Testing**: Test best offer vs no suggestion
4. **User Feedback**: Collect feedback on UI/UX
5. **Performance**: Monitor modal load time
6. **Optimization**: Cache vouchers to reduce API calls

---

## 📞 Need Help?

### Check These Files:
- `components/voucher/VoucherSelectionModal.tsx` - The modal component
- `services/couponApi.ts` - API service for validation
- `services/realVouchersApi.ts` - API service for vouchers
- `VOUCHER_COUPON_SYSTEM_COMPLETE.md` - Full documentation

### Common Code Patterns:
```typescript
// Load vouchers manually
await couponService.getMyCoupons({ status: 'available' });
await vouchersService.getUserVouchers({ status: 'active' });

// Validate voucher
await couponService.validateVoucherCode(code, cartData);

// Apply to order
ordersService.createOrder({
  ...orderData,
  couponCode: voucher.code
});
```

---

**Quick Start Complete!** 🎉

The voucher and coupon system is now ready to use. Users can apply vouchers/coupons at checkout and see instant savings!
