# Component Quick Reference

Quick lookup guide for Rez App components with copy-paste ready examples.

## Common Components

### AccessibleButton
```tsx
<AccessibleButton label="Click Me" onPress={handlePress} variant="primary" />
```
**Variants:** primary, secondary, outline, ghost, danger
**Sizes:** small, medium, large

### OptimizedImage
```tsx
<OptimizedImage source="url" width={200} height={200} progressive />
```
**Features:** Lazy loading, progressive, CDN optimization

### LoadingSpinner
```tsx
<LoadingSpinner message="Loading..." fullScreen />
```

### ErrorBoundary
```tsx
<ErrorBoundary onError={logError}><YourComponent /></ErrorBoundary>
```

### ErrorState
```tsx
<ErrorState title="Error" message="Failed" onRetry={retry} />
```

### Toast
```tsx
Toast.show({ type: 'success', message: 'Done!' });
```

### StockBadge
```tsx
<StockBadge stock={5} lowStockThreshold={10} variant="compact" />
```

### ShimmerEffect
```tsx
<ShimmerEffect width={200} height={20} borderRadius={8} />
```

---

## Layout Components

### ThemedView
```tsx
<ThemedView style={styles.container}>{children}</ThemedView>
```

### ThemedText
```tsx
<ThemedText type="title">Title</ThemedText>
<ThemedText type="subtitle">Subtitle</ThemedText>
<ThemedText type="defaultSemiBold">Bold Text</ThemedText>
```
**Types:** default, title, subtitle, defaultSemiBold, link

---

## Card Components

### ProductCard
```tsx
<ProductCard
  product={data}
  onPress={handlePress}
  onAddToCart={addToCart}
  width={180}
  showAddToCart
/>
```

### StoreCard
```tsx
<StoreCard store={data} onPress={handlePress} />
```

### EventCard
```tsx
<EventCard event={data} onPress={handlePress} onBook={handleBook} />
```

### BrandedStoreCard
```tsx
<BrandedStoreCard store={data} onPress={handlePress} />
```

---

## Cart Components

### CartItem
```tsx
<CartItem
  item={data}
  onRemove={remove}
  onUpdateQuantity={update}
  showAnimation
/>
```

### CartHeader
```tsx
<CartHeader itemCount={5} onBack={goBack} />
```

### PriceSection
```tsx
<PriceSection
  subtotal={1000}
  discount={200}
  deliveryFee={50}
  total={850}
/>
```

---

## Wallet Components

### WalletBalanceCard
```tsx
<WalletBalanceCard balance={1500} onTopup={topup} onSend={send} />
```

### TransactionCard
```tsx
<TransactionCard transaction={data} onPress={handlePress} />
```

### TransactionHistory
```tsx
<TransactionHistory transactions={list} onTransactionPress={press} />
```

---

## Play Components

### VideoCard
```tsx
<VideoCard video={data} onPress={handlePress} width={180} />
```

### ArticleCard
```tsx
<ArticleCard article={data} onPress={handlePress} />
```

### FeaturedVideoCard
```tsx
<FeaturedVideoCard video={data} onPress={handlePress} />
```

---

## Earn Components

### ProjectCard
```tsx
<ProjectCard project={data} onPress={handlePress} />
```

### TaskCard
```tsx
<TaskCard task={data} onComplete={handleComplete} />
```

### EarningsCard
```tsx
<EarningsCard totalEarnings={5000} pendingEarnings={1500} />
```

---

## Profile Components

### MenuItemCard
```tsx
<MenuItemCard icon="person" label="Edit Profile" onPress={press} />
```

### ProfileMenuModal
```tsx
<ProfileMenuModal visible={show} onClose={close} options={opts} />
```

---

## Bill Components

### BillImageUploader
```tsx
<BillImageUploader onUpload={handleUpload} maxImages={3} />
```

### BillVerificationStatus
```tsx
<BillVerificationStatus status="verified" confidence={0.95} />
```

### CashbackCalculator
```tsx
<CashbackCalculator billAmount={1000} cashbackPercentage={5} />
```

---

## Category Components

### CategoryCard
```tsx
<CategoryCard category={data} onPress={handlePress} />
```

### CategoryGrid
```tsx
<CategoryGrid categories={list} onCategoryPress={press} />
```

### CategoryFilters
```tsx
<CategoryFilters
  filters={opts}
  selectedFilters={selected}
  onFilterChange={change}
/>
```

---

## Form Components

### AccessibleInput
```tsx
<AccessibleInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  error={error}
/>
```

### FormInput
```tsx
<FormInput
  label="Phone"
  value={phone}
  onChangeText={setPhone}
  placeholder="Enter phone"
/>
```

---

## Modal Components

### CashbackModal
```tsx
<CashbackModal visible={show} cashback={50} onClose={close} />
```

### AboutModal
```tsx
<AboutModal visible={show} onClose={close} content={content} />
```

### DealDetailsModal
```tsx
<DealDetailsModal visible={show} deal={data} onClose={close} />
```

---

## Review Components

### RatingStars
```tsx
<RatingStars rating={4.5} size={16} showCount count={123} />
```

### ReviewTabs
```tsx
<ReviewTabs activeTab={tab} onTabChange={setTab} tabs={tabs} />
```

---

## Search Components

### SearchHeader
```tsx
<SearchHeader
  query={query}
  onQueryChange={setQuery}
  onFilterPress={filters}
/>
```

### FilterChips
```tsx
<FilterChips
  filters={opts}
  selectedFilters={selected}
  onFilterChange={change}
/>
```

---

## Hooks

### useThemeColor
```tsx
const bgColor = useThemeColor({}, 'background');
const primary = useThemeColor({ light: '#000', dark: '#FFF' }, 'primary');
```

### useColorScheme
```tsx
const theme = useColorScheme(); // 'light' | 'dark'
```

---

## Patterns

### Card Pattern
```tsx
<ThemedView style={styles.card}>
  <ThemedText type="subtitle">Title</ThemedText>
  <ThemedText>Description</ThemedText>
</ThemedView>

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});
```

### List Pattern
```tsx
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={item => item.id}
  contentContainerStyle={{ padding: 16 }}
/>
```

### Modal Pattern
```tsx
<Modal visible={visible} transparent animationType="fade">
  <View style={styles.overlay}>
    <View style={styles.modal}>{children}</View>
  </View>
</Modal>

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
});
```

### Form Pattern
```tsx
const [value, setValue] = useState('');
const [error, setError] = useState('');

<AccessibleInput
  label="Field"
  value={value}
  onChangeText={setValue}
  error={error}
/>
```

---

## Style Tokens

### Spacing
```tsx
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

### Border Radius
```tsx
4, 8, 12, 16, 20, 999 (circle)
```

### Font Sizes
```tsx
10, 12, 14, 16, 18, 20, 24, 32
```

### Font Weights
```tsx
'400' (regular), '500' (medium), '600' (semibold), '700' (bold)
```

### Colors (Light Theme)
```tsx
text: '#0f172a'
background: '#ffffff'
primary: '#6366f1'
secondary: '#8b5cf6'
accent: '#06b6d4'
success: '#10b981'
warning: '#f59e0b'
error: '#ef4444'
```

### Shadow
```tsx
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
}
```

---

## Common Imports

```tsx
// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AccessibleButton from '@/components/common/AccessibleButton';
import OptimizedImage from '@/components/common/OptimizedImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Hooks
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

// Constants
import { Colors } from '@/constants/Colors';

// Icons
import { Ionicons } from '@expo/vector-icons';

// React Native
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
```

---

## Icon Names (Common)

### Navigation
```
arrow-back, arrow-forward, close, menu, chevron-down, chevron-up
```

### Actions
```
add, remove, edit, delete, save, share, search, filter
```

### Status
```
checkmark-circle, alert-circle, information-circle, warning
```

### E-commerce
```
cart, heart, star, wallet, card, pricetag, bag
```

### Media
```
play, pause, image, camera, video, mic
```

### Communication
```
mail, call, chatbubble, notifications, send
```

### User
```
person, settings, log-in, log-out, eye, eye-off
```

### Location
```
location, map, navigate, compass
```

### Time
```
time, calendar, stopwatch, hourglass
```

---

## Accessibility

### Button
```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Add to cart"
  accessibilityHint="Double tap to add item"
  accessibilityState={{ disabled: false }}
>
```

### Image
```tsx
<Image
  accessibilityLabel="Product image"
  accessibilityRole="image"
  accessible={true}
/>
```

### Text
```tsx
<Text accessibilityRole="text">Content</Text>
```

### Adjustable
```tsx
<View
  accessibilityRole="adjustable"
  accessibilityLabel="Quantity: 2"
>
```

---

## Animation

### Fade In
```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start();

<Animated.View style={{ opacity: fadeAnim }}>
```

### Scale
```tsx
const scaleAnim = useRef(new Animated.Value(1)).current;

Animated.sequence([
  Animated.timing(scaleAnim, {
    toValue: 0.95,
    duration: 100,
    useNativeDriver: true,
  }),
  Animated.timing(scaleAnim, {
    toValue: 1,
    duration: 100,
    useNativeDriver: true,
  }),
]).start();

<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
```

---

## Performance Tips

1. Use `React.memo` for expensive components
2. Use `useCallback` for event handlers
3. Use `useMemo` for computed values
4. Implement `shouldComponentUpdate` for class components
5. Use `FlatList` for long lists (not `ScrollView`)
6. Enable `removeClippedSubviews` on `FlatList`
7. Use `OptimizedImage` for all images
8. Lazy load off-screen components
9. Avoid inline styles and functions
10. Use `StyleSheet.create` for styles

---

## Version History

- **v1.0.0** - Initial quick reference (2025-11-11)
