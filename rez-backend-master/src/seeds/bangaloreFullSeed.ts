/**
 * Bangalore Full Seed
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates:
 *   • 1 shared dummy merchant (for trial offers)
 *   • 10 categories (restaurants, cafes, salon-spa, gym-fitness, grocery,
 *                    electronics, fashion, beauty, healthcare, home-kitchen)
 *   • 5 stores per category × 10 categories = 50 Bangalore stores
 *   • 20 trial offers (5 × service, sample_pickup, experience, d2c_kit)
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register src/seeds/bangaloreFullSeed.ts
 */

import * as crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Merchant } from '../models/Merchant';
import { TrialOffer } from '../models/TrialOffer';
import { logger } from '../config/logger';

// SEC fix: the prior literal fallback leaked the `work_db_user` Atlas
// credential into source control. Seed scripts now require MONGODB_URI
// env var explicitly and refuse to run without it.
//
// OPERATOR ACTION REQUIRED: rotate the work_db_user Atlas password — the
// old credential is in git history regardless of this code change.
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  throw new Error(
    '[bangaloreFullSeed] MONGODB_URI env var is required. Set it before running the seed; no literal fallback.',
  );
}

// ─── Bangalore Areas ─────────────────────────────────────────────────────────
// [longitude, latitude]
const AREAS = [
  { name: 'BTM Layout', coords: [77.6101, 12.9165] as [number, number], pin: '560076' },
  { name: 'Koramangala', coords: [77.6245, 12.9352] as [number, number], pin: '560095' },
  { name: 'Indiranagar', coords: [77.6408, 12.9784] as [number, number], pin: '560038' },
  { name: 'Malleshwaram', coords: [77.5713, 13.0033] as [number, number], pin: '560003' },
  { name: 'HSR Layout', coords: [77.6376, 12.9116] as [number, number], pin: '560102' },
  { name: 'Whitefield', coords: [77.7509, 12.9698] as [number, number], pin: '560066' },
  { name: 'Jayanagar', coords: [77.5849, 12.9259] as [number, number], pin: '560041' },
  { name: 'JP Nagar', coords: [77.5854, 12.9102] as [number, number], pin: '560078' },
  { name: 'Hebbal', coords: [77.5973, 13.0358] as [number, number], pin: '560024' },
  { name: 'Yelahanka', coords: [77.5997, 13.1007] as [number, number], pin: '560064' },
];

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: 'restaurants', name: 'Restaurants', icon: '🍽️' },
  { slug: 'cafes', name: 'Cafes', icon: '☕' },
  { slug: 'salon-spa', name: 'Salon & Spa', icon: '💆' },
  { slug: 'gym-fitness', name: 'Gym & Fitness', icon: '💪' },
  { slug: 'grocery', name: 'Grocery', icon: '🛒' },
  { slug: 'electronics', name: 'Electronics', icon: '📱' },
  { slug: 'fashion', name: 'Fashion', icon: '👗' },
  { slug: 'beauty', name: 'Beauty', icon: '💄' },
  { slug: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { slug: 'home-kitchen', name: 'Home & Kitchen', icon: '🏠' },
];

// ─── Store names per category ─────────────────────────────────────────────────
const STORE_NAMES: Record<string, string[]> = {
  restaurants: ['Karavalli Kitchen', 'Biryani Bros', 'The Dosa Republic', 'Spice Route Bistro', 'Namma Ooru Thindi'],
  cafes: ['The Filter Press', 'Brew & Bean Co.', 'Third Wave Café', 'Monsoon Roastery', 'The Perch Café'],
  'salon-spa': [
    'Toni & Glow Salon',
    'The Mane Story',
    'Aura Spa & Beauty',
    'Snip & Style Studio',
    'Serenity Wellness Spa',
  ],
  'gym-fitness': ['IronGrip Fitness', 'Cult.fit Annex', 'ZenFlex Studio', 'Powerhouse Gym', 'FitLab Bengaluru'],
  grocery: ['Fresh Fields Market', 'Organica Daily', 'Namma Supermart', 'Green Basket Grocers', 'QuickPick Express'],
  electronics: ['TechZone Bangalore', 'Gadget Galaxy', 'Circuit House', 'DigiWorld Store', 'SmartBuy Electronics'],
  fashion: ['The Style Loft', 'Urban Thread Co.', 'Runway Closet', 'Fabric & Form', 'Chic Collective'],
  beauty: ['Glow Lab Beauty', 'Pure Skin Studio', 'Vanity & Co.', 'The Beauty Nook', 'Radiance Boutique'],
  healthcare: [
    'LifeCare Clinic',
    'MediPoint Health',
    'Apollo Diagnostics Annex',
    'WellnessFirst Center',
    'QuickDoc Bangalore',
  ],
  'home-kitchen': ['Home Essentials Hub', 'The Kitchen Collective', 'CasaDecor Store', 'Nest & Nook', 'Hearth & Home'],
};

const STORE_DESCRIPTIONS: Record<string, string> = {
  restaurants: 'Authentic flavours, locally sourced ingredients, and warm Bangalore hospitality.',
  cafes: 'Specialty coffee, fresh bakes, and a cosy corner to work or unwind.',
  'salon-spa': 'Expert stylists and therapists delivering premium grooming and wellness services.',
  'gym-fitness': 'State-of-the-art equipment, certified trainers, and result-driven programmes.',
  grocery: 'Fresh produce, daily essentials, and organic options delivered with a smile.',
  electronics: 'Latest gadgets, genuine accessories, and expert after-sales support.',
  fashion: 'Curated ethnic and contemporary fashion for every occasion.',
  beauty: 'Skin, hair, and makeup products from trusted brands at unbeatable prices.',
  healthcare: 'Qualified doctors, diagnostics, and preventive care — walk-in welcome.',
  'home-kitchen': 'Cookware, décor, and smart home products to elevate everyday living.',
};

const defaultHours = {
  monday: { open: '09:00', close: '21:00' },
  tuesday: { open: '09:00', close: '21:00' },
  wednesday: { open: '09:00', close: '21:00' },
  thursday: { open: '09:00', close: '21:00' },
  friday: { open: '09:00', close: '22:00' },
  saturday: { open: '10:00', close: '22:00' },
  sunday: { open: '10:00', close: '20:00' },
};

// ─── Trial Offers data ────────────────────────────────────────────────────────
// 5 of each type: service, sample_pickup, experience, d2c_kit

const TRIAL_OFFERS_DATA = [
  // ── SERVICE (5) ──────────────────────────────────────────────────────────
  {
    title: 'Free Haircut & Style Consultation',
    category: 'service' as const,
    coinPrice: 50,
    commitmentFee: 9 as const,
    originalPrice: 599,
    storeSlug: 'toni-glow-salon-btm-layout',
    description:
      'Experience a full haircut + styling session with one of our expert stylists. Walk out with a brand-new look.',
    terms: 'Valid for new customers only. One redemption per user. Must redeem QR within 30 min of booking.',
    images: ['https://picsum.photos/seed/haircut1/600/400', 'https://picsum.photos/seed/haircut2/600/400'],
    upsellLinks: [{ title: 'Book a Full Spa Package', url: 'https://rezapp.com/store/toni-glow-salon' }],
    rezCoins: 30,
    brandedCoins: 20,
    brandedCoinLabel: 'Glow Points',
    dailySlots: 8,
    qrWindowMinutes: 30,
    windowType: 'relative' as const,
    campaignBoost: 0.2,
  },
  {
    title: '45-Min Gym Trial Session',
    category: 'service' as const,
    coinPrice: 40,
    commitmentFee: 9 as const,
    originalPrice: 499,
    storeSlug: 'irongrip-fitness-koramangala',
    description: 'Try our full gym floor, cardio zone, and free weights with a personal trainer guiding you through.',
    terms: 'Valid Mon–Fri 6AM–8PM. One trial per user. Bring your own workout gear.',
    images: ['https://picsum.photos/seed/gym1/600/400', 'https://picsum.photos/seed/gym2/600/400'],
    upsellLinks: [{ title: 'Join Monthly Membership', url: 'https://rezapp.com/store/irongrip-fitness' }],
    rezCoins: 25,
    brandedCoins: 15,
    brandedCoinLabel: 'FitCoins',
    dailySlots: 10,
    qrWindowMinutes: 60,
    windowType: 'fixed' as const,
    campaignBoost: 0.1,
  },
  {
    title: 'Express Facial – 30 Min',
    category: 'service' as const,
    coinPrice: 60,
    commitmentFee: 19 as const,
    originalPrice: 799,
    storeSlug: 'aura-spa-beauty-indiranagar',
    description: 'Deep-cleansing express facial using dermatologist-approved products. Perfect for a quick glow-up.',
    terms: 'New clients only. Appointment required — book slot in-app. 24-hr cancellation policy.',
    images: ['https://picsum.photos/seed/facial1/600/400', 'https://picsum.photos/seed/facial2/600/400'],
    upsellLinks: [{ title: 'Full Spa Package', url: 'https://rezapp.com/store/aura-spa' }],
    rezCoins: 40,
    brandedCoins: 25,
    brandedCoinLabel: 'Aura Points',
    dailySlots: 6,
    qrWindowMinutes: 45,
    windowType: 'relative' as const,
    campaignBoost: 0.15,
  },
  {
    title: 'Doctor Consultation – 20 Min',
    category: 'service' as const,
    coinPrice: 35,
    commitmentFee: 9 as const,
    originalPrice: 400,
    storeSlug: 'lifecare-clinic-malleshwaram',
    description: 'Speak with a qualified MBBS doctor. General health consultation, prescription if needed.',
    terms: 'Walk-in or appointment. One consultation per user. Children below 5 accompanied by parent.',
    images: ['https://picsum.photos/seed/doctor1/600/400'],
    upsellLinks: [{ title: 'Full Health Check Package', url: 'https://rezapp.com/store/lifecare-clinic' }],
    rezCoins: 20,
    brandedCoins: 10,
    brandedCoinLabel: 'HealthCoins',
    dailySlots: 12,
    qrWindowMinutes: 20,
    windowType: 'fixed' as const,
    campaignBoost: 0.0,
  },
  {
    title: 'Yoga Flow – 1-Hour Drop-In Class',
    category: 'service' as const,
    coinPrice: 45,
    commitmentFee: 9 as const,
    originalPrice: 550,
    storeSlug: 'zenflex-studio-hsr-layout',
    description: 'Join our Hatha or Vinyasa flow class led by a certified yoga instructor. Mats provided.',
    terms: 'Arrive 10 min early. Wear comfortable clothing. One trial per user per studio.',
    images: ['https://picsum.photos/seed/yoga1/600/400', 'https://picsum.photos/seed/yoga2/600/400'],
    upsellLinks: [{ title: 'Monthly Yoga Pass', url: 'https://rezapp.com/store/zenflex-studio' }],
    rezCoins: 28,
    brandedCoins: 18,
    brandedCoinLabel: 'ZenCoins',
    dailySlots: 15,
    qrWindowMinutes: 60,
    windowType: 'fixed' as const,
    campaignBoost: 0.1,
  },

  // ── SAMPLE PICKUP (5) ────────────────────────────────────────────────────
  {
    title: 'Specialty Coffee Sample Pack',
    category: 'sample_pickup' as const,
    coinPrice: 20,
    commitmentFee: 9 as const,
    originalPrice: 250,
    storeSlug: 'the-filter-press-btm-layout',
    description: 'Pick up a curated 50g sample of our single-origin Coorg or Chikmagalur coffee. Whole bean or ground.',
    terms: 'One sample per user. Available Tue–Sun 9AM–6PM. Show QR at counter.',
    images: ['https://picsum.photos/seed/coffee-sample1/600/400', 'https://picsum.photos/seed/coffee-sample2/600/400'],
    upsellLinks: [{ title: 'Subscribe to Monthly Coffee Box', url: 'https://rezapp.com/store/filter-press' }],
    rezCoins: 15,
    brandedCoins: 10,
    brandedCoinLabel: 'Brew Coins',
    dailySlots: 20,
    qrWindowMinutes: 120,
    windowType: 'auto' as const,
    campaignBoost: 0.05,
  },
  {
    title: 'Skincare Starter Sample Kit',
    category: 'sample_pickup' as const,
    coinPrice: 25,
    commitmentFee: 9 as const,
    originalPrice: 350,
    storeSlug: 'glow-lab-beauty-koramangala',
    description: '5-piece skincare sample kit — cleanser, toner, serum, moisturiser, and SPF. All skin types welcome.',
    terms: 'One kit per user. Collect in-store with QR. Weekdays 10AM–7PM.',
    images: ['https://picsum.photos/seed/skincare-sample1/600/400'],
    upsellLinks: [{ title: 'Shop Full Size Products', url: 'https://rezapp.com/store/glow-lab' }],
    rezCoins: 18,
    brandedCoins: 12,
    brandedCoinLabel: 'Glow Credits',
    dailySlots: 15,
    qrWindowMinutes: 90,
    windowType: 'auto' as const,
    campaignBoost: 0.1,
  },
  {
    title: 'Organic Grocery Trial Bag',
    category: 'sample_pickup' as const,
    coinPrice: 30,
    commitmentFee: 9 as const,
    originalPrice: 399,
    storeSlug: 'organica-daily-indiranagar',
    description: 'Curated 500g organic trial bag — seasonal fruits or vegetables, pesticide-free, farm-fresh.',
    terms: 'One bag per user per month. Pickup window: 8AM–12PM, Mon/Wed/Fri only.',
    images: [
      'https://picsum.photos/seed/grocery-sample1/600/400',
      'https://picsum.photos/seed/grocery-sample2/600/400',
    ],
    upsellLinks: [{ title: 'Subscribe Weekly Veg Box', url: 'https://rezapp.com/store/organica-daily' }],
    rezCoins: 20,
    brandedCoins: 15,
    brandedCoinLabel: 'Green Points',
    dailySlots: 25,
    qrWindowMinutes: 240,
    windowType: 'fixed' as const,
    campaignBoost: 0.0,
  },
  {
    title: 'Protein Supplement Sample',
    category: 'sample_pickup' as const,
    coinPrice: 15,
    commitmentFee: 9 as const,
    originalPrice: 199,
    storeSlug: 'powerhouse-gym-malleshwaram',
    description: '2-serving sample of whey protein (chocolate or vanilla). Includes nutrition guide.',
    terms: 'Members and non-members welcome. One sample per user. Available at reception.',
    images: ['https://picsum.photos/seed/protein-sample1/600/400'],
    upsellLinks: [{ title: 'Buy 1kg Whey Protein', url: 'https://rezapp.com/store/powerhouse-gym' }],
    rezCoins: 10,
    brandedCoins: 8,
    brandedCoinLabel: 'FitPoints',
    dailySlots: 30,
    qrWindowMinutes: 180,
    windowType: 'auto' as const,
    campaignBoost: 0.0,
  },
  {
    title: 'Premium Tea Tasting Kit',
    category: 'sample_pickup' as const,
    coinPrice: 18,
    commitmentFee: 9 as const,
    originalPrice: 220,
    storeSlug: 'monsoon-roastery-hsr-layout',
    description: 'Sample 4 premium loose-leaf teas — Darjeeling, Nilgiri, Assam, and a herbal blend.',
    terms: 'One kit per user. Collect from store counter with QR. Valid 7 days.',
    images: ['https://picsum.photos/seed/tea-sample1/600/400', 'https://picsum.photos/seed/tea-sample2/600/400'],
    upsellLinks: [{ title: 'Shop Premium Tea Collection', url: 'https://rezapp.com/store/monsoon-roastery' }],
    rezCoins: 12,
    brandedCoins: 8,
    brandedCoinLabel: 'Leaf Credits',
    dailySlots: 20,
    qrWindowMinutes: 120,
    windowType: 'auto' as const,
    campaignBoost: 0.05,
  },

  // ── EXPERIENCE (5) ───────────────────────────────────────────────────────
  {
    title: "Chef's Tasting Menu – 3 Courses",
    category: 'experience' as const,
    coinPrice: 80,
    commitmentFee: 29 as const,
    originalPrice: 1200,
    storeSlug: 'karavalli-kitchen-btm-layout',
    description:
      "Experience our chef's rotating 3-course tasting menu — amuse-bouche, main, and dessert. Paired with a mocktail.",
    terms: 'Pre-booking mandatory. Dress code: smart casual. Valid weekdays only. Not combinable with other offers.',
    images: [
      'https://picsum.photos/seed/tasting1/600/400',
      'https://picsum.photos/seed/tasting2/600/400',
      'https://picsum.photos/seed/tasting3/600/400',
    ],
    upsellLinks: [{ title: 'Reserve a Table for 2', url: 'https://rezapp.com/store/karavalli-kitchen' }],
    rezCoins: 60,
    brandedCoins: 40,
    brandedCoinLabel: 'Karavalli Credits',
    dailySlots: 4,
    qrWindowMinutes: 15,
    windowType: 'fixed' as const,
    campaignBoost: 0.3,
  },
  {
    title: 'Hands-On Cooking Masterclass',
    category: 'experience' as const,
    coinPrice: 70,
    commitmentFee: 19 as const,
    originalPrice: 999,
    storeSlug: 'namma-ooru-thindi-koramangala',
    description:
      '90-minute class with a professional chef. Learn to make 3 Karnataka dishes from scratch. Ingredients provided.',
    terms: 'Max 8 participants per batch. Saturday sessions only, 11AM. Book 48 hrs in advance.',
    images: ['https://picsum.photos/seed/cooking1/600/400', 'https://picsum.photos/seed/cooking2/600/400'],
    upsellLinks: [{ title: 'Book Private Cooking Class', url: 'https://rezapp.com/store/namma-ooru-thindi' }],
    rezCoins: 50,
    brandedCoins: 30,
    brandedCoinLabel: 'Thindi Points',
    dailySlots: 8,
    qrWindowMinutes: 20,
    windowType: 'fixed' as const,
    campaignBoost: 0.2,
  },
  {
    title: 'HIIT Bootcamp – Trial Class',
    category: 'experience' as const,
    coinPrice: 45,
    commitmentFee: 9 as const,
    originalPrice: 650,
    storeSlug: 'fitlab-bengaluru-whitefield',
    description: '45-minute high-intensity interval training class. Burn 400–600 calories with expert coaching.',
    terms: 'Medical clearance recommended for heart conditions. Bring water bottle. One trial per user.',
    images: ['https://picsum.photos/seed/hiit1/600/400', 'https://picsum.photos/seed/hiit2/600/400'],
    upsellLinks: [{ title: 'Join FitLab Quarterly Plan', url: 'https://rezapp.com/store/fitlab' }],
    rezCoins: 30,
    brandedCoins: 20,
    brandedCoinLabel: 'FitCoins',
    dailySlots: 12,
    qrWindowMinutes: 30,
    windowType: 'fixed' as const,
    campaignBoost: 0.1,
  },
  {
    title: 'Aromatherapy & Sound Healing Session',
    category: 'experience' as const,
    coinPrice: 65,
    commitmentFee: 19 as const,
    originalPrice: 850,
    storeSlug: 'serenity-wellness-spa-jayanagar',
    description: '60-min immersive session combining aromatherapy diffusion and Tibetan singing bowl sound therapy.',
    terms: 'Appointment only. Wear loose comfortable clothing. No mobile phones inside session room.',
    images: ['https://picsum.photos/seed/sound1/600/400', 'https://picsum.photos/seed/sound2/600/400'],
    upsellLinks: [{ title: 'Book Monthly Wellness Plan', url: 'https://rezapp.com/store/serenity-spa' }],
    rezCoins: 45,
    brandedCoins: 28,
    brandedCoinLabel: 'Zen Points',
    dailySlots: 5,
    qrWindowMinutes: 15,
    windowType: 'fixed' as const,
    campaignBoost: 0.15,
  },
  {
    title: 'Skincare Science Workshop',
    category: 'experience' as const,
    coinPrice: 55,
    commitmentFee: 19 as const,
    originalPrice: 750,
    storeSlug: 'pure-skin-studio-hsr-layout',
    description:
      '75-min interactive workshop on skin types, layering actives, and building your routine. Dermatologist-led.',
    terms: 'Max 12 attendees. Sunday mornings 10AM–11:15AM. Bring your current skincare products.',
    images: ['https://picsum.photos/seed/workshop1/600/400', 'https://picsum.photos/seed/workshop2/600/400'],
    upsellLinks: [{ title: 'Book 1-on-1 Skin Consultation', url: 'https://rezapp.com/store/pure-skin-studio' }],
    rezCoins: 38,
    brandedCoins: 22,
    brandedCoinLabel: 'Skin Credits',
    dailySlots: 12,
    qrWindowMinutes: 20,
    windowType: 'fixed' as const,
    campaignBoost: 0.1,
  },

  // ── D2C KIT (5) ──────────────────────────────────────────────────────────
  {
    title: 'Glow Starter Skincare Kit',
    category: 'd2c_kit' as const,
    coinPrice: 90,
    commitmentFee: 29 as const,
    originalPrice: 1499,
    storeSlug: 'vanity-co-malleshwaram',
    description:
      'Full-size skincare kit — Vitamin C serum, hydrating moisturiser, SPF 50+ sunscreen, and a gentle foaming cleanser.',
    terms: 'Shipped within 3 business days to Bangalore addresses only. Non-returnable.',
    images: ['https://picsum.photos/seed/skinkit1/600/400', 'https://picsum.photos/seed/skinkit2/600/400'],
    upsellLinks: [{ title: 'Shop Complete Routine', url: 'https://rezapp.com/store/vanity-co' }],
    rezCoins: 60,
    brandedCoins: 40,
    brandedCoinLabel: 'Glow Credits',
    dailySlots: 5,
    qrWindowMinutes: 1440,
    windowType: 'auto' as const,
    campaignBoost: 0.2,
  },
  {
    title: 'Artisan Coffee Discovery Kit',
    category: 'd2c_kit' as const,
    coinPrice: 75,
    commitmentFee: 19 as const,
    originalPrice: 999,
    storeSlug: 'brew-bean-co-koramangala',
    description:
      '3 × 100g bags of single-origin Indian coffee — Coorg Robusta, Chikmagalur Arabica, Araku Valley blend.',
    terms: 'Delivered in 2–4 business days. Whole bean or ground — specify in notes.',
    images: ['https://picsum.photos/seed/coffeekit1/600/400', 'https://picsum.photos/seed/coffeekit2/600/400'],
    upsellLinks: [{ title: 'Subscribe Coffee Monthly', url: 'https://rezapp.com/store/brew-bean' }],
    rezCoins: 50,
    brandedCoins: 35,
    brandedCoinLabel: 'Brew Points',
    dailySlots: 8,
    qrWindowMinutes: 1440,
    windowType: 'auto' as const,
    campaignBoost: 0.15,
  },
  {
    title: 'Immunity Boost Health Kit',
    category: 'd2c_kit' as const,
    coinPrice: 85,
    commitmentFee: 29 as const,
    originalPrice: 1299,
    storeSlug: 'wellnessfirst-center-jp-nagar',
    description: 'Doctor-curated kit — Vitamin D3, Zinc, Ashwagandha, and Tulsi drops. 30-day supply.',
    terms: 'Delivered within 2 business days. Consult a doctor before use if on medication.',
    images: ['https://picsum.photos/seed/healthkit1/600/400', 'https://picsum.photos/seed/healthkit2/600/400'],
    upsellLinks: [{ title: 'Full Wellness Consultation', url: 'https://rezapp.com/store/wellnessfirst' }],
    rezCoins: 55,
    brandedCoins: 38,
    brandedCoinLabel: 'HealthCoins',
    dailySlots: 6,
    qrWindowMinutes: 1440,
    windowType: 'auto' as const,
    campaignBoost: 0.1,
  },
  {
    title: 'Gourmet Snack Discovery Box',
    category: 'd2c_kit' as const,
    coinPrice: 60,
    commitmentFee: 19 as const,
    originalPrice: 799,
    storeSlug: 'fresh-fields-market-whitefield',
    description: '10-item gourmet snack box — artisan cookies, exotic nuts, handcrafted chocolates, and herbal teas.',
    terms: 'Delivered within 3 business days. No returns on food items. Allergen info on each pack.',
    images: ['https://picsum.photos/seed/snackbox1/600/400', 'https://picsum.photos/seed/snackbox2/600/400'],
    upsellLinks: [{ title: 'Subscribe Snack Box Monthly', url: 'https://rezapp.com/store/fresh-fields' }],
    rezCoins: 40,
    brandedCoins: 25,
    brandedCoinLabel: 'Snack Credits',
    dailySlots: 10,
    qrWindowMinutes: 1440,
    windowType: 'auto' as const,
    campaignBoost: 0.05,
  },
  {
    title: 'Smart Home Starter Kit',
    category: 'd2c_kit' as const,
    coinPrice: 100,
    commitmentFee: 29 as const,
    originalPrice: 1799,
    storeSlug: 'techzone-bangalore-indiranagar',
    description:
      'Smart plug, LED bulb strip, and a mini Bluetooth speaker — everything to start your smart home journey.',
    terms: 'Delivered within 5 business days. Warranty: 6 months. Installation guide included.',
    images: ['https://picsum.photos/seed/smarthome1/600/400', 'https://picsum.photos/seed/smarthome2/600/400'],
    upsellLinks: [{ title: 'Shop Full Smart Home Range', url: 'https://rezapp.com/store/techzone' }],
    rezCoins: 70,
    brandedCoins: 45,
    brandedCoinLabel: 'Tech Credits',
    dailySlots: 4,
    qrWindowMinutes: 1440,
    windowType: 'auto' as const,
    campaignBoost: 0.2,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function randBetween(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  logger.info('📡 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI as string);
  logger.info('✅ Connected\n');

  // ── 0. Fix any previously seeded stores that have isFeatured:false ────────
  logger.info('🔧 Fixing existing stores → isFeatured: true…');
  const fixResult = await Store.updateMany(
    { 'location.city': { $in: [/^Bengaluru$/i, /^Bangalore$/i] }, isActive: true },
    { $set: { isFeatured: true, isVerified: true } },
  );
  logger.info(`   ✅ Updated ${fixResult.modifiedCount} existing Bangalore stores\n`);

  // ── 1. Upsert categories ─────────────────────────────────────────────────
  logger.info('📁 Upserting categories…');
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { slug: cat.slug, name: cat.name, isActive: true },
      { upsert: true, new: true },
    );
    categoryMap[cat.slug] = doc._id as mongoose.Types.ObjectId;
    logger.info(`   ✅ ${cat.icon}  ${cat.name}`);
  }

  // ── 2. Create shared dummy merchant ──────────────────────────────────────
  logger.info('\n👤 Creating shared dummy merchant…');
  const merchantEmail = 'dummy.merchant@rezapp.com';
  let merchant = await Merchant.findOne({ email: merchantEmail });
  if (!merchant) {
    const seedPassword = process.env.SEED_DEMO_PASSWORD || crypto.randomBytes(12).toString('hex');
    logger.warn(`[SEED] Dummy merchant password for this run: ${seedPassword} — record this now.`);
    const hashedPw = await bcrypt.hash(seedPassword, 10);
    merchant = await Merchant.create({
      businessName: 'REZ Dummy Merchant',
      ownerName: 'REZ Admin',
      email: merchantEmail,
      password: hashedPw,
      phone: '+919876500000',
      businessAddress: {
        street: '12th Cross, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560095',
        country: 'India',
      },
      verificationStatus: 'verified',
      isActive: true,
    });
    logger.info('   ✅ Created merchant:', merchant._id);
  } else {
    logger.info('   ⏭️  Merchant exists:', merchant._id);
  }
  const merchantId = merchant._id as mongoose.Types.ObjectId;

  // ── 3. Create 5 stores per category ──────────────────────────────────────
  logger.info('\n🏪 Creating stores (5 per category)…');
  const storeSlugToId: Record<string, mongoose.Types.ObjectId> = {};
  let storesCreated = 0;
  let storesSkipped = 0;

  for (const cat of CATEGORIES) {
    const catId = categoryMap[cat.slug];
    const names = STORE_NAMES[cat.slug];
    const desc = STORE_DESCRIPTIONS[cat.slug];

    for (let i = 0; i < 5; i++) {
      const area = AREAS[i]; // first 5 areas for main categories
      const name = names[i];
      const slug = slugify(`${name}-${slugify(area.name)}`);

      storeSlugToId[slug] = new mongoose.Types.ObjectId(); // pre-assign

      const exists = await Store.findOne({ slug });
      if (exists) {
        storeSlugToId[slug] = exists._id as mongoose.Types.ObjectId;
        logger.info(`   ⏭️  ${name} — ${area.name}`);
        storesSkipped++;
        continue;
      }

      const store = await Store.create({
        name,
        slug,
        description: desc,
        logo: `https://picsum.photos/seed/${slug}-logo/200/200`,
        image: `https://picsum.photos/seed/${slug}-banner/800/400`,
        category: catId,
        merchantId,
        location: {
          address: `${i + 1}${['st', 'nd', 'rd', 'th', 'th'][i]} Main Road, ${area.name}, Bengaluru`,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: area.pin,
          coordinates: area.coords,
          deliveryRadius: 5,
          landmark: area.name,
        },
        contact: {
          phone: `+9198765${String(storesCreated).padStart(5, '0')}`,
          email: `hello@${slug}.com`,
        },
        ratings: {
          average: randBetween(3.8, 4.8),
          count: Math.floor(Math.random() * 200) + 20,
          distribution: { 5: 40, 4: 30, 3: 15, 2: 10, 1: 5 },
        },
        offers: {
          cashback: [5, 8, 10, 12, 15][i],
          minOrderAmount: 200,
          maxCashback: 150,
          isPartner: true,
          partnerLevel: ['bronze', 'silver', 'gold', 'silver', 'bronze'][i] as any,
        },
        operationalInfo: {
          hours: defaultHours,
          deliveryTime: '30-45 mins',
          minimumOrder: 200,
          deliveryFee: 30,
          freeDeliveryAbove: 500,
          acceptsWalletPayment: true,
          paymentMethods: ['upi', 'card', 'wallet', 'cash'],
        },
        deliveryCategories: {
          fastDelivery: i === 0,
          budgetFriendly: false,
          ninetyNineStore: false,
          premium: i === 2,
          organic: cat.slug === 'grocery',
          alliance: false,
          lowestPrice: false,
          mall: false,
          cashStore: false,
        },
        analytics: {
          totalOrders: Math.floor(Math.random() * 500),
          totalRevenue: Math.floor(Math.random() * 50000),
          avgOrderValue: Math.floor(Math.random() * 400) + 200,
          repeatCustomers: Math.floor(Math.random() * 100),
          followersCount: Math.floor(Math.random() * 500),
        },
        tags: [cat.slug, area.name.toLowerCase().replace(' ', '-'), 'bangalore', 'near-u'],
        isActive: true,
        isFeatured: true,
        isVerified: true,
      });

      storeSlugToId[slug] = store._id as mongoose.Types.ObjectId;
      logger.info(`   ✅ [${cat.name}] ${name} — ${area.name}`);
      storesCreated++;
    }
  }

  logger.info(`\n   📊 Stores: ${storesCreated} created, ${storesSkipped} skipped`);

  // ── 4. Create trial offers ────────────────────────────────────────────────
  logger.info('\n🎯 Creating Trial Offers…');
  let trialsCreated = 0;
  let trialsSkipped = 0;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const t of TRIAL_OFFERS_DATA) {
    const exists = await TrialOffer.findOne({ title: t.title, merchantId });
    if (exists) {
      logger.info(`   ⏭️  ${t.title}`);
      trialsSkipped++;
      continue;
    }

    await TrialOffer.create({
      merchantId,
      title: t.title,
      category: t.category,
      coinPrice: t.coinPrice,
      commitmentFee: t.commitmentFee,
      originalPrice: t.originalPrice,
      slotConfig: {
        dailySlots: t.dailySlots,
        qrWindowMinutes: t.qrWindowMinutes,
        windowType: t.windowType,
      },
      rewardConfig: {
        rezCoins: t.rezCoins,
        brandedCoins: t.brandedCoins,
        brandedCoinLabel: t.brandedCoinLabel,
      },
      upsellLinks: t.upsellLinks,
      images: t.images,
      terms: t.terms,
      status: 'active',
      campaignBoost: t.campaignBoost,
      freshnessBoostedUntil: in30Days,
      totalBookings: Math.floor(Math.random() * 50),
      totalCompletions: Math.floor(Math.random() * 40),
      avgRating: randBetween(3.9, 4.9),
    });

    const typeEmoji: Record<string, string> = {
      service: '🛎️',
      sample_pickup: '📦',
      experience: '✨',
      d2c_kit: '📬',
    };
    logger.info(`   ✅ ${typeEmoji[t.category]} [${t.category}] ${t.title}`);
    trialsCreated++;
  }

  logger.info(`\n   📊 Trials: ${trialsCreated} created, ${trialsSkipped} skipped`);

  // ── Summary ───────────────────────────────────────────────────────────────
  logger.info('\n═══════════════════════════════════════════════');
  logger.info(`✅ DONE`);
  logger.info(`   Categories : ${CATEGORIES.length}`);
  logger.info(`   Stores     : ${storesCreated} created (${storesSkipped} skipped)`);
  logger.info(`   Trials     : ${trialsCreated} created (${trialsSkipped} skipped)`);
  logger.info('═══════════════════════════════════════════════');

  await mongoose.disconnect();
  logger.info('🔌 Disconnected');
}

seed().catch((err) => {
  logger.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});
