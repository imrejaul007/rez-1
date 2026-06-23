/**
 * Seed a demo restaurant store + menu for the REZ Web QR Menu.
 *
 * Run:  npx ts-node src/scripts/seedWebMenuDemo.ts
 *
 * After running, the web menu is live at:
 *   https://rez-web-menu.onrender.com/demo-restaurant
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectScriptDb, disconnectDb } from './connectDb';
import { logger } from '../config/logger';

dotenv.config();

// ── Minimal inline schemas (avoids importing models with many required fields) ──

const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    originalPrice: Number,
    image: String,
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    dietaryInfo: {
      isVegetarian: { type: Boolean, default: false },
      isVegan: { type: Boolean, default: false },
    },
    spicyLevel: { type: Number, default: 0 },
    tags: [String],
  },
  { _id: true },
);

const MenuCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    displayOrder: { type: Number, default: 0 },
    items: [MenuItemSchema],
  },
  { _id: true },
);

const MenuSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
    categories: [MenuCategorySchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const StoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    logo: String,
    image: String,
    banner: [String],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      pincode: String,
    },
    contact: {
      phone: String,
      email: String,
      website: String,
    },
    operationalInfo: {
      hours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String },
      },
      minimumOrder: Number,
      paymentMethods: [String],
      acceptsWalletPayment: { type: Boolean, default: false },
    },
    paymentSettings: {
      acceptUPI: { type: Boolean, default: true },
      acceptCards: { type: Boolean, default: true },
      acceptPayLater: { type: Boolean, default: false },
      acceptRezCoins: { type: Boolean, default: true },
      acceptPromoCoins: { type: Boolean, default: false },
      acceptPayBill: { type: Boolean, default: false },
      maxCoinRedemptionPercent: { type: Number, default: 10 },
      allowHybridPayment: { type: Boolean, default: false },
      allowOffers: { type: Boolean, default: true },
      allowCashback: { type: Boolean, default: true },
    },
    rewardRules: {
      baseCashbackPercent: { type: Number, default: 1 },
      reviewBonusCoins: { type: Number, default: 10 },
      socialShareBonusCoins: { type: Number, default: 5 },
      minimumAmountForReward: { type: Number, default: 100 },
      coinsPerRupee: { type: Number, default: 1 },
    },
    bookingConfig: {
      enabled: { type: Boolean, default: true },
      requiresAdvanceBooking: { type: Boolean, default: false },
      allowWalkIn: { type: Boolean, default: true },
      slotDuration: { type: Number, default: 60 },
      advanceBookingDays: { type: Number, default: 7 },
      maxTableCapacity: { type: Number, default: 4 },
      tableCount: { type: Number, default: 10 },
      tables: [
        {
          tableNumber: String,
          capacity: Number,
          qrData: String,
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    ratings: {
      average: { type: Number, default: 4.3 },
      count: { type: Number, default: 128 },
      distribution: { 5: Number, 4: Number, 3: Number, 2: Number, 1: Number },
    },
    offers: {
      isPartner: { type: Boolean, default: false },
      partnerLevel: String,
    },
    tags: [String],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    hasMenu: { type: Boolean, default: true },
    priceForTwo: Number,
    gstRate: { type: Number, default: 5 },
  },
  { timestamps: true },
);

async function seed() {
  logger.info('Connecting to MongoDB…');
  await connectScriptDb();
  logger.info('Connected.');

  // Use model() with overwrite to avoid "Cannot overwrite model once compiled" error
  const Store = mongoose.models['Store'] || mongoose.model('Store', StoreSchema);
  const Menu = mongoose.models['Menu'] || mongoose.model('Menu', MenuSchema);

  const SLUG = 'demo-restaurant';

  // ── Upsert Store ────────────────────────────────────────────────────────────
  const storeData = {
    name: 'The Grand Spice Kitchen',
    slug: SLUG,
    description: 'Authentic Indian cuisine with a modern twist. Dine-in, takeaway & QR ordering.',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=GS&backgroundColor=1a2744&textColor=f5c842',
    banner: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop'],
    location: {
      address: '42, MG Road, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560034',
    },
    contact: {
      phone: '+91-9876543210',
      email: 'hello@grandspicekitchen.com',
      website: 'https://grandspicekitchen.com',
    },
    operationalInfo: {
      hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:30' },
        saturday: { open: '10:00', close: '23:30' },
        sunday: { open: '10:00', close: '22:00' },
      },
      minimumOrder: 199,
      paymentMethods: ['upi', 'card', 'cash'],
      acceptsWalletPayment: false,
    },
    paymentSettings: {
      acceptUPI: true,
      acceptCards: true,
      acceptPayLater: false,
      acceptRezCoins: true,
      acceptPromoCoins: false,
      acceptPayBill: false,
      maxCoinRedemptionPercent: 10,
      allowHybridPayment: false,
      allowOffers: true,
      allowCashback: true,
    },
    rewardRules: {
      baseCashbackPercent: 1,
      reviewBonusCoins: 10,
      socialShareBonusCoins: 5,
      minimumAmountForReward: 100,
      coinsPerRupee: 1,
    },
    bookingConfig: {
      enabled: true,
      requiresAdvanceBooking: false,
      allowWalkIn: true,
      slotDuration: 60,
      advanceBookingDays: 7,
      maxTableCapacity: 4,
      tableCount: 10,
      tables: Array.from({ length: 10 }, (_, i) => ({
        tableNumber: String(i + 1),
        capacity: 4,
        qrData: `${SLUG}-table-${i + 1}`,
        isActive: true,
      })),
    },
    ratings: { average: 4.3, count: 128, distribution: { 5: 60, 4: 40, 3: 18, 2: 7, 1: 3 } },
    offers: { isPartner: false },
    tags: ['north-indian', 'biryani', 'tandoor', 'family', 'dine-in'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    hasMenu: true,
    priceForTwo: 600,
    gstRate: 5,
  };

  const store = await (Store as any).findOneAndUpdate(
    { slug: SLUG },
    { $set: storeData },
    { upsert: true, new: true, runValidators: false },
  );
  logger.info(`✓ Store upserted: ${store.name} (${store._id})`);

  // ── Upsert Menu ─────────────────────────────────────────────────────────────
  const menuData = {
    storeId: store._id,
    isActive: true,
    categories: [
      {
        name: 'Starters',
        description: 'Light bites to kick off your meal',
        displayOrder: 1,
        items: [
          {
            name: 'Paneer Tikka',
            price: 249,
            originalPrice: 299,
            description: 'Marinated cottage cheese grilled in tandoor with mint chutney',
            category: 'Starters',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true, isVegan: false },
            spicyLevel: 2,
            tags: ['bestseller', 'veg'],
            image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&auto=format&fit=crop',
          },
          {
            name: 'Chicken Seekh Kebab',
            price: 319,
            description: 'Minced chicken with spices, grilled on skewers',
            category: 'Starters',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false, isVegan: false },
            spicyLevel: 3,
            tags: ['popular'],
            image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop',
          },
          {
            name: 'Hara Bhara Kebab',
            price: 219,
            description: 'Spinach and pea patties with tangy chutney',
            category: 'Starters',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true, isVegan: true },
            spicyLevel: 1,
            tags: ['veg', 'healthy'],
          },
          {
            name: 'Crispy Fish Amritsari',
            price: 349,
            description: 'Batter-fried fish with ajwain and carom spices',
            category: 'Starters',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false },
            spicyLevel: 2,
            tags: ['seafood'],
          },
        ],
      },
      {
        name: 'Main Course',
        description: 'Hearty dishes for a complete meal',
        displayOrder: 2,
        items: [
          {
            name: 'Dal Makhani',
            price: 279,
            description: 'Slow-cooked black lentils with butter and cream',
            category: 'Main Course',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 1,
            tags: ['bestseller', 'veg'],
            image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop',
          },
          {
            name: 'Butter Chicken',
            price: 349,
            originalPrice: 399,
            description: 'Tender chicken in rich tomato-butter gravy',
            category: 'Main Course',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false },
            spicyLevel: 2,
            tags: ['bestseller', 'must-try'],
            image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop',
          },
          {
            name: 'Palak Paneer',
            price: 289,
            description: 'Fresh cottage cheese in spiced spinach gravy',
            category: 'Main Course',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 1,
            tags: ['veg', 'healthy'],
          },
          {
            name: 'Mutton Rogan Josh',
            price: 429,
            description: 'Slow-cooked Kashmiri mutton with aromatic spices',
            category: 'Main Course',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false },
            spicyLevel: 4,
            tags: ['spicy', 'premium'],
          },
          {
            name: 'Shahi Paneer',
            price: 309,
            description: 'Paneer in rich cashew and cream sauce',
            category: 'Main Course',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 1,
            tags: ['veg', 'rich'],
          },
        ],
      },
      {
        name: 'Biryani & Rice',
        description: 'Fragrant rice dishes cooked to perfection',
        displayOrder: 3,
        items: [
          {
            name: 'Hyderabadi Chicken Biryani',
            price: 399,
            originalPrice: 449,
            description: 'Aromatic basmati rice layered with spiced chicken — Dum style',
            category: 'Biryani & Rice',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false },
            spicyLevel: 3,
            tags: ['bestseller', 'must-try'],
            image: 'https://images.unsplash.com/photo-1563379091339-03246963d651?w=400&auto=format&fit=crop',
          },
          {
            name: 'Veg Dum Biryani',
            price: 299,
            description: 'Seasonal vegetables in fragrant saffron rice',
            category: 'Biryani & Rice',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 2,
            tags: ['veg', 'popular'],
          },
          {
            name: 'Mutton Biryani',
            price: 479,
            description: 'Tender mutton pieces layered with spiced basmati',
            category: 'Biryani & Rice',
            isAvailable: true,
            dietaryInfo: { isVegetarian: false },
            spicyLevel: 3,
            tags: ['premium'],
          },
          {
            name: 'Jeera Rice',
            price: 149,
            description: 'Basmati rice tempered with cumin and ghee',
            category: 'Biryani & Rice',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg', 'sides'],
          },
        ],
      },
      {
        name: 'Breads',
        displayOrder: 4,
        items: [
          {
            name: 'Garlic Naan',
            price: 79,
            description: 'Soft leavened bread with garlic and butter from tandoor',
            category: 'Breads',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg'],
          },
          {
            name: 'Butter Roti',
            price: 49,
            description: 'Whole wheat flatbread with butter',
            category: 'Breads',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg'],
          },
          {
            name: 'Stuffed Paratha',
            price: 99,
            description: 'Whole wheat bread stuffed with spiced potato or paneer',
            category: 'Breads',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 1,
            tags: ['veg'],
          },
          {
            name: 'Laccha Paratha',
            price: 89,
            description: 'Flaky layered whole wheat flatbread',
            category: 'Breads',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg'],
          },
        ],
      },
      {
        name: 'Drinks',
        displayOrder: 5,
        items: [
          {
            name: 'Sweet Lassi',
            price: 99,
            description: 'Chilled yogurt drink with sugar and cardamom',
            category: 'Drinks',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg', 'refreshing'],
          },
          {
            name: 'Mango Lassi',
            price: 119,
            description: 'Thick yogurt shake with Alphonso mango pulp',
            category: 'Drinks',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg', 'popular'],
          },
          {
            name: 'Masala Chaas',
            price: 79,
            description: 'Spiced buttermilk with roasted cumin and mint',
            category: 'Drinks',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 1,
            tags: ['veg', 'refreshing'],
          },
          {
            name: 'Fresh Lime Soda',
            price: 89,
            description: 'Sweet or salted lime with soda water',
            category: 'Drinks',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg'],
          },
        ],
      },
      {
        name: 'Desserts',
        displayOrder: 6,
        items: [
          {
            name: 'Gulab Jamun',
            price: 99,
            description: 'Soft milk-solid dumplings soaked in rose syrup',
            category: 'Desserts',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg', 'sweet'],
            image: 'https://images.unsplash.com/photo-1666977227745-4e49e92a4e44?w=400&auto=format&fit=crop',
          },
          {
            name: 'Kulfi Falooda',
            price: 149,
            description: 'Traditional Indian ice cream with vermicelli and basil seeds',
            category: 'Desserts',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg', 'popular'],
          },
          {
            name: 'Phirni',
            price: 119,
            description: 'Chilled rice pudding garnished with pistachios',
            category: 'Desserts',
            isAvailable: true,
            dietaryInfo: { isVegetarian: true },
            spicyLevel: 0,
            tags: ['veg'],
          },
        ],
      },
    ],
  };

  await (Menu as any).findOneAndUpdate(
    { storeId: store._id },
    { $set: menuData },
    { upsert: true, new: true, runValidators: false },
  );
  logger.info(
    `✓ Menu upserted: ${menuData.categories.length} categories, ${menuData.categories.reduce(
      (t, c) => t + c.items.length,
      0,
    )} items`,
  );

  logger.info('\n✅  Done!');
  logger.info(`\n   Web Menu URL:  https://rez-web-menu.onrender.com/demo-restaurant`);
  logger.info(`   API check:     https://rez-backend-e2jh.onrender.com/api/web-ordering/store/demo-restaurant\n`);

  await disconnectDb();
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
