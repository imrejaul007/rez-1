// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Master Seeds - Comprehensive seed data for all homepage sections
 * Run with: npx ts-node src/seeds/masterSeeds.ts
 *
 * This seeds:
 * - Categories (with vibes, occasions, hashtags)
 * - Stores (various categories)
 * - Products
 * - Offers
 * - HeroBanners
 * - Campaigns
 * - StoreExperiences
 * - Events
 * - ServiceCategories
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import Offer from '../models/Offer';
import HeroBanner from '../models/HeroBanner';
import Campaign from '../models/Campaign';
import StoreExperience from '../models/StoreExperience';
import Event from '../models/Event';
import { ServiceCategory } from '../models/ServiceCategory';
import { User } from '../models/User';

// ==========================================
// CATEGORY SEEDS
// ==========================================
const categorySeeds = [
  // GOING OUT Categories
  {
    name: 'Restaurants',
    slug: 'restaurants',
    description: 'Dine in at your favorite restaurants',
    icon: '🍽️',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    bannerImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    type: 'going_out',
    isActive: true,
    sortOrder: 1,
    metadata: { color: '#FF6B6B', tags: ['food', 'dining', 'dine-in'], featured: true },
    productCount: 150,
    storeCount: 45,
    isBestDiscount: true,
    maxCashback: 30,
    vibes: [
      { id: 'romantic', name: 'Romantic', icon: '💕', color: '#FF69B4', description: 'Perfect for dates' },
      { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', color: '#4CAF50', description: 'Family-friendly spots' },
      { id: 'party', name: 'Party', icon: '🎉', color: '#9C27B0', description: 'Celebration venues' },
    ],
    occasions: [
      { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#FF9800', tag: 'Hot', discount: 25 },
      { id: 'anniversary', name: 'Anniversary', icon: '💍', color: '#E91E63', tag: 'Trending', discount: 20 },
      { id: 'date-night', name: 'Date Night', icon: '🌹', color: '#9C27B0', discount: 15 },
    ],
    trendingHashtags: [
      { id: '1', tag: '#FoodieFinds', count: 1250, color: '#FF6B6B', trending: true },
      { id: '2', tag: '#WeekendVibes', count: 890, color: '#4CAF50', trending: true },
      { id: '3', tag: '#DateNight', count: 650, color: '#9C27B0', trending: false },
    ],
  },
  {
    name: 'Cafes',
    slug: 'cafes',
    description: 'Coffee, snacks and good vibes',
    icon: '☕',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    bannerImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    type: 'going_out',
    isActive: true,
    sortOrder: 2,
    metadata: { color: '#8D6E63', tags: ['coffee', 'cafe', 'snacks'], featured: true },
    productCount: 80,
    storeCount: 35,
    maxCashback: 25,
    vibes: [
      { id: 'cozy', name: 'Cozy', icon: '🛋️', color: '#8D6E63', description: 'Comfortable ambiance' },
      { id: 'work', name: 'Work', icon: '💻', color: '#2196F3', description: 'Great for remote work' },
    ],
    occasions: [
      { id: 'coffee-date', name: 'Coffee Date', icon: '☕', color: '#8D6E63', discount: 15 },
    ],
    trendingHashtags: [
      { id: '1', tag: '#CoffeeLover', count: 2100, color: '#8D6E63', trending: true },
    ],
  },
  {
    name: 'Bars & Pubs',
    slug: 'bars-pubs',
    description: 'Nightlife and drinks',
    icon: '🍺',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
    type: 'going_out',
    isActive: true,
    sortOrder: 3,
    metadata: { color: '#5C6BC0', tags: ['nightlife', 'drinks', 'bar'] },
    productCount: 60,
    storeCount: 25,
    maxCashback: 20,
  },
  {
    name: 'Movies',
    slug: 'movies',
    description: 'Book movie tickets',
    icon: '🎬',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    type: 'going_out',
    isActive: true,
    sortOrder: 4,
    metadata: { color: '#E91E63', tags: ['entertainment', 'movies', 'cinema'], featured: true },
    productCount: 20,
    storeCount: 15,
    isBestSeller: true,
    maxCashback: 15,
  },
  {
    name: 'Salon & Spa',
    slug: 'salon-spa',
    description: 'Beauty and wellness services',
    icon: '💅',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    type: 'going_out',
    isActive: true,
    sortOrder: 5,
    metadata: { color: '#EC407A', tags: ['beauty', 'wellness', 'spa'], featured: true },
    productCount: 100,
    storeCount: 40,
    maxCashback: 35,
  },
  {
    name: 'Gym & Fitness',
    slug: 'gym-fitness',
    description: 'Fitness centers and classes',
    icon: '🏋️',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    type: 'going_out',
    isActive: true,
    sortOrder: 6,
    metadata: { color: '#43A047', tags: ['fitness', 'gym', 'health'] },
    productCount: 50,
    storeCount: 20,
    maxCashback: 25,
  },

  // HOME DELIVERY Categories
  {
    name: 'Food Delivery',
    slug: 'food-delivery',
    description: 'Order food to your doorstep',
    icon: '🍕',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 1,
    metadata: { color: '#FF5722', tags: ['food', 'delivery', 'order'], featured: true },
    productCount: 500,
    storeCount: 100,
    isBestSeller: true,
    isBestDiscount: true,
    maxCashback: 40,
    vibes: [
      { id: 'healthy', name: 'Healthy', icon: '🥗', color: '#4CAF50', description: 'Nutritious options' },
      { id: 'comfort', name: 'Comfort Food', icon: '🍔', color: '#FF9800', description: 'Feel-good meals' },
      { id: 'quick', name: 'Quick Bites', icon: '⚡', color: '#2196F3', description: 'Fast delivery' },
    ],
    occasions: [
      { id: 'lunch', name: 'Lunch', icon: '🍱', color: '#4CAF50', discount: 20 },
      { id: 'dinner', name: 'Dinner', icon: '🍝', color: '#FF5722', discount: 25 },
      { id: 'midnight', name: 'Late Night', icon: '🌙', color: '#673AB7', tag: 'Hot', discount: 15 },
    ],
  },
  {
    name: 'Grocery',
    slug: 'grocery',
    description: 'Daily groceries delivered',
    icon: '🥬',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 2,
    metadata: { color: '#66BB6A', tags: ['grocery', 'essentials', 'daily'], featured: true },
    productCount: 1000,
    storeCount: 30,
    maxCashback: 15,
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Gadgets and electronics',
    icon: '📱',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 3,
    metadata: { color: '#42A5F5', tags: ['electronics', 'gadgets', 'tech'], featured: true },
    productCount: 300,
    storeCount: 25,
    isBestDiscount: true,
    maxCashback: 20,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing and accessories',
    icon: '👗',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 4,
    metadata: { color: '#AB47BC', tags: ['fashion', 'clothing', 'style'], featured: true },
    productCount: 800,
    storeCount: 50,
    isBestSeller: true,
    maxCashback: 30,
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    description: 'Beauty and cosmetics',
    icon: '💄',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 5,
    metadata: { color: '#EC407A', tags: ['beauty', 'cosmetics', 'skincare'] },
    productCount: 400,
    storeCount: 35,
    maxCashback: 35,
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Home essentials and decor',
    icon: '🏠',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 6,
    metadata: { color: '#78909C', tags: ['home', 'kitchen', 'decor'] },
    productCount: 250,
    storeCount: 20,
    maxCashback: 25,
  },

  // GENERAL Categories
  {
    name: 'Travel',
    slug: 'travel',
    description: 'Flights, hotels and packages',
    icon: '✈️',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    type: 'general',
    isActive: true,
    sortOrder: 1,
    metadata: { color: '#29B6F6', tags: ['travel', 'flights', 'hotels'], featured: true },
    productCount: 200,
    storeCount: 30,
    maxCashback: 12,
  },
  {
    name: 'Financial Services',
    slug: 'financial-services',
    description: 'Bill payments and recharges',
    icon: '💳',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
    type: 'general',
    isActive: true,
    sortOrder: 2,
    metadata: { color: '#26A69A', tags: ['finance', 'bills', 'recharge'] },
    productCount: 50,
    storeCount: 15,
    maxCashback: 5,
  },
  {
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'Pharmacy and health services',
    icon: '👨‍⚕️',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400',
    type: 'general',
    isActive: true,
    sortOrder: 3,
    metadata: { color: '#EF5350', tags: ['health', 'pharmacy', 'medicine'] },
    productCount: 300,
    storeCount: 25,
    maxCashback: 20,
  },
];

// ==========================================
// STORE SEEDS
// ==========================================
const storeSeeds = [
  // Food Delivery Stores
  {
    name: "Domino's Pizza",
    slug: 'dominos-pizza',
    description: "World's favorite pizza delivery",
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
    banner: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-eating-a-slice-of-pizza-42756-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      title: "Domino's Fresh Pizza",
      duration: 10,
      uploadedAt: new Date(),
    }],
    tags: ['pizza', 'fast-food', 'delivery', 'quick-commerce'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      coordinates: [77.6101, 12.9352],
    },
    contact: { phone: '+919876543210', email: 'support@dominos.in' },
    ratings: { average: 4.4, count: 1250, distribution: { 5: 600, 4: 400, 3: 150, 2: 70, 1: 30 } },
    offers: { cashback: 15, minOrderAmount: 300, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:30' },
        sunday: { open: '10:00', close: '23:30' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 200,
      deliveryFee: 30,
      freeDeliveryAbove: 500,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: false, premium: false, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 5600, totalRevenue: 2800000, avgOrderValue: 500, repeatCustomers: 2100, followersCount: 3500 },
  },
  {
    name: 'Starbucks',
    slug: 'starbucks',
    description: 'Premium coffee experience',
    logo: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200',
    banner: ['https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-barista-preparing-coffee-4797-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
      title: 'Starbucks Coffee Art',
      duration: 12,
      uploadedAt: new Date(),
    }],
    tags: ['coffee', 'cafe', 'premium', 'beverages'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'UB City Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543211', email: 'support@starbucks.in' },
    ratings: { average: 4.5, count: 890, distribution: { 5: 500, 4: 250, 3: 100, 2: 30, 1: 10 } },
    offers: { cashback: 20, minOrderAmount: 200, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '23:00' },
        saturday: { open: '08:00', close: '23:00' },
        sunday: { open: '09:00', close: '22:00' },
      },
      deliveryTime: '25-35 mins',
      minimumOrder: 150,
      deliveryFee: 25,
      freeDeliveryAbove: 400,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: false, premium: true, organic: false, mall: true, cashStore: false },
    analytics: { totalOrders: 3200, totalRevenue: 1600000, avgOrderValue: 500, repeatCustomers: 1800, followersCount: 4500 },
  },
  {
    name: 'KFC',
    slug: 'kfc',
    description: "Finger lickin' good chicken",
    logo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200',
    banner: ['https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-plate-with-vegetables-43129-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
      title: 'KFC Kitchen Fresh',
      duration: 10,
      uploadedAt: new Date(),
    }],
    tags: ['chicken', 'fast-food', 'fried-chicken', 'delivery'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5833, 12.9716],
    },
    contact: { phone: '+919876543212' },
    ratings: { average: 4.3, count: 2100, distribution: { 5: 900, 4: 700, 3: 300, 2: 150, 1: 50 } },
    offers: { cashback: 18, minOrderAmount: 250, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:30' },
        saturday: { open: '11:00', close: '23:30' },
        sunday: { open: '11:00', close: '23:00' },
      },
      deliveryTime: '30-40 mins',
      minimumOrder: 200,
      deliveryFee: 35,
      freeDeliveryAbove: 450,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, premium: false, organic: false, mall: false, cashStore: true },
    analytics: { totalOrders: 8900, totalRevenue: 4450000, avgOrderValue: 500, repeatCustomers: 4200, followersCount: 5600 },
  },
  // Beauty Stores
  {
    name: 'Lakme Salon',
    slug: 'lakme-salon',
    description: 'Premium beauty and salon services',
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200',
    banner: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-receiving-a-facial-treatment-42357-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
      title: 'Lakme Beauty Experience',
      duration: 15,
      uploadedAt: new Date(),
    }],
    tags: ['beauty', 'salon', 'spa', 'makeup', 'haircut'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6411, 12.9719],
    },
    contact: { phone: '+919876543213' },
    ratings: { average: 4.6, count: 560, distribution: { 5: 350, 4: 150, 3: 40, 2: 15, 1: 5 } },
    offers: { cashback: 25, minOrderAmount: 500, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '20:00' },
        tuesday: { open: '10:00', close: '20:00' },
        wednesday: { open: '10:00', close: '20:00' },
        thursday: { open: '10:00', close: '20:00' },
        friday: { open: '10:00', close: '21:00' },
        saturday: { open: '10:00', close: '21:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: false, cashStore: false },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: true, slotDuration: 60, advanceBookingDays: 14 },
    serviceTypes: ['haircut', 'facial', 'makeup', 'manicure', 'pedicure', 'hair-spa'],
  },
  // Grocery Stores
  {
    name: 'BigBasket',
    slug: 'bigbasket',
    description: 'Online grocery shopping',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    banner: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-women-shopping-in-a-supermarket-4844-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      title: 'BigBasket Fresh Delivery',
      duration: 10,
      uploadedAt: new Date(),
    }],
    tags: ['grocery', 'essentials', 'organic', 'fresh', 'daily-needs'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'HSR Layout',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560102',
      coordinates: [77.6245, 12.9352],
    },
    ratings: { average: 4.2, count: 3400, distribution: { 5: 1500, 4: 1200, 3: 450, 2: 180, 1: 70 } },
    offers: { cashback: 10, minOrderAmount: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      deliveryTime: '60-90 mins',
      minimumOrder: 300,
      deliveryFee: 0,
      freeDeliveryAbove: 500,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, premium: false, organic: true, mall: false, cashStore: true },
  },
  // Electronics Store
  {
    name: 'Croma',
    slug: 'croma',
    description: 'Electronics and gadgets',
    logo: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200',
    banner: ['https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800'],
    videos: [{
      url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-4693-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      title: 'Croma Tech Store',
      duration: 12,
      uploadedAt: new Date(),
    }],
    tags: ['electronics', 'gadgets', 'mobile', 'laptop', 'appliances'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Phoenix Marketcity',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560048',
      coordinates: [77.6411, 12.9972],
    },
    ratings: { average: 4.1, count: 1800, distribution: { 5: 700, 4: 600, 3: 300, 2: 150, 1: 50 } },
    offers: { cashback: 12, minOrderAmount: 1000, isPartner: true, partnerLevel: 'silver' },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: true, cashStore: false },
  },
];

// ==========================================
// HERO BANNER SEEDS
// ==========================================
const heroBannerSeeds = [
  {
    title: 'Super Cashback Weekend',
    subtitle: 'Up to 50% cashback on all orders',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    backgroundColor: '#FF6B6B',
    textColor: '#FFFFFF',
    ctaText: 'Shop Now',
    ctaLink: '/offers',
    priority: 100,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Food Festival',
    subtitle: 'Order from 500+ restaurants',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    backgroundColor: '#4CAF50',
    textColor: '#FFFFFF',
    ctaText: 'Order Food',
    ctaLink: '/food-delivery',
    priority: 90,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Beauty Bonanza',
    subtitle: '30% off on salon bookings',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    backgroundColor: '#EC407A',
    textColor: '#FFFFFF',
    ctaText: 'Book Now',
    ctaLink: '/beauty',
    priority: 80,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  },
];

// ==========================================
// OFFER SEEDS
// ==========================================
const offerSeeds = [
  {
    title: 'Flash Pizza Deal',
    subtitle: 'Large Pizza + 2 Sides',
    description: 'Limited time offer on our best-selling pizza combo',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    category: 'food',
    type: 'discount',
    cashbackPercentage: 15,
    location: { type: 'Point', coordinates: [77.6101, 12.9352] },
    validity: { startDate: new Date(), endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), isActive: true },
    engagement: { likesCount: 234, sharesCount: 45, viewsCount: 1250 },
    restrictions: { minOrderValue: 300 },
    isFollowerExclusive: false,
    isFreeDelivery: true,
    isActive: true,
    priority: 100,
  },
  {
    title: 'Coffee Rush Hour',
    subtitle: '33% off any Grande drink',
    description: 'Premium coffee at flash sale prices',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    category: 'food',
    type: 'discount',
    cashbackPercentage: 20,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    validity: { startDate: new Date(), endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), isActive: true },
    engagement: { likesCount: 456, sharesCount: 89, viewsCount: 2100 },
    restrictions: { minOrderValue: 200 },
    isFollowerExclusive: false,
    isFreeDelivery: false,
    isActive: true,
    priority: 95,
  },
  {
    title: 'Beauty Weekend',
    subtitle: 'Flat 30% off on all services',
    description: 'Pamper yourself this weekend',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    category: 'general',
    type: 'discount',
    cashbackPercentage: 30,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    validity: { startDate: new Date(), endDate: new Date(Date.now() + 72 * 60 * 60 * 1000), isActive: true },
    engagement: { likesCount: 567, sharesCount: 123, viewsCount: 3400 },
    restrictions: { minOrderValue: 500 },
    isFollowerExclusive: false,
    isFreeDelivery: false,
    isActive: true,
    priority: 90,
  },
  {
    title: 'Electronics Mega Sale',
    subtitle: 'Up to 40% off + extra 10% cashback',
    description: 'Best deals on gadgets and appliances',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    category: 'general',
    type: 'cashback',
    cashbackPercentage: 10,
    location: { type: 'Point', coordinates: [77.6411, 12.9972] },
    validity: { startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), isActive: true },
    engagement: { likesCount: 890, sharesCount: 234, viewsCount: 5600 },
    restrictions: { minOrderValue: 1000 },
    isFollowerExclusive: false,
    isFreeDelivery: true,
    isActive: true,
    priority: 85,
  },
];

// ==========================================
// CAMPAIGN SEEDS (for ExcitingDealsSection)
// ==========================================
const campaignSeeds = [
  {
    campaignId: 'super-cashback',
    title: 'Super Cashback Weekend',
    subtitle: 'Up to 50% cashback',
    badge: '50%',
    badgeBg: '#FFFFFF',
    badgeColor: '#0B2240',
    gradientColors: ['rgba(16, 185, 129, 0.2)', 'rgba(20, 184, 166, 0.1)'],
    type: 'cashback',
    deals: [
      { store: 'Electronics Hub', cashback: '40%', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
      { store: 'Fashion Central', cashback: '50%', image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=300' },
      { store: 'Home Decor', cashback: '35%', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 100,
  },
  {
    campaignId: 'triple-coin-day',
    title: 'Triple Coin Day',
    subtitle: '3X coins on all spends',
    badge: '3X',
    badgeBg: '#FFFFFF',
    badgeColor: '#0B2240',
    gradientColors: ['rgba(245, 158, 11, 0.2)', 'rgba(249, 115, 22, 0.1)'],
    type: 'coins',
    deals: [
      { store: 'Grocery Mart', coins: '3000', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300' },
      { store: 'Beauty Palace', coins: '2500', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
      { store: 'Fitness Zone', coins: '1800', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 90,
  },
  {
    campaignId: 'mega-bank-offers',
    title: 'Mega Bank Offers',
    subtitle: 'HDFC, ICICI, SBI, Axis',
    badge: 'BANKS',
    badgeBg: '#0B2240',
    badgeColor: '#FFFFFF',
    gradientColors: ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.1)'],
    type: 'bank',
    deals: [
      { store: 'HDFC Exclusive', cashback: '₹5000 off', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300' },
      { store: 'ICICI Bonanza', cashback: '₹3000 off', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 85,
  },
];

// ==========================================
// STORE EXPERIENCE SEEDS
// ==========================================
const experienceSeeds = [
  {
    slug: 'fast-delivery',
    title: '60-Minute Delivery',
    subtitle: 'Quick delivery to your doorstep',
    icon: '⚡',
    iconType: 'emoji',
    type: 'fastDelivery',
    badge: 'FAST',
    badgeBg: '#7B61FF',
    badgeColor: '#FFFFFF',
    filterCriteria: { tags: ['fast-delivery', 'quick-commerce'], maxDeliveryTime: 60 },
    sortOrder: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'one-rupee-store',
    title: '₹1 Store',
    subtitle: 'Deals starting at just ₹1',
    icon: '🏷️',
    iconType: 'emoji',
    type: 'oneRupee',
    badge: '₹1',
    badgeBg: '#22C55E',
    badgeColor: '#FFFFFF',
    filterCriteria: { tags: ['budget', 'deals', 'one-rupee'], maxPrice: 99 },
    sortOrder: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'luxury-store',
    title: 'Luxury Store',
    subtitle: 'Premium brands & exclusive products',
    icon: '👑',
    iconType: 'emoji',
    type: 'luxury',
    badge: 'PREMIUM',
    badgeBg: '#F59E0B',
    badgeColor: '#FFFFFF',
    filterCriteria: { tags: ['luxury', 'premium', 'exclusive'], isPremium: true },
    sortOrder: 3,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'organic-store',
    title: 'Organic Store',
    subtitle: 'Fresh & organic products',
    icon: '🌿',
    iconType: 'emoji',
    type: 'organic',
    badge: 'ORGANIC',
    badgeBg: '#10B981',
    badgeColor: '#FFFFFF',
    filterCriteria: { tags: ['organic', 'natural', 'healthy'], isOrganic: true },
    sortOrder: 4,
    isActive: true,
    isFeatured: true,
  },
];

// ==========================================
// EVENT SEEDS
// ==========================================
const eventSeeds = [
  {
    title: 'Weekend Movie Marathon',
    subtitle: 'Up to 20% off on bookings',
    description: 'Book your favorite movies with exclusive ReZ discounts',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    price: { amount: 250, currency: '₹', isFree: false, discount: 20 },
    location: { name: 'PVR Cinemas', address: 'Koramangala', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    time: '18:00',
    category: 'Entertainment',
    organizer: { name: 'ReZ Entertainment', email: 'events@rez.app' },
    status: 'published',
    featured: true,
    priority: 100,
  },
  {
    title: 'Live Music Concert',
    subtitle: '2x coins on tickets',
    description: 'Experience live music with your favorite artists',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    price: { amount: 1500, currency: '₹', isFree: false },
    location: { name: 'Phoenix Arena', address: 'Whitefield', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    time: '19:00',
    category: 'Music',
    organizer: { name: 'LiveNation India', email: 'events@livenation.in' },
    status: 'published',
    featured: true,
    priority: 90,
  },
  {
    title: 'DIY Art Workshop',
    subtitle: 'Learn & create',
    description: 'Weekend pottery and painting workshop',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
    price: { amount: 800, currency: '₹', isFree: false, discount: 15 },
    location: { name: 'Art Studio', address: 'Indiranagar', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '10:00',
    category: 'Arts',
    organizer: { name: 'CreativeHub', email: 'workshops@creativehub.com' },
    status: 'published',
    featured: true,
    priority: 80,
  },
  {
    title: 'Theme Park Day Pass',
    subtitle: 'Family fun package',
    description: 'Full day access to all rides and attractions',
    image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400',
    price: { amount: 1200, currency: '₹', isFree: false, discount: 25 },
    location: { name: 'Wonderla', address: 'Mysore Road', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '10:00',
    category: 'Entertainment',
    organizer: { name: 'Wonderla Parks', email: 'booking@wonderla.com' },
    status: 'published',
    featured: true,
    priority: 85,
  },
  {
    title: 'Gaming Tournament',
    subtitle: 'Win big prizes',
    description: 'Compete in popular games and win prizes',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    price: { amount: 500, currency: '₹', isFree: false },
    location: { name: 'Game Arena', address: 'HSR Layout', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    time: '14:00',
    category: 'Gaming',
    organizer: { name: 'ESports India', email: 'tournaments@esportsindia.com' },
    status: 'published',
    featured: true,
    priority: 75,
  },
];

// ==========================================
// SERVICE CATEGORY SEEDS
// ==========================================
const serviceCategorySeeds = [
  {
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'Doctors, pharmacy, lab tests & health packages',
    icon: '👨‍⚕️',
    iconType: 'emoji',
    cashbackPercentage: 10,
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Home Services',
    slug: 'home-services',
    description: 'Repair, cleaning, painting & more',
    icon: '🔧',
    iconType: 'emoji',
    cashbackPercentage: 15,
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Financial Services',
    slug: 'financial-services',
    description: 'Bill payments, recharges, insurance & more',
    icon: '💳',
    iconType: 'emoji',
    cashbackPercentage: 5,
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Travel',
    slug: 'travel',
    description: 'Flights, hotels, trains, buses & packages',
    icon: '✈️',
    iconType: 'emoji',
    cashbackPercentage: 8,
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Beauty & Wellness',
    slug: 'beauty-wellness',
    description: 'Salon, spa & beauty products',
    icon: '💅',
    iconType: 'emoji',
    cashbackPercentage: 20,
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Fitness & Sports',
    slug: 'fitness-sports',
    description: 'Gyms, studios & sports equipment',
    icon: '🏋️',
    iconType: 'emoji',
    cashbackPercentage: 12,
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Grocery & Essentials',
    slug: 'grocery-essentials',
    description: 'Daily groceries & household essentials',
    icon: '🥬',
    iconType: 'emoji',
    cashbackPercentage: 5,
    sortOrder: 7,
    isActive: true,
  },
];

// ==========================================
// MAIN SEED FUNCTION
// ==========================================
async function runMasterSeeds() {
  console.log('🚀 Starting Master Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI ||
      (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Seed Categories
    console.log('📁 Seeding Categories...');
    for (const category of categorySeeds) {
      await Category.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Category: ${category.name}`);
    }
    console.log(`   📊 Total categories: ${categorySeeds.length}\n`);

    // Get category IDs for stores
    const categoryMap: Record<string, any> = {};
    const categories = await Category.find({});
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });

    // Seed Stores with category references
    console.log('🏪 Seeding Stores...');
    for (const store of storeSeeds) {
      // Assign category based on tags
      let categoryId = categoryMap['food-delivery']; // default
      if (store.tags.includes('coffee') || store.tags.includes('cafe')) {
        categoryId = categoryMap['cafes'];
      } else if (store.tags.includes('beauty') || store.tags.includes('salon')) {
        categoryId = categoryMap['salon-spa'];
      } else if (store.tags.includes('grocery')) {
        categoryId = categoryMap['grocery'];
      } else if (store.tags.includes('electronics')) {
        categoryId = categoryMap['electronics'];
      }

      await Store.findOneAndUpdate(
        { slug: store.slug },
        { ...store, category: categoryId },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Store: ${store.name}`);
    }
    console.log(`   📊 Total stores: ${storeSeeds.length}\n`);

    // Seed Hero Banners
    console.log('🖼️ Seeding Hero Banners...');
    for (const banner of heroBannerSeeds) {
      await HeroBanner.findOneAndUpdate(
        { title: banner.title },
        banner,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Banner: ${banner.title}`);
    }
    console.log(`   📊 Total banners: ${heroBannerSeeds.length}\n`);

    // Get store IDs for offers
    const stores = await Store.find({});
    const storeIdMap: Record<string, any> = {};
    stores.forEach(s => {
      storeIdMap[s.slug] = s._id;
    });

    // Get or create admin user for createdBy
    let adminUser = await User.findOne({ $or: [{ email: 'admin@rez.app' }, { isAdmin: true }] });
    if (!adminUser) {
      // Get any existing user as fallback
      adminUser = await User.findOne({});
    }
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin',
        email: 'admin@rez.app',
        phoneNumber: '+919999900000',
        isAdmin: true,
        isVerified: true,
      });
      console.log('   ✅ Created admin user');
    }

    // Seed Offers - Delete existing ones with these titles first to avoid geo index issues
    console.log('🎁 Seeding Offers...');
    const offerTitles = offerSeeds.map(o => o.title);
    await Offer.deleteMany({ title: { $in: offerTitles } });

    for (const offer of offerSeeds) {
      // Assign a random store with proper structure
      const storeKeys = Object.keys(storeIdMap);
      const randomStoreSlug = storeKeys[Math.floor(Math.random() * storeKeys.length)];
      const storeDoc = await Store.findById(storeIdMap[randomStoreSlug]);

      if (!storeDoc) continue;

      await Offer.create({
        ...offer,
        store: {
          id: storeDoc._id,
          name: storeDoc.name,
          logo: storeDoc.logo || '',
        },
        createdBy: adminUser._id,
      });
      console.log(`   ✅ Offer: ${offer.title}`);
    }
    console.log(`   📊 Total offers: ${offerSeeds.length}\n`);

    // Seed Campaigns
    console.log('📢 Seeding Campaigns...');
    for (const campaign of campaignSeeds) {
      await Campaign.findOneAndUpdate(
        { campaignId: campaign.campaignId },
        campaign,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Campaign: ${campaign.title}`);
    }
    console.log(`   📊 Total campaigns: ${campaignSeeds.length}\n`);

    // Seed Store Experiences
    console.log('🛍️ Seeding Store Experiences...');
    for (const experience of experienceSeeds) {
      await StoreExperience.findOneAndUpdate(
        { slug: experience.slug },
        experience,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Experience: ${experience.title}`);
    }
    console.log(`   📊 Total experiences: ${experienceSeeds.length}\n`);

    // Seed Events
    console.log('🎭 Seeding Events...');
    for (const event of eventSeeds) {
      await Event.findOneAndUpdate(
        { title: event.title },
        event,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Event: ${event.title}`);
    }
    console.log(`   📊 Total events: ${eventSeeds.length}\n`);

    // Seed Service Categories
    console.log('🔧 Seeding Service Categories...');
    for (const category of serviceCategorySeeds) {
      await ServiceCategory.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Service Category: ${category.name}`);
    }
    console.log(`   📊 Total service categories: ${serviceCategorySeeds.length}\n`);

    // Print summary
    const totalItems =
      categorySeeds.length +
      storeSeeds.length +
      heroBannerSeeds.length +
      offerSeeds.length +
      campaignSeeds.length +
      experienceSeeds.length +
      eventSeeds.length +
      serviceCategorySeeds.length;

    console.log('🎉 Master seeds completed successfully!');
    console.log('━'.repeat(50));
    console.log('📊 SUMMARY');
    console.log('━'.repeat(50));
    console.log(`   Categories:         ${categorySeeds.length}`);
    console.log(`   Stores:             ${storeSeeds.length}`);
    console.log(`   Hero Banners:       ${heroBannerSeeds.length}`);
    console.log(`   Offers:             ${offerSeeds.length}`);
    console.log(`   Campaigns:          ${campaignSeeds.length}`);
    console.log(`   Store Experiences:  ${experienceSeeds.length}`);
    console.log(`   Events:             ${eventSeeds.length}`);
    console.log(`   Service Categories: ${serviceCategorySeeds.length}`);
    console.log('━'.repeat(50));
    console.log(`   TOTAL ITEMS:        ${totalItems}`);
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('❌ Error running master seeds:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run seeds if executed directly
if (require.main === module) {
  runMasterSeeds()
    .then(() => {
      console.log('\n✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { runMasterSeeds, categorySeeds, storeSeeds, offerSeeds, campaignSeeds, eventSeeds };
