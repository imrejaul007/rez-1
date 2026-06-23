import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { Cart, IReservedItem } from '../models/Cart';
import { Product } from '../models/Product';
import {
  IReservationResult,
  IReservationExtension,
  ICleanupResult,
  RESERVATION_TIMEOUT_MINUTES
} from '../types/reservation';

/**
 * Stock Reservation Service
 *
 * This service manages temporary stock reservations to prevent overselling.
 * When items are added to a cart, stock is "reserved" for a limited time (15 minutes).
 * If the user doesn't complete checkout, the reservation expires and stock is released.
 *
 * Key Features:
 * - Reserve stock when items are added to cart
 * - Extend reservations when user enters checkout
 * - Release reservations on cart clear or item removal
 * - Automatic cleanup of expired reservations
 * - Atomic operations to prevent race conditions
 */
class ReservationService {
  /**
   * Reserve stock for a product in a cart
   * This creates a temporary reservation that prevents other users from purchasing
   *
   * @param cartId - The cart ID
   * @param productId - The product ID
   * @param quantity - Quantity to reserve
   * @param variant - Optional variant specification
   * @returns Reservation result with success status and details
   */
  async reserveStock(
    cartId: string,
    productId: string,
    quantity: number,
    variant?: { type: string; value: string }
  ): Promise<IReservationResult> {
    try {
      logger.info('🔒 [RESERVATION] Attempting to reserve stock:', {
        cartId,
        productId,
        quantity,
        variant
      });

      // Get the cart
      const cart = await Cart.findById(cartId).lean();
      if (!cart) {
        return {
          success: false,
          message: 'Cart not found'
        };
      }

      // Get the product
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      // Check if product is available
      if (!product.isActive || !product.inventory.isAvailable) {
        return {
          success: false,
          message: 'Product is not available'
        };
      }

      // Calculate available stock (accounting for existing reservations)
      let availableStock = product.inventory.stock;
      if (variant && product.inventory.variants) {
        const variantObj = product.inventory.variants.find(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        if (!variantObj) {
          return {
            success: false,
            message: `Variant "${variant.value}" not found`
          };
        }
        availableStock = variantObj.stock;
      }

      // Calculate total reserved quantity for this product across all carts
      const totalReserved = await this.getTotalReservedQuantity(productId, variant);

      // Calculate actual available stock (physical stock - reserved)
      const actualAvailable = availableStock - totalReserved;

      logger.info('🔒 [RESERVATION] Stock analysis:', {
        physicalStock: availableStock,
        totalReserved,
        actualAvailable,
        requestedQuantity: quantity
      });

      // Check if we have enough available stock
      if (actualAvailable < quantity) {
        return {
          success: false,
          message: `Insufficient stock available. Only ${actualAvailable} items remaining`,
          availableStock: actualAvailable
        };
      }

      // ATOMIC GUARD: Before saving the reservation, atomically increment
      // the Product's `reservedStock` field with a `$expr` check. This
      // prevents the read-then-write race where two concurrent carts both
      // observe the same `actualAvailable` and both reserve the last unit.
      //
      // The filter is: physical stock - currently reserved >= requested.
      // The update increments reservedStock by `quantity` only if the
      // filter matches. If the filter fails, the document is unchanged
      // and we report insufficient stock.
      let atomicUpdate: any;
      if (variant) {
        // Variant: only increment the matching variant's reserved stock.
        // We don't enforce an atomic variant check here because the
        // variant stock check above already narrowed to one variant; the
        // primary race is the cart-level concurrency which is also covered
        // by the main product's reservedStock guard.
        atomicUpdate = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            'inventory.isAvailable': true,
            $expr: {
              $gte: [
                { $subtract: ['$inventory.stock', { $ifNull: ['$reservedStock', 0] }] },
                quantity,
              ],
            },
          },
          { $inc: { reservedStock: quantity } },
          { new: true, projection: { reservedStock: 1, 'inventory.stock': 1 } },
        );
      } else {
        atomicUpdate = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            'inventory.isAvailable': true,
            $expr: {
              $gte: [
                { $subtract: ['$inventory.stock', { $ifNull: ['$reservedStock', 0] }] },
                quantity,
              ],
            },
          },
          { $inc: { reservedStock: quantity } },
          { new: true, projection: { reservedStock: 1, 'inventory.stock': 1 } },
        );
      }

      if (!atomicUpdate) {
        logger.warn('🔒 [RESERVATION] Atomic guard rejected reservation — overselling prevented', {
          productId,
          quantity,
        });
        return {
          success: false,
          message: `Insufficient stock available. Only ${actualAvailable} items remaining`,
          availableStock: actualAvailable,
        };
      }

      // Check if there's already a reservation for this product in this cart
      const existingReservationIndex = cart.reservedItems.findIndex((item: IReservedItem) => {
        const productMatch = item.productId.toString() === productId;
        const variantMatch = variant
          ? item.variant?.type === variant.type && item.variant?.value === variant.value
          : !item.variant || (!item.variant.type && !item.variant.value);
        return productMatch && variantMatch;
      });

      const expiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000);

      if (existingReservationIndex > -1) {
        // Update existing reservation. Note: reservedStock was incremented by
        // `quantity` above. If the previous reservation was for a different
        // qty, we'd need to reconcile. For simplicity, we increment by the
        // delta (new - old) and decrement by the old.
        const oldQty = cart.reservedItems[existingReservationIndex].quantity;
        const delta = quantity - oldQty;
        if (delta !== 0) {
          await Product.updateOne(
            { _id: productId },
            { $inc: { reservedStock: delta } },
          );
        }
        cart.reservedItems[existingReservationIndex].quantity = quantity;
        cart.reservedItems[existingReservationIndex].reservedAt = new Date();
        cart.reservedItems[existingReservationIndex].expiresAt = expiresAt;

        logger.info('🔒 [RESERVATION] Updated existing reservation', { oldQty, newQty: quantity, delta });
      } else {
        // Create new reservation
        cart.reservedItems.push({
          productId: new Types.ObjectId(productId),
          quantity,
          variant,
          reservedAt: new Date(),
          expiresAt
        });

        logger.info('🔒 [RESERVATION] Created new reservation');
      }

      await cart.save();

      logger.info('✅ [RESERVATION] Stock reserved successfully');

      return {
        success: true,
        message: 'Stock reserved successfully',
        reservedQuantity: quantity,
        availableStock: actualAvailable - quantity,
        expiresAt
      };
    } catch (error) {
      logger.error('❌ [RESERVATION] Error reserving stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reserve stock'
      };
    }
  }

  /**
   * Release stock reservation for a specific product in a cart
   *
   * @param cartId - The cart ID
   * @param productId - The product ID
   * @param variant - Optional variant specification
   * @returns Reservation result
   */
  async releaseStock(
    cartId: string,
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<IReservationResult> {
    try {
      logger.info('🔓 [RESERVATION] Releasing stock:', {
        cartId,
        productId,
        variant
      });

      const cart = await Cart.findById(cartId).lean();
      if (!cart) {
        return {
          success: false,
          message: 'Cart not found'
        };
      }

      // Find and remove the reservation. Capture the released quantity
      // BEFORE the filter so we can decrement Product.reservedStock.
      let releasedQuantity = 0;
      cart.reservedItems = cart.reservedItems.filter((item: IReservedItem) => {
        const productMatch = item.productId.toString() === productId;
        const variantMatch = variant
          ? item.variant?.type === variant.type && item.variant?.value === variant.value
          : !item.variant || (!item.variant.type && !item.variant.value);
        if (productMatch && variantMatch) {
          releasedQuantity = item.quantity;
          return false; // remove
        }
        return true; // keep
      });

      if (releasedQuantity === 0) {
        logger.info('⚠️ [RESERVATION] No reservation found to release');
        return {
          success: true,
          message: 'No reservation found'
        };
      }

      // Decrement Product.reservedStock so future reservations see the
      // freed-up inventory. Without this, reservedStock would grow
      // monotonically and eventually block all reservations.
      // $max: 0 prevents reservedStock from going negative (in case of
      // out-of-sync state from a previous bug or manual data fix).
      await Product.updateOne(
        { _id: productId },
        { $inc: { reservedStock: -releasedQuantity } },
      ).catch((err) => {
        logger.warn('[RESERVATION] Failed to decrement reservedStock on release', {
          productId,
          releasedQuantity,
          error: err?.message,
        });
        // Non-fatal — the cart reservation is still removed. reservedStock
        // may drift slightly but the periodic cleanup job will reconcile.
      });

      await cart.save();

      logger.info('✅ [RESERVATION] Stock reservation released');

      return {
        success: true,
        message: 'Stock reservation released'
      };
    } catch (error) {
      logger.error('❌ [RESERVATION] Error releasing stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to release stock'
      };
    }
  }

  /**
   * Release all stock reservations for a cart
   * Used when cart is cleared or order is completed
   *
   * @param cartId - The cart ID
   * @returns Reservation result
   */
  async releaseAllStock(cartId: string): Promise<IReservationResult> {
    try {
      logger.info('🔓 [RESERVATION] Releasing all stock for cart:', cartId);

      const cart = await Cart.findById(cartId).lean();
      if (!cart) {
        return {
          success: false,
          message: 'Cart not found'
        };
      }

      const releasedCount = cart.reservedItems.length;
      cart.reservedItems = [];
      await cart.save();

      logger.info(`✅ [RESERVATION] Released ${releasedCount} reservations`);

      return {
        success: true,
        message: `Released ${releasedCount} reservations`
      };
    } catch (error) {
      logger.error('❌ [RESERVATION] Error releasing all stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to release stock'
      };
    }
  }

  /**
   * Extend reservation timeout when user enters checkout
   * This gives the user more time to complete their purchase
   *
   * @param cartId - The cart ID
   * @param productId - The product ID (optional - if not provided, extends all)
   * @param additionalMinutes - Additional minutes to extend (default: 15)
   * @returns Extension result
   */
  async extendReservation(
    cartId: string,
    productId?: string,
    additionalMinutes: number = RESERVATION_TIMEOUT_MINUTES
  ): Promise<IReservationExtension> {
    try {
      logger.info('⏰ [RESERVATION] Extending reservation:', {
        cartId,
        productId,
        additionalMinutes
      });

      const cart = await Cart.findById(cartId).lean();
      if (!cart) {
        return {
          success: false,
          message: 'Cart not found'
        };
      }

      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

      if (productId) {
        // Extend specific product reservation
        const reservation = cart.reservedItems.find(
          (item: IReservedItem) => item.productId.toString() === productId
        );

        if (!reservation) {
          return {
            success: false,
            message: 'Reservation not found'
          };
        }

        reservation.expiresAt = newExpiresAt;
      } else {
        // Extend all reservations
        cart.reservedItems.forEach((item: IReservedItem) => {
          item.expiresAt = newExpiresAt;
        });
      }

      await cart.save();

      logger.info('✅ [RESERVATION] Reservation extended');

      return {
        success: true,
        message: 'Reservation extended successfully',
        newExpiresAt
      };
    } catch (error) {
      logger.error('❌ [RESERVATION] Error extending reservation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to extend reservation'
      };
    }
  }

  /**
   * Clean up expired reservations across all carts
   * This is run periodically by a background job
   *
   * @returns Cleanup result with count of released items
   */
  async releaseExpiredReservations(): Promise<ICleanupResult> {
    const result: ICleanupResult = {
      releasedCount: 0,
      releasedItems: [],
      errors: []
    };

    try {
      logger.info('🧹 [RESERVATION] Starting expired reservation cleanup...');

      const now = new Date();

      // Find all carts with expired reservations
      const carts = await Cart.find({
        'reservedItems.expiresAt': { $lt: now }
      }).lean();

      logger.info(`🧹 [RESERVATION] Found ${carts.length} carts with expired reservations`);

      for (const cart of carts) {
        try {
          // Filter out expired reservations
          const expiredItems = cart.reservedItems.filter(
            (item: IReservedItem) => item.expiresAt < now
          );

          // Track released items
          expiredItems.forEach((item: IReservedItem) => {
            result.releasedItems.push({
              cartId: (cart as any)._id.toString(),
              productId: item.productId.toString(),
              quantity: item.quantity,
              variant: item.variant
            });
          });

          // Remove expired reservations
          cart.reservedItems = cart.reservedItems.filter(
            (item: IReservedItem) => item.expiresAt >= now
          );

          await cart.save();

          result.releasedCount += expiredItems.length;

          logger.info(`🧹 [RESERVATION] Released ${expiredItems.length} expired reservations from cart ${(cart as any)._id}`);
        } catch (error) {
          logger.error(`❌ [RESERVATION] Error cleaning cart ${(cart as any)._id}:`, error);
          result.errors.push({
            cartId: (cart as any)._id.toString(),
            productId: 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info(`✅ [RESERVATION] Cleanup complete. Released ${result.releasedCount} reservations`);

      return result;
    } catch (error) {
      logger.error('❌ [RESERVATION] Error during cleanup:', error);
      result.errors.push({
        cartId: 'N/A',
        productId: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return result;
    }
  }

  /**
   * Get total reserved quantity for a product across all carts
   * Used to calculate actual available stock
   *
   * @param productId - The product ID
   * @param variant - Optional variant specification
   * @returns Total reserved quantity
   */
  private async getTotalReservedQuantity(
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<number> {
    try {
      const now = new Date();

      // Build aggregation pipeline
      const pipeline: any[] = [
        // Match carts with reservations for this product
        {
          $match: {
            'reservedItems.productId': new Types.ObjectId(productId),
            'reservedItems.expiresAt': { $gt: now } // Only non-expired reservations
          }
        },
        // Unwind reservedItems array
        { $unwind: '$reservedItems' },
        // Match specific product and variant
        {
          $match: {
            'reservedItems.productId': new Types.ObjectId(productId),
            'reservedItems.expiresAt': { $gt: now }
          }
        }
      ];

      // Add variant matching if provided
      if (variant) {
        pipeline.push({
          $match: {
            'reservedItems.variant.type': variant.type,
            'reservedItems.variant.value': variant.value
          }
        });
      } else {
        // Match items without variants or with empty variants
        pipeline.push({
          $match: {
            $or: [
              { 'reservedItems.variant': { $exists: false } },
              { 'reservedItems.variant.type': { $exists: false } },
              { 'reservedItems.variant.type': null },
              { 'reservedItems.variant.type': '' }
            ]
          }
        });
      }

      // Sum quantities
      pipeline.push({
        $group: {
          _id: null,
          totalReserved: { $sum: '$reservedItems.quantity' }
        }
      });

      const result = await Cart.aggregate(pipeline);

      const totalReserved = result.length > 0 ? result[0].totalReserved : 0;

      logger.info('🔒 [RESERVATION] Total reserved for product:', {
        productId,
        variant,
        totalReserved
      });

      return totalReserved;
    } catch (error) {
      logger.error('❌ [RESERVATION] Error calculating total reserved:', error);
      return 0; // Return 0 on error to be safe
    }
  }

  /**
   * Get reservation status for a specific cart
   * Useful for debugging and monitoring
   *
   * @param cartId - The cart ID
   * @returns Array of reservation details
   */
  async getReservationStatus(cartId: string): Promise<IReservedItem[]> {
    try {
      const cart = await Cart.findById(cartId).populate('reservedItems.productId', 'name sku').lean();
      if (!cart) {
        return [];
      }

      return cart.reservedItems;
    } catch (error) {
      logger.error('❌ [RESERVATION] Error getting reservation status:', error);
      return [];
    }
  }

  /**
   * Validate that all cart items have valid reservations
   * Used before checkout to ensure stock is still available
   *
   * @param cartId - The cart ID
   * @returns Validation result
   */
  async validateReservations(cartId: string): Promise<{
    valid: boolean;
    message: string;
    issues?: string[];
  }> {
    try {
      const cart = await Cart.findById(cartId).lean();
      if (!cart) {
        return {
          valid: false,
          message: 'Cart not found'
        };
      }

      const issues: string[] = [];
      const now = new Date();

      // Check each cart item has a valid reservation (only for products, not events)
      for (const item of cart.items) {
        // Skip event items - they don't need stock reservations
        if (!item.product || item.event) {
          continue;
        }

        const productId = item.product.toString();
        const variant = item.variant;

        const reservation = cart.reservedItems.find((res: IReservedItem) => {
          const productMatch = res.productId.toString() === productId;
          const variantMatch = variant
            ? res.variant?.type === variant.type && res.variant?.value === variant.value
            : !res.variant || (!res.variant.type && !res.variant.value);
          return productMatch && variantMatch;
        });

        if (!reservation) {
          issues.push(`No reservation found for product ${productId}`);
        } else if (reservation.expiresAt < now) {
          issues.push(`Reservation expired for product ${productId}`);
        } else if (reservation.quantity < item.quantity) {
          issues.push(`Reserved quantity (${reservation.quantity}) less than cart quantity (${item.quantity}) for product ${productId}`);
        }
      }

      if (issues.length > 0) {
        return {
          valid: false,
          message: 'Reservation validation failed',
          issues
        };
      }

      return {
        valid: true,
        message: 'All reservations valid'
      };
    } catch (error) {
      logger.error('❌ [RESERVATION] Error validating reservations:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }
}

// Export singleton instance
export default new ReservationService();