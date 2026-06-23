import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

// Import all models
import {
  User,
  Store,
  Product,
  Order,
  Review,
  Cart,
  Notification,
  Video,
  Wishlist,
  Wallet,
  Transaction,
  Coupon,
  Offer,
  Category,
  Article,
  Activity,
  CoinTransaction,
  OfferRedemption,
  EventBooking,
  GameSession,
  FlashSale,
  Project,
  StockHistory,
  // StorePromoCoin removed - using wallet.brandedCoins instead
  Subscription,
  TriviaQuestion,
  QuizQuestion,
  UserAchievement,
  UserCoupon,
  UserSettings,
  Event,
  PaymentMethod,
  Consultation,
  Address,
  PromoCode,
  Referral,
  Message,
  Conversation,
  StockNotification,
  PriceAlert,
  CashbackMongoModel as Cashback,
  Bill,
  UserCashback,
  Challenge,
  MiniGame,
  HeroBanner,
  OfferCategory,
  PreOrder,
  ProcessedWebhookEvent,
  ScratchCard,
  SocialMediaPost,
  SupportTicket,
  StoreAnalytics,
  StoreComparison,
  StoreVisit,
  StoreVoucher,
  SubscriptionTier,
  TableBooking,
  UserChallengeProgress,
  UserOfferInteraction,
  UserProduct,
  UserStoreVoucher,
  UserStreak,
  Discount,
  DiscountUsage,
  Favorite,
  Follow,
  Menu,
  Outlet,
  Partner,
  Payment,
  ProductAnalytics,
  ServiceAppointment,
  ServiceRequest,
  Merchant,
  // MProduct is deprecated, using Product instead
  // Product as MerchantProduct,
  OrderMongoModel as MerchantOrder,
  MerchantUser,
  ActivityInteraction,
  PriceHistory
} from '../models';

interface IndexStats {
  model: string;
  indexes: {
    name: string;
    fields: string;
    type?: string;
  }[];
  status: 'success' | 'error';
  error?: string;
}

const results: IndexStats[] = [];

async function addIndexes() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');
    console.log('');

    // USER MODEL INDEXES
    console.log('Adding indexes to User model...');
    try {
      User.collection.dropIndexes().catch(() => {}); // Drop existing indexes to avoid conflicts

      User.collection.createIndex({ phoneNumber: 1 });
      User.collection.createIndex({ email: 1 });
      User.collection.createIndex({ 'profile.location.coordinates': '2dsphere' });
      User.collection.createIndex({ 'referral.referralCode': 1 });
      User.collection.createIndex({ 'referral.referredBy': 1 });
      User.collection.createIndex({ username: 1 });
      User.collection.createIndex({ 'auth.isVerified': 1 });
      User.collection.createIndex({ role: 1 });
      User.collection.createIndex({ createdAt: -1 });
      User.collection.createIndex({ isActive: 1 });
      User.collection.createIndex({ referralTier: 1 });
      User.collection.createIndex({ isPremium: 1 });

      results.push({
        model: 'User',
        indexes: [
          { name: 'phoneNumber', fields: 'phoneNumber: 1' },
          { name: 'email', fields: 'email: 1' },
          { name: 'location_geospatial', fields: 'profile.location.coordinates: 2dsphere' },
          { name: 'referralCode', fields: 'referral.referralCode: 1' },
          { name: 'referredBy', fields: 'referral.referredBy: 1' },
          { name: 'username', fields: 'username: 1' },
          { name: 'verified', fields: 'auth.isVerified: 1' },
          { name: 'role', fields: 'role: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'referralTier', fields: 'referralTier: 1' },
          { name: 'isPremium', fields: 'isPremium: 1' }
        ],
        status: 'success'
      });
      console.log('✓ User indexes added');
    } catch (error: any) {
      console.error('✗ Error adding User indexes:', error.message);
      results.push({
        model: 'User',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // STORE MODEL INDEXES
    console.log('Adding indexes to Store model...');
    try {
      Store.collection.dropIndexes().catch(() => {});

      Store.collection.createIndex({ name: 1 });
      Store.collection.createIndex({ 'location.coordinates': '2dsphere' });
      Store.collection.createIndex({ 'location.city': 1 });
      Store.collection.createIndex({ category: 1 });
      Store.collection.createIndex({ isActive: 1 });
      Store.collection.createIndex({ 'ratings.average': -1 });
      Store.collection.createIndex({ isFeatured: 1 });
      Store.collection.createIndex({ tags: 1 });
      Store.collection.createIndex({ createdAt: -1 });
      Store.collection.createIndex({ slug: 1 });
      Store.collection.createIndex({ isVerified: 1 });

      // Compound indexes for Store
      Store.collection.createIndex({ category: 1, isActive: 1, 'ratings.average': -1 });
      Store.collection.createIndex({ 'location.city': 1, isActive: 1, category: 1 });

      results.push({
        model: 'Store',
        indexes: [
          { name: 'name', fields: 'name: 1' },
          { name: 'location_geospatial', fields: 'location.coordinates: 2dsphere' },
          { name: 'city', fields: 'location.city: 1' },
          { name: 'category', fields: 'category: 1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'rating', fields: 'ratings.average: -1' },
          { name: 'isFeatured', fields: 'isFeatured: 1' },
          { name: 'tags', fields: 'tags: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'slug', fields: 'slug: 1' },
          { name: 'isVerified', fields: 'isVerified: 1' },
          { name: 'category_active_rating', fields: 'category: 1, isActive: 1, ratings.average: -1', type: 'compound' },
          { name: 'city_active_category', fields: 'location.city: 1, isActive: 1, category: 1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Store indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Store indexes:', error.message);
      results.push({
        model: 'Store',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // PRODUCT MODEL INDEXES
    console.log('Adding indexes to Product model...');
    try {
      Product.collection.dropIndexes().catch(() => {});

      Product.collection.createIndex({ name: 1 });
      Product.collection.createIndex({ slug: 1 });
      Product.collection.createIndex({ store: 1 });
      Product.collection.createIndex({ category: 1 });
      Product.collection.createIndex({ 'pricing.selling': 1 });
      Product.collection.createIndex({ 'inventory.isAvailable': 1 });
      Product.collection.createIndex({ 'inventory.stock': 1 });
      Product.collection.createIndex({ isActive: 1 });
      Product.collection.createIndex({ isFeatured: 1 });
      Product.collection.createIndex({ brand: 1 });
      Product.collection.createIndex({ 'ratings.average': -1 });
      Product.collection.createIndex({ tags: 1 });
      Product.collection.createIndex({ createdAt: -1 });
      Product.collection.createIndex({ sku: 1 });

      // Text search index
      Product.collection.createIndex({
        name: 'text',
        description: 'text',
        tags: 'text',
        brand: 'text'
      }, {
        weights: {
          name: 10,
          tags: 5,
          brand: 3,
          description: 1
        }
      });

      // Compound indexes for Product
      Product.collection.createIndex({ store: 1, isActive: 1, 'inventory.stock': 1 });
      Product.collection.createIndex({ category: 1, 'pricing.selling': 1, isActive: 1 });
      Product.collection.createIndex({ store: 1, 'ratings.average': -1 });
      Product.collection.createIndex({ isFeatured: 1, 'ratings.average': -1, isActive: 1 });
      Product.collection.createIndex({ store: 1, 'analytics.purchases': -1 });
      Product.collection.createIndex({ store: 1, category: 1, createdAt: -1 });

      results.push({
        model: 'Product',
        indexes: [
          { name: 'name', fields: 'name: 1' },
          { name: 'slug', fields: 'slug: 1' },
          { name: 'store', fields: 'store: 1' },
          { name: 'category', fields: 'category: 1' },
          { name: 'price', fields: 'pricing.selling: 1' },
          { name: 'available', fields: 'inventory.isAvailable: 1' },
          { name: 'stock', fields: 'inventory.stock: 1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'isFeatured', fields: 'isFeatured: 1' },
          { name: 'brand', fields: 'brand: 1' },
          { name: 'rating', fields: 'ratings.average: -1' },
          { name: 'tags', fields: 'tags: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'sku', fields: 'sku: 1' },
          { name: 'text_search', fields: 'name: text, description: text, tags: text, brand: text', type: 'text' },
          { name: 'store_active_stock', fields: 'store: 1, isActive: 1, inventory.stock: 1', type: 'compound' },
          { name: 'category_price_active', fields: 'category: 1, pricing.selling: 1, isActive: 1', type: 'compound' },
          { name: 'store_rating', fields: 'store: 1, ratings.average: -1', type: 'compound' },
          { name: 'featured_rating_active', fields: 'isFeatured: 1, ratings.average: -1, isActive: 1', type: 'compound' },
          { name: 'store_purchases', fields: 'store: 1, analytics.purchases: -1', type: 'compound' },
          { name: 'store_category_date', fields: 'store: 1, category: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Product indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Product indexes:', error.message);
      results.push({
        model: 'Product',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // ORDER MODEL INDEXES
    console.log('Adding indexes to Order model...');
    try {
      Order.collection.dropIndexes().catch(() => {});

      Order.collection.createIndex({ orderNumber: 1 });
      Order.collection.createIndex({ user: 1 });
      Order.collection.createIndex({ status: 1 });
      Order.collection.createIndex({ 'payment.status': 1 });
      Order.collection.createIndex({ 'delivery.status': 1 });
      Order.collection.createIndex({ createdAt: -1 });
      Order.collection.createIndex({ 'items.store': 1 });

      // Compound indexes for Order
      Order.collection.createIndex({ user: 1, status: 1, createdAt: -1 });
      Order.collection.createIndex({ 'items.store': 1, status: 1, createdAt: -1 });
      Order.collection.createIndex({ 'items.store': 1, 'items.product': 1, createdAt: -1 });
      Order.collection.createIndex({ 'payment.method': 1, 'items.store': 1 });

      results.push({
        model: 'Order',
        indexes: [
          { name: 'orderNumber', fields: 'orderNumber: 1' },
          { name: 'user', fields: 'user: 1' },
          { name: 'status', fields: 'status: 1' },
          { name: 'paymentStatus', fields: 'payment.status: 1' },
          { name: 'deliveryStatus', fields: 'delivery.status: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'store', fields: 'items.store: 1' },
          { name: 'user_status_date', fields: 'user: 1, status: 1, createdAt: -1', type: 'compound' },
          { name: 'store_status_date', fields: 'items.store: 1, status: 1, createdAt: -1', type: 'compound' },
          { name: 'store_product_date', fields: 'items.store: 1, items.product: 1, createdAt: -1', type: 'compound' },
          { name: 'payment_store', fields: 'payment.method: 1, items.store: 1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Order indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Order indexes:', error.message);
      results.push({
        model: 'Order',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // REVIEW MODEL INDEXES
    console.log('Adding indexes to Review model...');
    try {
      Review.collection.dropIndexes().catch(() => {});

      Review.collection.createIndex({ store: 1 });
      Review.collection.createIndex({ user: 1 });
      Review.collection.createIndex({ rating: 1 });
      Review.collection.createIndex({ createdAt: -1 });
      Review.collection.createIndex({ isActive: 1 });

      // Compound indexes for Review
      Review.collection.createIndex({ store: 1, rating: -1, createdAt: -1 });
      Review.collection.createIndex({ store: 1, createdAt: -1 });
      Review.collection.createIndex({ store: 1, isActive: 1 });

      results.push({
        model: 'Review',
        indexes: [
          { name: 'store', fields: 'store: 1' },
          { name: 'user', fields: 'user: 1' },
          { name: 'rating', fields: 'rating: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'store_rating_date', fields: 'store: 1, rating: -1, createdAt: -1', type: 'compound' },
          { name: 'store_date', fields: 'store: 1, createdAt: -1', type: 'compound' },
          { name: 'store_active', fields: 'store: 1, isActive: 1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Review indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Review indexes:', error.message);
      results.push({
        model: 'Review',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // CART MODEL INDEXES
    console.log('Adding indexes to Cart model...');
    try {
      Cart.collection.dropIndexes().catch(() => {});

      Cart.collection.createIndex({ user: 1 }, { unique: true });
      Cart.collection.createIndex({ updatedAt: -1 });
      Cart.collection.createIndex({ isActive: 1 });
      Cart.collection.createIndex({ expiresAt: 1 });

      results.push({
        model: 'Cart',
        indexes: [
          { name: 'user_unique', fields: 'user: 1', type: 'unique' },
          { name: 'updatedAt', fields: 'updatedAt: -1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'expiresAt', fields: 'expiresAt: 1' }
        ],
        status: 'success'
      });
      console.log('✓ Cart indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Cart indexes:', error.message);
      results.push({
        model: 'Cart',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // WISHLIST MODEL INDEXES
    console.log('Adding indexes to Wishlist model...');
    try {
      Wishlist.collection.dropIndexes().catch(() => {});

      Wishlist.collection.createIndex({ user: 1 }, { unique: true });
      Wishlist.collection.createIndex({ 'items.product': 1 });
      Wishlist.collection.createIndex({ createdAt: -1 });
      Wishlist.collection.createIndex({ updatedAt: -1 });

      results.push({
        model: 'Wishlist',
        indexes: [
          { name: 'user_unique', fields: 'user: 1', type: 'unique' },
          { name: 'products', fields: 'items.product: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'updatedAt', fields: 'updatedAt: -1' }
        ],
        status: 'success'
      });
      console.log('✓ Wishlist indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Wishlist indexes:', error.message);
      results.push({
        model: 'Wishlist',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // NOTIFICATION MODEL INDEXES
    console.log('Adding indexes to Notification model...');
    try {
      Notification.collection.dropIndexes().catch(() => {});

      Notification.collection.createIndex({ user: 1 });
      Notification.collection.createIndex({ isRead: 1 });
      Notification.collection.createIndex({ createdAt: -1 });
      Notification.collection.createIndex({ category: 1 });
      Notification.collection.createIndex({ priority: 1 });

      // Compound indexes for Notification
      Notification.collection.createIndex({ user: 1, isRead: 1, createdAt: -1 });
      Notification.collection.createIndex({ user: 1, category: 1, createdAt: -1 });

      results.push({
        model: 'Notification',
        indexes: [
          { name: 'user', fields: 'user: 1' },
          { name: 'isRead', fields: 'isRead: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'category', fields: 'category: 1' },
          { name: 'priority', fields: 'priority: 1' },
          { name: 'user_read_date', fields: 'user: 1, isRead: 1, createdAt: -1', type: 'compound' },
          { name: 'user_category_date', fields: 'user: 1, category: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Notification indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Notification indexes:', error.message);
      results.push({
        model: 'Notification',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // VIDEO MODEL INDEXES
    console.log('Adding indexes to Video model...');
    try {
      Video.collection.dropIndexes().catch(() => {});

      Video.collection.createIndex({ creator: 1 });
      Video.collection.createIndex({ contentType: 1 });
      Video.collection.createIndex({ isApproved: 1 });
      Video.collection.createIndex({ createdAt: -1 });
      Video.collection.createIndex({ category: 1 });
      Video.collection.createIndex({ tags: 1 });

      // Compound indexes for Video
      Video.collection.createIndex({ creator: 1, createdAt: -1 });
      Video.collection.createIndex({ contentType: 1, isApproved: 1, createdAt: -1 });
      Video.collection.createIndex({ category: 1, isApproved: 1, createdAt: -1 });

      results.push({
        model: 'Video',
        indexes: [
          { name: 'creator', fields: 'creator: 1' },
          { name: 'contentType', fields: 'contentType: 1' },
          { name: 'isApproved', fields: 'isApproved: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'category', fields: 'category: 1' },
          { name: 'tags', fields: 'tags: 1' },
          { name: 'creator_date', fields: 'creator: 1, createdAt: -1', type: 'compound' },
          { name: 'type_approved_date', fields: 'contentType: 1, isApproved: 1, createdAt: -1', type: 'compound' },
          { name: 'category_approved_date', fields: 'category: 1, isApproved: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Video indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Video indexes:', error.message);
      results.push({
        model: 'Video',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // WALLET MODEL INDEXES
    console.log('Adding indexes to Wallet model...');
    try {
      Wallet.collection.dropIndexes().catch(() => {});

      Wallet.collection.createIndex({ user: 1 }, { unique: true });
      Wallet.collection.createIndex({ updatedAt: -1 });
      Wallet.collection.createIndex({ createdAt: -1 });

      results.push({
        model: 'Wallet',
        indexes: [
          { name: 'user_unique', fields: 'user: 1', type: 'unique' },
          { name: 'updatedAt', fields: 'updatedAt: -1' },
          { name: 'createdAt', fields: 'createdAt: -1' }
        ],
        status: 'success'
      });
      console.log('✓ Wallet indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Wallet indexes:', error.message);
      results.push({
        model: 'Wallet',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // TRANSACTION MODEL INDEXES
    console.log('Adding indexes to Transaction model...');
    try {
      Transaction.collection.dropIndexes().catch(() => {});

      Transaction.collection.createIndex({ user: 1 });
      Transaction.collection.createIndex({ status: 1 });
      Transaction.collection.createIndex({ createdAt: -1 });
      Transaction.collection.createIndex({ type: 1 });

      // Compound indexes for Transaction
      Transaction.collection.createIndex({ user: 1, status: 1, createdAt: -1 });
      Transaction.collection.createIndex({ user: 1, type: 1, createdAt: -1 });

      results.push({
        model: 'Transaction',
        indexes: [
          { name: 'user', fields: 'user: 1' },
          { name: 'status', fields: 'status: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'type', fields: 'type: 1' },
          { name: 'user_status_date', fields: 'user: 1, status: 1, createdAt: -1', type: 'compound' },
          { name: 'user_type_date', fields: 'user: 1, type: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Transaction indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Transaction indexes:', error.message);
      results.push({
        model: 'Transaction',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // COUPON MODEL INDEXES
    console.log('Adding indexes to Coupon model...');
    try {
      Coupon.collection.dropIndexes().catch(() => {});

      Coupon.collection.createIndex({ code: 1 }, { unique: true });
      Coupon.collection.createIndex({ isActive: 1 });
      Coupon.collection.createIndex({ expiresAt: 1 });
      Coupon.collection.createIndex({ createdAt: -1 });

      results.push({
        model: 'Coupon',
        indexes: [
          { name: 'code_unique', fields: 'code: 1', type: 'unique' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'expiresAt', fields: 'expiresAt: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' }
        ],
        status: 'success'
      });
      console.log('✓ Coupon indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Coupon indexes:', error.message);
      results.push({
        model: 'Coupon',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // PROMO CODE MODEL INDEXES - Commented out as model doesn't exist
    // console.log('Adding indexes to PromoCode model...');
    // PromoCode model is not exported from models/index.ts

    // OFFER MODEL INDEXES
    console.log('Adding indexes to Offer model...');
    try {
      Offer.collection.dropIndexes().catch(() => {});

      Offer.collection.createIndex({ title: 1 });
      Offer.collection.createIndex({ store: 1 });
      Offer.collection.createIndex({ isActive: 1 });
      Offer.collection.createIndex({ expiresAt: 1 });
      Offer.collection.createIndex({ createdAt: -1 });

      results.push({
        model: 'Offer',
        indexes: [
          { name: 'title', fields: 'title: 1' },
          { name: 'store', fields: 'store: 1' },
          { name: 'isActive', fields: 'isActive: 1' },
          { name: 'expiresAt', fields: 'expiresAt: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' }
        ],
        status: 'success'
      });
      console.log('✓ Offer indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Offer indexes:', error.message);
      results.push({
        model: 'Offer',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // MESSAGE & CONVERSATION MODEL INDEXES - Commented out as models don't exist
    // console.log('Adding indexes to Message and Conversation models...');
    // Message and Conversation models are not exported from models/index.ts

    // ACTIVITY MODEL INDEXES
    console.log('Adding indexes to Activity model...');
    try {
      Activity.collection.dropIndexes().catch(() => {});

      Activity.collection.createIndex({ user: 1 });
      Activity.collection.createIndex({ type: 1 });
      Activity.collection.createIndex({ createdAt: -1 });
      Activity.collection.createIndex({ user: 1, createdAt: -1 });

      results.push({
        model: 'Activity',
        indexes: [
          { name: 'user', fields: 'user: 1' },
          { name: 'type', fields: 'type: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'user_date', fields: 'user: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ Activity indexes added');
    } catch (error: any) {
      console.error('✗ Error adding Activity indexes:', error.message);
      results.push({
        model: 'Activity',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // COIN TRANSACTION MODEL INDEXES
    console.log('Adding indexes to CoinTransaction model...');
    try {
      CoinTransaction.collection.dropIndexes().catch(() => {});

      CoinTransaction.collection.createIndex({ user: 1 });
      CoinTransaction.collection.createIndex({ type: 1 });
      CoinTransaction.collection.createIndex({ createdAt: -1 });
      CoinTransaction.collection.createIndex({ user: 1, createdAt: -1 });

      results.push({
        model: 'CoinTransaction',
        indexes: [
          { name: 'user', fields: 'user: 1' },
          { name: 'type', fields: 'type: 1' },
          { name: 'createdAt', fields: 'createdAt: -1' },
          { name: 'user_date', fields: 'user: 1, createdAt: -1', type: 'compound' }
        ],
        status: 'success'
      });
      console.log('✓ CoinTransaction indexes added');
    } catch (error: any) {
      console.error('✗ Error adding CoinTransaction indexes:', error.message);
      results.push({
        model: 'CoinTransaction',
        indexes: [],
        status: 'error',
        error: error.message
      });
    }

    // PRICE ALERT MODEL INDEXES - Commented out as model doesn't exist
    // console.log('Adding indexes to PriceAlert model...');
    // PriceAlert model is not exported from models/index.ts

    // REFERRAL MODEL INDEXES - Commented out as model doesn't exist
    // console.log('Adding indexes to Referral model...');
    // Referral model is not exported from models/index.ts

    // CASHBACK MODEL INDEXES - Commented out as model doesn't exist
    // console.log('Adding indexes to Cashback model...');
    // Cashback model is not exported from models/index.ts

    console.log('\n' + '='.repeat(80));
    console.log('DATABASE INDEX MIGRATION COMPLETE');
    console.log('='.repeat(80) + '\n');

    // Print summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Summary: ${successCount} models indexed successfully, ${errorCount} with errors\n`);

    // Print detailed results
    console.log('Detailed Results:\n');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.model}`);
      if (result.status === 'success') {
        console.log(`   Status: ✓ SUCCESS`);
        console.log(`   Indexes added: ${result.indexes.length}`);
        result.indexes.forEach(idx => {
          const type = idx.type ? ` (${idx.type})` : '';
          console.log(`     - ${idx.name}: ${idx.fields}${type}`);
        });
      } else {
        console.log(`   Status: ✗ ERROR`);
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

addIndexes();
