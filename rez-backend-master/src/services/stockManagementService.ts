import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { Product } from '../models/Product';
import stockAuditService from './stockAuditService';
import { StockChangeType } from '../models/StockHistory';

/**
 * Stock Management Service with Audit Trail
 *
 * This service wraps all stock-changing operations and automatically logs them
 * to the stock history for audit trail purposes.
 */
class StockManagementService {
  /**
   * Deduct stock for a purchase/order
   */
  async deductStockForOrder(
    productId: string | Types.ObjectId,
    quantity: number,
    variant?: { type: string; value: string },
    metadata?: {
      userId?: string | Types.ObjectId;
      orderId?: string | Types.ObjectId;
      reason?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; previousStock: number; newStock: number }> {
    try {
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        throw new Error('Product not found');
      }

      let previousStock: number;
      let stockPath: string;

      if (variant && product.inventory.variants) {
        const variantIndex = product.inventory.variants.findIndex(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        if (variantIndex === -1) {
          throw new Error('Variant not found');
        }
        previousStock = product.inventory.variants[variantIndex].stock;
        stockPath = `inventory.variants.${variantIndex}.stock`;
      } else {
        previousStock = product.inventory.stock;
        stockPath = 'inventory.stock';
      }

      const newStock = previousStock - quantity;

      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }

      // Update stock in database
      await Product.updateOne(
        { _id: productId },
        { $set: { [stockPath]: newStock } }
      );

      // Log to audit trail
      await stockAuditService.logStockChange({
        productId,
        storeId: product.store,
        variant,
        previousStock,
        newStock,
        changeType: 'purchase',
        userId: metadata?.userId,
        orderId: metadata?.orderId,
        reason: metadata?.reason || 'Order placed',
        notes: metadata?.notes
      });

      logger.info('📦 [STOCK MGMT] Stock deducted for order:', {
        productId,
        quantity,
        previousStock,
        newStock
      });

      return { success: true, previousStock, newStock };
    } catch (error) {
      logger.error('📦 [STOCK MGMT] Failed to deduct stock:', error);
      throw error;
    }
  }

  /**
   * Restore stock for order cancellation or return
   */
  async restoreStockForCancellation(
    productId: string | Types.ObjectId,
    quantity: number,
    variant?: { type: string; value: string },
    metadata?: {
      userId?: string | Types.ObjectId;
      orderId?: string | Types.ObjectId;
      reason?: string;
      changeType?: 'cancellation' | 'return';
    }
  ): Promise<{ success: boolean; previousStock: number; newStock: number }> {
    try {
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        throw new Error('Product not found');
      }

      let previousStock: number;
      let stockPath: string;

      if (variant && product.inventory.variants) {
        const variantIndex = product.inventory.variants.findIndex(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        if (variantIndex === -1) {
          throw new Error('Variant not found');
        }
        previousStock = product.inventory.variants[variantIndex].stock;
        stockPath = `inventory.variants.${variantIndex}.stock`;
      } else {
        previousStock = product.inventory.stock;
        stockPath = 'inventory.stock';
      }

      const newStock = previousStock + quantity;

      // Update stock in database
      await Product.updateOne(
        { _id: productId },
        { $set: { [stockPath]: newStock } }
      );

      // Log to audit trail
      await stockAuditService.logStockChange({
        productId,
        storeId: product.store,
        variant,
        previousStock,
        newStock,
        changeType: metadata?.changeType || 'cancellation',
        userId: metadata?.userId,
        orderId: metadata?.orderId,
        reason: metadata?.reason || 'Order cancelled/returned'
      });

      logger.info('📦 [STOCK MGMT] Stock restored:', {
        productId,
        quantity,
        previousStock,
        newStock
      });

      return { success: true, previousStock, newStock };
    } catch (error) {
      logger.error('📦 [STOCK MGMT] Failed to restore stock:', error);
      throw error;
    }
  }

  /**
   * Manual stock adjustment by merchant
   */
  async adjustStock(
    productId: string | Types.ObjectId,
    newStock: number,
    variant?: { type: string; value: string },
    metadata?: {
      userId?: string | Types.ObjectId;
      reason?: string;
      notes?: string;
      changeType?: StockChangeType;
    }
  ): Promise<{ success: boolean; previousStock: number; newStock: number }> {
    try {
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        throw new Error('Product not found');
      }

      let previousStock: number;
      let stockPath: string;

      if (variant && product.inventory.variants) {
        const variantIndex = product.inventory.variants.findIndex(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        if (variantIndex === -1) {
          throw new Error('Variant not found');
        }
        previousStock = product.inventory.variants[variantIndex].stock;
        stockPath = `inventory.variants.${variantIndex}.stock`;
      } else {
        previousStock = product.inventory.stock;
        stockPath = 'inventory.stock';
      }

      // Update stock in database
      await Product.updateOne(
        { _id: productId },
        { $set: { [stockPath]: newStock } }
      );

      // Determine change type based on adjustment
      let changeType: StockChangeType = metadata?.changeType || 'adjustment';
      if (!metadata?.changeType) {
        if (newStock > previousStock) {
          changeType = 'restock';
        } else if (newStock < previousStock) {
          changeType = 'adjustment';
        }
      }

      // Log to audit trail
      await stockAuditService.logStockChange({
        productId,
        storeId: product.store,
        variant,
        previousStock,
        newStock,
        changeType,
        userId: metadata?.userId,
        reason: metadata?.reason || 'Manual stock adjustment',
        notes: metadata?.notes
      });

      logger.info('📦 [STOCK MGMT] Stock adjusted:', {
        productId,
        previousStock,
        newStock,
        changeType
      });

      return { success: true, previousStock, newStock };
    } catch (error) {
      logger.error('📦 [STOCK MGMT] Failed to adjust stock:', error);
      throw error;
    }
  }

  /**
   * Reserve stock (for cart items)
   */
  async reserveStock(
    productId: string | Types.ObjectId,
    quantity: number,
    variant?: { type: string; value: string },
    metadata?: {
      userId?: string | Types.ObjectId;
      reservationId?: string | Types.ObjectId;
      reason?: string;
    }
  ): Promise<{ success: boolean }> {
    try {
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        throw new Error('Product not found');
      }

      let currentStock: number;
      if (variant && product.inventory.variants) {
        const variantObj = product.inventory.variants.find(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        currentStock = variantObj?.stock || 0;
      } else {
        currentStock = product.inventory.stock;
      }

      // Log reservation (doesn't actually change stock in DB, just tracks it)
      await stockAuditService.logStockChange({
        productId,
        storeId: product.store,
        variant,
        previousStock: currentStock,
        newStock: currentStock, // Stock doesn't change for reservations
        changeType: 'reservation',
        userId: metadata?.userId,
        reservationId: metadata?.reservationId,
        reason: metadata?.reason || 'Stock reserved for cart',
        metadata: { reservedQuantity: quantity }
      });

      logger.info('📦 [STOCK MGMT] Stock reserved:', {
        productId,
        quantity
      });

      return { success: true };
    } catch (error) {
      logger.error('📦 [STOCK MGMT] Failed to reserve stock:', error);
      throw error;
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(
    productId: string | Types.ObjectId,
    quantity: number,
    variant?: { type: string; value: string },
    metadata?: {
      userId?: string | Types.ObjectId;
      reservationId?: string | Types.ObjectId;
      reason?: string;
    }
  ): Promise<{ success: boolean }> {
    try {
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        throw new Error('Product not found');
      }

      let currentStock: number;
      if (variant && product.inventory.variants) {
        const variantObj = product.inventory.variants.find(
          (v: any) => v.type === variant.type && v.value === variant.value
        );
        currentStock = variantObj?.stock || 0;
      } else {
        currentStock = product.inventory.stock;
      }

      // Log reservation release
      await stockAuditService.logStockChange({
        productId,
        storeId: product.store,
        variant,
        previousStock: currentStock,
        newStock: currentStock, // Stock doesn't change for reservation releases
        changeType: 'reservation_release',
        userId: metadata?.userId,
        reservationId: metadata?.reservationId,
        reason: metadata?.reason || 'Reservation expired/released',
        metadata: { releasedQuantity: quantity }
      });

      logger.info('📦 [STOCK MGMT] Reservation released:', {
        productId,
        quantity
      });

      return { success: true };
    } catch (error) {
      logger.error('📦 [STOCK MGMT] Failed to release reservation:', error);
      throw error;
    }
  }
}

export default new StockManagementService();
