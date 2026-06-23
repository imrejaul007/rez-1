# Rez App Component Library

Complete reference guide for all reusable components in the Rez App frontend.

## Table of Contents

- [Overview](#overview)
- [Component Categories](#component-categories)
- [Common Components](#common-components)
- [Feature Components](#feature-components)
- [Layout Components](#layout-components)
- [Form Components](#form-components)
- [Card Components](#card-components)
- [Modal Components](#modal-components)
- [Navigation Components](#navigation-components)
- [Usage Guidelines](#usage-guidelines)

---

## Overview

The Rez App component library consists of 80+ reusable React Native components organized by category. All components follow:

- **TypeScript** for type safety
- **Themed styling** with light/dark mode support
- **Accessibility** following WCAG 2.1 AA guidelines
- **Performance optimization** with memoization and lazy loading
- **Consistent design system** with shared colors, spacing, and typography

### Component Structure

```
components/
├── common/          # Shared utility components
├── homepage/        # Homepage-specific components
│   └── cards/       # Card components for homepage
├── cart/            # Shopping cart components
├── product/         # Product-related components
├── store/           # Store components
├── wallet/          # Wallet and payment components
├── profile/         # User profile components
├── play/            # Video and game components
├── earn/            # Earnings and tasks components
└── [50+ more categories]
```

---

## Common Components

### AccessibleButton

A fully accessible button component with screen reader support, haptic feedback, and loading states.

**Props:**

```typescript
interface AccessibleButtonProps {
  label: string;                    // Button text
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  accessibilityHint?: string;
  announceOnPress?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}
```

**Usage:**

```tsx
import AccessibleButton from '@/components/common/AccessibleButton';

// Basic usage
<AccessibleButton
  label="Add to Cart"
  onPress={handleAddToCart}
  variant="primary"
/>

// With icon
<AccessibleButton
  label="Continue"
  onPress={handleContinue}
  variant="primary"
  icon="arrow-forward"
  accessibilityHint="Proceed to checkout"
/>

// Loading state
<AccessibleButton
  label="Processing"
  onPress={handleSubmit}
  loading={isLoading}
  disabled={isLoading}
/>

// Full width button
<AccessibleButton
  label="Sign In"
  onPress={handleSignIn}
  variant="primary"
  fullWidth
/>
```

**Features:**

- Minimum 44x44 touch target size (WCAG compliance)
- Haptic feedback on press (iOS/Android)
- Screen reader announcements
- Multiple variants and sizes
- Loading and disabled states
- Icon support (left and right)

**Accessibility:**

- `accessibilityRole="button"`
- Custom accessibility labels and hints
- Disabled state announcements
- Loading state indicators

---

### OptimizedImage

High-performance image component with lazy loading, progressive loading, and intelligent caching.

**Props:**

```typescript
interface OptimizedImageProps {
  source: string | { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  width?: number;
  height?: number;
  blurhash?: string;
  placeholder?: string;
  fallback?: string;
  lazy?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
  showLoadingIndicator?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
  progressive?: boolean;
  thumbnailUri?: string;
  componentId?: string;
  enableMemoryCache?: boolean;
  preload?: boolean;
}
```

**Usage:**

```tsx
import OptimizedImage from '@/components/common/OptimizedImage';

// Basic usage
<OptimizedImage
  source="https://example.com/image.jpg"
  width={200}
  height={200}
  resizeMode="cover"
/>

// With progressive loading (blur-up effect)
<OptimizedImage
  source="https://example.com/large-image.jpg"
  thumbnailUri="https://example.com/thumbnail.jpg"
  progressive
  width={400}
  height={300}
/>

// With lazy loading
<OptimizedImage
  source="https://example.com/image.jpg"
  lazy
  priority={false}
  width={200}
  height={200}
/>

// Network-aware quality
<OptimizedImage
  source="https://example.com/image.jpg"
  quality="auto" // Adjusts based on WiFi/cellular
  width={300}
  height={300}
/>
```

**Features:**

- Lazy loading with simulated intersection observer
- Progressive loading (blur-up technique)
- Automatic CDN optimization (Cloudinary, Imgix)
- Network-aware quality adjustment
- Memory-efficient caching
- Fallback images on error
- Loading placeholders

**Performance:**

- Reduces initial bundle load
- Optimizes image delivery based on network
- Caches aggressively with expiry
- Preloads critical images

---

### LoadingSpinner

Reusable loading indicator with optional message and full-screen mode.

**Props:**

```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}
```

**Usage:**

```tsx
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Basic spinner
<LoadingSpinner />

// With message
<LoadingSpinner
  message="Loading products..."
  size="large"
/>

// Full screen
<LoadingSpinner
  fullScreen
  message="Please wait..."
  color="#8B5CF6"
/>
```

**Accessibility:**

- `accessibilityRole="progressbar"`
- Custom accessibility labels
- Screen reader friendly

---

### ErrorBoundary

Catches React errors and displays fallback UI.

**Props:**

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}
```

**Usage:**

```tsx
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Wrap components
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Error:', error);
    // Log to error tracking service
  }}
  onReset={() => {
    // Reset app state
  }}
>
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary
  fallback={
    <View>
      <Text>Custom error message</Text>
    </View>
  }
>
  <YourComponent />
</ErrorBoundary>
```

**Features:**

- Catches component errors
- Displays user-friendly fallback UI
- Reset functionality
- Error logging callback

---

### ErrorState

Display error messages with retry functionality.

**Usage:**

```tsx
import ErrorState from '@/components/common/ErrorState';

<ErrorState
  title="Failed to Load"
  message="Unable to load products. Please try again."
  onRetry={handleRetry}
/>
```

---

### LoadingState

Display loading state with animation.

**Usage:**

```tsx
import LoadingState from '@/components/common/LoadingState';

<LoadingState
  message="Loading your data..."
/>
```

---

### Toast

Display toast notifications.

**Usage:**

```tsx
import Toast from '@/components/common/Toast';

Toast.show({
  type: 'success',
  message: 'Item added to cart',
  duration: 3000,
});

Toast.show({
  type: 'error',
  message: 'Failed to add item',
});
```

---

### ConnectionStatus

Display network connection status banner.

**Usage:**

```tsx
import ConnectionStatus from '@/components/common/ConnectionStatus';

<ConnectionStatus />
```

**Features:**

- Automatically detects connection status
- Shows banner when offline
- Dismissible

---

### OfflineBanner

Display offline mode indicator.

**Usage:**

```tsx
import OfflineBanner from '@/components/common/OfflineBanner';

<OfflineBanner
  visible={!isConnected}
  onDismiss={() => setShowBanner(false)}
/>
```

---

### StockBadge

Display product stock status with visual indicators.

**Usage:**

```tsx
import StockBadge from '@/components/common/StockBadge';

<StockBadge
  stock={5}
  lowStockThreshold={10}
  variant="compact"
/>
```

---

### ShimmerEffect

Loading placeholder with shimmer animation.

**Usage:**

```tsx
import ShimmerEffect from '@/components/common/ShimmerEffect';

<ShimmerEffect
  width={200}
  height={20}
  borderRadius={8}
/>
```

---

### SkeletonLoader

Skeleton loading screens for various content types.

**Usage:**

```tsx
import SkeletonLoader from '@/components/common/SkeletonLoader';

<SkeletonLoader type="card" />
<SkeletonLoader type="list" />
<SkeletonLoader type="detail" />
```

---

## Feature Components

### ProductCard

Display product information with cart functionality.

**Props:**

```typescript
interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  width?: number;
  showAddToCart?: boolean;
}
```

**Usage:**

```tsx
import ProductCard from '@/components/homepage/cards/ProductCard';

<ProductCard
  product={productData}
  onPress={handleProductPress}
  onAddToCart={handleAddToCart}
  width={180}
  showAddToCart
/>
```

**Features:**

- Product image with badges (New, Discount)
- Wishlist toggle
- Stock status indicator
- Price and discount display
- Cashback information
- Rating and reviews
- Add to cart / Quantity controls
- Notify me button for out of stock items

**Accessibility:**

- Full screen reader support
- Touch target compliance
- Descriptive labels

---

### CartItem

Display cart item with quantity controls.

**Props:**

```typescript
interface CartItemProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  showAnimation?: boolean;
}
```

**Usage:**

```tsx
import CartItem from '@/components/cart/CartItem';

<CartItem
  item={cartItemData}
  onRemove={handleRemove}
  onUpdateQuantity={handleUpdateQuantity}
  showAnimation
/>
```

**Features:**

- Product image with placeholder
- Quantity controls (+/-)
- Remove button
- Stock warnings
- Cashback badge
- Event details (for event items)
- Smooth animations

---

### CartHeader

Cart page header with item count.

**Usage:**

```tsx
import CartHeader from '@/components/cart/CartHeader';

<CartHeader
  itemCount={cartItems.length}
  onBack={() => navigation.goBack()}
/>
```

---

### PriceSection

Display price breakdown in cart.

**Usage:**

```tsx
import PriceSection from '@/components/cart/PriceSection';

<PriceSection
  subtotal={1000}
  discount={200}
  deliveryFee={50}
  total={850}
  savings={200}
/>
```

---

### StoreCard

Display store information card.

**Usage:**

```tsx
import StoreCard from '@/components/homepage/cards/StoreCard';

<StoreCard
  store={storeData}
  onPress={handleStorePress}
/>
```

---

### EventCard

Display event information with booking functionality.

**Usage:**

```tsx
import EventCard from '@/components/homepage/cards/EventCard';

<EventCard
  event={eventData}
  onPress={handleEventPress}
  onBook={handleBookEvent}
/>
```

---

### BrandedStoreCard

Display branded store with special styling.

**Usage:**

```tsx
import BrandedStoreCard from '@/components/homepage/cards/BrandedStoreCard';

<BrandedStoreCard
  store={storeData}
  onPress={handlePress}
/>
```

---

### RecommendationCard

Display personalized recommendations.

**Usage:**

```tsx
import RecommendationCard from '@/components/homepage/cards/RecommendationCard';

<RecommendationCard
  recommendation={recData}
  onPress={handlePress}
/>
```

---

## Wallet Components

### WalletBalanceCard

Display wallet balance with actions.

**Usage:**

```tsx
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';

<WalletBalanceCard
  balance={1500}
  onTopup={handleTopup}
  onSend={handleSend}
/>
```

---

### TransactionCard

Display transaction details.

**Usage:**

```tsx
import TransactionCard from '@/components/wallet/TransactionCard';

<TransactionCard
  transaction={transactionData}
  onPress={handlePress}
/>
```

---

### TransactionHistory

List of transactions with filtering.

**Usage:**

```tsx
import TransactionHistory from '@/components/wallet/TransactionHistory';

<TransactionHistory
  transactions={transactionsList}
  onTransactionPress={handlePress}
/>
```

---

## Play Page Components

### VideoCard

Display video thumbnail with play button.

**Usage:**

```tsx
import VideoCard from '@/components/playPage/VideoCard';

<VideoCard
  video={videoData}
  onPress={handleVideoPress}
  width={180}
/>
```

---

### ArticleCard

Display article preview card.

**Usage:**

```tsx
import ArticleCard from '@/components/playPage/ArticleCard';

<ArticleCard
  article={articleData}
  onPress={handleArticlePress}
/>
```

---

### FeaturedVideoCard

Large featured video card.

**Usage:**

```tsx
import FeaturedVideoCard from '@/components/playPage/FeaturedVideoCard';

<FeaturedVideoCard
  video={videoData}
  onPress={handlePress}
/>
```

---

## Earn Page Components

### ProjectCard

Display earning project information.

**Usage:**

```tsx
import ProjectCard from '@/components/earnPage/ProjectCard';

<ProjectCard
  project={projectData}
  onPress={handleProjectPress}
/>
```

---

### TaskCard

Display task with rewards.

**Usage:**

```tsx
import TaskCard from '@/components/earnPage/TaskCard';

<TaskCard
  task={taskData}
  onComplete={handleComplete}
/>
```

---

### EarningsCard

Display earnings summary.

**Usage:**

```tsx
import EarningsCard from '@/components/earnPage/EarningsCard';

<EarningsCard
  totalEarnings={5000}
  pendingEarnings={1500}
  onViewDetails={handleViewDetails}
/>
```

---

## Profile Components

### MenuItemCard

Profile menu item with navigation.

**Usage:**

```tsx
import MenuItemCard from '@/components/profile/MenuItemCard';

<MenuItemCard
  icon="person-outline"
  label="Edit Profile"
  onPress={handlePress}
/>
```

---

### ProfileMenuModal

Bottom sheet menu for profile actions.

**Usage:**

```tsx
import ProfileMenuModal from '@/components/profile/ProfileMenuModal';

<ProfileMenuModal
  visible={showMenu}
  onClose={handleClose}
  options={menuOptions}
/>
```

---

## Bill Upload Components

### BillImageUploader

Upload bill images with validation.

**Usage:**

```tsx
import BillImageUploader from '@/components/bills/BillImageUploader';

<BillImageUploader
  onUpload={handleUpload}
  maxImages={3}
/>
```

---

### BillVerificationStatus

Display bill verification status.

**Usage:**

```tsx
import BillVerificationStatus from '@/components/bills/BillVerificationStatus';

<BillVerificationStatus
  status="verified"
  confidence={0.95}
/>
```

---

### CashbackCalculator

Calculate and display cashback amount.

**Usage:**

```tsx
import CashbackCalculator from '@/components/bills/CashbackCalculator';

<CashbackCalculator
  billAmount={1000}
  cashbackPercentage={5}
/>
```

---

## Category Components

### CategoryCard

Display category with image.

**Usage:**

```tsx
import CategoryCard from '@/components/category/CategoryCard';

<CategoryCard
  category={categoryData}
  onPress={handlePress}
/>
```

---

### CategoryGrid

Grid layout of categories.

**Usage:**

```tsx
import CategoryGrid from '@/components/category/CategoryGrid';

<CategoryGrid
  categories={categoriesList}
  onCategoryPress={handlePress}
/>
```

---

### CategoryFilters

Filter chips for category filtering.

**Usage:**

```tsx
import CategoryFilters from '@/components/category/CategoryFilters';

<CategoryFilters
  filters={filterOptions}
  selectedFilters={selected}
  onFilterChange={handleChange}
/>
```

---

## Form Components

### AccessibleInput

Accessible text input with validation.

**Usage:**

```tsx
import AccessibleInput from '@/components/common/AccessibleInput';

<AccessibleInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
/>
```

---

### FormInput

Enhanced form input from onboarding.

**Usage:**

```tsx
import FormInput from '@/components/onboarding/FormInput';

<FormInput
  label="Phone Number"
  value={phone}
  onChangeText={setPhone}
  placeholder="Enter phone number"
  keyboardType="phone-pad"
/>
```

---

## Modal Components

### CashbackModal

Display cashback details modal.

**Usage:**

```tsx
import CashbackModal from '@/components/CashbackModal';

<CashbackModal
  visible={showModal}
  cashback={50}
  onClose={handleClose}
/>
```

---

### AboutModal

Display about/info modal.

**Usage:**

```tsx
import AboutModal from '@/components/AboutModal';

<AboutModal
  visible={showModal}
  onClose={handleClose}
  content={aboutContent}
/>
```

---

### DealDetailsModal

Display deal details in modal.

**Usage:**

```tsx
import DealDetailsModal from '@/components/DealDetailsModal';

<DealDetailsModal
  visible={showModal}
  deal={dealData}
  onClose={handleClose}
/>
```

---

## Layout Components

### ThemedView

Container with theme support.

**Props:**

```typescript
interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}
```

**Usage:**

```tsx
import { ThemedView } from '@/components/ThemedView';

<ThemedView style={styles.container}>
  <Text>Content</Text>
</ThemedView>

// With custom colors
<ThemedView
  lightColor="#FFFFFF"
  darkColor="#1F2937"
  style={styles.section}
>
  <Text>Custom themed section</Text>
</ThemedView>
```

---

### ThemedText

Text component with theme support and typography variants.

**Props:**

```typescript
interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
}
```

**Usage:**

```tsx
import { ThemedText } from '@/components/ThemedText';

// Default text
<ThemedText>Regular text</ThemedText>

// Title
<ThemedText type="title">Page Title</ThemedText>

// Subtitle
<ThemedText type="subtitle">Section Heading</ThemedText>

// Semi-bold
<ThemedText type="defaultSemiBold">Important text</ThemedText>

// Link
<ThemedText type="link">Click here</ThemedText>

// Custom colors
<ThemedText
  lightColor="#8B5CF6"
  darkColor="#A78BFA"
>
  Branded text
</ThemedText>
```

---

## Review Components

### RatingStars

Display star rating with count.

**Usage:**

```tsx
import RatingStars from '@/components/reviews/RatingStars';

<RatingStars
  rating={4.5}
  size={16}
  showCount
  count={123}
/>
```

---

### ReviewTabs

Tabs for review filtering.

**Usage:**

```tsx
import ReviewTabs from '@/components/ReviewTabs';

<ReviewTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  tabs={['All', 'Positive', 'Negative']}
/>
```

---

## Search Components

### SearchHeader

Search bar with filters.

**Usage:**

```tsx
import SearchHeader from '@/components/store-search/SearchHeader';

<SearchHeader
  query={searchQuery}
  onQueryChange={setSearchQuery}
  onFilterPress={handleFilters}
/>
```

---

### FilterChips

Horizontal scrollable filter chips.

**Usage:**

```tsx
import FilterChips from '@/components/store-search/FilterChips';

<FilterChips
  filters={filterOptions}
  selectedFilters={selected}
  onFilterChange={handleChange}
/>
```

---

## Usage Guidelines

### Best Practices

1. **Always use themed components** (`ThemedView`, `ThemedText`) for consistent theming
2. **Provide accessibility props** for all interactive components
3. **Use OptimizedImage** for all images to ensure performance
4. **Wrap error-prone components** in ErrorBoundary
5. **Show loading states** with LoadingSpinner or SkeletonLoader
6. **Display errors gracefully** with ErrorState component
7. **Use AccessibleButton** instead of raw TouchableOpacity
8. **Implement lazy loading** for off-screen components
9. **Follow the design system** color palette and spacing
10. **Test on multiple screen sizes** and accessibility features

### Performance Tips

1. **Memoize expensive components** with React.memo
2. **Use useCallback** for event handlers passed as props
3. **Implement virtualization** for long lists (FlatList)
4. **Lazy load images** with OptimizedImage
5. **Code split** feature components
6. **Avoid inline styles** - use StyleSheet.create
7. **Minimize re-renders** with proper dependency arrays

### Accessibility Checklist

- [ ] All buttons have `accessibilityRole="button"`
- [ ] All images have `accessibilityLabel`
- [ ] Touch targets are minimum 44x44 points
- [ ] Color contrast meets WCAG AA standards
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Loading states are communicated
- [ ] Keyboard navigation works (web)

### Common Patterns

See [COMPONENT_PATTERNS.md](./COMPONENT_PATTERNS.md) for detailed patterns and recipes.

### Theming

See [THEMING_GUIDE.md](./THEMING_GUIDE.md) for comprehensive theming documentation.

### Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for colors, typography, spacing, and more.

---

## Contributing

When creating new components:

1. Place in appropriate category folder
2. Follow TypeScript prop interface pattern
3. Include JSDoc comments
4. Add accessibility props
5. Support theming with `useThemeColor` hook
6. Export from category index file
7. Add to this documentation
8. Include usage examples
9. Test on iOS, Android, and Web
10. Verify accessibility with screen reader

---

## Component Count by Category

- **Common:** 20+ components
- **Homepage:** 15+ components
- **Cart:** 10+ components
- **Product:** 12+ components
- **Wallet:** 8+ components
- **Play Page:** 10+ components
- **Earn Page:** 12+ components
- **Profile:** 8+ components
- **Bills:** 10+ components
- **Categories:** 6+ components
- **Store:** 15+ components
- **Forms:** 5+ components
- **Modals:** 8+ components
- **Reviews:** 5+ components
- **Search:** 5+ components
- **Other categories:** 50+ components

**Total: 200+ components**

---

## Quick Reference

For a condensed quick reference guide, see [COMPONENT_QUICK_REFERENCE.md](./COMPONENT_QUICK_REFERENCE.md).

---

## Version History

- **v1.0.0** - Initial component library documentation (2025-11-11)
