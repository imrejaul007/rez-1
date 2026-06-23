import {
  PartnerLevel,
} from '@/types/partner.types';

// Partner Levels Configuration - Used as fallback when API doesn't return levels
export const partnerLevels: PartnerLevel[] = [
  {
    id: 'level-1',
    name: 'Partner',
    level: 1,
    requirements: {
      orders: 15,
      timeframe: 44, // days
    },
    benefits: [
      {
        id: 'benefit-1-1',
        name: 'Cashback',
        description: 'Up to 10% cashback on orders',
        type: 'cashback',
        value: 10,
        icon: 'cash-outline',
        isActive: true,
      },
      {
        id: 'benefit-1-2',
        name: 'Birthday Discount',
        description: '15% off on birthday month',
        type: 'discount',
        value: 15,
        icon: 'gift-outline',
        isActive: true,
      },
    ],
    color: '#00C06A',
    icon: 'star-outline',
  },
  {
    id: 'level-2',
    name: 'Influencer',
    level: 2,
    requirements: {
      orders: 45,
      timeframe: 44,
    },
    benefits: [
      {
        id: 'benefit-2-1',
        name: 'Cashback',
        description: 'Up to 15% cashback on orders',
        type: 'cashback',
        value: 15,
        icon: 'cash-outline',
        isActive: true,
      },
      {
        id: 'benefit-2-2',
        name: 'Birthday Discount',
        description: '20% off on birthday month',
        type: 'discount',
        value: 20,
        icon: 'gift-outline',
        isActive: true,
      },
      {
        id: 'benefit-2-3',
        name: 'Free Delivery',
        description: 'Free delivery on all orders',
        type: 'freebie',
        value: 'Free',
        icon: 'bicycle-outline',
        isActive: true,
      },
    ],
    color: '#10B981',
    icon: 'trophy-outline',
  },
  {
    id: 'level-3',
    name: 'Ambassador',
    level: 3,
    requirements: {
      orders: 100,
      timeframe: 90,
    },
    benefits: [
      {
        id: 'benefit-3-1',
        name: 'Cashback',
        description: 'Up to 20% cashback on orders',
        type: 'cashback',
        value: 20,
        icon: 'cash-outline',
        isActive: true,
      },
      {
        id: 'benefit-3-2',
        name: 'VIP Support',
        description: 'Priority customer support',
        type: 'special',
        value: 'VIP',
        icon: 'headset-outline',
        isActive: true,
      },
      {
        id: 'benefit-3-3',
        name: 'Exclusive Access',
        description: 'Early access to sales and products',
        type: 'special',
        value: 'Exclusive',
        icon: 'lock-open-outline',
        isActive: true,
      },
    ],
    color: '#F59E0B',
    icon: 'medal-outline',
  },
];

// Utility functions for level management
export const getPartnerLevelById = (levelId: string): PartnerLevel | undefined => {
  return partnerLevels.find(level => level.id === levelId);
};

export const getNextLevel = (currentLevel: number): PartnerLevel | undefined => {
  return partnerLevels.find(level => level.level === currentLevel + 1);
};

export const calculateProgressPercentage = (current: number, target: number): number => {
  return Math.min((current / target) * 100, 100);
};

export default {
  partnerLevels,
  getPartnerLevelById,
  getNextLevel,
  calculateProgressPercentage,
};
