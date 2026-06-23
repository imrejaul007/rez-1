/**
 * Store Components Index
 *
 * Exports all store-related components and their types
 */

// StorePolicies Component
export { default as StorePolicies, MOCK_POLICIES } from './StorePolicies';
export type { StorePoliciesProps, StorePolicy } from './StorePolicies';

// StoreContact Component
export { default as StoreContact, MOCK_CONTACT_INFO } from './StoreContact';
export type { StoreContactProps, StoreContactInfo } from './StoreContact';

// StoreInfoModal Component (Combined Modal)
export { default as StoreInfoModal } from './StoreInfoModal';
export type { StoreInfoModalProps } from './StoreInfoModal';

// FrequentlyBoughtTogether Component
export { default as FrequentlyBoughtTogether } from './FrequentlyBoughtTogether';
export type { BundleProduct } from './FrequentlyBoughtTogether';

// StoreProductCard Component
export { default as StoreProductCard } from './StoreProductCard';

// RelatedProducts Component
export { default as RelatedProducts } from './RelatedProducts';

// Example Usage (for development/testing)
export { default as StoreComponentExamples } from './ExampleUsage';
