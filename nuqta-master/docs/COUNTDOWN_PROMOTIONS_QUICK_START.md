# Deal Countdown & Promotions - Quick Start Guide

## 🚀 Quick Implementation

### 1. Add Countdown Timer to Any Component

```tsx
import DealCountdownTimer from '@/components/store/DealCountdownTimer';

<DealCountdownTimer
  expiryDate={deal.validUntil}
  size="normal"
  showLabel={true}
/>
```

### 2. Add Promotions Banner to Store Page

```tsx
import PromotionsBanner from '@/components/store/PromotionsBanner';

<PromotionsBanner
  banners={promotions}
  storeId={storeId}
  autoRotate={true}
  showCountdown={true}
/>
```

### 3. Load Promotions from API

```tsx
import { offersApi } from '@/services/offersApi';

const response = await offersApi.getStorePromotions(storeId);
setPromotions(response.data.promotions);
```

---

## 📦 Component Props Cheat Sheet

### DealCountdownTimer
```tsx
expiryDate: string | Date       // Required
size?: 'small' | 'normal' | 'large'  // Default: 'normal'
showLabel?: boolean             // Default: true
showIcon?: boolean              // Default: true
onExpire?: () => void           // Callback when expired
```

### PromotionsBanner
```tsx
banners: PromotionBanner[]      // Required
storeId?: string
autoRotate?: boolean            // Default: true
rotationInterval?: number       // Default: 5000ms
showCountdown?: boolean         // Default: true
onBannerPress?: (banner) => void
onDismiss?: (bannerId) => void
```

---

## 🎨 Color Guide

| Time Remaining | Color | Hex Code | Usage |
|---------------|-------|----------|-------|
| > 24 hours | Green | #10B981 | Normal state |
| < 24 hours | Orange | #F59E0B | Warning state |
| < 1 hour | Red | #EF4444 | Critical state |
| Expired | Gray | #9CA3AF | Disabled state |

---

## ⚡ Common Use Cases

### Use Case 1: Product Detail Page
```tsx
<DealCountdownTimer
  expiryDate={product.saleEndsAt}
  size="large"
  showLabel={true}
  onExpire={() => Alert.alert('Sale Ended', 'This deal has expired')}
/>
```

### Use Case 2: Deal Card in List
```tsx
<DealCountdownTimer
  expiryDate={deal.validUntil}
  size="small"
  showLabel={false}
  containerStyle={{ alignSelf: 'flex-start' }}
/>
```

### Use Case 3: Store Homepage Banner
```tsx
const [promotions, setPromotions] = useState([]);

useEffect(() => {
  async function load() {
    const res = await offersApi.getStorePromotions(storeId);
    setPromotions(res.data.promotions);
  }
  load();
}, [storeId]);

<PromotionsBanner
  banners={promotions}
  storeId={storeId}
  autoRotate={true}
  onBannerPress={(banner) => {
    router.push(`/deals/${banner.id}`);
  }}
/>
```

---

## 🐛 Troubleshooting

### Timer not updating?
- Verify `expiryDate` is valid Date or ISO string
- Check component is mounted
- Look for console errors

### Banner not showing?
- Ensure `banners` array has items
- Check `isActive` is true
- Verify promotions not expired

### Performance issues?
- Limit number of simultaneous timers
- Use `CompactCountdownTimer` for lists
- Implement virtual scrolling for long lists

---

## 📝 Mock Data for Testing

```tsx
const testPromotion: PromotionBanner = {
  id: 'test-1',
  type: 'flash_sale',
  title: 'Test Flash Sale',
  discountText: '50% OFF',
  expiryDate: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
  ctaText: 'Shop Now',
  priority: 100,
  isActive: true,
};

<PromotionsBanner banners={[testPromotion]} />
```

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `hooks/useCountdown.ts` | Countdown logic |
| `components/store/DealCountdownTimer.tsx` | Timer component |
| `components/store/PromotionsBanner.tsx` | Banner component |
| `types/promotions.types.ts` | TypeScript types |
| `data/mockPromotions.ts` | Test data |
| `services/offersApi.ts` | API endpoints |

---

## 🎯 Ready-to-Use Snippets

### Snippet 1: Inline Countdown
```tsx
import { CompactCountdownTimer } from '@/components/store/DealCountdownTimer';

<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text>Sale ends in: </Text>
  <CompactCountdownTimer expiryDate={saleEnd} size="small" />
</View>
```

### Snippet 2: Progress Bar Countdown
```tsx
import { CountdownProgressBar } from '@/components/store/DealCountdownTimer';

<CountdownProgressBar
  expiryDate={deal.validUntil}
  totalDuration={86400} // 24 hours in seconds
  size="normal"
/>
```

### Snippet 3: Custom Urgency Badge
```tsx
import { useCountdown, getUrgencyBadge } from '@/hooks/useCountdown';

const countdown = useCountdown(deal.validUntil);
const badge = getUrgencyBadge(countdown);

{badge && (
  <View style={styles.badge}>
    <Text>{badge}</Text>
  </View>
)}
```

---

## ✅ Integration Checklist

- [ ] Import countdown timer component
- [ ] Add expiry date to data model
- [ ] Load promotions from API
- [ ] Add banner to store page
- [ ] Test with different time ranges
- [ ] Verify animations work
- [ ] Check accessibility
- [ ] Test on multiple devices
- [ ] Monitor performance
- [ ] Deploy to production

---

**Need More Help?** Check `DEAL_COUNTDOWN_PROMOTIONS_SUMMARY.md` for comprehensive documentation.
