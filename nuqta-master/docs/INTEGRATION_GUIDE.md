# Integration Guide

## Quick Start Guide for Voucher & Wishlist Features

### 1. Install Required Dependencies

Make sure you have these packages installed:

```bash
npm install react-native-qrcode-svg
npm install expo-clipboard
```

### 2. Add Voucher Redemption to Online Voucher Page

Here's how to integrate the redemption flow into `app/online-voucher.tsx`:

```typescript
// Add imports at the top
import RedemptionFlow from '@/components/voucher/RedemptionFlow';
import { useVoucherRedemption } from '@/hooks/useVoucherRedemption';

// Inside your component
export default function OnlineVoucherPage() {
  // ... existing state ...

  const [showRedemptionFlow, setShowRedemptionFlow] = useState(false);
  const [userVouchers, setUserVouchers] = useState([]);
  const { redeemVoucher } = useVoucherRedemption();

  // Add this handler
  const handleRedeem = async (voucherId: string, method: 'online' | 'in_store') => {
    try {
      const redemption = await redeemVoucher(voucherId, method);
      return redemption;
    } catch (error) {
      console.error('Redemption error:', error);
      throw error;
    }
  };

  // Add button to your UI
  <TouchableOpacity
    style={styles.redeemButton}
    onPress={() => setShowRedemptionFlow(true)}
  >
    <ThemedText>Redeem Voucher</ThemedText>
  </TouchableOpacity>

  // Add the modal at the end of your return
  <RedemptionFlow
    visible={showRedemptionFlow}
    onClose={() => setShowRedemptionFlow(false)}
    vouchers={userVouchers}
    onRedeem={handleRedeem}
  />
}
```

### 3. Wishlist Sharing Is Already Integrated

The wishlist sharing functionality has been integrated into `app/wishlist.tsx`. Users can:
- Click the share button on any wishlist
- Choose from multiple sharing platforms
- Generate QR codes
- Manage privacy settings

### 4. View Public Wishlists

To add a page for viewing shared wishlists, create `app/wishlist/[shareCode].tsx`:

```typescript
import { useLocalSearchParams } from 'expo-router';
import PublicWishlistView from '@/components/wishlist/PublicWishlistView';

export default function SharedWishlistPage() {
  const { shareCode } = useLocalSearchParams<{ shareCode: string }>();

  return (
    <PublicWishlistView
      shareCode={shareCode}
      onBack={() => router.back()}
    />
  );
}
```

## Backend API Endpoints Required

### Wishlist Sharing Endpoints

```typescript
// Generate share link
POST /wishlist/:wishlistId/generate-share-link
Response: { shareCode, shareUrl, deepLink, qrCodeData }

// Get public wishlist
GET /wishlist/public/:shareCode
Response: { wishlist with items, owner, stats }

// Update privacy settings
PATCH /wishlist/:wishlistId/privacy
Body: { visibility, allowComments, allowGiftReservation, ... }

// Like/Unlike
POST /wishlist/public/:shareCode/like
DELETE /wishlist/public/:shareCode/like

// Add comment
POST /wishlist/public/:shareCode/comments
Body: { comment }

// Reserve gift
POST /wishlist/public/:shareCode/items/:itemId/reserve
Body: { anonymous, message }

// Track analytics
POST /wishlist/:wishlistId/track-share
Body: { platform }
```

### Voucher Redemption Endpoints

```typescript
// Validate voucher
POST /vouchers/validate
Body: { voucherId, orderAmount }
Response: { valid, errors, warnings, voucher }

// Redeem voucher
POST /vouchers/redeem
Body: { voucherId, method, location, orderId }
Response: { redemption with qrCode/redemptionCode }

// Get redemption history
GET /vouchers/redemptions
Query: { page, limit, status, brand }
Response: { history, pagination, stats }

// Get savings stats
GET /vouchers/savings-stats
Response: { totalSavings, redemptionsByMethod, etc }
```

## Deep Linking Setup

### 1. Configure Deep Links in `app.json`

```json
{
  "expo": {
    "scheme": "rezapp",
    "ios": {
      "associatedDomains": ["applinks:www.rezapp.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "www.rezapp.com",
              "pathPrefix": "/wishlist"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 2. Handle Deep Links in Your App

Create `utils/deepLinkHandler.ts`:

```typescript
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    // Handle initial URL (when app is closed)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL when app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = (url: string) => {
    const { hostname, path, queryParams } = Linking.parse(url);

    // Handle wishlist share links
    // Format: rezapp://wishlist/:shareCode
    // Or: https://www.rezapp.com/wishlist/:shareCode
    if (path?.includes('wishlist/')) {
      const shareCode = path.split('wishlist/')[1];
      router.push(`/wishlist/${shareCode}`);
    }
  };
}
```

### 3. Use in Your App

In `app/_layout.tsx`:

```typescript
import { useDeepLinking } from '@/utils/deepLinkHandler';

export default function RootLayout() {
  useDeepLinking(); // Initialize deep linking

  return (
    // ... your layout
  );
}
```

## Testing

### Test Wishlist Sharing

1. **Generate Share Link**
   - Open a wishlist
   - Tap share button
   - Verify link is generated
   - Copy link

2. **Share via Platform**
   - Tap WhatsApp button
   - Verify WhatsApp opens with message
   - Test other platforms

3. **View Public Wishlist**
   - Open shared link
   - Verify wishlist loads
   - Test like button
   - Add comment
   - Reserve gift

### Test Voucher Redemption

1. **Start Redemption Flow**
   - Open voucher page
   - Tap redeem button
   - Verify modal opens

2. **Select Voucher**
   - Choose a voucher
   - Verify selection highlight
   - Tap next

3. **Choose Method**
   - Select online or in-store
   - Verify selection
   - Tap next

4. **Accept Terms**
   - Read terms
   - Check acceptance box
   - Tap next

5. **Confirm Redemption**
   - Review details
   - Tap confirm
   - Verify loading state

6. **View Success**
   - For in-store: Verify QR code displays
   - For online: Verify confirmation message
   - Check savings amount

## Troubleshooting

### QR Code Not Showing
```bash
npm install react-native-qrcode-svg
# Clear cache
npx expo start --clear
```

### Share Not Working on Platform
- Check if platform app is installed
- Fallback to generic share should work
- Verify URL encoding is correct

### Deep Links Not Working
- Check `app.json` configuration
- Verify domain association files
- Test with `npx uri-scheme open rezapp://wishlist/test123 --ios`

### API Connection Issues
- Verify backend endpoints are implemented
- Check authentication headers
- Enable CORS for web platform
- Test with Postman first

## Environment Variables

Add to your `.env`:

```env
# Base URLs
EXPO_PUBLIC_API_URL=https://api.rezapp.com
EXPO_PUBLIC_WEB_URL=https://www.rezapp.com

# Deep Linking
EXPO_PUBLIC_APP_SCHEME=rezapp

# Feature Flags
EXPO_PUBLIC_ENABLE_WISHLIST_SHARING=true
EXPO_PUBLIC_ENABLE_VOUCHER_REDEMPTION=true
```

## Next Steps

1. **Implement Backend APIs** - Use the API specification above
2. **Test End-to-End** - Complete user flows from start to finish
3. **Add Analytics** - Track shares, redemptions, conversions
4. **Monitor Performance** - Check load times, error rates
5. **Gather Feedback** - Get user input on the flows
6. **Iterate** - Improve based on usage data

## Support

For questions or issues:
1. Check the implementation documentation
2. Review type definitions for API contracts
3. Test with mock data first
4. Verify backend integration

---

**Status**: Ready for Backend Integration
**Version**: 1.0.0
**Last Updated**: 2025
