// MainStoreSection Components Index
// This file exports all MainStore section components

// Header Section
export { default as MainStoreHeader } from './MainStoreHeader';

// Product Display Section
export { default as ProductDisplay } from './ProductDisplay';

// Navigation Tabs
export { default as TabNavigation } from './TabNavigation';
export type { TabKey } from './TabNavigation';

// Product Information
export { default as ProductDetails } from './ProductDetails';

// Cashback Offer (Legacy)
export { default as CashbackOffer } from './CashbackOffer';

// UGC Section
export { default as UGCSection } from './UGCSection';

// Bottom Action Button
export { default as VisitStoreButton } from './VisitStoreButton';

// Store Products Grid
export { default as StoreProducts } from './StoreProducts';

// Store Hero Metrics (Magicpin-inspired)
export { default as StoreHeroMetrics } from './StoreHeroMetrics';

// Voucher Cards Section (Magicpin-inspired)
export { default as VoucherCardsSection } from './VoucherCardsSection';
export type { VoucherCard } from './VoucherCardsSection';

// Rating Breakdown Section (Magicpin-inspired)
export { default as RatingBreakdownSection } from './RatingBreakdownSection';
export type { RatingCategory } from './RatingBreakdownSection';

// AI Review Summary (Magicpin-inspired)
export { default as AIReviewSummary } from './AIReviewSummary';

// ============================================================================
// NEW COMPONENTS - Redesigned MainStorePage UI
// ============================================================================

// Store Info Card - Image, name, rating, tags, status
export { default as StoreInfoCard } from './StoreInfoCard';

// Store Quick Info Card - Description, hours, location
export { default as StoreQuickInfoCard } from './StoreQuickInfoCard';

// Store Offers Preview - Offers at this store
export { default as StoreOffersPreview } from './StoreOffersPreview';
export type { StoreOffer } from './StoreOffersPreview';

// User Loyalty Card - Loyalty progress with store
export { default as UserLoyaltyCard } from './UserLoyaltyCard';

// Payment Methods Card - Accepted payment methods
export { default as PaymentMethodsCard } from './PaymentMethodsCard';

// Cashback Hero Card - Green gradient cashback display
export { default as CashbackHeroCard } from './CashbackHeroCard';

// Store Action Buttons - Scan & Pay, Upload Bill, View Offers
export { default as StoreActionButtons } from './StoreActionButtons';

// Store Offers Section - Offers with Apply buttons
export { default as StoreOffersSection } from './StoreOffersSection';

// Store Loyalty Section - Visits progress, next reward
export { default as StoreLoyaltySection } from './StoreLoyaltySection';

// Payment Methods Section - Payment options grid
export { default as PaymentMethodsSection } from './PaymentMethodsSection';

// Menu Section - List format menu with coin earnings
export { default as MenuSection } from './MenuSection';

// People Earning Section - Recent user earnings
export { default as PeopleEarningSection } from './PeopleEarningSection';

// AI Insight Card - AI savings tips
export { default as AIInsightCard } from './AIInsightCard';

// Location Section - Map with directions
export { default as LocationSection } from './LocationSection';

// Nearby Stores Section - Nearby ReZ stores list
export { default as NearbyStoresSection } from './NearbyStoresSection';

// Terms & Transparency Section - Collapsible accordion
export { default as TermsTransparencySection } from './TermsTransparencySection';

// Rewards Footer Banner - Dark footer with trophy
export { default as RewardsFooterBanner } from './RewardsFooterBanner';

// Store Bottom Action Bar - Sticky bottom action bar
export { default as StoreBottomActionBar } from './StoreBottomActionBar';

// Default export for the main component
export { default } from './MainStoreHeader';
