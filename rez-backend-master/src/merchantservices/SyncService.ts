import { ProductModel, MProduct } from '../models/MerchantProduct';
import { logger } from '../config/logger';
import { OrderModel } from '../models/MerchantOrder';
import { CashbackModel } from '../models/Cashback';
import { MerchantModel } from '../models/Merchant';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

export interface SyncConfig {
  merchantId: string;
  lastSync?: Date;
  syncTypes: ('products' | 'orders' | 'cashback' | 'merchant')[];
  batchSize: number;
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  merchantId: string;
  syncedAt: Date;
  results: {
    products?: {
      created: number;
      updated: number;
      deleted: number;
      errors: number;
    };
    orders?: {
      created: number;
      updated: number;
      errors: number;
    };
    cashback?: {
      created: number;
      updated: number;
      errors: number;
    };
    merchant?: {
      updated: boolean;
      errors: number;
    };
  };
  errors: string[];
  duration: number;
}

export interface CustomerAppProduct {
  merchantId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  availability: {
    inStock: boolean;
    quantity?: number;
    estimatedDelivery?: string;
  };
  cashback: {
    percentage: number;
    maxAmount?: number;
    conditions?: string[];
  };
  ratings: {
    average: number;
    count: number;
  };
  attributes: {
    size?: string[];
    color?: string[];
    material?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: any;
  };
  seo: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncService {
  private static activeSyncs = new Map<string, boolean>();
  private static syncHistory: SyncResult[] = [];

  // Main sync method
  static async syncToCustomerApp(config: SyncConfig): Promise<SyncResult> {
    const syncId = `sync_${config.merchantId}_${Date.now()}`;
    const startTime = Date.now();

    // Check if sync is already in progress
    if (this.activeSyncs.get(config.merchantId)) {
      throw new Error('Sync already in progress for this merchant');
    }

    this.activeSyncs.set(config.merchantId, true);

    const result: SyncResult = {
      success: false,
      syncId,
      merchantId: config.merchantId,
      syncedAt: new Date(),
      results: {},
      errors: [],
      duration: 0,
    };

    try {
      logger.info(`🔄 Starting sync ${syncId} for merchant ${config.merchantId}`);

      // Sync products
      if (config.syncTypes.includes('products')) {
        result.results.products = await this.syncProducts(config);
      }

      // Sync orders
      if (config.syncTypes.includes('orders')) {
        result.results.orders = await this.syncOrders(config);
      }

      // Sync cashback
      if (config.syncTypes.includes('cashback')) {
        result.results.cashback = await this.syncCashback(config);
      }

      // Sync merchant profile
      if (config.syncTypes.includes('merchant')) {
        result.results.merchant = await this.syncMerchantProfile(config);
      }

      result.success = true;
      logger.info(`✅ Sync ${syncId} completed successfully`);

    } catch (error) {
      logger.error(`❌ Sync ${syncId} failed:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      result.duration = Date.now() - startTime;
      this.activeSyncs.delete(config.merchantId);
      this.syncHistory.push(result);
      
      // Keep only last 50 sync results
      if (this.syncHistory.length > 50) {
        this.syncHistory = this.syncHistory.slice(-50);
      }
    }

    return result;
  }

  // Sync products to customer app format
  private static async syncProducts(config: SyncConfig) {
    const result = { created: 0, updated: 0, deleted: 0, errors: 0 };

    try {
      // Get all products for merchant
      const products = await ProductModel.findByMerchantId(config.merchantId);
      
      const customerAppProducts: CustomerAppProduct[] = products.map(product => ({
        merchantId: config.merchantId,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.compareAtPrice,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        images: product.images.map(img => img.url),
        availability: {
          inStock: product.inventory.trackInventory ? product.inventory.stock > 0 : true,
          quantity: product.inventory.trackInventory ? product.inventory.stock : undefined,
          estimatedDelivery: product.shipping?.estimatedDelivery,
        },
        cashback: {
          percentage: product.cashback.percentage,
          maxAmount: product.cashback.maxAmount,
          conditions: product.cashback.conditions || [],
        },
        ratings: {
          average: product.ratings?.average || 0,
          count: product.ratings?.count || 0,
        },
        attributes: {
          size: product.variants?.filter(v => v.option === 'Size').map(v => v.value) || [],
          color: product.variants?.filter(v => v.option === 'Color').map(v => v.value) || [],
          material: product.attributes?.material,
          weight: product.attributes?.weight,
          dimensions: product.attributes?.dimensions,
          ...product.attributes || {},
        },
        seo: {
          slug: product.slug || '',
          metaTitle: product.seo?.title || '',
          metaDescription: product.seo?.description || '',
          keywords: product.seo?.keywords || [],
        },
        isActive: product.status === 'active',
        isFeatured: product.isFeatured || false,
        sortOrder: product.sortOrder || 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));

      // Sync directly to database
      await this.syncToDatabase('products', customerAppProducts, config);

      result.created = products.filter(p => !config.lastSync || p.createdAt > config.lastSync).length;
      result.updated = products.filter(p => config.lastSync && p.updatedAt > config.lastSync && p.createdAt <= config.lastSync).length;

      logger.info(`📦 Synced ${products.length} products to customer app`);

    } catch (error) {
      logger.error('Error syncing products:', error);
      result.errors++;
    }

    return result;
  }

  // Sync orders
  private static async syncOrders(config: SyncConfig) {
    const result = { created: 0, updated: 0, errors: 0 };

    try {
      const orders = await OrderModel.findByMerchantId(config.merchantId);
      
      // Filter orders since last sync
      const ordersToSync = config.lastSync 
        ? orders.filter(order => order.updatedAt > config.lastSync!)
        : orders;

      // Format orders for customer app
      const customerAppOrders = ordersToSync.map(order => ({
        merchantId: config.merchantId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        status: order.status,
        timeline: order.timeline,
        total: order.total,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        estimatedDelivery: order.estimatedDelivery,
        tracking: order.tracking,
        updatedAt: order.updatedAt,
      }));

      await this.syncToDatabase('orders', customerAppOrders, config);

      result.created = ordersToSync.filter(o => !config.lastSync || o.createdAt > config.lastSync).length;
      result.updated = ordersToSync.filter(o => config.lastSync && o.updatedAt > config.lastSync && o.createdAt <= config.lastSync).length;

      logger.info(`📋 Synced ${ordersToSync.length} orders to customer app`);

    } catch (error) {
      logger.error('Error syncing orders:', error);
      result.errors++;
    }

    return result;
  }

  // Sync cashback data
  private static async syncCashback(config: SyncConfig) {
    const result = { created: 0, updated: 0, errors: 0 };

    try {
      const cashbackRequests = await CashbackModel.findByMerchantId(config.merchantId);
      
      const cashbackToSync = config.lastSync 
        ? cashbackRequests.filter(request => request.updatedAt > config.lastSync!)
        : cashbackRequests;

      // Format cashback for customer app
      const customerAppCashback = cashbackToSync.map(request => ({
        merchantId: config.merchantId,
        requestId: request.id,
        customerId: request.customer.id,
        orderId: request.order.id,
        status: request.status,
        requestedAmount: request.requestedAmount,
        approvedAmount: request.approvedAmount,
        paidAmount: request.paidAmount,
        paidAt: request.paidAt,
        timeline: request.timeline,
        updatedAt: request.updatedAt,
      }));

      await this.syncToDatabase('cashback', customerAppCashback, config);

      result.created = cashbackToSync.filter(c => !config.lastSync || c.createdAt > config.lastSync).length;
      result.updated = cashbackToSync.filter(c => config.lastSync && c.updatedAt > config.lastSync && c.createdAt <= config.lastSync).length;

      logger.info(`💰 Synced ${cashbackToSync.length} cashback requests to customer app`);

    } catch (error) {
      logger.error('Error syncing cashback:', error);
      result.errors++;
    }

    return result;
  }

  // Sync merchant profile
  private static async syncMerchantProfile(config: SyncConfig) {
    const result = { updated: false, errors: 0 };

    try {
      const merchant = await MerchantModel.findById(config.merchantId);
      
      if (merchant) {
        // Format merchant data for customer app
        const customerAppMerchant = {
          merchantId: merchant.id,
          businessName: merchant.businessName,
          displayName: merchant.displayName,
          description: merchant.description,
          logo: merchant.logo,
          coverImage: merchant.coverImage,
          address: merchant.address,
          contact: merchant.contact,
          socialMedia: merchant.socialMedia,
          businessHours: merchant.businessHours,
          deliveryOptions: merchant.deliveryOptions,
          paymentMethods: merchant.paymentMethods,
          policies: merchant.policies,
          ratings: merchant.ratings,
          isActive: merchant.status === 'active',
          isFeatured: merchant.isFeatured,
          categories: merchant.categories,
          tags: merchant.tags,
          updatedAt: merchant.updatedAt,
        };

        await this.syncToDatabase('merchant', customerAppMerchant, config);
        result.updated = true;

        logger.info(`🏪 Synced merchant profile to customer app`);
      }

    } catch (error) {
      logger.error('Error syncing merchant profile:', error);
      result.errors++;
    }

    return result;
  }

  // Direct database sync to shared MongoDB
  private static async syncToDatabase(type: string, data: any, config: SyncConfig) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let syncedCount = 0;

      switch(type) {
        case 'products':
          syncedCount = await this.syncProductsToDatabase(data, config.merchantId, session);
          break;
        case 'merchant':
          syncedCount = await this.syncMerchantToDatabase(data, config.merchantId, session);
          break;
        case 'orders':
        case 'cashback':
          // Orders and cashback are read-only from merchant side, no sync needed
          logger.info(`ℹ️ ${type} sync skipped - managed by user backend`);
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      await session.commitTransaction();
      logger.info(`✅ Successfully synced ${syncedCount} ${type} records to database`);

      // Emit Socket.IO event if available
      if (global.io) {
        global.io.emit('data_synced', {
          type,
          merchantId: config.merchantId,
          count: syncedCount,
          timestamp: new Date()
        });
      }

      return { success: true, synced: syncedCount };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`❌ Database sync failed for ${type}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Sync products to user-side Product model
  private static async syncProductsToDatabase(
    customerAppProducts: CustomerAppProduct[],
    merchantId: string,
    session: any
  ): Promise<number> {
    let syncedCount = 0;

    // Find the store for this merchant
    const store = await Store.findOne({ merchantId: new mongoose.Types.ObjectId(merchantId) }).session(session);

    if (!store) {
      throw new Error(`Store not found for merchant ${merchantId}`);
    }

    for (const merchantProduct of customerAppProducts) {
      try {
        // Find or create category
        let category = await Category.findOne({ name: merchantProduct.category }).session(session);
        if (!category) {
          const categories = await Category.create([{
            name: merchantProduct.category,
            slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
            type: 'product',
            isActive: true
          }], { session });
          category = categories[0];
        }

        // Transform merchant product to user-side product format
        const productData = {
          name: merchantProduct.name,
          slug: merchantProduct.seo.slug || merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
          description: merchantProduct.description,
          category: category._id,
          store: store._id,
          brand: merchantProduct.brand,
          sku: merchantProduct.productId, // Use productId as SKU for matching
          barcode: merchantProduct.attributes?.barcode,
          images: merchantProduct.images || [],
          pricing: {
            original: merchantProduct.originalPrice || merchantProduct.price,
            selling: merchantProduct.price,
            currency: 'INR',
            discount: merchantProduct.originalPrice ?
              Math.round(((merchantProduct.originalPrice - merchantProduct.price) / merchantProduct.originalPrice) * 100) : 0
          },
          inventory: {
            stock: merchantProduct.availability.quantity || 0,
            isAvailable: merchantProduct.availability.inStock,
            lowStockThreshold: 5,
            unlimited: false
          },
          ratings: {
            average: merchantProduct.ratings.average || 0,
            count: merchantProduct.ratings.count || 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },
          specifications: [],
          tags: Object.keys(merchantProduct.attributes).filter(key =>
            Array.isArray(merchantProduct.attributes[key])
          ).flatMap(key => merchantProduct.attributes[key]),
          seo: {
            title: merchantProduct.seo.metaTitle || merchantProduct.name,
            description: merchantProduct.seo.metaDescription || merchantProduct.description,
            keywords: merchantProduct.seo.keywords || []
          },
          analytics: {
            views: 0,
            purchases: 0,
            conversions: 0,
            wishlistAdds: 0,
            shareCount: 0,
            returnRate: 0,
            avgRating: merchantProduct.ratings.average || 0
          },
          cashback: {
            percentage: merchantProduct.cashback.percentage || 0,
            maxAmount: merchantProduct.cashback.maxAmount,
            minPurchase: 0
          },
          deliveryInfo: {
            estimatedDays: merchantProduct.availability.estimatedDelivery || '2-3 days',
            freeShippingThreshold: 500,
            expressAvailable: false
          },
          isActive: merchantProduct.isActive,
          isFeatured: merchantProduct.isFeatured,
          isDigital: false,
          weight: merchantProduct.attributes?.weight ? parseFloat(merchantProduct.attributes.weight) : undefined,
          dimensions: merchantProduct.attributes?.dimensions ? {
            length: 0,
            width: 0,
            height: 0,
            unit: 'cm' as 'cm'
          } : undefined,
          productType: 'product' as 'product'
        };

        // Upsert product (update if exists, create if not)
        await Product.findOneAndUpdate(
          { sku: merchantProduct.productId },
          productData,
          { upsert: true, new: true, session }
        );

        syncedCount++;
        logger.info(`📦 Synced product: ${merchantProduct.name} (SKU: ${merchantProduct.productId})`);
      } catch (error) {
        logger.error(`❌ Error syncing product ${merchantProduct.name}:`, error);
        // Continue with other products instead of failing entire sync
      }
    }

    return syncedCount;
  }

  // Sync merchant profile to user-side Store model
  private static async syncMerchantToDatabase(
    merchantData: any,
    merchantId: string,
    session: any
  ): Promise<number> {
    try {
      // Find or create category for the store
      let category = await Category.findOne({ name: 'General' }).session(session);
      if (!category) {
        const categories = await Category.create([{
          name: 'General',
          slug: 'general',
          type: 'store',
          isActive: true
        }], { session });
        category = categories[0];
      }

      const storeData = {
        name: merchantData.businessName || merchantData.displayName,
        slug: (merchantData.businessName || merchantData.displayName).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
        description: merchantData.description,
        logo: merchantData.logo,
        banner: merchantData.coverImage,
        category: category._id,
        location: {
          address: merchantData.address?.street || '',
          city: merchantData.address?.city || '',
          state: merchantData.address?.state,
          pincode: merchantData.address?.zipCode,
          coordinates: merchantData.address?.coordinates,
          deliveryRadius: 5
        },
        contact: {
          phone: merchantData.contact?.phone,
          email: merchantData.contact?.email,
          website: merchantData.contact?.website,
          whatsapp: merchantData.contact?.whatsapp
        },
        ratings: {
          average: merchantData.ratings?.average || 0,
          count: merchantData.ratings?.count || 0,
          distribution: merchantData.ratings?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        offers: {
          cashback: 5,
          isPartner: merchantData.isFeatured || false,
          partnerLevel: merchantData.isFeatured ? 'gold' : 'bronze'
        },
        operationalInfo: {
          hours: merchantData.businessHours || {},
          deliveryTime: '30-45 mins',
          minimumOrder: 0,
          deliveryFee: 0,
          acceptsWalletPayment: true,
          paymentMethods: merchantData.paymentMethods || ['cash', 'card', 'upi']
        },
        deliveryCategories: {
          fastDelivery: false,
          budgetFriendly: false,
          ninetyNineStore: false,
          premium: false,
          organic: false,
          alliance: false,
          lowestPrice: false,
          mall: false,
          cashStore: false
        },
        analytics: {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          repeatCustomers: 0
        },
        tags: merchantData.tags || [],
        isActive: merchantData.isActive,
        isFeatured: merchantData.isFeatured || false,
        isVerified: true,
        merchantId: new mongoose.Types.ObjectId(merchantId)
      };

      // Upsert store
      await Store.findOneAndUpdate(
        { merchantId: new mongoose.Types.ObjectId(merchantId) },
        storeData,
        { upsert: true, new: true, session }
      );

      logger.info(`🏪 Synced merchant profile: ${merchantData.businessName}`);
      return 1;
    } catch (error) {
      logger.error(`❌ Error syncing merchant profile:`, error);
      throw error;
    }
  }

  // Get sync status for a merchant
  static getSyncStatus(merchantId: string) {
    const isActive = this.activeSyncs.get(merchantId) || false;
    const lastSync = this.syncHistory
      .filter(sync => sync.merchantId === merchantId)
      .sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())[0];

    return {
      isActive,
      lastSync: lastSync || null,
      nextScheduledSync: this.getNextScheduledSync(merchantId),
    };
  }

  // Get sync history for a merchant
  static getSyncHistory(merchantId: string, limit: number = 10) {
    return this.syncHistory
      .filter(sync => sync.merchantId === merchantId)
      .sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())
      .slice(0, limit);
  }

  // Schedule automatic sync
  static scheduleAutoSync(merchantId: string, intervalMinutes: number = 15) {
    // Clear existing interval if any
    this.clearAutoSync(merchantId);

    const interval = setInterval(async () => {
      try {
        await this.syncToCustomerApp({
          merchantId,
          lastSync: this.getLastSyncDate(merchantId),
          syncTypes: ['products', 'orders', 'cashback', 'merchant'],
          batchSize: 100,
        });
      } catch (error) {
        logger.error(`Auto-sync failed for merchant ${merchantId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);

    // Store interval reference (in real app, use a proper job scheduler)
    (global as any).syncIntervals = (global as any).syncIntervals || new Map();
    (global as any).syncIntervals.set(merchantId, interval);

    logger.info(`⏰ Scheduled auto-sync for merchant ${merchantId} every ${intervalMinutes} minutes`);
  }

  // Clear auto sync
  static clearAutoSync(merchantId: string) {
    if ((global as any).syncIntervals?.has(merchantId)) {
      clearInterval((global as any).syncIntervals.get(merchantId));
      (global as any).syncIntervals.delete(merchantId);
      logger.info(`⏹️ Cleared auto-sync for merchant ${merchantId}`);
    }
  }

  // Get last sync date for a merchant
  private static getLastSyncDate(merchantId: string): Date | undefined {
    const lastSync = this.syncHistory
      .filter(sync => sync.merchantId === merchantId && sync.success)
      .sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())[0];
    
    return lastSync?.syncedAt;
  }

  // Get next scheduled sync time
  private static getNextScheduledSync(merchantId: string): Date | null {
    // In a real implementation, this would check the job scheduler
    // For now, return estimated next sync based on interval
    const lastSync = this.getLastSyncDate(merchantId);
    if (lastSync) {
      return new Date(lastSync.getTime() + 15 * 60 * 1000); // 15 minutes
    }
    return null;
  }

  // Force full sync (re-sync all data)
  static async forceFullSync(merchantId: string): Promise<SyncResult> {
    return this.syncToCustomerApp({
      merchantId,
      lastSync: undefined, // Force full sync
      syncTypes: ['products', 'orders', 'cashback', 'merchant'],
      batchSize: 100,
    });
  }

  // Get sync statistics
  static getSyncStatistics() {
    const stats = {
      totalSyncs: this.syncHistory.length,
      successfulSyncs: this.syncHistory.filter(s => s.success).length,
      failedSyncs: this.syncHistory.filter(s => !s.success).length,
      averageDuration: 0,
      activeSyncs: this.activeSyncs.size,
      merchantsWithAutoSync: (global as any).syncIntervals?.size || 0,
    };

    if (stats.totalSyncs > 0) {
      stats.averageDuration = this.syncHistory.reduce((sum, sync) => sum + sync.duration, 0) / stats.totalSyncs;
    }

    return stats;
  }
}