import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import {
  sendSuccess,
  sendBadRequest,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import stockSocketService from '../services/stockSocketService';
import { pct } from '../utils/currency';
import activityService from '../services/activityService';
import couponService from '../services/couponService';
import gamificationEventBus from '../events/gamificationEventBus';
import { walletService } from '../services/walletService';
import { Wallet } from '../models/Wallet';
import SmartSpendItem from '../models/SmartSpendItem';
import { CHECKOUT_CONFIG } from '../config/checkoutConfig';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { MainCategorySlug, CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../config/logger';
import redisService from '../services/redisService';
import { CacheInvalidator } from '../utils/cacheHelper';
import merchantNotificationService from '../services/merchantNotificationService';
import orderSocketService from '../services/orderSocketService';

// ─── Category root slug helpers (shared with orderUpdateController) ─────────

export const VALID_CATEGORY_SLUGS: MainCategorySlug[] = [
  'food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports',
  'healthcare', 'fashion', 'education-learning', 'home-services',
  'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics',
];

const CATEGORY_ROOT_CACHE_KEY = 'cache:category-root-map';
const CATEGORY_ROOT_CACHE_TTL = 300; // 5 minutes
let localCategoryCache: Map<string, string | null> | null = null;
let localCacheTTL = 0;

/**
 * Build or retrieve a map of categoryId -> root MainCategory slug.
 * Cached in Redis (5min) with in-memory fallback.
 */
export async function getCategoryRootMap(): Promise<Map<string, string | null>> {
  // Check local memory cache first
  if (localCategoryCache && Date.now() < localCacheTTL) {
    return localCategoryCache;
  }

  // Try Redis cache
  try {
    const cached = await redisService.get<[string, string | null][]>(CATEGORY_ROOT_CACHE_KEY);
    if (cached) {
      localCategoryCache = new Map<string, string | null>(cached);
      localCacheTTL = Date.now() + CATEGORY_ROOT_CACHE_TTL * 1000;
      return localCategoryCache;
    }
  } catch { /* Redis unavailable — build from DB */ }

  // Build from DB: load all categories in one query
  const allCategories = await Category.find({}).select('slug parentCategory').lean();
  const catMap = new Map<string, { slug: string; parentId: string | null }>();
  for (const cat of allCategories) {
    catMap.set(cat._id.toString(), {
      slug: cat.slug,
      parentId: cat.parentCategory ? cat.parentCategory.toString() : null,
    });
  }

  // Resolve each category to its root slug
  const rootMap = new Map<string, string | null>();
  for (const [catId] of catMap) {
    let currentId: string | null = catId;
    let depth = 5;
    let rootSlug: string | null = null;

    while (currentId && depth-- > 0) {
      const entry = catMap.get(currentId);
      if (!entry) break;
      if (!entry.parentId) {
        // Root category found
        rootSlug = VALID_CATEGORY_SLUGS.includes(entry.slug as MainCategorySlug) ? entry.slug : null;
        break;
      }
      currentId = entry.parentId;
    }
    rootMap.set(catId, rootSlug);
  }

  // Cache in Redis + memory
  try {
    await redisService.set(CATEGORY_ROOT_CACHE_KEY, [...rootMap], CATEGORY_ROOT_CACHE_TTL);
  } catch { /* Redis unavailable */ }
  localCategoryCache = rootMap;
  localCacheTTL = Date.now() + CATEGORY_ROOT_CACHE_TTL * 1000;

  return rootMap;
}

/**
 * Get the root MainCategory slug for a store.
 * Uses cached category hierarchy (1 DB query for all categories, cached 5min).
 */
export async function getStoreCategorySlug(storeId: string): Promise<MainCategorySlug | null> {
  try {
    const store = await Store.findById(storeId).select('category').lean();
    if (!store?.category) return null;

    const rootMap = await getCategoryRootMap();
    const rootSlug = rootMap.get(store.category.toString());
    return (rootSlug as MainCategorySlug) || null;
  } catch (err) {
    logger.error('[ORDER] Error getting store category slug:', err);
    return null;
  }
}

// ─── createOrder handler ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order from cart
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryAddress
 *               - paymentMethod
 *             properties:
 *               deliveryAddress:
 *                 type: object
 *                 required: [name, phone, addressLine1, city, state, pincode]
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   addressLine1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cod, wallet, razorpay, upi, card, netbanking, stripe]
 *               specialInstructions:
 *                 type: string
 *               couponCode:
 *                 type: string
 *               voucherCode:
 *                 type: string
 *               coinsUsed:
 *                 type: object
 *                 description: Coin amounts to deduct from wallet
 *                 properties:
 *                   rezCoins:
 *                     type: number
 *                     description: REZ coins to use
 *                   promoCoins:
 *                     type: number
 *                     description: Promo coins to use
 *                   storePromoCoins:
 *                     type: number
 *                     description: Store promo coins to use
 *               storeId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               idempotencyKey:
 *                 type: string
 *               fulfillmentType:
 *                 type: string
 *                 enum: [delivery, pickup, dine_in]
 *               fulfillmentDetails:
 *                 type: object
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (empty cart, invalid payment, etc.)
 *       401:
 *         description: Unauthorized
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deliveryAddress, paymentMethod, specialInstructions, couponCode, voucherCode, coinsUsed, storeId, items: requestItems, redemptionCode, offerRedemptionCode, lockFeeDiscount: clientLockFeeDiscount, idempotencyKey, pickId, fulfillmentType: reqFulfillmentType, fulfillmentDetails: reqFulfillmentDetails } = req.body;
  const fulfillmentType = reqFulfillmentType || 'delivery';

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Idempotency check: prevent duplicate orders from network retries
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ user: userId, idempotencyKey }).session(session).lean();
      if (existingOrder) {
        await session.abortTransaction();
        session.endSession();
        return sendSuccess(res, { order: existingOrder }, 'Order already exists');
      }
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name image images isActive inventory'
      })
      .populate({
        path: 'items.store',
        select: 'name logo'
      })
      .session(session).lean();

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Cart is empty');
    }

    // Filter cart items by storeId if provided (for multi-store order splitting)
    let itemsToProcess = cart.items;
    if (storeId) {
      itemsToProcess = cart.items.filter((item: any) => {
        const itemStoreId = typeof item.store === 'object' ? item.store._id?.toString() : item.store?.toString();
        return itemStoreId === storeId;
      });
      if (itemsToProcess.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'No items found for the specified store');
      }
    }

    // Also support filtering by specific product IDs (for more granular control)
    if (requestItems && Array.isArray(requestItems) && requestItems.length > 0) {
      const productIds = requestItems.map((item: any) => item.product?.toString() || item.id?.toString()).filter(Boolean);
      if (productIds.length > 0) {
        itemsToProcess = itemsToProcess.filter((item: any) => {
          const itemProductId = typeof item.product === 'object' ? item.product._id?.toString() : item.product?.toString();
          return productIds.includes(itemProductId);
        });
      }
    }

    // Create a virtual cart object with filtered items for order processing
    // Cart is fetched with .lean() so it's already a plain JS object
    const orderCart = {
      ...cart,
      items: itemsToProcess
    };

    // Validate payment method
    const validPaymentMethods = ['cod', 'wallet', 'razorpay', 'upi', 'card', 'netbanking', 'stripe'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, `Invalid payment method. Allowed: ${validPaymentMethods.join(', ')}`);
    }

    // Validate address fields based on fulfillment type.
    // Delivery requires full address; non-delivery accepts minimal address.
    const isDeliveryOrder = fulfillmentType === 'delivery';
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (isDeliveryOrder) {
      if (!deliveryAddress) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Delivery address is required');
      }

      const requiredAddressFields = ['name', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
      const missingFields = requiredAddressFields.filter(field => !deliveryAddress[field]);
      if (missingFields.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Missing required address fields: ${missingFields.join(', ')}`);
      }

      const cleanPhone = String(deliveryAddress.phone || '').replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid phone number format');
      }

      if (!pincodeRegex.test(String(deliveryAddress.pincode || ''))) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid pincode format (must be 6 digits)');
      }
    } else if (deliveryAddress) {
      const requiredNonDeliveryFields = ['name', 'phone'];
      const missingNonDeliveryFields = requiredNonDeliveryFields.filter(field => !deliveryAddress[field]);
      if (missingNonDeliveryFields.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Missing required address fields: ${missingNonDeliveryFields.join(', ')}`);
      }

      const cleanPhone = String(deliveryAddress.phone || '').replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid phone number format');
      }

      if (deliveryAddress.pincode && !pincodeRegex.test(String(deliveryAddress.pincode))) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid pincode format (must be 6 digits)');
      }
    }

    // Validate all items belong to the same store (using filtered orderCart)
    const storeIds = new Set(orderCart.items.map((item: any) => {
      const store = item.store;
      return typeof store === 'object' ? store._id?.toString() : store?.toString();
    }).filter(Boolean));

    if (storeIds.size > 1) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'All items must be from the same store. Please create separate orders for different stores.');
    }

    // Validate coin balances if coins are being used
    if (coinsUsed && (coinsUsed.rezCoins > 0 || coinsUsed.storePromoCoins > 0 || coinsUsed.promoCoins > 0)) {
      // Validate REZ coins
      if (coinsUsed.rezCoins > 0) {
        const coinService = require('../services/coinService').default;
        const userCoinBalance = await coinService.getCoinBalance(userId);
        if (userCoinBalance < coinsUsed.rezCoins) {
          await session.abortTransaction();
          session.endSession();
          logger.error('[CREATE ORDER] Insufficient REZ coin balance:', {
            required: coinsUsed.rezCoins,
            available: userCoinBalance
          });
          return sendBadRequest(res, `Insufficient REZ coin balance. Required: ${coinsUsed.rezCoins}, Available: ${userCoinBalance}`);
        }
      }

      // Load wallet ONCE for both promo and branded coin validations (avoids duplicate DB query)
      const needsWalletValidation = coinsUsed.promoCoins > 0 || coinsUsed.storePromoCoins > 0;
      const validationWallet = needsWalletValidation
        ? await Wallet.findOne({ user: userId }).session(session).lean()
        : null;

      // Validate promo coins (reuses validationWallet)
      if (coinsUsed.promoCoins > 0) {
        const promoCoin = (validationWallet as any)?.coins?.find((c: any) => c.type === 'promo');
        const promoBalance = promoCoin?.amount || 0;
        if (promoBalance < coinsUsed.promoCoins) {
          await session.abortTransaction();
          session.endSession();
          logger.error('[CREATE ORDER] Insufficient promo coin balance:', {
            required: coinsUsed.promoCoins,
            available: promoBalance
          });
          return sendBadRequest(res, `Insufficient promo coin balance. Required: ${coinsUsed.promoCoins}, Available: ${promoBalance}`);
        }
        // Pre-checkout expiry check: reject if promo coins have expired
        // Check legacy wallet field
        const promoExpiryRaw = promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate;
        if (promoExpiryRaw) {
          const expDate = new Date(promoExpiryRaw as string | number | Date);
          if (expDate <= new Date()) {
            await session.abortTransaction();
            session.endSession();
            return sendBadRequest(res, 'Your promo coins have expired. Please refresh your wallet balance.');
          }
        }
        // Also check CoinTransaction-based expiry (new system)
        const expiredPromoTx = await CoinTransaction.findOne({
          user: userId,
          type: 'earned',
          'metadata.coinType': 'promo',
          expiresAt: { $lte: new Date() },
          'metadata.isExpired': { $ne: true },
        }).session(session).lean();
        if (expiredPromoTx) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'Some of your promo coins have expired. Please refresh your wallet balance.');
        }
      }

      // Validate store promo coins (reuses validationWallet — no extra DB query)
      if (coinsUsed.storePromoCoins > 0) {
        // Get the store from the first order item - now using branded coins
        const firstItem = orderCart.items[0];
        const orderStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (orderStoreId) {
          const brandedCoin = (validationWallet as any)?.brandedCoins?.find(
            (bc: any) => bc.merchantId?.toString() === orderStoreId.toString()
          );
          const brandedBalance = brandedCoin?.amount || 0;

          if (brandedBalance < coinsUsed.storePromoCoins) {
            await session.abortTransaction();
            session.endSession();
            logger.error('[CREATE ORDER] Insufficient branded coin balance:', {
              required: coinsUsed.storePromoCoins,
              available: brandedBalance
            });
            return sendBadRequest(res, `Insufficient store coin balance. Required: ${coinsUsed.storePromoCoins}, Available: ${brandedBalance}`);
          }
        }
      }
    }

    // Validate products availability and build order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for atomic operation

    for (const cartItem of orderCart.items) {
      const product = cartItem.product as any;
      const store = cartItem.store as any;

      // Verify cart price against current product price (prevent stale/manipulated prices)
      const currentPrice = product.pricing?.selling || (typeof product.price === 'number' ? product.price : product.price?.current) || 0;
      const cartPrice = cartItem.price || 0;
      if (currentPrice > 0 && cartPrice > 0) {
        const priceDiff = Math.abs(currentPrice - cartPrice) / currentPrice;
        if (priceDiff > 0.05) { // >5% difference
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Price for "${product.name}" has changed from ₹${cartPrice} to ₹${currentPrice}. Please refresh your cart.`);
        }
      }

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        logger.error('[CREATE ORDER] Product is null/undefined for cart item');
        return sendBadRequest(res, 'Invalid product in cart');
      }

      if (!store) {
        await session.abortTransaction();
        session.endSession();
        logger.error('[CREATE ORDER] Store is null/undefined for product:', product.name);
        return sendBadRequest(res, `Product "${product.name}" has no associated store`);
      }

      if (!product.isActive) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Product "${product.name}" is not available`);
      }

      // Check stock availability and prepare atomic update
      const requestedQuantity = cartItem.quantity;
      let availableStock = 0;
      let updateQuery: any = {};
      let stockCheckQuery: any = { _id: product._id };

      // Skip stock deduction for unlimited products (digital goods, etc.)
      if (product.inventory?.unlimited) {
        // No stock update needed for unlimited products
      } else if (cartItem.variant && product.inventory?.variants?.length > 0) {
        // Handle variant stock
        const variant = product.inventory.variants.find((v: any) =>
          v.type === cartItem.variant?.type && v.value === cartItem.variant?.value
        );

        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Variant not found for product "${product.name}"`);
        }

        availableStock = variant.stock;
        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}" (${variant.type}: ${variant.value}). Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for variant stock AND main product stock
        const mainStock = product.inventory?.stock || 0;
        const newMainStock = mainStock - requestedQuantity;
        updateQuery = {
          $inc: {
            'inventory.variants.$[variant].stock': -requestedQuantity,
            'inventory.stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.variants'] = {
          $elemMatch: {
            type: cartItem.variant.type,
            value: cartItem.variant.value,
            stock: { $gte: requestedQuantity }
          }
        };

        // Set isAvailable to false if main stock becomes 0
        if (newMainStock <= 0) {
          updateQuery.$set = {
            'inventory.isAvailable': false
          };
        }

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: [{
            'variant.type': cartItem.variant.type,
            'variant.value': cartItem.variant.value
          }]
        });

      } else {
        // Handle main product stock
        availableStock = product.inventory?.stock || 0;
        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for main product stock
        updateQuery = {
          $inc: {
            'inventory.stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.stock'] = { $gte: requestedQuantity };

        // Set isAvailable to false if stock becomes 0
        const newStock = availableStock - requestedQuantity;
        if (newStock === 0) {
          updateQuery.$set = {
            'inventory.isAvailable': false
          };
        }

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: null
        });
      }

      // Get product image - provide default if missing
      const productImage = product.image || product.images?.[0] || 'https://via.placeholder.com/150';

      // Build order item
      const orderItem: any = {
        product: product._id,
        store: store._id,
        storeName: store.name, // Store name for display without populate
        name: product.name,
        image: productImage,
        quantity: cartItem.quantity,
        variant: cartItem.variant || undefined,
        price: cartItem.price || 0,
        originalPrice: cartItem.originalPrice || cartItem.price || 0,
        discount: cartItem.discount || 0,
        subtotal: (cartItem.price || 0) * cartItem.quantity
      };

      // Propagate Smart Spend source for enhanced Prive coin earning
      if (cartItem.metadata?.source === 'smart_spend' && cartItem.metadata?.smartSpendItemId) {
        try {
          const ssItem = await SmartSpendItem.findById(cartItem.metadata.smartSpendItemId).select('coinRewardRate').lean();
          if (ssItem) {
            orderItem.smartSpendSource = {
              smartSpendItemId: cartItem.metadata.smartSpendItemId,
              coinRewardRate: ssItem.coinRewardRate, // snapshot rate at order time
            };
          }
        } catch (ssErr) {
          // SmartSpendItem lookup failed - non-critical
        }
      }

      orderItems.push(orderItem);
    }

    // Note: Stock deduction is now deferred until payment is confirmed
    // This prevents stock being locked for failed payments
    // Stock deduction will happen in paymentService.handlePaymentSuccess()

    // BUGFIX: Calculate totals from filtered items, NOT full cart
    // For multi-store orders, each order should only include its store's items
    const filteredSubtotal = itemsToProcess.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);

    // Use filtered subtotal for this order (not full cart subtotal)
    const subtotal = filteredSubtotal;

    // Calculate tax (5%) on filtered subtotal
    const taxRate = 0.05;
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    // Calculate discount proportionally based on filtered items ratio
    const fullCartSubtotal = cart.totals.subtotal || 0;
    const discountRatio = fullCartSubtotal > 0 ? subtotal / fullCartSubtotal : 1;
    const baseDiscount = Math.round((cart.totals.discount || 0) * discountRatio * 100) / 100;

    // Calculate 15% platform fee on SUBTOTAL ONLY (excludes tax and delivery)
    const platformFeeRate = CHECKOUT_CONFIG.merchantFee?.percentage || 0.15;
    const minFee = CHECKOUT_CONFIG.merchantFee?.minFee || 2;
    const maxFee = CHECKOUT_CONFIG.merchantFee?.maxFee || 10000;
    let platformFee = Math.round(subtotal * platformFeeRate * 100) / 100;
    // Apply min/max constraints
    platformFee = Math.max(minFee, Math.min(maxFee, platformFee));
    const merchantPayout = Math.round((subtotal - platformFee) * 100) / 100;

    // Apply partner benefits to order
    const partnerBenefitsService = require('../services/partnerBenefitsService').default;

    // Calculate base delivery fee for THIS order's subtotal
    // For non-delivery fulfillment types (pickup, drive_thru, dine_in), delivery fee is 0
    const FREE_DELIVERY_THRESHOLD = 500;
    const STANDARD_DELIVERY_FEE = 50;
    const baseDeliveryFee = fulfillmentType !== 'delivery' ? 0 :
      (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE);

    const partnerBenefits = await partnerBenefitsService.applyPartnerBenefits({
      subtotal,
      deliveryFee: baseDeliveryFee, // Use calculated delivery fee for this order
      userId: userId.toString()
    });

    // Use partner-adjusted values
    const deliveryFee = partnerBenefits.deliveryFee;
    let discount = baseDiscount + partnerBenefits.birthdayDiscount;
    const cashback = partnerBenefits.cashbackAmount;

    // Apply partner voucher if provided (FIXED: Issue #4 - Voucher redemption)
    let voucherDiscount = 0;
    let voucherApplied = '';
    if (voucherCode) {
      const partnerService = require('../services/partnerService').default;
      const voucherResult = await partnerService.applyVoucher(
        userId.toString(),
        voucherCode,
        subtotal
      );

      if (voucherResult.valid) {
        voucherDiscount = voucherResult.discount;
        voucherApplied = voucherCode;
        discount += voucherDiscount;
      } else {
        // Don't fail order creation, just don't apply the voucher
      }
    }

    // Apply deal redemption code if provided
    let redemptionDiscount = 0;
    let appliedRedemption: any = null;
    if (redemptionCode) {
      const DealRedemption = require('../models/DealRedemption').default;

      const redemption = await DealRedemption.findOne({
        redemptionCode: redemptionCode.toUpperCase(),
        user: new mongoose.Types.ObjectId(userId),
      }).session(session);

      if (redemption) {
        // Check if redemption is active - return error if not
        if (redemption.status !== 'active') {
          await session.abortTransaction();
          session.endSession();
          const statusMessages: Record<string, string> = {
            'pending': 'This deal code is pending payment confirmation',
            'used': 'This deal code has already been used',
            'expired': 'This deal code has expired',
            'cancelled': 'This deal code was cancelled'
          };
          return sendBadRequest(res, statusMessages[redemption.status] || `Deal code is ${redemption.status}`);
        } else if (new Date(redemption.expiresAt) < new Date()) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'This deal code has expired');
        } else {
          // Calculate the benefit
          const deal = redemption.dealSnapshot;
          if (deal?.cashback) {
            const match = deal.cashback.match(/(\d+)/);
            if (match) {
              const value = parseInt(match[1]);
              redemptionDiscount = deal.cashback.includes('%')
                ? pct(subtotal, value)
                : value;
            }
          } else if (deal?.discount) {
            const match = deal.discount.match(/(\d+)/);
            if (match) {
              const value = parseInt(match[1]);
              redemptionDiscount = deal.discount.includes('%')
                ? pct(subtotal, value)
                : value;
            }
          }

          // Apply max benefit cap from campaign
          if (redemption.campaignSnapshot?.maxBenefit && redemptionDiscount > redemption.campaignSnapshot.maxBenefit) {
            redemptionDiscount = redemption.campaignSnapshot.maxBenefit;
          }

          appliedRedemption = redemption;
          discount += redemptionDiscount;
        }
      } else {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid deal code. Please check the code and try again.');
      }
    }

    // Apply offer redemption code if provided (RED-xxx format cashback vouchers)
    let offerRedemptionCashback = 0;
    let appliedOfferRedemption: any = null;
    if (offerRedemptionCode) {
      const OfferRedemption = require('../models/OfferRedemption').default;
      const Offer = require('../models/Offer').default;

      const offerRedemption = await OfferRedemption.findOne({
        $or: [
          { redemptionCode: offerRedemptionCode.toUpperCase() },
          { verificationCode: offerRedemptionCode }
        ],
        user: new mongoose.Types.ObjectId(userId),
      }).populate('offer', 'title cashbackPercentage restrictions').session(session);

      if (offerRedemption) {
        // Check if redemption is active
        if (offerRedemption.status !== 'active') {
          await session.abortTransaction();
          session.endSession();
          const statusMessages: Record<string, string> = {
            'pending': 'This voucher is pending activation',
            'used': 'This voucher has already been used',
            'expired': 'This voucher has expired',
            'cancelled': 'This voucher was cancelled'
          };
          return sendBadRequest(res, statusMessages[offerRedemption.status] || `Voucher is ${offerRedemption.status}`);
        }

        // Check expiry
        if (new Date(offerRedemption.expiryDate) < new Date()) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'This voucher has expired');
        }

        const offer = offerRedemption.offer as any;

        // Check minimum order value
        if (offer?.restrictions?.minOrderValue && subtotal < offer.restrictions.minOrderValue) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Minimum order value of ₹${offer.restrictions.minOrderValue} required for this voucher`);
        }

        // Calculate cashback
        const cashbackPercentage = offer?.cashbackPercentage || 0;
        offerRedemptionCashback = pct(subtotal, cashbackPercentage);

        // Apply max discount cap
        if (offer?.restrictions?.maxDiscountAmount && offerRedemptionCashback > offer.restrictions.maxDiscountAmount) {
          offerRedemptionCashback = offer.restrictions.maxDiscountAmount;
        }

        appliedOfferRedemption = offerRedemption;
      } else {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid voucher code. Please check the code and try again.');
      }
    }

    // Calculate coin discount from coinsUsed
    const coinDiscount = coinsUsed
      ? (coinsUsed.rezCoins || 0) + (coinsUsed.promoCoins || 0) + (coinsUsed.storePromoCoins || 0)
      : 0;

    // Lock fee discount (amount already paid by customer when locking item)
    const lockFeeDiscount = Number(clientLockFeeDiscount) || 0;
    if (lockFeeDiscount > 0) {
    }

    // Validate coin discount doesn't exceed order total (prevent negative payment)
    const maxAllowedCoinDiscount = subtotal + tax + deliveryFee - discount - lockFeeDiscount;
    if (coinDiscount > maxAllowedCoinDiscount) {
      await session.abortTransaction();
      session.endSession();
      logger.error('[CREATE ORDER] Coin discount exceeds order total:', {
        coinDiscount,
        maxAllowedCoinDiscount
      });
      return sendBadRequest(res, `Coin discount (₹${coinDiscount}) exceeds order total (₹${maxAllowedCoinDiscount})`);
    }

    // Calculate total with partner benefits, voucher, lock fee, and coin discount
    let total = subtotal + tax + deliveryFee - discount - lockFeeDiscount - coinDiscount;
    if (total < 0) total = 0;

    // Generate collision-safe order number (timestamp + random suffix)
    const crypto = require('crypto');
    const randomSuffix = crypto.randomInt(100000, 999999);
    const orderNumber = `ORD${Date.now()}${randomSuffix}`;

    // Get primary store - use storeId from request (for multi-store orders) or extract from first item
    const primaryStoreId = storeId || orderItems[0]?.store;

    // Validate fulfillment type against store serviceCapabilities
    const FULFILLMENT_TO_CAPABILITY: Record<string, string> = {
      delivery: 'homeDelivery',
      pickup: 'storePickup',
      drive_thru: 'driveThru',
      dine_in: 'dineIn'
    };

    // Fetch store once for fulfillment validation, address lookup, and details
    const primaryStoreDoc = (fulfillmentType !== 'delivery' && primaryStoreId)
      ? await Store.findById(primaryStoreId).select('serviceCapabilities name location').lean().session(session)
      : null;

    if (fulfillmentType !== 'delivery' && primaryStoreId) {
      const capKey = FULFILLMENT_TO_CAPABILITY[fulfillmentType];
      const capEnabled = (primaryStoreDoc?.serviceCapabilities as any)?.[capKey]?.enabled;
      if (!capEnabled) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `This store does not support ${fulfillmentType.replace('_', ' ')} orders`);
      }
    }

    // Map fulfillment type to delivery method
    const FULFILLMENT_TO_METHOD: Record<string, string> = {
      delivery: 'standard',
      pickup: 'pickup',
      drive_thru: 'drive_thru',
      dine_in: 'dine_in'
    };
    const deliveryMethod = FULFILLMENT_TO_METHOD[fulfillmentType] || 'standard';

    // For non-delivery fulfillment types, override delivery fee to 0
    const finalDeliveryFee = fulfillmentType === 'delivery' ? deliveryFee : 0;

    // Recalculate total if delivery fee changed due to fulfillment type
    let finalTotal = total;
    if (finalDeliveryFee !== deliveryFee) {
      finalTotal = subtotal + tax + finalDeliveryFee - discount - lockFeeDiscount - coinDiscount;
      if (finalTotal < 0) finalTotal = 0;
    }

    // Build delivery address: for non-delivery types, use minimal address or store address
    let orderDeliveryAddress = deliveryAddress;
    if (fulfillmentType !== 'delivery' && (!deliveryAddress || !deliveryAddress.addressLine1)) {
      orderDeliveryAddress = {
        name: deliveryAddress?.name || 'Store Pickup',
        phone: deliveryAddress?.phone || '',
        addressLine1: primaryStoreDoc?.location?.address || 'Store Address',
        city: primaryStoreDoc?.location?.city || '',
        state: primaryStoreDoc?.location?.state || '',
        pincode: primaryStoreDoc?.location?.pincode || '',
        country: 'India'
      };
    }

    // Build fulfillment details
    let fulfillmentDetailsData: any = undefined;
    if (fulfillmentType !== 'delivery') {
      fulfillmentDetailsData = {
        storeAddress: primaryStoreDoc?.location?.address,
        storeCoordinates: primaryStoreDoc?.location?.coordinates,
        ...(reqFulfillmentDetails || {}),
      };
      if (fulfillmentType === 'pickup') {
        fulfillmentDetailsData.estimatedReadyTime = new Date(Date.now() + 20 * 60 * 1000);
      } else if (fulfillmentType === 'drive_thru') {
        fulfillmentDetailsData.estimatedReadyTime = new Date(Date.now() + 10 * 60 * 1000);
      }
    }

    // Create order
    const order = new Order({
      orderNumber,
      user: userId,
      store: primaryStoreId,
      fulfillmentType,
      fulfillmentDetails: fulfillmentDetailsData,
      idempotencyKey: idempotencyKey || undefined,
      items: orderItems,
      totals: {
        subtotal,
        tax,
        delivery: finalDeliveryFee,
        discount,
        lockFeeDiscount,
        cashback,
        total: finalTotal,
        paidAmount: paymentMethod === 'cod' ? 0 : finalTotal,
        platformFee,
        merchantPayout
      },
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
        coinsUsed: coinsUsed ? {
          rezCoins: coinsUsed.rezCoins || 0,
          promoCoins: coinsUsed.promoCoins || 0,
          storePromoCoins: coinsUsed.storePromoCoins || 0,
          totalCoinsValue: (coinsUsed.rezCoins || 0) + (coinsUsed.promoCoins || 0) + (coinsUsed.storePromoCoins || 0)
        } : undefined
      },
      delivery: {
        method: deliveryMethod,
        status: 'pending',
        address: orderDeliveryAddress,
        deliveryFee: finalDeliveryFee
      },
      timeline: [{
        status: 'placed',
        message: fulfillmentType === 'delivery' ? 'Order placed - awaiting payment' :
                 fulfillmentType === 'pickup' ? 'Pickup order placed' :
                 fulfillmentType === 'drive_thru' ? 'Drive-thru order placed' :
                 fulfillmentType === 'dine_in' ? 'Dine-in order placed' :
                 'Order placed - awaiting payment',
        timestamp: new Date()
      }],
      status: 'placed',
      couponCode: cart.coupon?.code,
      specialInstructions,
      // Add redemption info if a deal code was applied
      redemption: appliedRedemption ? {
        code: appliedRedemption.redemptionCode,
        discount: redemptionDiscount,
        dealTitle: appliedRedemption.campaignSnapshot?.title,
      } : undefined,
      // Add offer redemption info if an offer voucher was applied
      offerRedemption: appliedOfferRedemption ? {
        code: appliedOfferRedemption.redemptionCode,
        cashback: offerRedemptionCashback,
        offerTitle: (appliedOfferRedemption.offer as any)?.title || 'Offer Cashback',
      } : undefined,
      // Creator pick attribution
      analytics: pickId ? { attributionPickId: pickId } : undefined,
    });

    await order.save({ session });

    // Mark deal redemption as used if applied
    if (appliedRedemption) {
      appliedRedemption.status = 'used';
      appliedRedemption.usedAt = new Date();
      appliedRedemption.orderId = order._id;
      appliedRedemption.benefitApplied = redemptionDiscount;
      await appliedRedemption.save({ session });
    }

    // Mark offer redemption as used and credit cashback if applied
    if (appliedOfferRedemption && offerRedemptionCashback > 0) {
      // Mark as used
      appliedOfferRedemption.status = 'used';
      appliedOfferRedemption.usedDate = new Date();
      appliedOfferRedemption.order = order._id;
      appliedOfferRedemption.usedAmount = offerRedemptionCashback;
      await appliedOfferRedemption.save({ session });

      // Credit cashback to user's wallet via walletService (handles wallet creation, CoinTransaction, ledger, audit)
      await walletService.credit({
        userId: String(order.user),
        amount: offerRedemptionCashback,
        source: 'purchase_reward',
        description: `Offer cashback from order #${order.orderNumber}`,
        operationType: 'offer_cashback',
        referenceId: String(order._id),
        referenceModel: 'Order',
        metadata: { orderId: order._id, orderNumber: order.orderNumber },
        session,
      });
      // Send push notification (async, don't wait)
      try {
        const NotificationService = require('../services/notificationService').default;
        NotificationService.sendToUser(userId.toString(), {
          title: 'Cashback Credited! 🎉',
          body: `₹${offerRedemptionCashback} cashback has been added to your wallet for order #${order.orderNumber}`,
          data: {
            type: 'cashback_credited',
            amount: offerRedemptionCashback,
            orderId: (order as any)._id?.toString() || '',
            orderNumber: order.orderNumber,
          }
        }).catch((err: any) => logger.error('Failed to send cashback notification:', err));
      } catch (notifError) {
        logger.error('Failed to send cashback notification:', notifError);
      }

    }

    // For COD orders, deduct stock immediately since payment confirmation never happens
    if (paymentMethod === 'cod') {
      for (const stockUpdate of stockUpdates) {
        try {
          const updateResult = await Product.findOneAndUpdate(
            stockUpdate.stockCheckQuery,
            stockUpdate.updateQuery,
            {
              session,
              arrayFilters: stockUpdate.arrayFilters || undefined,
              new: true
            }
          );

          if (!updateResult) {
            // Stock became insufficient during transaction - rollback
            await session.abortTransaction();
            session.endSession();
            logger.error('[CREATE ORDER] Stock became insufficient during order creation');
            return sendBadRequest(res, 'Stock became unavailable. Please try again.');
          }

          // Emit real-time stock update (reuse updateResult instead of separate query)
          if (stockSocketService && updateResult) {
            stockSocketService.emitStockUpdate(
              stockUpdate.productId.toString(),
              (updateResult as any).inventory?.stock || 0
            );
          }
        } catch (stockError) {
          logger.error('[CREATE ORDER] Failed to deduct stock:', stockError);
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'Failed to process order. Please try again.');
        }
      }

      // Invalidate product cache for items whose stock changed
      for (const stockUpdate of stockUpdates) {
        CacheInvalidator.invalidateProduct(stockUpdate.productId.toString()).catch((err) => logger.error('[OrderCreateCtrl] Product cache invalidation failed after stock update', { error: err.message, productId: stockUpdate.productId }));
      }
    }

    // Deduct coins for COD orders immediately (INSIDE TRANSACTION - ATOMIC)
    // Online payments deduct coins in PaymentService after payment confirmation
    if (paymentMethod === 'cod' && coinsUsed && coinDiscount > 0) {
      // Determine the store's root category for category-specific coin deduction
      const firstCartItem = orderCart.items[0];
      const codStoreId = firstCartItem?.store
        ? (typeof firstCartItem.store === 'object' ? (firstCartItem.store as any)._id : firstCartItem.store)
        : null;
      const codCategory = codStoreId ? await getStoreCategorySlug(codStoreId.toString()) : null;

      // Deduct REZ coins atomically with $gte guard (prevents double-spend on concurrent requests)
      let deductedFromCategory = false;
      if (coinsUsed.rezCoins && coinsUsed.rezCoins > 0) {
        // Try category balance first, fall back to global
        if (codCategory) {
          const catDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              [`categoryBalances.${codCategory}.available`]: { $gte: coinsUsed.rezCoins }
            },
            {
              $inc: {
                [`categoryBalances.${codCategory}.available`]: -coinsUsed.rezCoins,
                'statistics.totalSpent': coinsUsed.rezCoins
              },
              $set: { lastTransactionAt: new Date() }
            },
            { new: true, session }
          );
          if (catDeductResult) {
            deductedFromCategory = true;
          }
        }

        if (!deductedFromCategory) {
          // Fall back to global ReZ coins — atomic deduction
          const rezDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              'balance.available': { $gte: coinsUsed.rezCoins },
              'coins': { $elemMatch: { type: 'rez', amount: { $gte: coinsUsed.rezCoins } } }
            },
            {
              $inc: {
                'balance.available': -coinsUsed.rezCoins,
                'coins.$.amount': -coinsUsed.rezCoins,
                'statistics.totalSpent': coinsUsed.rezCoins
              },
              $set: { lastTransactionAt: new Date(), 'coins.$.lastUsed': new Date() }
            },
            { new: true, session }
          );

          if (!rezDeductResult) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Insufficient rez coins in wallet at time of deduction', { userId, requested: coinsUsed.rezCoins });
            return sendBadRequest(res, 'Insufficient REZ coins. Balance may have changed.');
          }
        }

        const { CoinTransaction } = require('../models/CoinTransaction');
        await CoinTransaction.createTransaction(
          userId.toString(),
          'spent',
          coinsUsed.rezCoins,
          'purchase',
          `COD Order: ${orderNumber}`,
          { orderId: order._id, orderNumber, paymentMethod: 'cod' },
          deductedFromCategory ? codCategory : null
        );

        // Also update UserLoyalty.categoryCoins if deducted from category
        if (deductedFromCategory && codCategory) {
          try {
            const UserLoyalty = require('../models/UserLoyalty').default || require('../models/UserLoyalty').UserLoyalty;
            await UserLoyalty.findOneAndUpdate(
              { userId: userId.toString(), [`categoryCoins.${codCategory}.available`]: { $gte: coinsUsed.rezCoins } },
              { $inc: { [`categoryCoins.${codCategory}.available`]: -coinsUsed.rezCoins } },
              { session }
            );
          } catch (loyaltyErr) {
            logger.error('[CREATE ORDER] Failed to update UserLoyalty categoryCoins:', loyaltyErr);
          }
        }
      }

      // Deduct promo coins atomically
      if (coinsUsed.promoCoins && coinsUsed.promoCoins > 0) {
        const promoDeductResult = await Wallet.findOneAndUpdate(
          {
            user: userId,
            'coins': { $elemMatch: { type: 'promo', amount: { $gte: coinsUsed.promoCoins } } }
          },
          {
            $inc: { 'coins.$.amount': -coinsUsed.promoCoins },
            $set: { lastTransactionAt: new Date(), 'coins.$.lastUsed': new Date() }
          },
          { new: true, session }
        );

        if (!promoDeductResult) {
          await session.abortTransaction();
          session.endSession();
          logger.error('Insufficient promo coins at time of deduction', { userId, requested: coinsUsed.promoCoins });
          return sendBadRequest(res, 'Insufficient Promo coins. Balance may have changed.');
        }
      }

      // Deduct branded coins atomically (store-specific coins)
      if (coinsUsed.storePromoCoins && coinsUsed.storePromoCoins > 0) {
        const firstItem = orderCart.items[0];
        const deductStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (deductStoreId) {
          const brandedDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              'brandedCoins': {
                $elemMatch: {
                  merchantId: deductStoreId,
                  amount: { $gte: coinsUsed.storePromoCoins }
                }
              }
            },
            {
              $inc: {
                'brandedCoins.$.amount': -coinsUsed.storePromoCoins,
                'statistics.totalSpent': coinsUsed.storePromoCoins
              },
              $set: { lastTransactionAt: new Date(), 'brandedCoins.$.lastUsed': new Date() }
            },
            { new: true, session }
          );

          if (!brandedDeductResult) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Insufficient branded coins at time of deduction', { userId, requested: coinsUsed.storePromoCoins });
            return sendBadRequest(res, 'Insufficient store coins. Balance may have changed.');
          }
        }
      }
      // Record ledger entry for coin deduction (non-blocking — don't fail order)
      try {
        const ledgerService = require('../services/ledgerService').default || require('../services/ledgerService');
        const { Types: MongoTypes } = require('mongoose');
        const PLATFORM_FLOAT_ID = new MongoTypes.ObjectId('000000000000000000000002');
        await ledgerService.recordEntry({
          debitAccount: { type: 'user_wallet', id: new MongoTypes.ObjectId(userId) },
          creditAccount: { type: 'platform_float', id: PLATFORM_FLOAT_ID },
          amount: coinDiscount,
          coinType: 'nuqta',
          operationType: 'order_coin_deduction',
          referenceId: String(order._id),
          referenceModel: 'Order',
          metadata: {
            description: `Coin payment for COD order ${orderNumber}`,
            idempotencyKey: `order_coin_${String(order._id)}`,
          },
        });
      } catch (ledgerErr) {
        logger.error('[ORDER:LEDGER] Failed to create ledger entry for coin deduction (non-blocking):', ledgerErr);
      }
    }

    // Mark voucher as used if one was applied
    if (voucherApplied) {
      try {
        const partnerService = require('../services/partnerService').default;
        await partnerService.markVoucherUsed(userId.toString(), voucherApplied);
      } catch (error) {
        logger.error('[VOUCHER] Error marking voucher as used:', error);
        // Don't fail order creation if voucher marking fails
      }
    }

    // Check for transaction bonus (every 11 orders)
    // Note: This is checked after order placement, but bonus is only awarded after delivery
    try {
      await partnerBenefitsService.checkTransactionBonus(userId.toString());
    } catch (error) {
      logger.error('[PARTNER BENEFITS] Error checking transaction bonus:', error);
      // Don't fail order creation if bonus check fails
    }

    // Note: Cart is NOT cleared here - it will be cleared after successful payment
    // This allows users to retry payment if it fails

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // NOTE: Merchant wallet credit moved to delivery (see updateOrderStatus).
    // Both COD and online payment orders only credit merchant wallet when status = 'delivered'.

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name image images')
      .populate('items.store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber').lean();

    // Mark coupon as used if one was applied
    // Check both cart.coupon (from DB) and couponCode (from request body)
    // Frontend passes couponCode in request but doesn't save it to cart DB
    const appliedCouponCode = cart.coupon?.code || couponCode;
    if (appliedCouponCode) {
      const couponResult = await couponService.markCouponAsUsed(
        new Types.ObjectId(userId),
        appliedCouponCode,
        order._id as Types.ObjectId
      );
      if (!couponResult.success) {
        // Note: Order is already created, so we don't fail the request
        // The discount was already applied to the order total
      }
    }

    // Create activity for order placement
    if (populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      await activityService.order.onOrderPlaced(
        new Types.ObjectId(userId),
        populatedOrder._id as Types.ObjectId,
        storeName,
        total
      );
    }

    // Emit gamification event for order creation
    gamificationEventBus.emit('order_placed', {
      userId,
      entityId: String(populatedOrder?._id),
      entityType: 'order',
      amount: total,
      source: { controller: 'orderController', action: 'createOrder' }
    });

    // Send notifications to customer and merchant (all independent — run in parallel)
    try {
      const user = populatedOrder?.user as any;
      const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
      const userName = user?.profile?.firstName || user?.fullName || 'Customer';
      const userEmail = user?.email;
      const storeData = populatedOrder?.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const populatedOrderNumber = populatedOrder?.orderNumber || (order._id as any).toString();

      const notifPromises: Promise<any>[] = [];

      // Send SMS to customer
      if (userPhone) {
        notifPromises.push(SMSService.sendOrderConfirmation(userPhone, populatedOrderNumber, storeName));
      }

      // Send email to customer
      if (userEmail && userName) {
        const emailOrderItems = populatedOrder?.items.map((item: any) => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price * item.quantity
        })) || [];

        notifPromises.push(EmailService.sendOrderConfirmation(userEmail, userName, {
          orderId: (order._id as any).toString(),
          orderNumber: populatedOrderNumber,
          items: emailOrderItems,
          subtotal: populatedOrder?.totals?.subtotal || 0,
          deliveryFee: populatedOrder?.delivery?.deliveryFee || 0,
          total: populatedOrder?.totals?.total || 0,
          estimatedDelivery: 'Within 30-45 minutes',
          storeName,
          deliveryAddress: deliveryAddress
        }));
      }

      // Send new order alert to merchant (fetch store contact in parallel with customer notifications)
      if (storeData?._id) {
        notifPromises.push(
          Store.findById(storeData._id).select('contact merchant').lean().then(async (store) => {
            if (!store) return;
            const merchantPhone = store?.contact?.phone;
            const merchantId = (store as any)?.merchant?.toString();

            const merchantPromises: Promise<any>[] = [];

            if (merchantPhone) {
              merchantPromises.push(SMSService.sendNewOrderAlertToMerchant(merchantPhone, populatedOrderNumber, userName, total));
              if (total > 10000) {
                merchantPromises.push(SMSService.sendHighValueOrderAlert(merchantPhone, populatedOrderNumber, total));
              }
            }

            if (merchantId) {
              merchantPromises.push(merchantNotificationService.notifyNewOrder({
                merchantId,
                orderId: (order._id as any).toString(),
                orderNumber: populatedOrderNumber,
                customerName: userName,
                totalAmount: total,
                itemCount: populatedOrder?.items?.length || 0,
                paymentMethod,
              }));

              // Real-time socket emit to merchant dashboard
              try {
                orderSocketService.emitToMerchant(merchantId, 'new_order', {
                  orderId: (order._id as any).toString(),
                  orderNumber: populatedOrderNumber,
                  customerName: userName,
                  totalAmount: total,
                  itemCount: populatedOrder?.items?.length || 0,
                  paymentMethod,
                  status: order.status,
                });
              } catch (socketErr) {
                logger.warn('[ORDER] Real-time socket emit failed:', socketErr);
              }
            }

            await Promise.all(merchantPromises);
          })
        );
      }

      await Promise.all(notifPromises);

    } catch (error) {
      logger.error('[ORDER] Error sending notifications:', error);
      // Don't fail order creation if notifications fail
    }

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    logger.error('[CREATE ORDER] Error:', error);
    logger.error('[CREATE ORDER] Error message:', error.message);
    logger.error('[CREATE ORDER] Error stack:', error.stack);
    logger.error('[CREATE ORDER] Error name:', error.name);

    // Log more details about the error
    if (error.name === 'TypeError') {
      logger.error('[CREATE ORDER] This is a TypeError - likely null/undefined access');
    }

    throw new AppError(`Failed to create order: ${error.message}`, 500);
  }
});
