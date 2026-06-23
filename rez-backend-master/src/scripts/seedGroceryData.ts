/**
 * Seed Grocery Data Script
 * Creates comprehensive grocery data for production
 *
 * Run with: npx ts-node src/scripts/seedGroceryData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app';

// ========================================
// GROCERY SUBCATEGORIES DATA
// ========================================
const grocerySubcategories = [
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Fresh fruits delivered to your doorstep',
    icon: '🍎',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400',
    metadata: { color: '#FF6B6B', tags: ['fruits', 'fresh', 'organic'], featured: true },
    maxCashback: 12,
  },
  {
    name: 'Vegetables',
    slug: 'veggies',
    description: 'Farm-fresh vegetables',
    icon: '🥕',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
    metadata: { color: '#4CAF50', tags: ['vegetables', 'fresh', 'organic'], featured: true },
    maxCashback: 10,
  },
  {
    name: 'Dairy & Eggs',
    slug: 'dairy',
    description: 'Milk, curd, cheese, eggs and more',
    icon: '🥛',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    metadata: { color: '#2196F3', tags: ['dairy', 'milk', 'eggs'], featured: true },
    maxCashback: 8,
  },
  {
    name: 'Snacks & Munchies',
    slug: 'snacks',
    description: 'Chips, namkeen, biscuits and more',
    icon: '🍪',
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
    metadata: { color: '#FF9800', tags: ['snacks', 'chips', 'biscuits'], featured: true },
    maxCashback: 15,
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    description: 'Cold drinks, juices, tea, coffee',
    icon: '🥤',
    image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400',
    metadata: { color: '#00BCD4', tags: ['beverages', 'drinks', 'juice'], featured: false },
    maxCashback: 10,
  },
  {
    name: 'Staples & Grains',
    slug: 'staples',
    description: 'Rice, dal, atta, oil, sugar',
    icon: '🌾',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    metadata: { color: '#795548', tags: ['staples', 'rice', 'dal', 'atta'], featured: false },
    maxCashback: 5,
  },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Skincare, haircare, hygiene products',
    icon: '🧴',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
    metadata: { color: '#E91E63', tags: ['personal-care', 'hygiene', 'skincare'], featured: false },
    maxCashback: 18,
  },
  {
    name: 'Household',
    slug: 'household',
    description: 'Cleaning supplies, detergents',
    icon: '🧹',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    metadata: { color: '#9C27B0', tags: ['household', 'cleaning', 'detergent'], featured: false },
    maxCashback: 12,
  },
];

// ========================================
// GROCERY STORES DATA
// ========================================
const groceryStores = [
  {
    name: 'BigBasket',
    slug: 'bigbasket',
    description: "India's largest online grocery store",
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=100',
    banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    rating: { average: 4.5, count: 12500 },
    maxCashback: 15,
    deliveryTime: { min: 30, max: 45 },
    tags: ['grocery', 'supermarket', 'essentials'],
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, organic: true },
  },
  {
    name: 'Blinkit',
    slug: 'blinkit',
    description: 'Grocery delivered in 10 minutes',
    logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
    rating: { average: 4.6, count: 8500 },
    maxCashback: 20,
    deliveryTime: { min: 8, max: 15 },
    tags: ['grocery', 'quick-delivery', 'essentials'],
    deliveryCategories: { fastDelivery: true, premium: true },
  },
  {
    name: 'Zepto',
    slug: 'zepto',
    description: '10-minute grocery delivery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
    banner: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
    rating: { average: 4.4, count: 6200 },
    maxCashback: 25,
    deliveryTime: { min: 10, max: 20 },
    tags: ['grocery', 'quick-delivery', 'fresh'],
    deliveryCategories: { fastDelivery: true, premium: true },
  },
  {
    name: 'DMart Ready',
    slug: 'dmart-ready',
    description: 'Quality products at lowest prices',
    logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100',
    banner: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
    rating: { average: 4.3, count: 9800 },
    maxCashback: 10,
    deliveryTime: { min: 45, max: 90 },
    tags: ['grocery', 'supermarket', 'budget'],
    deliveryCategories: { budgetFriendly: true, lowestPrice: true },
  },
  {
    name: 'Reliance Fresh',
    slug: 'reliance-fresh',
    description: 'Fresh groceries from Reliance',
    logo: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=100',
    banner: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800',
    rating: { average: 4.2, count: 5400 },
    maxCashback: 12,
    deliveryTime: { min: 30, max: 60 },
    tags: ['grocery', 'fresh', 'supermarket'],
    deliveryCategories: { fastDelivery: true, organic: true },
  },
  {
    name: 'JioMart',
    slug: 'jiomart',
    description: 'Groceries from JioMart',
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=100',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
    rating: { average: 4.1, count: 7200 },
    maxCashback: 18,
    deliveryTime: { min: 60, max: 120 },
    tags: ['grocery', 'supermarket', 'essentials'],
    deliveryCategories: { budgetFriendly: true },
  },
  {
    name: 'More Supermarket',
    slug: 'more-supermarket',
    description: 'Quality groceries at great prices',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
    banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    rating: { average: 4.0, count: 3200 },
    maxCashback: 8,
    deliveryTime: { min: 45, max: 75 },
    tags: ['grocery', 'supermarket'],
    deliveryCategories: { budgetFriendly: true },
  },
  {
    name: 'Organic Garden',
    slug: 'organic-garden',
    description: '100% organic produce',
    logo: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400',
    banner: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
    rating: { average: 4.7, count: 1800 },
    maxCashback: 20,
    deliveryTime: { min: 60, max: 120 },
    tags: ['grocery', 'organic', 'fresh', 'farm'],
    deliveryCategories: { organic: true, premium: true },
  },
];

// ========================================
// GROCERY PRODUCTS DATA
// ========================================
const productsData: Record<string, Array<{
  name: string;
  description: string;
  basePrice: number;
  salePrice?: number;
  unit: string;
  image: string;
  tags: string[];
  cashbackPercentage: number;
}>> = {
  fruits: [
    { name: 'Fresh Apples', description: 'Crisp and juicy red apples', basePrice: 180, salePrice: 160, unit: '1 kg', image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400', tags: ['apple', 'fruit', 'fresh'], cashbackPercentage: 10 },
    { name: 'Bananas', description: 'Ripe yellow bananas', basePrice: 50, unit: '1 dozen', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', tags: ['banana', 'fruit', 'fresh'], cashbackPercentage: 8 },
    { name: 'Oranges', description: 'Sweet and tangy oranges', basePrice: 120, salePrice: 100, unit: '1 kg', image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400', tags: ['orange', 'citrus', 'fruit'], cashbackPercentage: 12 },
    { name: 'Mangoes', description: 'Alphonso mangoes - king of fruits', basePrice: 350, salePrice: 299, unit: '1 kg', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400', tags: ['mango', 'fruit', 'seasonal'], cashbackPercentage: 15 },
    { name: 'Grapes', description: 'Sweet seedless grapes', basePrice: 140, unit: '500 g', image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400', tags: ['grapes', 'fruit', 'fresh'], cashbackPercentage: 10 },
    { name: 'Pomegranate', description: 'Fresh ruby red pomegranates', basePrice: 220, salePrice: 199, unit: '1 kg', image: 'https://images.unsplash.com/photo-1541344999736-4a22dc7e4f8b?w=400', tags: ['pomegranate', 'fruit', 'antioxidant'], cashbackPercentage: 12 },
    { name: 'Watermelon', description: 'Juicy sweet watermelon', basePrice: 45, unit: '1 kg', image: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400', tags: ['watermelon', 'fruit', 'summer'], cashbackPercentage: 5 },
    { name: 'Papaya', description: 'Ripe sweet papaya', basePrice: 60, unit: '1 kg', image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400', tags: ['papaya', 'fruit', 'tropical'], cashbackPercentage: 8 },
    { name: 'Strawberries', description: 'Fresh red strawberries', basePrice: 180, salePrice: 150, unit: '250 g', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400', tags: ['strawberry', 'berry', 'fresh'], cashbackPercentage: 15 },
    { name: 'Kiwi', description: 'Imported green kiwis', basePrice: 200, unit: '3 pcs', image: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400', tags: ['kiwi', 'fruit', 'imported'], cashbackPercentage: 12 },
  ],
  veggies: [
    { name: 'Tomatoes', description: 'Fresh red tomatoes', basePrice: 40, unit: '1 kg', image: 'https://images.unsplash.com/photo-1546470427-227c7369a9b8?w=400', tags: ['tomato', 'vegetable', 'fresh'], cashbackPercentage: 8 },
    { name: 'Onions', description: 'Fresh onions', basePrice: 35, unit: '1 kg', image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400', tags: ['onion', 'vegetable', 'essential'], cashbackPercentage: 5 },
    { name: 'Potatoes', description: 'Fresh potatoes', basePrice: 30, unit: '1 kg', image: 'https://images.unsplash.com/photo-1518977676601-b53f82ber88f?w=400', tags: ['potato', 'vegetable', 'staple'], cashbackPercentage: 5 },
    { name: 'Carrots', description: 'Crunchy orange carrots', basePrice: 50, unit: '500 g', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', tags: ['carrot', 'vegetable', 'fresh'], cashbackPercentage: 10 },
    { name: 'Spinach', description: 'Fresh green spinach', basePrice: 30, unit: '250 g', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', tags: ['spinach', 'leafy', 'green'], cashbackPercentage: 12 },
    { name: 'Capsicum', description: 'Colorful bell peppers', basePrice: 80, unit: '500 g', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400', tags: ['capsicum', 'pepper', 'vegetable'], cashbackPercentage: 10 },
    { name: 'Cucumber', description: 'Fresh green cucumbers', basePrice: 35, unit: '500 g', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400', tags: ['cucumber', 'vegetable', 'salad'], cashbackPercentage: 8 },
    { name: 'Cauliflower', description: 'Fresh white cauliflower', basePrice: 40, unit: '1 pc', image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400', tags: ['cauliflower', 'vegetable'], cashbackPercentage: 8 },
    { name: 'Brinjal', description: 'Purple brinjals', basePrice: 45, unit: '500 g', image: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400', tags: ['brinjal', 'eggplant', 'vegetable'], cashbackPercentage: 8 },
    { name: 'Green Beans', description: 'Fresh french beans', basePrice: 60, unit: '250 g', image: 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400', tags: ['beans', 'vegetable', 'green'], cashbackPercentage: 10 },
  ],
  dairy: [
    { name: 'Amul Milk', description: 'Full cream milk 1L', basePrice: 68, unit: '1 L', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', tags: ['milk', 'dairy', 'amul'], cashbackPercentage: 5 },
    { name: 'Amul Butter', description: 'Salted butter 500g', basePrice: 270, salePrice: 255, unit: '500 g', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', tags: ['butter', 'dairy', 'amul'], cashbackPercentage: 8 },
    { name: 'Paneer', description: 'Fresh cottage cheese', basePrice: 120, unit: '200 g', image: 'https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=400', tags: ['paneer', 'dairy', 'protein'], cashbackPercentage: 10 },
    { name: 'Curd', description: 'Fresh curd 400g', basePrice: 45, unit: '400 g', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', tags: ['curd', 'yogurt', 'dairy'], cashbackPercentage: 8 },
    { name: 'Cheese Slices', description: 'Amul cheese slices', basePrice: 150, unit: '200 g', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400', tags: ['cheese', 'dairy', 'amul'], cashbackPercentage: 10 },
    { name: 'Eggs', description: 'Farm fresh eggs', basePrice: 90, unit: '12 pcs', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', tags: ['eggs', 'protein', 'fresh'], cashbackPercentage: 5 },
    { name: 'Greek Yogurt', description: 'High protein greek yogurt', basePrice: 120, salePrice: 99, unit: '200 g', image: 'https://images.unsplash.com/photo-1571212515416-fca325e36a1e?w=400', tags: ['yogurt', 'greek', 'protein'], cashbackPercentage: 12 },
    { name: 'Lassi', description: 'Sweet mango lassi', basePrice: 40, unit: '200 ml', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', tags: ['lassi', 'drink', 'dairy'], cashbackPercentage: 8 },
    { name: 'Cream', description: 'Fresh cream for cooking', basePrice: 55, unit: '200 ml', image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400', tags: ['cream', 'dairy', 'cooking'], cashbackPercentage: 8 },
    { name: 'Flavored Milk', description: 'Chocolate milk shake', basePrice: 35, unit: '200 ml', image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400', tags: ['milk', 'chocolate', 'drink'], cashbackPercentage: 10 },
  ],
  snacks: [
    { name: 'Lays Classic', description: 'Classic salted chips', basePrice: 40, unit: '90 g', image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', tags: ['chips', 'snack', 'lays'], cashbackPercentage: 15 },
    { name: 'Kurkure', description: 'Masala munch kurkure', basePrice: 20, unit: '75 g', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400', tags: ['kurkure', 'snack', 'namkeen'], cashbackPercentage: 12 },
    { name: 'Haldirams Bhujia', description: 'Classic besan bhujia', basePrice: 85, unit: '200 g', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400', tags: ['bhujia', 'namkeen', 'haldirams'], cashbackPercentage: 10 },
    { name: 'Oreo Biscuits', description: 'Chocolate cream biscuits', basePrice: 35, unit: '120 g', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400', tags: ['oreo', 'biscuit', 'chocolate'], cashbackPercentage: 12 },
    { name: 'Britannia Good Day', description: 'Butter cookies', basePrice: 30, unit: '100 g', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400', tags: ['biscuit', 'cookies', 'britannia'], cashbackPercentage: 10 },
    { name: 'Parle-G', description: 'India\'s favorite glucose biscuit', basePrice: 10, unit: '80 g', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', tags: ['parle', 'biscuit', 'glucose'], cashbackPercentage: 5 },
    { name: 'Pringles', description: 'Sour cream & onion', basePrice: 180, salePrice: 150, unit: '110 g', image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400', tags: ['pringles', 'chips', 'imported'], cashbackPercentage: 15 },
    { name: 'Popcorn', description: 'Ready to eat caramel popcorn', basePrice: 60, unit: '100 g', image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=400', tags: ['popcorn', 'snack', 'caramel'], cashbackPercentage: 12 },
    { name: 'Mixture', description: 'South Indian mixture', basePrice: 70, unit: '200 g', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', tags: ['mixture', 'namkeen', 'snack'], cashbackPercentage: 10 },
    { name: 'Murukku', description: 'Crispy chakli', basePrice: 80, unit: '200 g', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400', tags: ['murukku', 'chakli', 'snack'], cashbackPercentage: 10 },
  ],
  beverages: [
    { name: 'Coca-Cola', description: 'Classic cola drink', basePrice: 45, unit: '750 ml', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400', tags: ['cola', 'drink', 'soft-drink'], cashbackPercentage: 10 },
    { name: 'Real Fruit Juice', description: 'Mixed fruit juice', basePrice: 120, salePrice: 99, unit: '1 L', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', tags: ['juice', 'fruit', 'drink'], cashbackPercentage: 12 },
    { name: 'Tata Tea Gold', description: 'Premium tea leaves', basePrice: 350, unit: '500 g', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400', tags: ['tea', 'tata', 'beverage'], cashbackPercentage: 8 },
    { name: 'Nescafe Classic', description: 'Instant coffee', basePrice: 420, salePrice: 380, unit: '200 g', image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400', tags: ['coffee', 'nescafe', 'instant'], cashbackPercentage: 10 },
    { name: 'Sprite', description: 'Lemon lime drink', basePrice: 40, unit: '750 ml', image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400', tags: ['sprite', 'lemon', 'soft-drink'], cashbackPercentage: 10 },
    { name: 'Appy Fizz', description: 'Sparkling apple drink', basePrice: 35, unit: '250 ml', image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', tags: ['appy', 'apple', 'fizz'], cashbackPercentage: 12 },
    { name: 'Coconut Water', description: 'Fresh tender coconut water', basePrice: 50, unit: '200 ml', image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400', tags: ['coconut', 'water', 'natural'], cashbackPercentage: 8 },
    { name: 'Green Tea', description: 'Organic green tea bags', basePrice: 180, unit: '25 bags', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400', tags: ['green-tea', 'organic', 'healthy'], cashbackPercentage: 12 },
    { name: 'Energy Drink', description: 'Red Bull energy drink', basePrice: 125, unit: '250 ml', image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400', tags: ['energy', 'redbull', 'drink'], cashbackPercentage: 10 },
    { name: 'Buttermilk', description: 'Fresh chaas/buttermilk', basePrice: 25, unit: '200 ml', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', tags: ['buttermilk', 'chaas', 'drink'], cashbackPercentage: 5 },
  ],
  staples: [
    { name: 'Basmati Rice', description: 'Premium aged basmati', basePrice: 180, unit: '1 kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', tags: ['rice', 'basmati', 'staple'], cashbackPercentage: 5 },
    { name: 'Toor Dal', description: 'Split pigeon peas', basePrice: 160, unit: '1 kg', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', tags: ['dal', 'lentil', 'protein'], cashbackPercentage: 5 },
    { name: 'Aashirvaad Atta', description: 'Whole wheat flour', basePrice: 320, salePrice: 299, unit: '5 kg', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', tags: ['atta', 'wheat', 'flour'], cashbackPercentage: 5 },
    { name: 'Sunflower Oil', description: 'Refined sunflower oil', basePrice: 180, unit: '1 L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', tags: ['oil', 'cooking', 'sunflower'], cashbackPercentage: 5 },
    { name: 'Sugar', description: 'White crystal sugar', basePrice: 55, unit: '1 kg', image: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?w=400', tags: ['sugar', 'sweet', 'staple'], cashbackPercentage: 3 },
    { name: 'Salt', description: 'Tata iodized salt', basePrice: 25, unit: '1 kg', image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400', tags: ['salt', 'iodized', 'essential'], cashbackPercentage: 3 },
    { name: 'Moong Dal', description: 'Yellow moong lentils', basePrice: 140, unit: '1 kg', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', tags: ['dal', 'moong', 'protein'], cashbackPercentage: 5 },
    { name: 'Mustard Oil', description: 'Cold pressed mustard oil', basePrice: 210, unit: '1 L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', tags: ['oil', 'mustard', 'cooking'], cashbackPercentage: 5 },
    { name: 'Poha', description: 'Flattened rice', basePrice: 55, unit: '500 g', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400', tags: ['poha', 'breakfast', 'staple'], cashbackPercentage: 5 },
    { name: 'Besan', description: 'Gram flour', basePrice: 80, unit: '500 g', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', tags: ['besan', 'flour', 'gram'], cashbackPercentage: 5 },
  ],
  'personal-care': [
    { name: 'Dettol Soap', description: 'Antibacterial bath soap', basePrice: 45, unit: '75 g x 4', image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400', tags: ['soap', 'dettol', 'hygiene'], cashbackPercentage: 15 },
    { name: 'Colgate Toothpaste', description: 'Cavity protection toothpaste', basePrice: 120, unit: '200 g', image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400', tags: ['toothpaste', 'colgate', 'oral'], cashbackPercentage: 12 },
    { name: 'Head & Shoulders', description: 'Anti-dandruff shampoo', basePrice: 350, salePrice: 299, unit: '340 ml', image: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400', tags: ['shampoo', 'hair', 'antidandruff'], cashbackPercentage: 18 },
    { name: 'Nivea Body Lotion', description: 'Deep moisture lotion', basePrice: 280, unit: '400 ml', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400', tags: ['lotion', 'nivea', 'skincare'], cashbackPercentage: 18 },
    { name: 'Gillette Razor', description: 'Mach3 disposable razor', basePrice: 220, unit: '1 pc', image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400', tags: ['razor', 'gillette', 'shaving'], cashbackPercentage: 15 },
    { name: 'Sunscreen SPF 50', description: 'Broad spectrum sunscreen', basePrice: 450, salePrice: 399, unit: '100 ml', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', tags: ['sunscreen', 'skin', 'protection'], cashbackPercentage: 20 },
    { name: 'Face Wash', description: 'Himalaya neem face wash', basePrice: 180, unit: '150 ml', image: 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=400', tags: ['facewash', 'neem', 'skincare'], cashbackPercentage: 15 },
    { name: 'Deodorant', description: 'Fogg deo spray', basePrice: 250, unit: '150 ml', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400', tags: ['deo', 'fragrance', 'spray'], cashbackPercentage: 18 },
    { name: 'Hand Sanitizer', description: 'Lifebuoy germ protection', basePrice: 80, unit: '100 ml', image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400', tags: ['sanitizer', 'hygiene', 'germ'], cashbackPercentage: 12 },
    { name: 'Lip Balm', description: 'Nivea moisturizing lip balm', basePrice: 150, unit: '4.8 g', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400', tags: ['lipbalm', 'nivea', 'moisturizing'], cashbackPercentage: 15 },
  ],
  household: [
    { name: 'Surf Excel', description: 'Detergent powder', basePrice: 420, salePrice: 380, unit: '2 kg', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400', tags: ['detergent', 'surf', 'laundry'], cashbackPercentage: 10 },
    { name: 'Vim Dishwash', description: 'Lemon dishwash liquid', basePrice: 180, unit: '500 ml', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400', tags: ['dishwash', 'vim', 'kitchen'], cashbackPercentage: 12 },
    { name: 'Colin Glass Cleaner', description: 'Streak-free glass cleaner', basePrice: 120, unit: '500 ml', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400', tags: ['glass', 'cleaner', 'colin'], cashbackPercentage: 12 },
    { name: 'Harpic', description: 'Toilet cleaner', basePrice: 95, unit: '500 ml', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400', tags: ['toilet', 'cleaner', 'harpic'], cashbackPercentage: 10 },
    { name: 'Lizol Floor Cleaner', description: 'Disinfectant floor cleaner', basePrice: 220, unit: '975 ml', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400', tags: ['floor', 'cleaner', 'lizol'], cashbackPercentage: 10 },
    { name: 'Good Knight', description: 'Mosquito repellent liquid', basePrice: 75, unit: '45 ml', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', tags: ['mosquito', 'repellent', 'goodknight'], cashbackPercentage: 8 },
    { name: 'Garbage Bags', description: 'Biodegradable garbage bags', basePrice: 99, unit: '30 pcs', image: 'https://images.unsplash.com/photo-1610141882127-c62c49a42c6f?w=400', tags: ['garbage', 'bags', 'disposable'], cashbackPercentage: 8 },
    { name: 'Steel Scrubber', description: 'Scotch-Brite steel scrub', basePrice: 45, unit: '3 pcs', image: 'https://images.unsplash.com/photo-1585227107636-ef34e5a67f1b?w=400', tags: ['scrubber', 'scotchbrite', 'utensil'], cashbackPercentage: 10 },
    { name: 'Room Freshener', description: 'Odonil air freshener', basePrice: 130, unit: '200 ml', image: 'https://images.unsplash.com/photo-1585828922344-85c9daa264b0?w=400', tags: ['freshener', 'air', 'odonil'], cashbackPercentage: 12 },
    { name: 'Naphthalene Balls', description: 'Moth repellent balls', basePrice: 40, unit: '100 g', image: 'https://images.unsplash.com/photo-1610141882127-c62c49a42c6f?w=400', tags: ['naphthalene', 'moth', 'household'], cashbackPercentage: 5 },
  ],
};

// ========================================
// SEEDING FUNCTIONS
// ========================================

async function seedGrocerySubcategories(parentCategoryId: mongoose.Types.ObjectId) {
  console.log('\n--- Seeding Grocery Subcategories ---\n');

  const createdCategories: any[] = [];

  for (const subcat of grocerySubcategories) {
    // Check if already exists
    const existing = await Category.findOne({ slug: subcat.slug });
    if (existing) {
      console.log(`  Subcategory "${subcat.name}" already exists, skipping...`);
      createdCategories.push(existing);
      continue;
    }

    const category = await Category.create({
      ...subcat,
      type: 'home_delivery',
      parentCategory: parentCategoryId,
      isActive: true,
      sortOrder: grocerySubcategories.indexOf(subcat) + 1,
      productCount: 0,
      storeCount: 0,
    });

    console.log(`  Created subcategory: ${category.name}`);
    createdCategories.push(category);
  }

  return createdCategories;
}

async function seedGroceryStores(categoryId: mongoose.Types.ObjectId) {
  console.log('\n--- Seeding Grocery Stores ---\n');

  const createdStores: any[] = [];

  for (const storeData of groceryStores) {
    // Check if already exists
    const existing = await Store.findOne({ slug: storeData.slug });
    if (existing) {
      console.log(`  Store "${storeData.name}" already exists, skipping...`);
      createdStores.push(existing);
      continue;
    }

    // Convert deliveryTime object to string format
    const deliveryTimeStr = `${storeData.deliveryTime.min}-${storeData.deliveryTime.max} mins`;

    const store = await Store.create({
      name: storeData.name,
      slug: storeData.slug,
      description: storeData.description,
      logo: storeData.logo,
      banner: [storeData.banner],
      category: categoryId,
      ratings: {
        average: storeData.rating.average,
        count: storeData.rating.count,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      offers: {
        cashback: storeData.maxCashback,
        maxCashback: storeData.maxCashback * 10,
        isPartner: true,
        partnerLevel: 'gold'
      },
      operationalInfo: {
        hours: {
          monday: { open: '06:00', close: '23:00', closed: false },
          tuesday: { open: '06:00', close: '23:00', closed: false },
          wednesday: { open: '06:00', close: '23:00', closed: false },
          thursday: { open: '06:00', close: '23:00', closed: false },
          friday: { open: '06:00', close: '23:00', closed: false },
          saturday: { open: '06:00', close: '23:00', closed: false },
          sunday: { open: '06:00', close: '23:00', closed: false },
        },
        deliveryTime: deliveryTimeStr,
        minimumOrder: 99,
        deliveryFee: 0,
        freeDeliveryAbove: 199,
        acceptsWalletPayment: true,
        paymentMethods: ['upi', 'card', 'wallet', 'cash']
      },
      tags: storeData.tags,
      deliveryCategories: {
        fastDelivery: storeData.deliveryCategories.fastDelivery || false,
        budgetFriendly: storeData.deliveryCategories.budgetFriendly || false,
        ninetyNineStore: false,
        premium: storeData.deliveryCategories.premium || false,
        organic: storeData.deliveryCategories.organic || false,
        alliance: false,
        lowestPrice: storeData.deliveryCategories.lowestPrice || false,
        mall: false,
        cashStore: false
      },
      isActive: true,
      isVerified: true,
      isFeatured: true,
      location: {
        address: 'Mumbai, Maharashtra',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 10
      },
      contact: {
        phone: '+91 1800-123-4567',
        email: `support@${storeData.slug}.com`,
        website: `https://${storeData.slug}.com`
      },
      analytics: {
        totalOrders: Math.floor(Math.random() * 10000) + 1000,
        totalRevenue: Math.floor(Math.random() * 1000000) + 100000,
        avgOrderValue: Math.floor(Math.random() * 500) + 200,
        repeatCustomers: Math.floor(Math.random() * 1000) + 100,
        followersCount: Math.floor(Math.random() * 5000) + 500
      }
    });

    console.log(`  Created store: ${store.name}`);
    createdStores.push(store);
  }

  return createdStores;
}

async function seedGroceryProducts(
  subcategories: any[],
  stores: any[]
) {
  console.log('\n--- Seeding Grocery Products ---\n');

  let totalCreated = 0;

  for (const category of subcategories) {
    const categorySlug = category.slug;
    const productsList = productsData[categorySlug];

    if (!productsList) {
      console.log(`  No products data for category: ${category.name}`);
      continue;
    }

    console.log(`  Seeding products for: ${category.name}`);

    for (const productData of productsList) {
      // Check if already exists
      const existing = await Product.findOne({
        name: productData.name,
        category: category._id
      });

      if (existing) {
        continue;
      }

      // Assign to a random store
      const randomStore = stores[Math.floor(Math.random() * stores.length)];

      // Generate unique slug and SKU
      const productSlug = `${productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const productSku = `GRC-${category.slug.toUpperCase().substr(0, 3)}-${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const product = await Product.create({
        name: productData.name,
        slug: productSlug,
        sku: productSku,
        description: productData.description,
        shortDescription: productData.description?.substring(0, 100),
        productType: 'product',
        category: category._id,
        store: randomStore._id,
        pricing: {
          original: productData.basePrice,
          selling: productData.salePrice || productData.basePrice,
          discount: Math.round(((productData.basePrice - (productData.salePrice || productData.basePrice)) / productData.basePrice) * 100),
          currency: 'INR',
        },
        images: [productData.image],
        inventory: {
          stock: Math.floor(Math.random() * 100) + 50,
          isAvailable: true,
          lowStockThreshold: 10,
          unlimited: false,
          allowBackorder: false,
        },
        tags: productData.tags || [],
        specifications: [],
        seo: {},
        analytics: {
          views: Math.floor(Math.random() * 1000),
          purchases: Math.floor(Math.random() * 100),
          conversions: Math.random() * 0.1,
          wishlistAdds: Math.floor(Math.random() * 50),
          shareCount: Math.floor(Math.random() * 20),
          returnRate: Math.random() * 0.05,
          avgRating: 4 + Math.random() * 0.9
        },
        cashback: {
          percentage: productData.cashbackPercentage || 5,
          maxAmount: 100,
          isActive: true
        },
        isActive: true,
        isFeatured: Math.random() > 0.7,
        isDigital: false,
        isDeleted: false,
        ratings: {
          average: Math.round((4 + Math.random() * 0.9) * 10) / 10,
          count: Math.floor(Math.random() * 500) + 50,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
      });

      totalCreated++;
    }

    // Update category product count
    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true
    });
    await Category.findByIdAndUpdate(category._id, { productCount });

    console.log(`    Created ${productsList.length} products for ${category.name}`);
  }

  console.log(`\n  Total products created: ${totalCreated}`);
  return totalCreated;
}

// ========================================
// MAIN FUNCTION
// ========================================

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.\n');

    console.log('========================================');
    console.log('GROCERY DATA SEEDER');
    console.log('========================================');

    // 1. Find or create main Grocery category
    let groceryCategory = await Category.findOne({ slug: 'grocery' });

    if (!groceryCategory) {
      console.log('\nCreating main Grocery category...');
      groceryCategory = await Category.create({
        name: 'Grocery',
        slug: 'grocery',
        description: 'Daily groceries delivered',
        icon: '🥬',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        type: 'home_delivery',
        isActive: true,
        sortOrder: 2,
        metadata: { color: '#66BB6A', tags: ['grocery', 'essentials', 'daily'], featured: true },
        productCount: 0,
        storeCount: 0,
        maxCashback: 15,
      });
      console.log('Created main Grocery category');
    } else {
      console.log('\nMain Grocery category already exists');
    }

    // 2. Seed subcategories
    const subcategories = await seedGrocerySubcategories(groceryCategory._id as mongoose.Types.ObjectId);

    // 3. Seed stores
    const stores = await seedGroceryStores(groceryCategory._id as mongoose.Types.ObjectId);

    // Update grocery category store count
    await Category.findByIdAndUpdate(groceryCategory._id, {
      storeCount: stores.length
    });

    // 4. Seed products
    const productCount = await seedGroceryProducts(subcategories, stores);

    // Update grocery category product count
    const totalProducts = await Product.countDocuments({
      category: { $in: [groceryCategory._id, ...subcategories.map(c => c._id)] },
      status: 'active'
    });
    await Category.findByIdAndUpdate(groceryCategory._id, {
      productCount: totalProducts
    });

    // 5. Summary
    console.log('\n========================================');
    console.log('SEEDING COMPLETE');
    console.log('========================================\n');
    console.log(`Subcategories: ${subcategories.length}`);
    console.log(`Stores: ${stores.length}`);
    console.log(`Products: ${totalProducts}`);
    console.log('\nGrocery section is now ready for production!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

main();
