# Quick Reference - My Vouchers & My Earnings

## My Vouchers - QR Code Usage

### For Users
1. Go to "My Vouchers" page
2. Find an active voucher
3. Tap "Use at Store" button
4. QR code appears with auto-brightness
5. Show QR to cashier to scan
6. Or share/save QR code
7. Mark as used when redeemed

### QR Code Actions
- **Copy Code**: Copies voucher code to clipboard
- **Share**: Shares QR as image or text
- **Save**: Saves QR as PNG to device
- **Mark as Used**: Marks voucher as redeemed

---

## My Earnings - Features

### View Earnings
- Total lifetime earnings
- Available balance
- Pending earnings
- 6 category breakdown with percentages

### Categories
1. **Videos** - Video project earnings (Pink)
2. **Projects** - General project work (Purple)
3. **Referrals** - Referral bonuses (Green)
4. **Cashback** - Purchase cashback (Orange)
5. **Social Media** - Social media earnings (Blue)
6. **Bonus** - Rewards and bonuses (Red)

### Statistics Shown
- Daily average earnings
- Weekly average earnings
- Monthly average earnings
- Total transaction count

### Export Options
1. Tap download icon in header
2. Choose export format:
   - CSV file (for Excel)
   - Text report (for sharing)
3. Share or save the report

---

## Files Modified

### New Components
```
components/vouchers/QRCodeModal.tsx          # QR display modal
components/earnings/EarningsPieChart.tsx     # Pie chart
components/earnings/EarningsStatsCard.tsx    # Stats display
services/earningsCalculationService.ts       # Calculations
```

### Updated Pages
```
app/my-vouchers.tsx                          # QR integration
app/my-earnings.tsx                          # Fixed calculations
```

---

## Common Issues & Solutions

### QR Code Not Showing
- **Check**: Voucher must be active status
- **Check**: User ID must be available
- **Solution**: Ensure user is logged in

### Earnings Don't Match
- **Check**: Are transactions loading?
- **Check**: Console logs for calculation details
- **Solution**: Pull to refresh to reload data

### Export Not Working
- **Check**: File system permissions
- **Check**: Sharing is available on device
- **Fallback**: Uses text sharing if file sharing unavailable

### Brightness Not Changing
- **Check**: Brightness permissions granted
- **Note**: Permission request on first use
- **Fallback**: Manual brightness adjustment works

---

## API Endpoints Used

### My Vouchers
- `GET /vouchers/my-vouchers` - Fetch user vouchers
- `POST /vouchers/:id/use` - Mark voucher as used

### My Earnings
- `GET /wallet/balance` - Get wallet balance
- `GET /wallet/transactions` - Get transaction history

---

## Data Flow

### QR Code Generation
```
User taps "Use at Store"
  → Opens QRCodeModal
  → Generates JSON with voucher data
  → Creates QR code from JSON
  → Increases brightness
  → Shows QR + actions
  → User scans or shares
  → Mark as used (optional)
  → Close modal
  → Restore brightness
```

### Earnings Calculation
```
Fetch transactions + balance
  → Filter credit transactions
  → Categorize by type/source
  → Calculate totals per category
  → Calculate averages
  → Calculate percentages
  → Display breakdown
  → Show visualizations
  → Allow export
```

---

## Testing Commands

### Install Dependencies
```bash
cd frontend
npm install react-native-qrcode-svg react-native-svg --legacy-peer-deps
```

### Run App
```bash
npm start
# or
npx expo start
```

### Clear Cache (if needed)
```bash
npm start -- --clear
```

---

## TypeScript Interfaces

### Voucher QR Data
```typescript
interface VoucherData {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  description: string;
  expiryDate: string;
  userId: string;
}
```

### Earnings Breakdown
```typescript
interface EarningsBreakdown {
  videos: number;
  projects: number;
  referrals: number;
  cashback: number;
  socialMedia: number;
  bonus: number;
  total: number;
}
```

### Earnings Stats
```typescript
interface EarningsStats {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  breakdown: EarningsBreakdown;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  transactionCount: number;
}
```

---

## Performance Tips

1. **Pull to Refresh**: Reload latest data
2. **Limit Transactions**: Fetches 100 for calculations
3. **Memoization**: Uses useCallback for optimization
4. **Lazy Loading**: Components load on demand

---

## Styling Colors

### Earnings Categories
```typescript
const categoryColors = {
  videos: '#EC4899',      // Pink
  projects: '#8B5CF6',    // Purple
  referrals: '#10B981',   // Green
  cashback: '#F59E0B',    // Orange
  socialMedia: '#3B82F6', // Blue
  bonus: '#EF4444',       // Red
};
```

### UI Colors
- Primary: #EC4899 (Pink)
- Background: #F3F4F6 (Light Gray)
- Card: #FFFFFF (White)
- Text: #1F2937 (Dark Gray)
- Muted: #6B7280 (Medium Gray)

---

## Accessibility

- Large touch targets (40x40 minimum)
- High contrast colors
- Clear labels and icons
- Readable font sizes
- Screen reader friendly

---

## Browser/Platform Support

- ✅ iOS (native)
- ✅ Android (native)
- ⚠️ Web (QR code works, brightness control not available)

---

## Debug Logs

Enable detailed logging by checking console:
```javascript
console.log('💰 [MY EARNINGS] Balance response:', balance);
console.log('📊 [MY EARNINGS] Transactions count:', transactions.length);
console.log('✅ [MY EARNINGS] Calculated stats:', stats);
```

---

## Quick Fixes

### Reset Earnings Data
Pull down to refresh on My Earnings page

### Re-scan QR Code
Close and reopen QR modal

### Fix Export Issues
Try text export if CSV fails

### Brightness Issues
Close and reopen QR modal

---

## Version Info

- React Native: 0.81.4
- Expo: 54.0.2
- react-native-qrcode-svg: Latest
- react-native-svg: Latest

---

## Next Steps

After implementation:
1. Test on real device
2. Verify QR codes scan correctly
3. Check earnings calculations
4. Test export functionality
5. Review error handling
6. Optimize performance if needed

---

## Contact

For support or questions, check:
- Console logs for errors
- Network tab for API issues
- Component props for data flow
- Service layer for calculations
