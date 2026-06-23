/**
 * Fill Empty Subcategories with Stores
 *
 * 1. Checks which frontend subcategories have 0 stores
 * 2. Reassigns unsubcategorized stores (have main cat but no sub) to best-fit subcategory
 * 3. Creates realistic seed stores for subcategories still at 0
 *
 * Run: npx ts-node src/scripts/fillEmptySubcategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

// ============================================================
// FRONTEND SUBCATEGORIES (only those used on categories page)
// ============================================================
const FRONTEND_STRUCTURE: Record<string, { name: string; subs: { slug: string; name: string }[] }> = {
  'food-dining': {
    name: 'Food & Dining',
    subs: [
      { slug: 'cafes', name: 'Cafés' },
      { slug: 'qsr-fast-food', name: 'QSR / Fast Food' },
      { slug: 'family-restaurants', name: 'Family Restaurants' },
      { slug: 'fine-dining', name: 'Fine Dining' },
      { slug: 'ice-cream-dessert', name: 'Ice Cream & Dessert' },
      { slug: 'bakery-confectionery', name: 'Bakery & Confectionery' },
      { slug: 'cloud-kitchens', name: 'Cloud Kitchens' },
      { slug: 'street-food', name: 'Street Food' },
    ],
  },
  'grocery-essentials': {
    name: 'Grocery & Essentials',
    subs: [
      { slug: 'supermarkets', name: 'Supermarkets' },
      { slug: 'kirana-stores', name: 'Kirana Stores' },
      { slug: 'fresh-vegetables', name: 'Fresh Vegetables' },
      { slug: 'meat-fish', name: 'Meat & Fish' },
      { slug: 'dairy', name: 'Dairy' },
      { slug: 'packaged-goods', name: 'Packaged Goods' },
      { slug: 'water-cans', name: 'Water Cans' },
    ],
  },
  'beauty-wellness': {
    name: 'Beauty & Wellness',
    subs: [
      { slug: 'salons', name: 'Salons' },
      { slug: 'spa-massage', name: 'Spa & Massage' },
      { slug: 'beauty-services', name: 'Beauty Services' },
      { slug: 'cosmetology', name: 'Cosmetology' },
      { slug: 'dermatology', name: 'Dermatology' },
      { slug: 'skincare-cosmetics', name: 'Skincare & Cosmetics' },
      { slug: 'nail-studios', name: 'Nail Studios' },
      { slug: 'grooming-men', name: 'Grooming for Men' },
    ],
  },
  'healthcare': {
    name: 'Healthcare',
    subs: [
      { slug: 'pharmacy', name: 'Pharmacy' },
      { slug: 'clinics', name: 'Clinics' },
      { slug: 'diagnostics', name: 'Diagnostics' },
      { slug: 'dental', name: 'Dental' },
      { slug: 'physiotherapy', name: 'Physiotherapy' },
      { slug: 'home-nursing', name: 'Home Nursing' },
      { slug: 'vision-eyewear', name: 'Vision & Eyewear' },
    ],
  },
  'fashion': {
    name: 'Fashion',
    subs: [
      { slug: 'footwear', name: 'Footwear' },
      { slug: 'bags-accessories', name: 'Bags & Accessories' },
      { slug: 'mobile-accessories', name: 'Mobile Accessories' },
      { slug: 'watches', name: 'Watches' },
      { slug: 'jewelry', name: 'Jewelry' },
      { slug: 'local-brands', name: 'Local Brands' },
    ],
  },
  'fitness-sports': {
    name: 'Fitness & Sports',
    subs: [
      { slug: 'gyms', name: 'Gyms' },
      { slug: 'crossfit', name: 'CrossFit' },
      { slug: 'yoga', name: 'Yoga' },
      { slug: 'zumba', name: 'Zumba' },
      { slug: 'martial-arts', name: 'Martial Arts' },
      { slug: 'sports-academies', name: 'Sports Academies' },
      { slug: 'sportswear', name: 'Sportswear' },
    ],
  },
  'education-learning': {
    name: 'Education & Learning',
    subs: [
      { slug: 'coaching-centers', name: 'Coaching Centers' },
      { slug: 'skill-development', name: 'Skill Development' },
      { slug: 'music-dance-classes', name: 'Music/Dance Classes' },
      { slug: 'art-craft', name: 'Art & Craft' },
      { slug: 'vocational', name: 'Vocational' },
      { slug: 'language-training', name: 'Language Training' },
    ],
  },
  'home-services': {
    name: 'Home Services',
    subs: [
      { slug: 'ac-repair', name: 'AC Repair' },
      { slug: 'plumbing', name: 'Plumbing' },
      { slug: 'electrical', name: 'Electrical' },
      { slug: 'cleaning', name: 'Cleaning' },
      { slug: 'pest-control', name: 'Pest Control' },
      { slug: 'house-shifting', name: 'House Shifting' },
      { slug: 'laundry-dry-cleaning', name: 'Laundry & Dry Cleaning' },
      { slug: 'home-tutors', name: 'Home Tutors' },
    ],
  },
  'travel-experiences': {
    name: 'Travel & Experiences',
    subs: [
      { slug: 'hotels', name: 'Hotels' },
      { slug: 'intercity-travel', name: 'Intercity Travel' },
      { slug: 'taxis', name: 'Taxis' },
      { slug: 'bike-rentals', name: 'Bike Rentals' },
      { slug: 'weekend-getaways', name: 'Weekend Getaways' },
      { slug: 'tours', name: 'Tours' },
      { slug: 'activities', name: 'Activities' },
    ],
  },
  'entertainment': {
    name: 'Entertainment',
    subs: [
      { slug: 'movies', name: 'Movies' },
      { slug: 'live-events', name: 'Live Events' },
      { slug: 'festivals', name: 'Festivals' },
      { slug: 'workshops', name: 'Workshops' },
      { slug: 'amusement-parks', name: 'Amusement Parks' },
      { slug: 'gaming-cafes', name: 'Gaming Cafés' },
      { slug: 'vr-ar-experiences', name: 'VR/AR Experiences' },
    ],
  },
  'financial-lifestyle': {
    name: 'Financial Lifestyle',
    subs: [
      { slug: 'bill-payments', name: 'Bill Payments' },
      { slug: 'mobile-recharge', name: 'Mobile Recharge' },
      { slug: 'broadband', name: 'Broadband' },
      { slug: 'cable-ott', name: 'Cable/OTT' },
      { slug: 'insurance', name: 'Insurance' },
      { slug: 'gold-savings', name: 'Gold Savings' },
      { slug: 'donations', name: 'Donations' },
    ],
  },
  'electronics': {
    name: 'Electronics',
    subs: [
      { slug: 'mobile-phones', name: 'Mobile Phones' },
      { slug: 'laptops', name: 'Laptops' },
      { slug: 'televisions', name: 'Televisions' },
      { slug: 'cameras', name: 'Cameras' },
      { slug: 'audio-headphones', name: 'Audio & Headphones' },
      { slug: 'gaming', name: 'Gaming' },
      { slug: 'accessories', name: 'Accessories' },
      { slug: 'smartwatches', name: 'Smartwatches' },
    ],
  },
};

// ============================================================
// SEED STORE TEMPLATES — realistic stores for each subcategory
// ============================================================
const SEED_STORES: Record<string, {
  name: string;
  description: string;
  tags: string[];
  location: { address: string; city: string; state: string; country: string; pincode: string; coordinates: [number, number] };
}[]> = {
  // FOOD & DINING
  'cafes': [
    { name: 'Brew Culture Café', description: 'Specialty coffee house serving artisanal brews, cold press, and fresh pastries in a cozy setting.', tags: ['cafe', 'coffee', 'espresso', 'latte', 'pastries'], location: { address: '12 MG Road, Indiranagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560038', coordinates: [77.6408, 12.9716] } },
    { name: 'The Chai Story', description: 'Premium tea lounge offering 50+ varieties of chai, matcha, and herbal infusions with light bites.', tags: ['cafe', 'tea', 'chai', 'beverages', 'snacks'], location: { address: '45 Linking Road, Bandra', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400050', coordinates: [72.8363, 19.0596] } },
  ],
  'qsr-fast-food': [
    { name: 'Wrap Express', description: 'Quick service restaurant specializing in wraps, rolls, and combos. Ready in 5 minutes, fresh every time.', tags: ['qsr', 'fast food', 'wraps', 'rolls', 'quick service'], location: { address: '78 FC Road, Shivajinagar', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411005', coordinates: [73.8567, 18.5204] } },
  ],
  'family-restaurants': [
    { name: 'Spice Garden Restaurant', description: 'Multi-cuisine family restaurant with North Indian, South Indian, Chinese & Continental dishes. Perfect for family celebrations.', tags: ['restaurant', 'family', 'multi cuisine', 'north indian', 'south indian', 'chinese'], location: { address: '23 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500033', coordinates: [78.4069, 17.4325] } },
  ],
  'fine-dining': [
    { name: 'Le Jardin', description: 'Award-winning fine dining restaurant with French-inspired cuisine, curated wine list, and impeccable service.', tags: ['fine dining', 'premium', 'french', 'wine', 'gourmet', 'luxury'], location: { address: '1 The Oberoi, Nariman Point', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400021', coordinates: [72.8215, 18.9256] } },
  ],
  'ice-cream-dessert': [
    { name: 'Frozen Bliss', description: 'Handcrafted ice cream parlor with 80+ flavors including vegan options, sundaes, and custom cakes.', tags: ['ice cream', 'dessert', 'gelato', 'sundae', 'frozen', 'cakes'], location: { address: '56 Church Street', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.6063, 12.9756] } },
  ],
  'bakery-confectionery': [
    { name: 'Golden Crust Bakery', description: 'Artisan bakery offering freshly baked breads, cakes, pastries, cookies, and custom wedding cakes.', tags: ['bakery', 'cake', 'bread', 'pastry', 'cookies', 'confectionery'], location: { address: '34 Park Street', city: 'Kolkata', state: 'West Bengal', country: 'India', pincode: '700016', coordinates: [88.3523, 22.5530] } },
  ],
  'cloud-kitchens': [
    { name: 'FreshBox Cloud Kitchen', description: 'Delivery-only kitchen serving healthy bowls, salads, and meal prep boxes. Order online for doorstep delivery.', tags: ['cloud kitchen', 'delivery only', 'healthy', 'bowls', 'meal prep'], location: { address: '89 HSR Layout', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560102', coordinates: [77.6501, 12.9121] } },
  ],
  'street-food': [
    { name: 'Chaat Bazaar', description: 'Authentic street food stall with golgappa, pav bhaji, dahi puri, chole bhature, and more desi favorites.', tags: ['street food', 'chaat', 'pani puri', 'pav bhaji', 'chole bhature', 'snacks'], location: { address: '12 Chandni Chowk', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110006', coordinates: [77.2307, 28.6507] } },
  ],

  // GROCERY & ESSENTIALS
  'kirana-stores': [
    { name: 'Sharma General Store', description: 'Neighborhood kirana store with daily essentials, spices, snacks, beverages, and household items at best prices.', tags: ['kirana', 'general store', 'grocery', 'provisions', 'daily essentials'], location: { address: '23 Sector 14', city: 'Gurgaon', state: 'Haryana', country: 'India', pincode: '122001', coordinates: [77.0266, 28.4595] } },
    { name: 'Balaji Provisions', description: 'Trusted neighborhood provision store. Fresh groceries, cooking oils, pulses, rice & household supplies delivered.', tags: ['kirana', 'provision', 'grocery', 'rice', 'pulses', 'oil'], location: { address: '67 Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600040', coordinates: [80.2090, 13.0878] } },
  ],
  'fresh-vegetables': [
    { name: 'Farm Fresh Veggies', description: 'Farm-to-table fresh vegetables and fruits delivered daily. Organic options available. No middlemen, best prices.', tags: ['vegetables', 'fresh', 'organic', 'fruits', 'farm fresh', 'sabzi'], location: { address: '45 Koregaon Park', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411001', coordinates: [73.8955, 18.5362] } },
  ],
  'meat-fish': [
    { name: 'FreshCatch Meats', description: 'Premium quality fresh chicken, mutton, fish, and seafood. Halal certified. Home delivery within 2 hours.', tags: ['meat', 'fish', 'chicken', 'mutton', 'seafood', 'fresh', 'halal'], location: { address: '12 Frazer Town', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560005', coordinates: [77.6146, 13.0024] } },
    { name: 'Licious Express', description: 'Fresh meat, poultry, and seafood store with quality-tested products. Marinated ready-to-cook options available.', tags: ['meat', 'chicken', 'fish', 'seafood', 'poultry', 'marinated'], location: { address: '78 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560066', coordinates: [77.7480, 12.9698] } },
  ],
  'dairy': [
    { name: 'Country Delight Dairy', description: 'Farm-fresh milk, curd, paneer, butter, ghee & cheese delivered to your doorstep every morning.', tags: ['dairy', 'milk', 'curd', 'paneer', 'butter', 'ghee', 'cheese'], location: { address: '34 Dwarka', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110075', coordinates: [77.0413, 28.5921] } },
    { name: 'Amul Parlour', description: 'Official Amul outlet with fresh dairy products, ice cream, chocolates, and beverages.', tags: ['dairy', 'milk', 'ice cream', 'amul', 'cheese', 'yogurt'], location: { address: '89 Connaught Place', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110001', coordinates: [77.2195, 28.6315] } },
  ],
  'packaged-goods': [
    { name: 'SnackHub', description: 'Wide range of branded packaged foods, snacks, chips, beverages, instant noodles, and daily essentials.', tags: ['packaged', 'snacks', 'chips', 'beverages', 'branded', 'fmcg'], location: { address: '56 Salt Lake', city: 'Kolkata', state: 'West Bengal', country: 'India', pincode: '700091', coordinates: [88.3953, 22.5803] } },
  ],
  'water-cans': [
    { name: 'AquaPure Water', description: 'RO purified 20L water can delivery. Same day delivery, monthly subscriptions available. Trusted quality.', tags: ['water', 'water can', 'purified', 'drinking water', 'delivery', 'RO'], location: { address: '12 Madhapur', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500081', coordinates: [78.3875, 17.4484] } },
  ],

  // BEAUTY & WELLNESS
  'cosmetology': [
    { name: 'Glow Aesthetics Clinic', description: 'Advanced cosmetology clinic offering laser treatments, chemical peels, microdermabrasion, and anti-aging therapies.', tags: ['cosmetology', 'laser', 'aesthetic', 'anti-aging', 'chemical peel', 'skin treatment'], location: { address: '67 Banjara Hills', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500034', coordinates: [78.4480, 17.4156] } },
  ],
  'dermatology': [
    { name: 'SkinFirst Derma Clinic', description: 'Board-certified dermatologists treating acne, pigmentation, hair loss, and skin conditions. Consultation & treatments.', tags: ['dermatology', 'skin', 'acne', 'pigmentation', 'hair loss', 'dermatologist'], location: { address: '23 Koramangala', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560034', coordinates: [77.6245, 12.9352] } },
  ],
  'skincare-cosmetics': [
    { name: 'Luxe Beauty Store', description: 'Premium skincare and cosmetics store with international brands. Foundations, serums, moisturizers, and makeup kits.', tags: ['skincare', 'cosmetics', 'makeup', 'serum', 'foundation', 'moisturizer', 'beauty products'], location: { address: '45 Khan Market', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110003', coordinates: [77.2273, 28.6002] } },
    { name: 'The Body Shop', description: 'Natural, ethically sourced beauty and skincare products. Body butters, face masks, fragrances, and gift sets.', tags: ['skincare', 'cosmetics', 'natural', 'beauty', 'body care', 'fragrance'], location: { address: '78 Brigade Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560025', coordinates: [77.6070, 12.9716] } },
  ],

  // HEALTHCARE
  'clinics': [
    { name: 'HealthFirst Clinic', description: 'Multi-specialty clinic with experienced doctors. General medicine, pediatrics, gynecology, and ENT consultations.', tags: ['clinic', 'doctor', 'general medicine', 'pediatrics', 'consultation', 'health'], location: { address: '12 Aundh', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411007', coordinates: [73.8077, 18.5579] } },
    { name: 'Apollo Clinic', description: 'Trusted healthcare clinic offering consultations, health checkups, vaccinations, and minor procedures.', tags: ['clinic', 'doctor', 'apollo', 'health checkup', 'vaccination', 'consultation'], location: { address: '34 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560066', coordinates: [77.7480, 12.9698] } },
  ],
  'diagnostics': [
    { name: 'Thyrocare Diagnostics', description: 'NABL accredited diagnostic lab offering blood tests, full body checkups, thyroid profiles, and home sample collection.', tags: ['diagnostic', 'lab', 'blood test', 'pathology', 'health checkup', 'thyroid'], location: { address: '56 Andheri East', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400069', coordinates: [72.8697, 19.1197] } },
    { name: 'SRL Diagnostics', description: 'Advanced diagnostic centre with X-ray, MRI, CT scan, ultrasound, and comprehensive blood testing services.', tags: ['diagnostic', 'x-ray', 'mri', 'ct scan', 'ultrasound', 'pathology', 'lab'], location: { address: '89 Saket', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110017', coordinates: [77.2167, 28.5244] } },
  ],
  'dental': [
    { name: 'SmileCare Dental Clinic', description: 'Complete dental care — cleaning, fillings, root canal, braces, implants, teeth whitening, and cosmetic dentistry.', tags: ['dental', 'dentist', 'teeth', 'root canal', 'braces', 'implant', 'whitening'], location: { address: '23 Jayanagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560041', coordinates: [77.5838, 12.9299] } },
    { name: 'Clove Dental', description: 'India\'s largest dental chain. Affordable dental treatments with expert dentists and modern equipment.', tags: ['dental', 'dentist', 'teeth cleaning', 'orthodontic', 'oral care', 'dental clinic'], location: { address: '67 Gachibowli', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500032', coordinates: [78.3497, 17.4401] } },
  ],
  'physiotherapy': [
    { name: 'PhysioCare Wellness', description: 'Expert physiotherapy for back pain, sports injuries, post-surgery rehab, and chronic conditions. Home visits available.', tags: ['physiotherapy', 'physio', 'rehab', 'back pain', 'sports injury', 'physical therapy'], location: { address: '45 Indiranagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560038', coordinates: [77.6408, 12.9783] } },
  ],
  'home-nursing': [
    { name: 'CareFirst Nursing Services', description: 'Professional home nursing care — trained nurses, patient attendants, elder care, and post-operative home care.', tags: ['nursing', 'home care', 'home nurse', 'elder care', 'patient care', 'attendant'], location: { address: '12 Powai', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400076', coordinates: [72.9050, 19.1177] } },
  ],
  'vision-eyewear': [
    { name: 'Lenskart Studio', description: 'Premium eyewear store with free eye testing. Frames, sunglasses, contact lenses, and blue-light blocking glasses.', tags: ['eyewear', 'glasses', 'lens', 'contact lens', 'sunglasses', 'optical', 'eye test'], location: { address: '34 Phoenix Mall, Viman Nagar', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411014', coordinates: [73.9146, 18.5679] } },
    { name: 'Titan Eyeplus', description: 'Trusted optical store with latest frames, powered sunglasses, and free comprehensive eye checkup.', tags: ['eyewear', 'optical', 'glasses', 'frames', 'sunglasses', 'eye checkup', 'titan'], location: { address: '56 MG Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.6070, 12.9756] } },
  ],

  // FASHION
  'footwear': [
    { name: 'Bata Shoe Store', description: 'Trusted footwear brand with shoes, sandals, sneakers, and formal wear for men, women, and kids.', tags: ['footwear', 'shoes', 'sandals', 'sneakers', 'formal shoes', 'bata'], location: { address: '23 Commercial Street', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.6063, 12.9812] } },
    { name: 'Metro Shoes', description: 'Premium footwear store with heels, boots, loafers, and sneakers. Latest collections for every occasion.', tags: ['footwear', 'shoes', 'heels', 'boots', 'loafers', 'sneakers'], location: { address: '67 Linking Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400050', coordinates: [72.8363, 19.0696] } },
  ],
  'mobile-accessories': [
    { name: 'MobiGear Hub', description: 'Complete mobile accessories shop — covers, screen guards, chargers, earphones, power banks, and cables.', tags: ['mobile accessories', 'phone cover', 'charger', 'earphone', 'power bank', 'screen guard'], location: { address: '45 Nehru Place', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110019', coordinates: [77.2519, 28.5485] } },
  ],
  'watches': [
    { name: 'Titan World', description: 'Official Titan store with analog, digital, and smart watches for men and women. Premium brands and latest designs.', tags: ['watch', 'wrist watch', 'titan', 'analog', 'digital watch', 'smartwatch'], location: { address: '89 Connaught Place', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110001', coordinates: [77.2195, 28.6339] } },
    { name: 'Fossil Store', description: 'Stylish watches, smartwatches, bags, and accessories. Classic designs with modern functionality.', tags: ['watch', 'smartwatch', 'fossil', 'accessories', 'fashion'], location: { address: '12 Phoenix MarketCity', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400086', coordinates: [72.8888, 19.0886] } },
  ],

  // FITNESS & SPORTS
  'zumba': [
    { name: 'Zumba Fitness Studio', description: 'High energy Zumba dance fitness classes for all levels. Burn calories while having fun with Latin dance moves.', tags: ['zumba', 'dance fitness', 'aerobics', 'cardio dance', 'group fitness', 'dance'], location: { address: '23 Koramangala', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560034', coordinates: [77.6245, 12.9352] } },
  ],
  'martial-arts': [
    { name: 'Dragon Martial Arts Academy', description: 'Learn karate, taekwondo, MMA, and self-defense. Classes for kids and adults with certified black-belt instructors.', tags: ['martial arts', 'karate', 'taekwondo', 'mma', 'self defense', 'boxing'], location: { address: '67 Baner', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411045', coordinates: [73.7868, 18.5590] } },
  ],
  'sports-academies': [
    { name: 'Champions Cricket Academy', description: 'Professional cricket coaching for all ages. Net practice, batting, bowling, and fielding training with expert coaches.', tags: ['sports academy', 'cricket', 'coaching', 'batting', 'bowling', 'net practice'], location: { address: '45 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560066', coordinates: [77.7480, 12.9698] } },
    { name: 'Ace Badminton Academy', description: 'Top badminton coaching with international-standard courts. Beginner to advanced training programs.', tags: ['sports academy', 'badminton', 'coaching', 'training', 'racquet sports'], location: { address: '89 Gachibowli', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500032', coordinates: [78.3497, 17.4401] } },
  ],
  'sportswear': [
    { name: 'Nike Store', description: 'Official Nike retail store with running shoes, training gear, sportswear, and athletic accessories for all sports.', tags: ['sportswear', 'nike', 'running shoes', 'athletic', 'activewear', 'sports gear'], location: { address: '12 Orion Mall', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560055', coordinates: [77.5570, 13.0107] } },
    { name: 'Decathlon Sports', description: 'One-stop shop for all sports equipment, sportswear, fitness gear, and outdoor adventure equipment at best prices.', tags: ['sportswear', 'sports equipment', 'fitness gear', 'outdoor', 'decathlon', 'athletic'], location: { address: '34 Noida Expressway', city: 'Noida', state: 'Uttar Pradesh', country: 'India', pincode: '201301', coordinates: [77.3910, 28.5355] } },
  ],

  // EDUCATION & LEARNING
  'coaching-centers': [
    { name: 'Allen Career Institute', description: 'Leading coaching center for IIT-JEE, NEET, and competitive exam preparation with experienced faculty.', tags: ['coaching', 'iit', 'neet', 'competitive exam', 'entrance', 'tuition'], location: { address: '23 Kota Road', city: 'Jaipur', state: 'Rajasthan', country: 'India', pincode: '302001', coordinates: [75.7873, 26.9124] } },
    { name: 'Aakash Institute', description: 'Trusted name in medical and engineering entrance exam coaching. NEET, JEE Main & Advanced preparation.', tags: ['coaching', 'neet', 'jee', 'medical', 'engineering', 'entrance exam'], location: { address: '67 Pusa Road', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110005', coordinates: [77.1855, 28.6377] } },
  ],
  'skill-development': [
    { name: 'UpSkill Academy', description: 'Learn coding, digital marketing, data science, and soft skills. Industry-certified courses with placement support.', tags: ['skill development', 'coding', 'digital marketing', 'data science', 'programming', 'course'], location: { address: '45 Electronic City', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560100', coordinates: [77.6602, 12.8458] } },
  ],
  'music-dance-classes': [
    { name: 'Rhythm Music Academy', description: 'Learn guitar, piano, drums, singing, and classical music from expert instructors. All age groups welcome.', tags: ['music', 'guitar', 'piano', 'drums', 'singing', 'classical music', 'music class'], location: { address: '89 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500033', coordinates: [78.4069, 17.4325] } },
    { name: 'Shiamak Dance Studio', description: 'Bollywood, contemporary, hip-hop, and classical dance classes. Professional choreography for events and shows.', tags: ['dance', 'bollywood', 'contemporary', 'hip hop', 'dance class', 'choreography'], location: { address: '12 Andheri West', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400058', coordinates: [72.8369, 19.1365] } },
  ],
  'art-craft': [
    { name: 'Creative Canvas Studio', description: 'Art classes for painting, sketching, pottery, and sculpture. Weekend workshops and kids batches available.', tags: ['art', 'painting', 'sketching', 'pottery', 'craft', 'sculpture', 'art class'], location: { address: '34 Hauz Khas Village', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110016', coordinates: [77.2022, 28.5494] } },
  ],
  'vocational': [
    { name: 'TechSkill Vocational Center', description: 'Vocational training in electrician, plumbing, AC technician, and automotive repair with certification.', tags: ['vocational', 'technical', 'electrician', 'plumbing', 'certification', 'trade', 'diploma'], location: { address: '56 Peenya Industrial Area', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560058', coordinates: [77.5185, 13.0297] } },
  ],
  'language-training': [
    { name: 'British Council Language Center', description: 'Learn English, IELTS prep, spoken English, and business communication. Certified international programs.', tags: ['language', 'english', 'ielts', 'spoken english', 'communication', 'british council'], location: { address: '67 Kasturba Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.5945, 12.9756] } },
  ],

  // HOME SERVICES
  'plumbing': [
    { name: 'QuickFix Plumbing Services', description: 'Expert plumbers for pipe repair, tap fitting, leakage fix, drainage cleaning, and bathroom installation.', tags: ['plumbing', 'plumber', 'pipe repair', 'leakage', 'tap', 'drainage'], location: { address: '23 Whitefield', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560066', coordinates: [77.7480, 12.9698] } },
  ],
  'electrical': [
    { name: 'PowerUp Electrical Services', description: 'Licensed electricians for wiring, switchboard repair, fan installation, inverter setup, and electrical safety audits.', tags: ['electrical', 'electrician', 'wiring', 'switchboard', 'fan installation', 'inverter'], location: { address: '45 Magarpatta', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411028', coordinates: [73.9271, 18.5167] } },
  ],
  'pest-control': [
    { name: 'SafeHome Pest Control', description: 'Complete pest control for cockroaches, termites, mosquitoes, rats, and bed bugs. Safe chemicals, warranty included.', tags: ['pest control', 'termite', 'cockroach', 'mosquito', 'fumigation', 'rat control'], location: { address: '89 Marathahalli', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560037', coordinates: [77.6971, 12.9569] } },
  ],
  'house-shifting': [
    { name: 'EasyMove Packers & Movers', description: 'Professional packers and movers for house shifting, office relocation, and vehicle transport. Insured and on-time.', tags: ['shifting', 'packers', 'movers', 'relocation', 'house shifting', 'transport', 'moving'], location: { address: '12 Sector 62', city: 'Noida', state: 'Uttar Pradesh', country: 'India', pincode: '201301', coordinates: [77.3690, 28.6273] } },
  ],
  'laundry-dry-cleaning': [
    { name: 'FreshPress Laundry', description: 'Professional laundry and dry cleaning with free pickup & delivery. Ironing, steam press, and stain removal services.', tags: ['laundry', 'dry cleaning', 'ironing', 'steam press', 'wash', 'stain removal'], location: { address: '34 BTM Layout', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560076', coordinates: [77.6099, 12.9166] } },
    { name: 'UClean Laundromat', description: 'Self-service and full-service laundry. Wash, dry, fold, and premium dry cleaning at affordable prices.', tags: ['laundry', 'laundromat', 'wash', 'dry cleaning', 'self service', 'fold'], location: { address: '56 Karol Bagh', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110005', coordinates: [77.1904, 28.6519] } },
  ],
  'home-tutors': [
    { name: 'Vedantu Home Tutors', description: 'Experienced home tutors for all subjects and grades. Board exam prep, homework help, and competitive exam coaching.', tags: ['home tutor', 'tutor', 'tuition', 'private tutor', 'home teaching', 'exam prep'], location: { address: '67 JP Nagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560078', coordinates: [77.5838, 12.9066] } },
  ],

  // TRAVEL & EXPERIENCES
  'hotels': [
    { name: 'OYO Rooms Premium', description: 'Affordable premium hotel rooms with AC, WiFi, breakfast, and 24/7 reception. Book for business or leisure.', tags: ['hotel', 'rooms', 'oyo', 'accommodation', 'wifi', 'breakfast'], location: { address: '23 MG Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.6070, 12.9756] } },
    { name: 'Taj Hotels', description: 'Luxury 5-star hotel with world-class amenities, fine dining restaurants, spa, pool, and conference facilities.', tags: ['hotel', 'luxury', '5 star', 'resort', 'spa', 'fine dining', 'taj'], location: { address: '89 Apollo Bunder', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.8347, 18.9217] } },
  ],
  'intercity-travel': [
    { name: 'RedBus Booking Center', description: 'Book intercity bus tickets for Volvo, sleeper, and AC buses across India. Trusted platform with 10,000+ routes.', tags: ['intercity', 'bus', 'travel', 'redbus', 'volvo', 'sleeper bus', 'booking'], location: { address: '45 Majestic', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560009', coordinates: [77.5714, 12.9767] } },
  ],
  'taxis': [
    { name: 'Meru Cabs', description: 'Reliable taxi and cab service for city rides, airport transfers, and outstation trips. AC cabs with professional drivers.', tags: ['taxi', 'cab', 'ride', 'airport transfer', 'outstation', 'car rental', 'driver'], location: { address: '12 Electronic City', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560100', coordinates: [77.6602, 12.8458] } },
  ],
  'bike-rentals': [
    { name: 'Royal Brothers Bike Rental', description: 'Rent bikes and scooters hourly or daily. Activa, Bullet, KTM, and more. Helmets and insurance included.', tags: ['bike rental', 'scooter', 'motorcycle', 'rent a bike', 'two wheeler', 'activa'], location: { address: '34 Koramangala', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560034', coordinates: [77.6245, 12.9352] } },
  ],
  'weekend-getaways': [
    { name: 'StayVista Getaways', description: 'Curated weekend getaway villas and cottages near your city. Private pools, mountain views, and luxury stays.', tags: ['weekend', 'getaway', 'villa', 'staycation', 'cottage', 'luxury stay', 'vacation'], location: { address: '56 Lonavala', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '410401', coordinates: [73.4073, 18.7546] } },
  ],
  'tours': [
    { name: 'Thrillophilia Tours', description: 'Curated tour packages — city tours, heritage walks, pilgrimage trips, and international holiday packages.', tags: ['tour', 'travel package', 'sightseeing', 'heritage walk', 'pilgrimage', 'holiday'], location: { address: '67 Ashram Road', city: 'Ahmedabad', state: 'Gujarat', country: 'India', pincode: '380009', coordinates: [72.5714, 23.0225] } },
  ],
  'activities': [
    { name: 'Adventure Zone', description: 'Outdoor adventure activities — trekking, camping, rafting, paragliding, and bungee jumping experiences.', tags: ['adventure', 'trekking', 'camping', 'rafting', 'paragliding', 'bungee', 'outdoor'], location: { address: '89 Rishikesh Road', city: 'Dehradun', state: 'Uttarakhand', country: 'India', pincode: '248001', coordinates: [78.0322, 30.3165] } },
  ],

  // ENTERTAINMENT
  'movies': [
    { name: 'PVR INOX Cinemas', description: 'Multiplex cinema with IMAX, 4DX, and Dolby Atmos screens. Latest Bollywood, Hollywood, and regional films.', tags: ['movies', 'cinema', 'multiplex', 'imax', 'pvr', 'inox', 'film', 'dolby'], location: { address: '23 Phoenix Mall', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400086', coordinates: [72.8888, 19.0886] } },
  ],
  'live-events': [
    { name: 'BookMyShow Live', description: 'Live concerts, standup comedy, music festivals, and theatrical performances. Book tickets for events near you.', tags: ['live event', 'concert', 'standup comedy', 'music', 'performance', 'show', 'theatre'], location: { address: '45 Lower Parel', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400013', coordinates: [72.8296, 18.9932] } },
  ],
  'workshops': [
    { name: 'MasterClass Studio', description: 'Hands-on workshops in photography, cooking, pottery, candle making, and creative writing. Weekend batches.', tags: ['workshop', 'masterclass', 'photography', 'cooking class', 'pottery', 'creative'], location: { address: '67 HSR Layout', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560102', coordinates: [77.6501, 12.9121] } },
  ],
  'amusement-parks': [
    { name: 'WonderLa Amusement Park', description: 'India\'s top amusement park with thrilling rides, water park, kids zone, and food courts. Fun for the whole family.', tags: ['amusement park', 'rides', 'water park', 'fun', 'theme park', 'kids', 'wonderla'], location: { address: '89 Mysore Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '562109', coordinates: [77.4009, 12.8340] } },
  ],
  'gaming-cafes': [
    { name: 'Headshot Gaming Lounge', description: 'Premium gaming café with PS5, Xbox, high-end gaming PCs, VR headsets, and esports tournament hosting.', tags: ['gaming', 'gaming cafe', 'ps5', 'xbox', 'pc gaming', 'esports', 'vr'], location: { address: '12 Connaught Place', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110001', coordinates: [77.2195, 28.6315] } },
  ],
  'vr-ar-experiences': [
    { name: 'SMAAASH VR Arena', description: 'Immersive virtual reality experiences — VR racing, VR cricket, horror rooms, and interactive AR games.', tags: ['vr', 'virtual reality', 'ar', 'augmented reality', 'immersive', 'gaming', 'smaaash'], location: { address: '34 DLF CyberHub', city: 'Gurgaon', state: 'Haryana', country: 'India', pincode: '122002', coordinates: [77.0883, 28.4949] } },
  ],

  // FINANCIAL LIFESTYLE
  'bill-payments': [
    { name: 'PayPoint Bills Center', description: 'Pay electricity, gas, water, and municipal bills instantly. Multiple payment options with instant receipts.', tags: ['bill payment', 'electricity', 'gas', 'water bill', 'utility', 'payment center'], location: { address: '56 Rajaji Nagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560010', coordinates: [77.5552, 12.9876] } },
  ],
  'mobile-recharge': [
    { name: 'Recharge Zone', description: 'Instant mobile recharge for all operators — Jio, Airtel, Vi, BSNL. Prepaid, postpaid, and data pack recharges.', tags: ['recharge', 'mobile recharge', 'prepaid', 'postpaid', 'jio', 'airtel', 'data pack'], location: { address: '23 Lajpat Nagar', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110024', coordinates: [77.2373, 28.5700] } },
  ],
  'broadband': [
    { name: 'ACT Fibernet Store', description: 'High-speed fiber broadband connections. Plans starting 100Mbps. Free router, quick installation, and 24/7 support.', tags: ['broadband', 'internet', 'fiber', 'wifi', 'act fibernet', 'high speed', 'connection'], location: { address: '67 Marathahalli', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560037', coordinates: [77.6971, 12.9569] } },
  ],
  'cable-ott': [
    { name: 'Tata Play Store', description: 'DTH set-top box sales, recharge, and channel packs. Binge streaming with Tata Play Binge including Netflix, Hotstar.', tags: ['cable', 'dth', 'tata play', 'streaming', 'ott', 'netflix', 'hotstar', 'dish'], location: { address: '89 Ameerpet', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500016', coordinates: [78.4469, 17.4374] } },
  ],
  'insurance': [
    { name: 'LIC Branch Office', description: 'Life Insurance Corporation of India branch. Life, health, and term insurance plans with expert advisory.', tags: ['insurance', 'life insurance', 'health insurance', 'lic', 'policy', 'term plan'], location: { address: '12 Mount Road', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600002', coordinates: [80.2648, 13.0569] } },
  ],
  'gold-savings': [
    { name: 'Tanishq Gold Savings', description: 'Tanishq gold savings plan — save monthly and buy gold jewelry at best making charges. Trusted by millions.', tags: ['gold', 'gold savings', 'tanishq', 'jewelry', 'investment', 'digital gold'], location: { address: '34 Brigade Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560025', coordinates: [77.6070, 12.9716] } },
  ],
  'donations': [
    { name: 'GiveIndia Center', description: 'Donate to verified NGOs and social causes. Education, healthcare, disaster relief, and animal welfare donations.', tags: ['donation', 'charity', 'ngo', 'social cause', 'give india', 'fund', 'contribute'], location: { address: '56 Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400051', coordinates: [72.8602, 19.0596] } },
  ],

  // ELECTRONICS
  'laptops': [
    { name: 'Dell Exclusive Store', description: 'Official Dell store with laptops, desktops, monitors, and accessories. Expert advice and after-sales service.', tags: ['laptop', 'dell', 'computer', 'desktop', 'monitor', 'notebook'], location: { address: '23 SP Road', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560002', coordinates: [77.5779, 12.9841] } },
    { name: 'HP World Store', description: 'HP laptops, printers, desktops, and accessories. Latest models with EMI options and exchange offers.', tags: ['laptop', 'hp', 'printer', 'computer', 'notebook', 'desktop'], location: { address: '67 Nehru Place', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110019', coordinates: [77.2519, 28.5485] } },
  ],
  'televisions': [
    { name: 'Samsung Smart TV Store', description: 'Samsung Smart TVs, QLED, OLED, and Crystal UHD displays. Experience stunning visuals with free installation.', tags: ['television', 'tv', 'samsung', 'smart tv', 'qled', 'oled', 'led tv'], location: { address: '45 Indiranagar', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560038', coordinates: [77.6408, 12.9716] } },
  ],
  'cameras': [
    { name: 'Canon Image Square', description: 'Official Canon store with DSLR, mirrorless cameras, lenses, printers, and photography accessories.', tags: ['camera', 'dslr', 'mirrorless', 'canon', 'lens', 'photography'], location: { address: '89 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600002', coordinates: [80.2571, 13.0569] } },
  ],
  'audio-headphones': [
    { name: 'JBL Store', description: 'Premium audio store with headphones, earbuds, Bluetooth speakers, soundbars, and home theatre systems.', tags: ['audio', 'headphone', 'speaker', 'jbl', 'bluetooth', 'soundbar', 'earbuds'], location: { address: '12 MG Road', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411001', coordinates: [73.8784, 18.5204] } },
    { name: 'Bose Experience Center', description: 'Premium Bose audio products. Noise-cancelling headphones, speakers, soundbars, and home audio systems.', tags: ['audio', 'headphone', 'bose', 'noise cancelling', 'speaker', 'soundbar'], location: { address: '34 Palladium Mall', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400013', coordinates: [72.8296, 18.9932] } },
  ],
  'accessories': [
    { name: 'TechHub Accessories', description: 'Computer and mobile accessories — mouse, keyboard, USB hubs, cables, adapters, hard drives, and pen drives.', tags: ['accessories', 'mouse', 'keyboard', 'usb hub', 'cable', 'adapter', 'hard disk', 'pendrive'], location: { address: '56 Lamington Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400004', coordinates: [72.8308, 18.9633] } },
  ],
  'smartwatches': [
    { name: 'Apple Watch Store', description: 'Official Apple Watch retailer. Apple Watch Ultra, Series 9, SE, and bands. Health tracking and fitness features.', tags: ['smartwatch', 'apple watch', 'fitness band', 'wearable', 'health tracker'], location: { address: '67 UB City', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', coordinates: [77.5945, 12.9716] } },
    { name: 'Noise Smartwatch Store', description: 'India\'s #1 smartwatch brand. Fitness tracking, calling watches, and smart bands at affordable prices.', tags: ['smartwatch', 'smart watch', 'fitness band', 'noise', 'wearable', 'calling watch'], location: { address: '89 Sector 18', city: 'Noida', state: 'Uttar Pradesh', country: 'India', pincode: '201301', coordinates: [77.3260, 28.5706] } },
  ],
};

// ============================================================
// MAIN SCRIPT
// ============================================================
async function fillEmptySubcategories() {
  try {
    console.log('🚀 Starting: Fill Empty Subcategories\n');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const storesCol = db.collection('stores');
    const categoriesCol = db.collection('categories');

    // ---- Build category ID maps ----
    const mainCatMap: Record<string, any> = {};
    const subCatMap: Record<string, any> = {};

    for (const [mainSlug, config] of Object.entries(FRONTEND_STRUCTURE)) {
      const mainCat = await categoriesCol.findOne({ slug: mainSlug, parentCategory: null });
      if (mainCat) mainCatMap[mainSlug] = mainCat;

      for (const sub of config.subs) {
        const subCat = await categoriesCol.findOne({ slug: sub.slug, parentCategory: { $ne: null } });
        if (subCat) {
          subCatMap[sub.slug] = subCat;
        } else {
          const anyMatch = await categoriesCol.findOne({ slug: sub.slug });
          if (anyMatch) subCatMap[sub.slug] = anyMatch;
        }
      }
    }

    // ---- Step 1: Check which subcategories are empty ----
    console.log('========================================');
    console.log('📊 SUBCATEGORY STORE COUNT (BEFORE)');
    console.log('========================================\n');

    const emptySubcategories: { mainSlug: string; subSlug: string; subName: string }[] = [];
    let totalEmpty = 0;

    for (const [mainSlug, config] of Object.entries(FRONTEND_STRUCTURE)) {
      const mainCat = mainCatMap[mainSlug];
      if (!mainCat) continue;

      console.log(`📁 ${config.name}`);

      for (const sub of config.subs) {
        const subCat = subCatMap[sub.slug];
        if (!subCat) {
          console.log(`   ⚠️ ${sub.name} (${sub.slug}) — NOT IN DB`);
          emptySubcategories.push({ mainSlug, subSlug: sub.slug, subName: sub.name });
          totalEmpty++;
          continue;
        }

        const count = await storesCol.countDocuments({
          isActive: true,
          $or: [
            { subCategories: subCat._id },
            { category: subCat._id },
          ],
        });

        if (count === 0) {
          console.log(`   ❌ ${sub.name} (${sub.slug}): 0 stores`);
          emptySubcategories.push({ mainSlug, subSlug: sub.slug, subName: sub.name });
          totalEmpty++;
        } else {
          console.log(`   ✅ ${sub.name} (${sub.slug}): ${count} stores`);
        }
      }
      console.log('');
    }

    console.log(`\n📊 Empty subcategories: ${totalEmpty}\n`);

    if (totalEmpty === 0) {
      console.log('✅ All subcategories have stores! Nothing to do.\n');
      return;
    }

    // ---- Step 2: Reassign unsubcategorized stores ----
    console.log('========================================');
    console.log('🔄 STEP 1: Reassigning unsubcategorized stores');
    console.log('========================================\n');

    let reassignCount = 0;
    const emptySubSlugsSet = new Set(emptySubcategories.map(e => e.subSlug));

    for (const [mainSlug, config] of Object.entries(FRONTEND_STRUCTURE)) {
      const mainCat = mainCatMap[mainSlug];
      if (!mainCat) continue;

      // Find stores in this main cat with no subcategory assigned
      const unsubbed = await storesCol.find({
        category: mainCat._id,
        isActive: true,
        $or: [
          { subCategories: { $exists: false } },
          { subCategories: { $size: 0 } },
        ],
      }).toArray();

      for (const store of unsubbed) {
        // Try to match to an empty subcategory
        const searchText = [store.name, store.description, ...(store.tags || [])].join(' ').toLowerCase();

        for (const sub of config.subs) {
          if (!emptySubSlugsSet.has(sub.slug)) continue;
          const subCat = subCatMap[sub.slug];
          if (!subCat) continue;

          const subNameLower = sub.name.toLowerCase();
          const subSlugWords = sub.slug.replace(/-/g, ' ');

          if (searchText.includes(subNameLower) || searchText.includes(subSlugWords)) {
            await storesCol.updateOne(
              { _id: store._id },
              { $addToSet: { subCategories: subCat._id } }
            );
            console.log(`   🔗 "${store.name}" → ${sub.name}`);
            reassignCount++;
            break;
          }
        }
      }
    }

    console.log(`\n   Reassigned: ${reassignCount} stores\n`);

    // ---- Recheck empty subcategories ----
    const stillEmpty: typeof emptySubcategories = [];
    for (const entry of emptySubcategories) {
      const subCat = subCatMap[entry.subSlug];
      if (!subCat) {
        stillEmpty.push(entry);
        continue;
      }
      const count = await storesCol.countDocuments({
        isActive: true,
        $or: [
          { subCategories: subCat._id },
          { category: subCat._id },
        ],
      });
      if (count === 0) stillEmpty.push(entry);
    }

    console.log(`📊 Still empty after reassignment: ${stillEmpty.length}\n`);

    // ---- Step 3: Create seed stores for still-empty subcategories ----
    if (stillEmpty.length > 0) {
      console.log('========================================');
      console.log('🏪 STEP 2: Creating seed stores for empty subcategories');
      console.log('========================================\n');

      let createdCount = 0;

      for (const entry of stillEmpty) {
        const templates = SEED_STORES[entry.subSlug];
        if (!templates || templates.length === 0) {
          console.log(`   ⚠️ No seed templates for ${entry.subName} (${entry.subSlug}) — skipping`);
          continue;
        }

        const mainCat = mainCatMap[entry.mainSlug];
        const subCat = subCatMap[entry.subSlug];

        if (!mainCat) {
          console.log(`   ⚠️ Main category ${entry.mainSlug} not in DB — skipping`);
          continue;
        }

        for (const template of templates) {
          // Check if store with same name already exists
          const existing = await storesCol.findOne({ name: template.name });
          if (existing) {
            // Just link it to the right category/subcategory
            const updateFields: any = { category: mainCat._id };
            if (subCat) {
              await storesCol.updateOne(
                { _id: existing._id },
                {
                  $set: { category: mainCat._id },
                  $addToSet: { subCategories: subCat._id },
                }
              );
            } else {
              await storesCol.updateOne({ _id: existing._id }, { $set: updateFields });
            }
            console.log(`   🔗 Existing "${template.name}" → ${entry.subName}`);
            createdCount++;
            continue;
          }

          // Create new store
          const newStore: any = {
            name: template.name,
            slug: template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            description: template.description,
            logo: 'https://via.placeholder.com/150',
            banner: [],
            category: mainCat._id,
            subCategories: subCat ? [subCat._id] : [],
            location: {
              address: template.location.address,
              city: template.location.city,
              state: template.location.state,
              country: template.location.country,
              pincode: template.location.pincode,
              coordinates: template.location.coordinates,
              type: 'Point',
            },
            tags: template.tags,
            isActive: true,
            isFeatured: false,
            ratings: { average: 4.0 + Math.random() * 0.8, count: Math.floor(50 + Math.random() * 200) },
            operatingHours: {
              monday: { open: '09:00', close: '21:00', isClosed: false },
              tuesday: { open: '09:00', close: '21:00', isClosed: false },
              wednesday: { open: '09:00', close: '21:00', isClosed: false },
              thursday: { open: '09:00', close: '21:00', isClosed: false },
              friday: { open: '09:00', close: '21:00', isClosed: false },
              saturday: { open: '09:00', close: '22:00', isClosed: false },
              sunday: { open: '10:00', close: '21:00', isClosed: false },
            },
            contactInfo: {
              phone: '+91' + (9000000000 + Math.floor(Math.random() * 999999999)),
              email: template.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@example.com',
            },
            deliveryCategories: {
              fastDelivery: false,
              budgetFriendly: true,
              topRated: Math.random() > 0.5,
              newlyLaunched: true,
              partnerStore: false,
              cashbackEnabled: false,
              freeDelivery: false,
            },
            analytics: {
              totalViews: Math.floor(100 + Math.random() * 500),
              totalOrders: Math.floor(10 + Math.random() * 100),
              conversionRate: 2 + Math.random() * 5,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await storesCol.insertOne(newStore);
          console.log(`   ✅ Created: "${template.name}" → ${FRONTEND_STRUCTURE[entry.mainSlug].name} > ${entry.subName}`);
          createdCount++;
        }
      }

      console.log(`\n   Created/linked: ${createdCount} stores\n`);
    }

    // ---- Step 4: Final verification ----
    console.log('========================================');
    console.log('📊 FINAL VERIFICATION');
    console.log('========================================\n');

    let finalEmptyCount = 0;

    for (const [mainSlug, config] of Object.entries(FRONTEND_STRUCTURE)) {
      const mainCat = mainCatMap[mainSlug];
      if (!mainCat) continue;

      const mainStoreCount = await storesCol.countDocuments({ category: mainCat._id, isActive: true });
      console.log(`📁 ${config.name}: ${mainStoreCount} stores`);

      for (const sub of config.subs) {
        const subCat = subCatMap[sub.slug];
        if (!subCat) {
          console.log(`      ❌ ${sub.name}: NOT IN DB`);
          finalEmptyCount++;
          continue;
        }

        const count = await storesCol.countDocuments({
          isActive: true,
          $or: [
            { subCategories: subCat._id },
            { category: subCat._id },
          ],
        });

        const status = count > 0 ? '✅' : '❌';
        if (count === 0) finalEmptyCount++;
        console.log(`      ${status} ${sub.name}: ${count} stores`);
      }
      console.log('');
    }

    console.log(`\n📊 Empty subcategories remaining: ${finalEmptyCount}`);
    if (finalEmptyCount === 0) {
      console.log('🎉 All subcategories now have stores!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✅ Done!');
  }
}

fillEmptySubcategories();
