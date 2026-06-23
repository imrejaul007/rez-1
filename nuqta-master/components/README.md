# Components Directory

Welcome to the Rez App component library. This directory contains 200+ reusable React Native components organized by feature and functionality.

## Directory Structure

```
components/
├── common/              # 20+ shared utility components
├── homepage/            # Homepage-specific components
│   └── cards/          # Card components (Product, Store, Event, etc.)
├── cart/               # Shopping cart components
├── product/            # Product-related components
├── store/              # Store components
├── wallet/             # Wallet and payment components
├── profile/            # User profile components
├── playPage/           # Video and entertainment components
├── earnPage/           # Earnings and tasks components
├── bills/              # Bill upload components
├── category/           # Category browsing components
├── account/            # Account settings components
├── onboarding/         # Onboarding flow components
├── reviews/            # Review and rating components
├── search/             # Search components
├── store-search/       # Store-specific search
├── form/               # Form components
├── modal/              # Modal dialogs
├── navigation/         # Navigation components
├── ugc/                # User-generated content
├── voucher/            # Voucher components
├── subscription/       # Subscription components
├── payment/            # Payment components
├── gamification/       # Gamification features
├── social/             # Social features
├── messages/           # Messaging components
├── events/             # Event components
├── group-buying/       # Group buying features
├── going-out/          # Going out features
├── home-delivery/      # Home delivery features
├── loyalty/            # Loyalty program components
├── referral/           # Referral program components
├── feed/               # Social feed components
├── challenges/         # Challenge components
├── support/            # Customer support components
└── [50+ more categories]
```

## Component Categories

### Common Components (`common/`)

Shared utility components used throughout the app:

- **AccessibleButton** - Fully accessible button with haptic feedback
- **AccessibleInput** - Accessible text input with validation
- **OptimizedImage** - High-performance image with lazy loading
- **LoadingSpinner** - Loading indicator
- **ErrorBoundary** - Error catching component
- **ErrorState** - Error display component
- **LoadingState** - Loading state display
- **Toast** - Toast notifications
- **ConnectionStatus** - Network status indicator
- **OfflineBanner** - Offline mode banner
- **StockBadge** - Product stock indicator
- **ShimmerEffect** - Shimmer loading animation
- **SkeletonLoader** - Skeleton loading screens
- **NotificationBell** - Notification indicator
- **FileUploader** - File upload component
- **CommentSystem** - Comment functionality
- **ReviewSystem** - Review system
- **ReportToast** - Report notifications
- **CrossPlatformAlert** - Cross-platform alerts
- **GameErrorBoundary** - Game-specific error handling

**[View full documentation →](../COMPONENT_LIBRARY.md#common-components)**

### Homepage Components (`homepage/`, `homepage/cards/`)

Components for the main homepage:

- **HorizontalScrollSection** - Horizontal scrolling container
- **SkeletonLoader** - Homepage skeleton loading
- **ProductCard** - Product display card
- **StoreCard** - Store display card
- **EventCard** - Event display card
- **BrandedStoreCard** - Branded store card
- **RecommendationCard** - Personalized recommendation card

### Cart Components (`cart/`)

Shopping cart functionality:

- **CartItem** - Individual cart item with quantity controls
- **CartHeader** - Cart page header
- **PriceSection** - Price breakdown display
- **SlidingTabs** - Tab navigation
- **CartValidation** - Cart validation logic
- **CartSyncStatus** - Sync status indicator
- **CartSocketIntegration** - Real-time cart sync
- **LockedItem** - Locked cart item
- **StockWarningBanner** - Stock warning
- **AddedToCartModal** - Add to cart confirmation

### Wallet Components (`wallet/`)

Wallet and payment features:

- **WalletBalanceCard** - Balance display with actions
- **TransactionCard** - Transaction item
- **TransactionHistory** - Transaction list
- **TransactionTabs** - Transaction filtering tabs
- **TopupModal** - Wallet top-up modal
- **SendMoneyModal** - Money transfer modal

### Play Page Components (`playPage/`, `play/`)

Video and entertainment content:

- **VideoCard** - Video thumbnail card
- **ArticleCard** - Article preview card
- **FeaturedVideoCard** - Large featured video
- **HorizontalVideoSection** - Video carousel
- **MainContentSection** - Main content area
- **CategoryHeader** - Category headers
- **SectionHeader** - Section headers
- **GameCard** - Game card
- **ChallengeCard** - Challenge card
- **ArticleSection** - Article listings
- **ThumbnailVideoCard** - Video thumbnail
- **MerchantVideoSection** - Merchant videos
- **UGCVideoSection** - User videos

### Earn Page Components (`earnPage/`, `earn/`)

Earning opportunities and tasks:

- **ProjectCard** - Earning project card
- **TaskCard** - Task card with rewards
- **EarningsCard** - Earnings summary
- **CategoryGrid** - Category grid
- **CategoryTile** - Category tile
- **NotificationCard** - Notification item
- **NotificationSection** - Notification group
- **ProjectDashboard** - Project overview
- **ProjectStatusCard** - Project status
- **RecentProjectsSection** - Recent projects
- **ReferralSection** - Referral program
- **OpportunityCard** - Earning opportunity
- **EarningOpportunities** - Opportunity list
- **EarningsChart** - Earnings visualization

### Bill Components (`bills/`)

Bill upload and verification:

- **BillImageUploader** - Image upload component
- **BillPreviewModal** - Bill preview
- **BillRequirements** - Requirements display
- **BillVerificationStatus** - Verification status
- **CashbackCalculator** - Cashback calculation
- **ImagePreview** - Image preview
- **ImageQualityChecker** - Quality validation
- **ManualCorrectionForm** - Manual correction
- **MerchantSelector** - Merchant selection
- **BillUploadQueueDemo** - Queue demonstration

### Category Components (`category/`)

Category browsing and filtering:

- **CategoryCard** - Category card
- **CategoryGrid** - Category grid layout
- **CategoryCarousel** - Category carousel
- **CategoryBanner** - Category banner
- **CategoryHeader** - Category header
- **CategoryFilters** - Filter chips

### Profile Components (`profile/`)

User profile and settings:

- **MenuItemCard** - Profile menu item
- **ProfileMenuModal** - Profile menu modal

### Account Components (`account/`)

Account settings:

- **AccountTabs** - Account tab navigation
- **SettingsItem** - Settings list item
- **AddAddressModal** - Add address modal
- **EditAddressModal** - Edit address modal
- **EditInstructionsModal** - Edit instructions

### Review Components (`reviews/`)

Review and rating system:

- **RatingStars** - Star rating display

### Search Components (`search/`, `store-search/`)

Search functionality:

- **SearchHeader** - Search bar with filters
- **FilterChips** - Filter chip list
- **ProductGrid** - Product grid
- **StoreInfo** - Store information
- **DiscountBadge** - Discount badge
- **StoreListSkeleton** - Loading skeleton

### Onboarding Components (`onboarding/`)

User onboarding flow:

- **FormInput** - Form input field
- **LoadingScreen** - Loading screen
- **PurpleGradientBg** - Gradient background

### UI Components (`ui/`)

UI utilities:

- **IconSymbol** - Icon symbols

## Themed Components

### ThemedView

Base container component with automatic theme support.

```tsx
import { ThemedView } from '@/components/ThemedView';

<ThemedView style={styles.container}>
  {/* Content */}
</ThemedView>
```

### ThemedText

Text component with typography variants and theme support.

```tsx
import { ThemedText } from '@/components/ThemedText';

<ThemedText type="title">Page Title</ThemedText>
<ThemedText type="subtitle">Section Heading</ThemedText>
<ThemedText>Body text</ThemedText>
```

**[View theming guide →](../THEMING_GUIDE.md)**

## Other Components

### Collapsible

Expandable/collapsible content container.

### DealCard

Deal display card with details.

### DealList

List of deals.

### CashbackModal

Cashback information modal.

### AboutModal

About/information modal.

### ReviewModal

Review submission modal.

### WalkInDealsModal

Walk-in deals modal.

### DealComparisonModal

Compare deals modal.

### DealDetailsModal

Deal details modal.

### DealFilterModal

Deal filtering modal.

### DealSharingModal

Deal sharing modal.

### ScratchCardOffer

Scratch card promotion.

### CoinInfoCard

Coin information card.

### RechargeWalletCard

Wallet recharge card.

### ReferAndEarnCard

Referral program card.

### ProfileCompletionCard

Profile completion progress.

### ProfileOptionsList

Profile options list.

### EarningCard

Earning display card.

## Documentation

For comprehensive documentation, see:

- **[Component Library](../COMPONENT_LIBRARY.md)** - Complete component reference with props and examples
- **[Design System](../DESIGN_SYSTEM.md)** - Colors, typography, spacing, shadows
- **[Component Patterns](../COMPONENT_PATTERNS.md)** - Common patterns and recipes
- **[Theming Guide](../THEMING_GUIDE.md)** - Theming and dark mode
- **[Quick Reference](../COMPONENT_QUICK_REFERENCE.md)** - Quick lookup guide

## Usage Guidelines

### Importing Components

```tsx
// Themed components
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

// Common components
import AccessibleButton from '@/components/common/AccessibleButton';
import OptimizedImage from '@/components/common/OptimizedImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Feature components
import ProductCard from '@/components/homepage/cards/ProductCard';
import CartItem from '@/components/cart/CartItem';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
```

### Best Practices

1. **Use themed components** - Always use `ThemedView` and `ThemedText` for consistent theming
2. **Provide accessibility props** - All interactive components should have proper accessibility labels
3. **Use OptimizedImage** - For all images to ensure performance
4. **Implement loading states** - Show loading indicators during async operations
5. **Handle errors gracefully** - Use ErrorBoundary and ErrorState components
6. **Follow design system** - Use standard colors, spacing, and typography
7. **Test responsive layouts** - Ensure components work on different screen sizes
8. **Optimize performance** - Use memoization and lazy loading where appropriate

### Component Checklist

When creating new components:

- [ ] Place in appropriate category folder
- [ ] Define TypeScript interface for props
- [ ] Support theming with `useThemeColor` hook
- [ ] Add accessibility props (`accessibilityRole`, `accessibilityLabel`)
- [ ] Include JSDoc comments
- [ ] Export from category index file
- [ ] Add to component library documentation
- [ ] Test on iOS, Android, and Web
- [ ] Verify with screen reader
- [ ] Performance test with large datasets

## Component Statistics

- **Total Components:** 200+
- **Common Components:** 20+
- **Feature Components:** 180+
- **Categories:** 50+
- **Lines of Code:** 50,000+

## Performance

All components are optimized for:

- **Fast rendering** - Memoization and pure components
- **Memory efficiency** - Proper cleanup and unmounting
- **Smooth animations** - Native driver animations
- **Lazy loading** - Off-screen component loading
- **Image optimization** - CDN optimization and caching

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Screen reader support** - Proper accessibility labels
- **Touch target sizes** - Minimum 44x44 points
- **Color contrast** - Sufficient contrast ratios
- **Keyboard navigation** - Full keyboard support (web)
- **Focus indicators** - Clear focus states
- **Error messages** - Announced to screen readers

## Contributing

When adding new components:

1. Follow the existing directory structure
2. Use TypeScript for type safety
3. Support theming out of the box
4. Include accessibility features
5. Document props and usage
6. Add examples to documentation
7. Test on all platforms
8. Verify accessibility

## Support

For questions or issues:

1. Check the [Component Library](../COMPONENT_LIBRARY.md) documentation
2. Review [Component Patterns](../COMPONENT_PATTERNS.md) for examples
3. Consult the [Quick Reference](../COMPONENT_QUICK_REFERENCE.md)
4. Search existing components for similar implementations

## Version History

- **v1.0.0** - Initial component library (2025-11-11)
  - 200+ components documented
  - Complete theming support
  - Accessibility compliance
  - Performance optimizations
