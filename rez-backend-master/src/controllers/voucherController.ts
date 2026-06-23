import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { VoucherBrand, UserVoucher } from '../models/Voucher';
import { logger } from '../config/logger';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import stripeService from '../services/stripeService';
import coinService from '../services/coinService';
import { withCache } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';
import { validateSortField } from '../utils/sanitize';

/**
 * GET /api/vouchers/brands
 * Get all voucher brands with filters
 */
export const getVoucherBrands = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      category,
      featured,
      newlyAdded,
      search,
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    // Build filter
    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (newlyAdded === 'true') {
      filter.isNewlyAdded = true;
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    // Sort options (whitelist to prevent sort field injection)
    const ALLOWED_SORT_FIELDS = ['name', 'cashbackRate', 'rating', 'ratingCount', 'createdAt', 'updatedAt'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_SORT_FIELDS, 'name');
    const sortOptions: any = {};
    sortOptions[safeSortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `vouchers:brands:${JSON.stringify(filter)}:${pageNum}:${limitNum}:${sortBy}:${order}`;
    const { brands, total } = await withCache(cacheKey, CacheTTL.VOUCHER_LIST, async () => {
      const [brandsList, count] = await Promise.all([
        VoucherBrand.find(filter)
          .populate('store', 'name slug logo location.address location.city')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        VoucherBrand.countDocuments(filter),
      ]);
      return { brands: brandsList, total: count };
    });

    sendPaginated(res, brands, pageNum, limitNum, total, 'Voucher brands fetched successfully');
});

/**
 * GET /api/vouchers/brands/:id
 * Get single voucher brand by ID
 */
export const getVoucherBrandById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const brand = await VoucherBrand.findById(id)
      .populate('store', 'name slug logo location.address location.city')
      .lean();

    if (!brand) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    sendSuccess(res, brand, 'Voucher brand fetched successfully');
});

/**
 * GET /api/vouchers/brands/featured
 * Get featured voucher brands
 */
export const getFeaturedBrands = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const brands = await withCache(`vouchers:featured:${limit}`, CacheTTL.VOUCHER_LIST, () =>
      VoucherBrand.find({
        isActive: true,
        isFeatured: true,
      })
        .populate('store', 'name slug logo location.address location.city')
        .sort({ purchaseCount: -1 })
        .limit(Number(limit))
        .lean()
    );

    sendSuccess(res, brands, 'Featured brands fetched successfully');
});

/**
 * GET /api/vouchers/brands/newly-added
 * Get newly added voucher brands
 */
export const getNewlyAddedBrands = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const brands = await withCache(`vouchers:newly-added:${limit}`, CacheTTL.VOUCHER_LIST, () =>
      VoucherBrand.find({
        isActive: true,
        isNewlyAdded: true,
      })
        .populate('store', 'name slug logo location.address location.city')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean()
    );

    sendSuccess(res, brands, 'Newly added brands fetched successfully');
});

/**
 * GET /api/vouchers/categories
 * Get voucher categories (distinct)
 */
export const getVoucherCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await withCache('vouchers:categories', CacheTTL.VOUCHER_LIST, () =>
      VoucherBrand.distinct('category', { isActive: true })
    );

    sendSuccess(res, categories, 'Categories fetched successfully');
});

/**
 * POST /api/vouchers/purchase
 * Purchase a voucher (authenticated users only)
 */
export const purchaseVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      brandId,
      denomination,
      paymentMethod = 'wallet',
    } = req.body;

    // Validate input
    if (!brandId || !denomination) {
      return sendError(res, 'Brand ID and denomination are required', 400);
    }

    // Find brand
    const brand = await VoucherBrand.findById(brandId).lean();

    if (!brand) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    if (!brand.isActive) {
      return sendError(res, 'This voucher brand is currently unavailable', 400);
    }

    // Check if denomination is available
    if (!brand.denominations.includes(Number(denomination))) {
      return sendError(res, 'Invalid denomination for this brand', 400);
    }

    const purchasePrice = Number(denomination);

    // CARD PAYMENT: Create Stripe PaymentIntent
    if (paymentMethod === 'card') {
      if (!stripeService.isStripeConfigured()) {
        return sendError(res, 'Card payments are not available at this time', 503);
      }

      const paymentIntent = await stripeService.createPaymentIntent({
        amount: purchasePrice,
        currency: 'inr',
        metadata: {
          type: 'voucher_purchase',
          userId,
          brandId: String(brandId),
          brandName: brand.name,
          denomination: String(denomination),
        },
      });

      return sendSuccess(res, {
        requiresPayment: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: purchasePrice,
        brand: {
          name: brand.name,
          cashbackRate: brand.cashbackRate,
        },
      }, 'Payment intent created. Complete card payment to receive your voucher.');
    }

    // WALLET PAYMENT
    if (paymentMethod !== 'wallet') {
      return sendError(res, 'Supported payment methods: wallet, card', 400);
    }

    // Generate voucher code before transaction
    const brandPrefix = brandId.toString().substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `${brandPrefix}-${denomination}-${random}`;

    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + 365);

    // MongoDB transaction: coin deduction + voucher creation + transaction record
    // If any step fails, everything rolls back atomically
    const session = await mongoose.startSession();
    let deductResult: any;
    let userVoucher: any;

    try {
      await session.startTransaction();

      // Step 1: Deduct coins
      try {
        deductResult = await coinService.deductCoins(
          userId,
          purchasePrice,
          'purchase',
          `Purchased ${brand.name} voucher - ₹${denomination}`,
          { brandId: String(brandId), brandName: brand.name, denomination },
          null
        );
      } catch (deductError: any) {
        await session.abortTransaction();
        return sendError(res, deductError.message || 'Insufficient coin balance', 400);
      }

      // Step 2: Create voucher
      const [createdVoucher] = await UserVoucher.create([{
        user: userId,
        brand: brandId,
        voucherCode,
        denomination: Number(denomination),
        purchasePrice,
        purchaseDate,
        expiryDate,
        validityDays: 365,
        status: 'active',
        deliveryMethod: 'app',
        deliveryStatus: 'delivered',
        deliveredAt: new Date(),
        paymentMethod: 'wallet',
      }], { session });
      userVoucher = createdVoucher;

      // Step 3: Create transaction record
      const wallet = await Wallet.findOne({ user: userId }).session(session).lean();
      const [transaction] = await Transaction.create([{
        user: userId,
        type: 'debit',
        amount: purchasePrice,
        currency: wallet?.currency || 'INR',
        category: 'spending',
        description: `Purchased ${brand.name} voucher - ₹${denomination}`,
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: new Date(),
            reason: 'Voucher purchased successfully',
          }],
        },
        source: {
          type: 'order',
          reference: userVoucher._id,
          description: `Voucher purchase - ${brand.name}`,
          metadata: {
            orderNumber: `VOUCHR-${String(userVoucher._id).substring(0, 8)}`,
            coinTransactionId: deductResult.transactionId,
            storeInfo: brand.store ? {
              name: brand.name,
              id: brand.store as any,
            } : undefined,
          },
        },
        balanceBefore: deductResult.newBalance + purchasePrice,
        balanceAfter: deductResult.newBalance,
      }], { session });

      await session.commitTransaction();
    } catch (txError: any) {
      await session.abortTransaction();
      logger.error('[VOUCHER] Purchase transaction failed', txError);
      return sendError(res, 'Voucher purchase failed. Your coins have not been deducted.', 500);
    } finally {
      session.endSession();
    }

    // Non-critical: update brand purchase count (fire-and-forget)
    VoucherBrand.findByIdAndUpdate(brandId, { $inc: { purchaseCount: 1 } })
      .exec().catch(err => logger.warn('[VOUCHER] Failed to increment brand purchaseCount:', err));

    // Populate voucher for response
    await userVoucher.populate('brand', 'name logo backgroundColor cashbackRate');

    sendSuccess(
      res,
      {
        voucher: userVoucher,
        wallet: {
          balance: deductResult.newBalance,
          available: deductResult.newBalance,
        },
      },
      'Voucher purchased successfully',
      201
    );
});

/**
 * POST /api/vouchers/confirm-card-purchase
 * Confirm voucher purchase after successful Stripe card payment
 */
export const confirmCardPurchase = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return sendError(res, 'Payment intent ID is required', 400);
    }

    // Verify with Stripe
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return sendError(res, `Payment not completed. Status: ${paymentIntent.status}`, 400);
    }

    // Extract purchase details from metadata
    const { brandId, denomination, type: paymentType } = paymentIntent.metadata;

    if (paymentType !== 'voucher_purchase') {
      return sendError(res, 'Invalid payment intent for voucher purchase', 400);
    }

    if (paymentIntent.metadata.userId !== userId) {
      return sendError(res, 'Payment does not belong to this user', 403);
    }

    // Idempotency: check if voucher already created for this payment
    const existingVoucher = await UserVoucher.findOne({ transactionId: paymentIntentId })
      .populate('brand', 'name logo backgroundColor cashbackRate');
    if (existingVoucher) {
      return sendSuccess(res, {
        voucher: existingVoucher,
        alreadyProcessed: true,
      }, 'Voucher already issued for this payment');
    }

    const brand = await VoucherBrand.findById(brandId).lean();
    if (!brand) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    const purchasePrice = Number(denomination);

    // Generate voucher code
    const brandPrefix = brandId.toString().substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `${brandPrefix}-${denomination}-${random}`;

    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + 365);

    // Create voucher
    const userVoucher = new UserVoucher({
      user: userId,
      brand: brandId,
      voucherCode,
      denomination: purchasePrice,
      purchasePrice,
      purchaseDate,
      expiryDate,
      validityDays: 365,
      status: 'active',
      deliveryMethod: 'app',
      deliveryStatus: 'delivered',
      deliveredAt: new Date(),
      paymentMethod: 'card',
      transactionId: paymentIntentId,
    });

    await userVoucher.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'debit',
      amount: purchasePrice,
      currency: 'INR',
      category: 'spending',
      description: `Purchased ${brand.name} voucher - ₹${denomination} (Card)`,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Voucher purchased via card payment',
        }],
      },
      source: {
        type: 'order',
        reference: userVoucher._id as any,
        description: `Voucher purchase - ${brand.name}`,
        metadata: {
          orderNumber: `VOUCHR-${String(userVoucher._id).substring(0, 8)}`,
          paymentIntentId,
          paymentMethod: 'card',
        },
      },
    });

    await transaction.save();

    brand.purchaseCount += 1;
    await brand.save();

    await userVoucher.populate('brand', 'name logo backgroundColor cashbackRate');

    sendSuccess(res, {
      voucher: userVoucher,
      transaction,
    }, 'Voucher purchased successfully via card', 201);
});

/**
 * GET /api/vouchers/my-vouchers
 * Get user's purchased vouchers
 */
export const getUserVouchers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = { user: userId };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [vouchers, total] = await Promise.all([
      UserVoucher.find(filter)
        .populate('brand', 'name logo backgroundColor cashbackRate category')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserVoucher.countDocuments(filter),
    ]);

    sendPaginated(res, vouchers, pageNum, limitNum, total, 'User vouchers fetched successfully');
});

/**
 * GET /api/vouchers/my-vouchers/:id
 * Get single user voucher by ID
 */
export const getUserVoucherById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const voucher = await UserVoucher.findOne({
      _id: id,
      user: userId,
    })
      .populate('brand', 'name logo backgroundColor cashbackRate category termsAndConditions')
      .lean();

    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    sendSuccess(res, voucher, 'Voucher fetched successfully');
});

/**
 * POST /api/vouchers/:id/use
 * Mark voucher as used
 */
export const useVoucher = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { usageLocation } = req.body;

    // Find voucher (no .lean() — need instance methods: isValid, markAsUsed)
    const voucher = await UserVoucher.findOne({
      _id: id,
      user: userId,
    });

    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    // Check if valid
    if (typeof voucher.isValid === 'function' && !voucher.isValid()) {
      return sendError(res, 'Voucher is not valid or has expired', 400);
    }

    // Mark as used
    if (typeof voucher.markAsUsed === 'function') {
      await voucher.markAsUsed(usageLocation);
    } else {
      // Fallback: manual update if instance method unavailable
      voucher.set('status', 'used');
      voucher.set('usedAt', new Date());
      if (usageLocation) voucher.set('usageLocation', usageLocation);
      await voucher.save();
    }

    sendSuccess(res, voucher.toObject(), 'Voucher marked as used successfully');
});

/**
 * POST /api/vouchers/brands/:id/track-view
 * Track brand view (analytics)
 */
export const trackBrandView = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await VoucherBrand.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    sendSuccess(res, { success: true }, 'View tracked');
});

/**
 * GET /api/vouchers/hero-carousel
 * Get hero carousel items for online voucher page
 */
export const getHeroCarousel = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 5 } = req.query;

    const cacheKey = `vouchers:hero-carousel:${limit}`;
    const cachedCarousel = await withCache(cacheKey, CacheTTL.VOUCHER_LIST, async () => {

    // Get featured brands with highest cashback rates, prioritizing travel brands (like MakeMyTrip) for hero carousel
    const featuredBrands = await VoucherBrand.find({
      isActive: true,
      $or: [
        { isFeatured: true },
        { category: 'travel' }, // Include travel brands in hero carousel
      ],
    })
      .populate('store', 'name slug logo location.address location.city')
      .sort({
        // Prioritize travel brands first, then by cashback rate
        category: 1, // travel comes first alphabetically, but we'll manually sort
        cashbackRate: -1,
        purchaseCount: -1
      })
      .limit(Number(limit) + 5) // Get extra to filter
      .lean();

    // Manually sort: travel brands first, then others
    featuredBrands.sort((a, b) => {
      const aIsTravel = a.category === 'travel';
      const bIsTravel = b.category === 'travel';
      if (aIsTravel && !bIsTravel) return -1;
      if (!aIsTravel && bIsTravel) return 1;
      return b.cashbackRate - a.cashbackRate;
    });

    // Limit to requested number
    const limitedBrands = featuredBrands.slice(0, Number(limit));

    // Transform to carousel format
    const carouselItems = limitedBrands.map((brand, index) => {
      // Special handling for MakeMyTrip to match image format
      const title = brand.name.toLowerCase() === 'makemytrip'
        ? 'make my trip'
        : brand.name;

      return {
        id: brand._id.toString(),
        title,
        subtitle: `Cashback upto ${brand.cashbackRate}%`,
        image: brand.logo, // Use logo as image for now
        backgroundColor: brand.backgroundColor || '#F97316',
        textColor: brand.logoColor || '#FFFFFF',
        cashbackRate: brand.cashbackRate,
        brandId: brand._id.toString(),
        store: brand.store ? {
          id: (brand.store as any)._id?.toString(),
          name: (brand.store as any).name,
          slug: (brand.store as any).slug,
          address: (brand.store as any).location?.address,
        } : null,
        action: {
          type: 'brand' as const,
          target: brand._id.toString(),
        },
      };
    });

    return carouselItems;
    }); // end withCache

    sendSuccess(res, cachedCarousel, 'Hero carousel items fetched successfully');
});
