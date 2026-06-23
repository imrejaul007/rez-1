import { PromotionBanner } from '@/types/promotions.types';

/**
 * Mock Promotions Data
 * Various expiry times for testing countdown timers
 */

/**
 * Generate mock promotions for a store
 * @param storeId - Store ID
 * @returns Array of promotion banners
 */
export function getMockPromotions(storeId: string): PromotionBanner[] {
  const now = new Date();

  return [
    // Critical: Expiring in 30 minutes
    {
      id: 'promo-001',
      type: 'flash_sale',
      title: 'Flash Sale Ending Soon!',
      subtitle: 'Last chance to grab amazing deals',
      discountText: '60% OFF',
      backgroundColor: ['#DC2626', '#991B1B'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
      ctaText: 'Grab Now',
      priority: 100,
      isActive: true,
      storeId,
      termsAndConditions: [
        'Valid for 30 minutes only',
        'Limited stock available',
        'Cannot be combined with other offers',
      ],
    },

    // Warning: Expiring in 2 hours
    {
      id: 'promo-002',
      type: 'limited_offer',
      title: 'Limited Time Offer',
      subtitle: 'Hurry! Few hours left',
      discountText: '50% OFF',
      backgroundColor: ['#F59E0B', '#D97706'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
      ctaText: 'Shop Now',
      priority: 90,
      isActive: true,
      storeId,
      termsAndConditions: [
        'Valid for today only',
        'Minimum purchase ₹500',
        'Applicable on selected items',
      ],
    },

    // Normal: Expiring in 1 day
    {
      id: 'promo-003',
      type: 'weekend_special',
      title: 'Weekend Special',
      subtitle: 'Exclusive weekend deals',
      discountText: 'Buy 1 Get 1',
      backgroundColor: ['#7C3AED', '#6D28D9'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day
      ctaText: 'Explore',
      priority: 70,
      isActive: true,
      storeId,
      termsAndConditions: [
        'Valid on weekends only',
        'Applicable on fashion items',
        'Lower priced item will be free',
      ],
    },

    // Normal: Expiring in 3 days
    {
      id: 'promo-004',
      type: 'clearance',
      title: 'Clearance Sale',
      subtitle: 'Clear stock before season ends',
      discountText: 'Up to 70% OFF',
      backgroundColor: ['#EC4899', '#DB2777'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      ctaText: 'Browse',
      priority: 60,
      isActive: true,
      storeId,
      termsAndConditions: [
        'Valid till stock lasts',
        'No returns or exchanges',
        'Final sale items',
      ],
    },

    // Normal: Expiring in 7 days
    {
      id: 'promo-005',
      type: 'new_arrivals',
      title: 'New Arrivals',
      subtitle: 'Fresh collection just landed',
      discountText: '30% OFF',
      backgroundColor: ['#10B981', '#059669'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ctaText: 'Discover',
      priority: 50,
      isActive: true,
      storeId,
      termsAndConditions: [
        'On new collection only',
        'Limited period offer',
        'While stocks last',
      ],
    },

    // Seasonal promotion without expiry (ongoing)
    {
      id: 'promo-006',
      type: 'seasonal',
      title: 'Summer Collection',
      subtitle: 'Beat the heat with style',
      discountText: '40% OFF',
      backgroundColor: ['#F59E0B', '#EAB308'],
      textColor: '#FFFFFF',
      ctaText: 'Shop Summer',
      priority: 40,
      isActive: true,
      storeId,
      termsAndConditions: [
        'On summer collection only',
        'Valid for the season',
      ],
    },

    // Exclusive membership deal
    {
      id: 'promo-007',
      type: 'exclusive',
      title: 'Member Exclusive',
      subtitle: 'Special discount for members',
      discountText: '₹500 OFF',
      backgroundColor: ['#8B5CF6', '#7C3AED'],
      textColor: '#FFFFFF',
      expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
      ctaText: 'Redeem',
      priority: 80,
      isActive: true,
      storeId,
      termsAndConditions: [
        'Members only',
        'Minimum purchase ₹2000',
        'One time use per member',
      ],
    },
  ];
}

/**
 * Get promotions by type
 */
export function getPromotionsByType(
  storeId: string,
  type: PromotionBanner['type']
): PromotionBanner[] {
  return getMockPromotions(storeId).filter(promo => promo.type === type);
}

/**
 * Get active promotions (not expired)
 */
export function getActivePromotions(storeId: string): PromotionBanner[] {
  const now = new Date().getTime();
  return getMockPromotions(storeId).filter(promo => {
    if (!promo.expiryDate) return true; // No expiry = always active
    const expiryTime = new Date(promo.expiryDate).getTime();
    return expiryTime > now;
  });
}

/**
 * Get urgent promotions (expiring within 24 hours)
 */
export function getUrgentPromotions(storeId: string): PromotionBanner[] {
  const now = new Date().getTime();
  const threshold = now + (24 * 60 * 60 * 1000);

  return getMockPromotions(storeId).filter(promo => {
    if (!promo.expiryDate) return false;
    const expiryTime = new Date(promo.expiryDate).getTime();
    return expiryTime > now && expiryTime <= threshold;
  });
}

/**
 * Get priority-sorted promotions
 */
export function getSortedPromotions(storeId: string): PromotionBanner[] {
  return [...getActivePromotions(storeId)].sort((a, b) => b.priority - a.priority);
}

/**
 * Sample promotion for different store types
 */
export const samplePromotions = {
  fashion: {
    id: 'fashion-promo',
    type: 'seasonal' as const,
    title: 'Summer Fashion Sale',
    subtitle: 'Trendy styles at unbeatable prices',
    discountText: '50% OFF',
    backgroundColor: ['#EC4899', '#DB2777'],
    textColor: '#FFFFFF',
    ctaText: 'Shop Fashion',
    priority: 75,
    isActive: true,
  },
  grocery: {
    id: 'grocery-promo',
    type: 'weekend_special' as const,
    title: 'Weekend Grocery Deals',
    subtitle: 'Fresh produce & essentials',
    discountText: '30% OFF',
    backgroundColor: ['#10B981', '#059669'],
    textColor: '#FFFFFF',
    ctaText: 'Order Now',
    priority: 70,
    isActive: true,
  },
  electronics: {
    id: 'electronics-promo',
    type: 'flash_sale' as const,
    title: 'Electronics Flash Sale',
    subtitle: 'Latest gadgets at lowest prices',
    discountText: '40% OFF',
    backgroundColor: ['#3B82F6', '#2563EB'],
    textColor: '#FFFFFF',
    ctaText: 'Browse Tech',
    priority: 85,
    isActive: true,
  },
  restaurant: {
    id: 'restaurant-promo',
    type: 'limited_offer' as const,
    title: 'Lunch Special',
    subtitle: 'Delicious meals delivered hot',
    discountText: 'Buy 1 Get 1',
    backgroundColor: ['#F59E0B', '#D97706'],
    textColor: '#FFFFFF',
    ctaText: 'Order Food',
    priority: 80,
    isActive: true,
  },
};

export default getMockPromotions;
