/**
 * Offers Page Seeds - Main Export
 *
 * This file exports all seed data for the offers page
 */

// Store seeds
export { storeSeeds, storeIds, getStoreInfo } from './storeSeeds';

// Offer seeds
export { offerSeeds } from './offerSeeds';

// Flash Sale seeds (Lightning Deals)
export { flashSaleSeeds } from './flashSaleSeeds';

// Hotspot seeds
export { hotspotSeeds } from './hotspotSeeds';

// Campaign seeds
export { doubleCashbackSeeds } from './doubleCashbackSeeds';
export { coinDropSeeds } from './coinDropSeeds';

// Store-related seeds
export { uploadBillStoreSeeds } from './uploadBillStoreSeeds';
export { bankOfferSeeds } from './bankOfferSeeds';

// Exclusive zone seeds
export { exclusiveZoneSeeds } from './exclusiveZoneSeeds';
export { specialProfileSeeds } from './specialProfileSeeds';

// Loyalty seeds
export { loyaltyMilestoneSeeds } from './loyaltyMilestoneSeeds';

// Seed runner - use: npx ts-node src/seeds/offersPageSeeds/runOffersPageSeeds.ts
// This will seed Flash Sales, Coupons, and Friend Redemptions

// Re-export all for convenience
// Note: All exports are named exports above. Default export removed to avoid TypeScript private name issues.
