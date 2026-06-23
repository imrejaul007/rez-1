import { logger } from '../config/logger';
import { Request, Response } from 'express';
import flashSaleService from '../services/flashSaleService';
import offerService from '../services/offerService';
import { asyncHandler } from '../utils/asyncHandler';

class FlashSaleController {
  /**
   * Get all active flash sales
   */
  getActiveFlashSales = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const flashSales = await flashSaleService.getActiveFlashSales();

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting active flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get upcoming flash sales
   */
  getUpcomingFlashSales = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const flashSales = await flashSaleService.getUpcomingFlashSales();

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting upcoming flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sales expiring soon
   */
  getExpiringSoonFlashSales = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 5;
      const flashSales = await flashSaleService.getExpiringSoonFlashSales(minutes);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting expiring flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sale by ID
   */
  getFlashSaleById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const flashSale = await flashSaleService.getFlashSaleById(id);

      if (!flashSale) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      // Track view
      await flashSaleService.trackView(id);

      res.status(200).json({
        success: true,
        data: flashSale,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sales by product
   */
  getFlashSalesByProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const flashSales = await flashSaleService.getFlashSalesByProduct(productId);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting flash sales by product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sales by category
   */
  getFlashSalesByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const flashSales = await flashSaleService.getFlashSalesByCategory(categoryId);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting flash sales by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Create flash sale (admin only)
   */
  createFlashSale = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title, description, image, banner,
        discountPercentage, discountAmount, priority,
        startTime, endTime,
        maxQuantity, limitPerUser, lowStockThreshold,
        products, stores, category,
        originalPrice, flashSalePrice,
        termsAndConditions, minimumPurchase, maximumDiscount, promoCode,
        notifyOnStart, notifyOnEndingSoon, notifyOnLowStock,
      } = req.body;

      const flashSaleData = {
        title, description, image, banner,
        discountPercentage, discountAmount, priority,
        startTime, endTime,
        maxQuantity, limitPerUser, lowStockThreshold,
        products, stores, category,
        originalPrice, flashSalePrice,
        termsAndConditions, minimumPurchase, maximumDiscount, promoCode,
        notifyOnStart, notifyOnEndingSoon, notifyOnLowStock,
        createdBy: (req as any).user.userId,
      };

      const flashSale = await flashSaleService.createFlashSale(flashSaleData);

      res.status(201).json({
        success: true,
        message: 'Flash sale created successfully',
        data: flashSale,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error creating flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Update flash sale (admin only)
   */
  updateFlashSale = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const {
        title, description, image, banner,
        discountPercentage, discountAmount, priority,
        startTime, endTime,
        maxQuantity, limitPerUser, lowStockThreshold,
        products, stores, category,
        originalPrice, flashSalePrice,
        termsAndConditions, minimumPurchase, maximumDiscount, promoCode,
        notifyOnStart, notifyOnEndingSoon, notifyOnLowStock,
        enabled,
      } = req.body;

      // Only include defined fields in the update
      const updateData: Record<string, any> = {};
      const allowedFields = {
        title, description, image, banner,
        discountPercentage, discountAmount, priority,
        startTime, endTime,
        maxQuantity, limitPerUser, lowStockThreshold,
        products, stores, category,
        originalPrice, flashSalePrice,
        termsAndConditions, minimumPurchase, maximumDiscount, promoCode,
        notifyOnStart, notifyOnEndingSoon, notifyOnLowStock,
        enabled,
      };

      for (const [key, value] of Object.entries(allowedFields)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const flashSale = await flashSaleService.updateFlashSale(id, updateData);

      if (!flashSale) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Flash sale updated successfully',
        data: flashSale,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error updating flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Delete flash sale (admin only)
   */
  deleteFlashSale = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await flashSaleService.deleteFlashSale(id);

      res.status(200).json({
        success: true,
        message: 'Flash sale deleted successfully',
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error deleting flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Validate flash sale purchase
   */
  validateFlashSalePurchase = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { flashSaleId, productId, quantity } = req.body;
      const userId = (req as any).user.userId;

      const validation = await flashSaleService.validateFlashSalePurchase({
        flashSaleId,
        userId,
        productId,
        quantity,
      });

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error validating purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate flash sale purchase',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Track flash sale click
   */
  trackClick = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await flashSaleService.trackClick(id);

      res.status(200).json({
        success: true,
        message: 'Click tracked successfully',
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track click',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sale statistics (admin only)
   */
  getFlashSaleStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stats = await flashSaleService.getFlashSaleStats(id);

      if (!stats) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sale statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Find best offer for cart
   */
  findBestOffer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { cartTotal, items } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.findBestOffer(cartTotal, items, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error finding best offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find best offer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Apply specific offer to cart
   */
  applyOffer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { offerId, cartTotal, items } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.applyOffer(offerId, cartTotal, items, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error applying offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply offer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Validate promo code
   */
  validatePromoCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { promoCode, cartTotal } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.validatePromoCode(promoCode, cartTotal, userId);

      if (!result.valid) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error validating promo code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate promo code',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // FLASH SALE PURCHASE ENDPOINTS
  // ============================================

  /**
   * Initiate flash sale purchase - creates Stripe checkout session
   * POST /api/flash-sales/purchase/initiate
   */
  initiateFlashSalePurchase = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { flashSaleId, quantity = 1, successUrl, cancelUrl } = req.body;
      const userId = (req as any).user.userId;
      const userEmail = (req as any).user.email;

      if (!flashSaleId) {
        res.status(400).json({
          success: false,
          message: 'Flash sale ID is required',
        });
        return;
      }

      // Get metadata from request
      const metadata = {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        successUrl,
        cancelUrl,
        customerEmail: userEmail,
      };

      const result = await flashSaleService.initiateFlashSalePurchase(
        userId,
        flashSaleId,
        quantity,
        metadata
      );

      res.status(200).json({
        success: true,
        message: 'Flash sale purchase initiated',
        data: result,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error initiating purchase:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to initiate flash sale purchase',
      });
    }
  });

  /**
   * Verify flash sale payment - completes the purchase (for Stripe)
   * POST /api/flash-sales/purchase/verify
   */
  verifyFlashSalePayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { purchaseId, stripeSessionId } = req.body;

      if (!purchaseId || !stripeSessionId) {
        res.status(400).json({
          success: false,
          message: 'Missing required payment verification fields (purchaseId, stripeSessionId)',
        });
        return;
      }

      const result = await flashSaleService.completeFlashSalePurchase(purchaseId, {
        stripeSessionId,
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          voucherCode: result.voucherCode,
          promoCode: result.promoCode,
          expiresAt: result.expiresAt,
          amount: result.purchase.amount,
        },
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error verifying payment:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify payment',
      });
    }
  });

  /**
   * Mark flash sale purchase as failed
   * POST /api/flash-sales/purchase/fail
   */
  failFlashSalePurchase = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { purchaseId, reason } = req.body;

      if (!purchaseId) {
        res.status(400).json({
          success: false,
          message: 'Purchase ID is required',
        });
        return;
      }

      await flashSaleService.failFlashSalePurchase(purchaseId, reason || 'Payment failed');

      res.status(200).json({
        success: true,
        message: 'Purchase marked as failed',
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error failing purchase:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update purchase status',
      });
    }
  });

  /**
   * Get user's flash sale purchases
   * GET /api/flash-sales/purchases
   */
  getUserFlashSalePurchases = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;

      const purchases = await flashSaleService.getUserFlashSalePurchases(userId);

      res.status(200).json({
        success: true,
        data: purchases,
        count: purchases.length,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting user purchases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sale purchases',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get flash sale purchase by ID
   * GET /api/flash-sales/purchases/:purchaseId
   */
  getFlashSalePurchaseById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { purchaseId } = req.params;
      const userId = (req as any).user.userId;

      const purchase = await flashSaleService.getFlashSalePurchaseById(purchaseId);

      if (!purchase) {
        res.status(404).json({
          success: false,
          message: 'Purchase not found',
        });
        return;
      }

      // Verify the purchase belongs to the user
      if (purchase.user.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to view this purchase',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: purchase,
      });
    } catch (error) {
      logger.error('❌ [FlashSaleController] Error getting purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase details',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

export default new FlashSaleController();
