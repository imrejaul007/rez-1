# 🚀 Homepage Restructuring - Quick Reference

**Quick guide for developers using the restructured homepage**

---

## 📁 File Locations

```bash
# Main file
app/(tabs)/index.tsx                      # Use index.refactored.tsx for new version

# Components
components/homepage/HomeHeader.tsx         # Header section
components/homepage/PartnerCard.tsx        # Partner card
components/homepage/QuickActionsGrid.tsx   # Quick actions
components/homepage/CategorySections.tsx   # Category sections

# ProductCard
components/homepage/cards/ProductCard/
├── index.tsx                              # Main component
├── ProductImage.tsx                       # Image section
├── ProductInfo.tsx                        # Info section
├── ProductActions.tsx                     # Action buttons
└── styles.ts                              # Styles

# Hooks
hooks/useUserStatistics.ts                 # User stats & wallet sync
hooks/useHomeRefresh.ts                    # Pull-to-refresh

# Styles
styles/homepage.styles.ts                  # Centralized styles
```

---

## 🔧 Usage Examples

### 1. Using HomeHeader

```typescript
import HomeHeader from '@/components/homepage/HomeHeader';
import { textStyles, viewStyles } from '@/styles/homepage.styles';

<HomeHeader
  userPoints={1250}
  subscriptionTier="gold"
  cartItemCount={3}
  showDetailedLocation={false}
  onToggleLocation={() => setShowLocation(!showLocation)}
  animatedHeight={animatedHeight}
  animatedOpacity={animatedOpacity}
  onSearchPress={() => router.push('/search')}
  onProfilePress={() => showModal()}
  userInitials="JD"
  isAuthenticated={true}
  headerStyles={viewStyles}
  textStyles={textStyles}
/>
```

### 2. Using PartnerCard

```typescript
import PartnerCard from '@/components/homepage/PartnerCard';

<PartnerCard
  points={1250}
  level="Level 2"
  onPress={() => router.push('/profile/partner')}
/>
```

### 3. Using QuickActionsGrid

```typescript
import QuickActionsGrid, { QuickAction } from '@/components/homepage/QuickActionsGrid';

const actions: QuickAction[] = [
  {
    id: 'wallet',
    icon: 'wallet-outline',
    label: 'Wallet',
    value: '₹ 1,250',
    onPress: () => router.push('/wallet'),
    accessibilityLabel: 'Wallet balance: 1,250 rupees',
    accessibilityHint: 'Double tap to open wallet',
  },
  // ... more actions
];

<QuickActionsGrid actions={actions} />
```

### 4. Using CategorySections

```typescript
import CategorySections, { CategorySection } from '@/components/homepage/CategorySections';

const sections: CategorySection[] = [
  {
    title: 'Going Out',
    categories: [
      {
        id: 'fashion',
        slug: 'fashion',
        label: 'Fashion',
        icon: 'shirt-outline',
        onPress: () => router.push('/fashion'),
      },
      // ... more categories
    ],
    onViewAll: () => router.push('/going-out'),
  },
];

<CategorySections sections={sections} />
```

### 5. Using useUserStatistics Hook

```typescript
import { useUserStatistics } from '@/hooks/useUserStatistics';

function MyComponent() {
  const { userPoints, userStats, syncStatus, loading, error, refresh } =
    useUserStatistics(userId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>Points: {userPoints}</Text>
      <Text>Orders: {userStats?.orders?.total}</Text>
      <Button onPress={refresh}>Refresh</Button>
    </View>
  );
}
```

### 6. Using useHomeRefresh Hook

```typescript
import { useHomeRefresh } from '@/hooks/useHomeRefresh';

function MyComponent() {
  const { refreshing, onRefresh } = useHomeRefresh(
    {
      refreshAllSections: async () => { /* ... */ },
      refreshUserStatistics: async () => { /* ... */ },
    },
    true // hasUser
  );

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* content */}
    </ScrollView>
  );
}
```

### 7. Using ProductCard (New Version)

```typescript
import ProductCard from '@/components/homepage/cards/ProductCard';

<ProductCard
  product={productData}
  onPress={(product) => router.push(`/product/${product.id}`)}
  onAddToCart={(product) => addToCart(product)}
  width={180}
  showAddToCart={true}
/>
```

---

## 🎨 Styling

### Using Homepage Styles

```typescript
import { textStyles, viewStyles, homepageStyles } from '@/styles/homepage.styles';

// Option 1: Individual imports
<Text style={textStyles.sectionTitle}>Title</Text>
<View style={viewStyles.container}>Content</View>

// Option 2: Combined import
<Text style={homepageStyles.text.sectionTitle}>Title</Text>
<View style={homepageStyles.view.container}>Content</View>
```

### Available Text Styles

```typescript
textStyles.locationText
textStyles.coinsText
textStyles.profileText
textStyles.greeting
textStyles.searchPlaceholder
textStyles.partnerLevel
textStyles.level1
textStyles.statNumber
textStyles.statLabel
textStyles.actionLabel
textStyles.actionValue
textStyles.sectionTitle
textStyles.viewAllText
textStyles.categoryLabel
```

### Available View Styles

```typescript
viewStyles.container
viewStyles.header
viewStyles.headerTop
viewStyles.content
viewStyles.partnerCard
viewStyles.quickActions
viewStyles.section
viewStyles.categoryIcon
// ... see homepage.styles.ts for full list
```

---

## 🔄 Migration Checklist

```bash
# Step 1: Backup original
cd app/(tabs)
cp index.tsx index.tsx.backup

# Step 2: Replace with refactored version
mv index.refactored.tsx index.tsx

# Step 3: Test imports
npm run type-check

# Step 4: Run dev server
npm start

# Step 5: Test functionality (see testing checklist in main report)

# Step 6: If issues, rollback
mv index.tsx index.tsx.new
mv index.tsx.backup index.tsx
```

---

## 🐛 Troubleshooting

### Import Errors

```typescript
// ❌ Wrong
import HomeHeader from '../components/homepage/HomeHeader';

// ✅ Correct
import HomeHeader from '@/components/homepage/HomeHeader';
```

### Type Errors

```typescript
// ❌ Missing required props
<HomeHeader userPoints={1250} />

// ✅ All required props
<HomeHeader
  userPoints={1250}
  subscriptionTier="free"
  cartItemCount={0}
  showDetailedLocation={false}
  onToggleLocation={() => {}}
  animatedHeight={new Animated.Value(0)}
  animatedOpacity={new Animated.Value(0)}
  onSearchPress={() => {}}
  onProfilePress={() => {}}
  isAuthenticated={false}
  headerStyles={viewStyles}
  textStyles={textStyles}
/>
```

### Style Not Applied

```typescript
// ❌ Wrong import
import styles from '@/styles/homepage.styles';

// ✅ Correct import
import { textStyles, viewStyles } from '@/styles/homepage.styles';
```

### Hook Not Working

```typescript
// ❌ Called conditionally
if (userId) {
  const { userPoints } = useUserStatistics(userId);
}

// ✅ Called unconditionally
const { userPoints } = useUserStatistics(userId);
```

---

## 📚 Common Patterns

### Pattern 1: Action Configuration

```typescript
// Define actions as configuration
const actions: QuickAction[] = [
  {
    id: 'action1',
    icon: 'icon-name',
    label: 'Label',
    value: 'Value',
    onPress: handleAction,
    accessibilityLabel: 'Accessible label',
    accessibilityHint: 'What happens on tap',
  },
];

// Pass to component
<QuickActionsGrid actions={actions} />
```

### Pattern 2: Category Configuration

```typescript
// Define categories as configuration
const categories: CategorySection[] = [
  {
    title: 'Section Title',
    categories: [
      {
        id: 'cat1',
        slug: 'slug',
        label: 'Label',
        icon: 'icon-name',
        onPress: () => router.push('/path'),
      },
    ],
    onViewAll: () => router.push('/view-all'),
  },
];

// Pass to component
<CategorySections sections={categories} />
```

### Pattern 3: Memoized Handlers

```typescript
// Memoize handlers to prevent re-renders
const handleAction = useCallback(() => {
  // action logic
}, [dependencies]);

const memoizedData = useMemo(() => {
  // expensive calculation
  return result;
}, [dependencies]);
```

---

## 🎯 Best Practices

### 1. Component Props

✅ **DO:**
- Use TypeScript interfaces for props
- Provide default values for optional props
- Document props with JSDoc comments
- Keep prop count reasonable (< 10)

❌ **DON'T:**
- Pass entire state objects
- Use generic names like `data` or `info`
- Forget accessibility props
- Mutate props inside component

### 2. Hooks Usage

✅ **DO:**
- Call hooks at top level
- Use custom hooks for complex logic
- Memoize expensive computations
- Clean up effects properly

❌ **DON'T:**
- Call hooks conditionally
- Forget dependency arrays
- Create circular dependencies
- Mix data fetching in render

### 3. Styling

✅ **DO:**
- Use centralized styles
- Follow existing naming conventions
- Group related styles together
- Use platform-specific styles when needed

❌ **DON'T:**
- Inline styles everywhere
- Duplicate style definitions
- Use magic numbers
- Forget responsive considerations

### 4. Performance

✅ **DO:**
- Use React.memo for expensive components
- Memoize callbacks with useCallback
- Memoize computed values with useMemo
- Lazy load below-the-fold content

❌ **DON'T:**
- Premature optimization
- Memoize everything
- Forget to profile
- Ignore bundle size

---

## 📊 Performance Tips

### Optimization Checklist

```typescript
// ✅ Memoize expensive operations
const expensiveValue = useMemo(() => {
  return complexCalculation(data);
}, [data]);

// ✅ Memoize callbacks
const handlePress = useCallback(() => {
  // handler logic
}, [dependency]);

// ✅ Use React.memo for pure components
const MyComponent = React.memo(({ data }) => {
  return <View>{data}</View>;
});

// ✅ Lazy load components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// ✅ Use Suspense for loading states
<Suspense fallback={<Loader />}>
  <HeavyComponent />
</Suspense>
```

---

## 🔗 Quick Links

- **Full Documentation:** `AGENT_1_HOMEPAGE_RESTRUCTURING_COMPLETE.md`
- **Visual Summary:** `RESTRUCTURING_VISUAL_SUMMARY.md`
- **Original Backup:** `app/(tabs)/index.tsx.backup`
- **Refactored Version:** `app/(tabs)/index.refactored.tsx`

---

## 💡 Need Help?

1. Check the full documentation first
2. Review inline JSDoc comments
3. Look at existing usage patterns
4. Test components in isolation
5. Consult the original backup if needed

---

**Agent 1 - Homepage Restructuring**
**Status: COMPLETE ✅**
**Date: 2025-11-14**
