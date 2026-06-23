/**
 * Double Cashback Campaign Seeds
 */

import mongoose from 'mongoose';
import { IDoubleCashbackCampaign } from '../../models/DoubleCashbackCampaign';
import { storeIds } from './storeSeeds';

// Helper for future dates
const futureDate = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);
const pastDate = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

export const doubleCashbackSeeds: Partial<IDoubleCashbackCampaign>[] = [
  {
    title: 'Double Cashback Weekend',
    subtitle: 'Earn 2X coins on all food orders!',
    description: 'This weekend only - get double the cashback on all your food delivery orders from Swiggy and Zomato.',
    multiplier: 2,
    startTime: pastDate(2), // Started 2 hours ago
    endTime: futureDate(48), // Ends in 48 hours
    eligibleStores: [storeIds.swiggy, storeIds.zomato, storeIds.dunzo],
    eligibleStoreNames: ['Swiggy', 'Zomato', 'Dunzo'],
    eligibleCategories: ['Food Delivery', 'Quick Commerce'],
    terms: [
      'Minimum order value Rs. 200',
      'Maximum cashback Rs. 100 per order',
      'Valid on first 3 orders only',
      'Cannot be combined with other offers',
    ],
    minOrderValue: 200,
    maxCashback: 100,
    backgroundColor: '#FEF3C7',
    icon: 'flash',
    isActive: true,
    priority: 100,
    usageCount: 1250,
  },
  {
    title: '3X Coins on Fashion',
    subtitle: 'Triple cashback on all fashion purchases!',
    description: 'Shop your favorite styles and earn 3X coins on Myntra and AJIO.',
    multiplier: 3,
    startTime: futureDate(24), // Starts tomorrow
    endTime: futureDate(72), // Ends in 3 days
    eligibleStores: [storeIds.myntra, storeIds.ajio],
    eligibleStoreNames: ['Myntra', 'AJIO'],
    eligibleCategories: ['Fashion'],
    terms: [
      'Minimum order value Rs. 999',
      'Maximum cashback Rs. 500 per order',
      'Valid on all products',
      'Applicable once per user',
    ],
    minOrderValue: 999,
    maxCashback: 500,
    backgroundColor: '#FCE7F3',
    icon: 'shirt',
    isActive: true,
    priority: 90,
    usageCount: 0,
  },
  {
    title: 'Mega Monday - 5X Coins',
    subtitle: 'Start your week with 5X cashback!',
    description: 'Every Monday, earn 5X coins on grocery shopping.',
    multiplier: 5,
    startTime: futureDate(48), // Starts in 2 days
    endTime: futureDate(72), // Ends in 3 days
    eligibleStores: [storeIds.bigBazaar, storeIds.dmart, storeIds.relianceFresh],
    eligibleStoreNames: ['Big Bazaar', 'DMart', 'Reliance Fresh'],
    eligibleCategories: ['Grocery'],
    terms: [
      'Minimum order value Rs. 500',
      'Maximum cashback Rs. 250',
      'Valid only on Mondays',
      'Limited to first 1000 users',
    ],
    minOrderValue: 500,
    maxCashback: 250,
    backgroundColor: '#D1FAE5',
    icon: 'cart',
    isActive: true,
    priority: 85,
    usageCount: 0,
  },
  {
    title: 'Coffee Lover\'s Special',
    subtitle: '2X coins at all cafes!',
    description: 'Get your caffeine fix and earn double coins.',
    multiplier: 2,
    startTime: pastDate(12),
    endTime: futureDate(36),
    eligibleStores: [storeIds.starbucks, storeIds.ccd, storeIds.chaayos],
    eligibleStoreNames: ['Starbucks', 'Café Coffee Day', 'Chaayos'],
    eligibleCategories: ['Cafe'],
    terms: [
      'No minimum order value',
      'Maximum cashback Rs. 50 per order',
      'Valid on dine-in and delivery',
    ],
    minOrderValue: 0,
    maxCashback: 50,
    backgroundColor: '#FEE2E2',
    icon: 'cafe',
    isActive: true,
    priority: 75,
    usageCount: 890,
  },
];

export default doubleCashbackSeeds;
