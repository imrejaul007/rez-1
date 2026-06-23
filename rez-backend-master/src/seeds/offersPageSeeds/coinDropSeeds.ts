/**
 * Coin Drop Seeds - Boosted Cashback Events
 */

import mongoose from 'mongoose';
import { ICoinDrop } from '../../models/CoinDrop';
import { storeIds, storeSeeds } from './storeSeeds';

// Helper for future dates
const futureDate = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

const getStoreName = (id: mongoose.Types.ObjectId) =>
  storeSeeds.find(s => s._id.equals(id))?.name || 'Unknown';

const getStoreLogo = (id: mongoose.Types.ObjectId) =>
  storeSeeds.find(s => s._id.equals(id))?.logo || '';

export const coinDropSeeds: Partial<ICoinDrop>[] = [
  {
    storeId: storeIds.swiggy,
    storeName: getStoreName(storeIds.swiggy),
    storeLogo: getStoreLogo(storeIds.swiggy),
    multiplier: 3,
    normalCashback: 10,
    boostedCashback: 30,
    category: 'Food Delivery',
    startTime: new Date(),
    endTime: futureDate(4),
    minOrderValue: 200,
    maxCashback: 150,
    isActive: true,
    priority: 100,
    usageCount: 1500,
  },
  {
    storeId: storeIds.zomato,
    storeName: getStoreName(storeIds.zomato),
    storeLogo: getStoreLogo(storeIds.zomato),
    multiplier: 2,
    normalCashback: 8,
    boostedCashback: 16,
    category: 'Food Delivery',
    startTime: new Date(),
    endTime: futureDate(6),
    minOrderValue: 150,
    maxCashback: 100,
    isActive: true,
    priority: 95,
    usageCount: 1200,
  },
  {
    storeId: storeIds.amazon,
    storeName: getStoreName(storeIds.amazon),
    storeLogo: getStoreLogo(storeIds.amazon),
    multiplier: 5,
    normalCashback: 5,
    boostedCashback: 25,
    category: 'Shopping',
    startTime: new Date(),
    endTime: futureDate(2),
    minOrderValue: 500,
    maxCashback: 500,
    isActive: true,
    priority: 98,
    usageCount: 800,
  },
  {
    storeId: storeIds.myntra,
    storeName: getStoreName(storeIds.myntra),
    storeLogo: getStoreLogo(storeIds.myntra),
    multiplier: 4,
    normalCashback: 6,
    boostedCashback: 24,
    category: 'Fashion',
    startTime: new Date(),
    endTime: futureDate(8),
    minOrderValue: 999,
    maxCashback: 300,
    isActive: true,
    priority: 90,
    usageCount: 650,
  },
  {
    storeId: storeIds.flipkart,
    storeName: getStoreName(storeIds.flipkart),
    storeLogo: getStoreLogo(storeIds.flipkart),
    multiplier: 3,
    normalCashback: 7,
    boostedCashback: 21,
    category: 'Shopping',
    startTime: new Date(),
    endTime: futureDate(12),
    minOrderValue: 499,
    maxCashback: 250,
    isActive: true,
    priority: 88,
    usageCount: 920,
  },
  {
    storeId: storeIds.dominos,
    storeName: getStoreName(storeIds.dominos),
    storeLogo: getStoreLogo(storeIds.dominos),
    multiplier: 2,
    normalCashback: 15,
    boostedCashback: 30,
    category: 'Pizza',
    startTime: new Date(),
    endTime: futureDate(3),
    minOrderValue: 300,
    maxCashback: 100,
    isActive: true,
    priority: 85,
    usageCount: 450,
  },
  {
    storeId: storeIds.starbucks,
    storeName: getStoreName(storeIds.starbucks),
    storeLogo: getStoreLogo(storeIds.starbucks),
    multiplier: 2,
    normalCashback: 10,
    boostedCashback: 20,
    category: 'Cafe',
    startTime: new Date(),
    endTime: futureDate(5),
    minOrderValue: 200,
    maxCashback: 80,
    isActive: true,
    priority: 80,
    usageCount: 380,
  },
  {
    storeId: storeIds.nykaa,
    storeName: getStoreName(storeIds.nykaa),
    storeLogo: getStoreLogo(storeIds.nykaa),
    multiplier: 3,
    normalCashback: 8,
    boostedCashback: 24,
    category: 'Beauty',
    startTime: new Date(),
    endTime: futureDate(10),
    minOrderValue: 500,
    maxCashback: 200,
    isActive: true,
    priority: 82,
    usageCount: 290,
  },
];

export default coinDropSeeds;
