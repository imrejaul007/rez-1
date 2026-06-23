// Re-order Service
// Handles re-ordering logic, product availability checks, and smart suggestions

import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { AppError } from '../middleware/errorHandler';
import { pct, add, sub } from '../utils/currency';
import { logger } from '../config/logger';

export interface ReorderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  currentPrice: number;
  originalPrice: number;
  priceDifference: number;
  isAvailable: boolean;
  hasStockIssue: boolean;
  availableStock: number;
  hasVariantIssue: boolean;
  replacementSuggestion?: {
    productId: string;
    name: string;
    price: number;
    image: string;
  };
}

export interface ReorderValidation {
  canReorder: boolean;
  items: ReorderItem[];
  unavailableItems: any[];
  priceChanges: any[];
  totalOriginal: number;
  totalCurrent: number;
  totalDifference: number;
  warnings: string[];
}

export interface FrequentlyOrderedItem {
  productId: string;
  productName: string;
  productImage: string;
  storeId: string;
  storeName: string;
  orderCount: number;
  lastOrderDate: Date;
  averageQuantity: number;
  totalSpent: number;
  currentPrice: number;
  isAvailable: boolean;
}

export interface ReorderSuggestion {
  type: 'frequent' | 'consumable' | 'subscription';
  productId: string;
  productName: string;
  productImage: string;
  storeId: string;
  storeName: string;
  reason: string;
  lastOrderDate?: Date;
  orderFrequency?: number; // days between orders
  suggestedQuantity: number;
  currentPrice: number;
  isAvailable: boolean;
}

class ReorderService {
  /**
   * Validate if an order can be reordered
   * Checks product availability, stock, and price changes
   */
  async validateReorder(userId: string, orderId: string, selectedItemIds?: string[]): Promise<ReorderValidation> {
    try {
      logger.info('[REORDER SERVICE] Validating reorder:', { userId, orderId, selectedItemIds });

      // Get original order
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate('items.product')
        .lean();

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Filter items if specific items selected
      let itemsToReorder = order.items;
      if (selectedItemIds && selectedItemIds.length > 0) {
        itemsToReorder = order.items.filter(item =>
          item.product && selectedItemIds.includes(item.product._id?.toString() || '')
        );
      }

      const reorderItems: ReorderItem[] = [];
      const unavailableItems: any[] = [];
      const priceChanges: any[] = [];
      const warnings: string[] = [];
      let totalOriginal = 0;
      let totalCurrent = 0;

      // Validate each item
      for (const orderItem of itemsToReorder) {
        const originalPrice = orderItem.price;
        const originalQuantity = orderItem.quantity;
        const productId = orderItem.product._id?.toString() || '';

        totalOriginal += originalPrice * originalQuantity;

        // Get current product data
        const product = await Product.findById(productId)
          .populate('store', 'name')
          .lean();

        if (!product) {
          unavailableItems.push({
            productId,
            name: orderItem.name,
            reason: 'Product no longer exists',
            originalPrice,
            quantity: originalQuantity
          });
          warnings.push(`"${orderItem.name}" is no longer available`);
          continue;
        }

        // Check if product is active
        if (!(product as any).isActive) {
          unavailableItems.push({
            productId,
            name: (product as any).name,
            reason: 'Product discontinued',
            originalPrice,
            quantity: originalQuantity
          });
          warnings.push(`"${(product as any).name}" has been discontinued`);
          continue;
        }

        // Get current price
        const currentPrice = (product as any).basePrice || (product as any).salePrice || originalPrice;
        const priceDifference = currentPrice - originalPrice;

        // Check stock availability
        let availableStock = 0;
        let hasStockIssue = false;
        let hasVariantIssue = false;

        if (orderItem.variant && (product as any).inventory?.variants?.length > 0) {
          // Check variant stock
          const variant = (product as any).inventory.variants.find((v: any) =>
            v.type === orderItem.variant?.type && v.value === orderItem.variant?.value
          );

          if (!variant) {
            hasVariantIssue = true;
            unavailableItems.push({
              productId,
              name: (product as any).name,
              variant: orderItem.variant,
              reason: 'Variant no longer available',
              originalPrice,
              quantity: originalQuantity
            });
            warnings.push(`"${(product as any).name}" (${orderItem.variant.type}: ${orderItem.variant.value}) variant is no longer available`);
            continue;
          }

          availableStock = variant.stock || 0;
        } else {
          // Check main product stock
          availableStock = (product as any).inventory?.stock || 0;
        }

        hasStockIssue = availableStock < originalQuantity;
        const isAvailable = !hasStockIssue && !hasVariantIssue;

        if (hasStockIssue) {
          warnings.push(
            `"${(product as any).name}" has limited stock. Only ${availableStock} available (you ordered ${originalQuantity})`
          );
        }

        // Track price changes
        if (Math.abs(priceDifference) > 0.01) {
          priceChanges.push({
            productId,
            name: (product as any).name,
            originalPrice,
            currentPrice,
            difference: priceDifference,
            percentChange: ((priceDifference / originalPrice) * 100).toFixed(2)
          });

          if (priceDifference > 0) {
            warnings.push(`"${(product as any).name}" price increased by ₹${priceDifference.toFixed(2)}`);
          } else {
            warnings.push(`"${(product as any).name}" price decreased by ₹${Math.abs(priceDifference).toFixed(2)}`);
          }
        }

        totalCurrent += currentPrice * Math.min(originalQuantity, availableStock);

        reorderItems.push({
          productId,
          variantId: orderItem.variant?.value,
          quantity: originalQuantity,
          currentPrice,
          originalPrice,
          priceDifference,
          isAvailable,
          hasStockIssue,
          availableStock,
          hasVariantIssue
        });
      }

      const totalDifference = totalCurrent - totalOriginal;
      const canReorder = reorderItems.length > 0;

      logger.info('[REORDER SERVICE] Validation complete:', {
        canReorder,
        itemCount: reorderItems.length,
        unavailableCount: unavailableItems.length,
        totalDifference
      });

      return {
        canReorder,
        items: reorderItems,
        unavailableItems,
        priceChanges,
        totalOriginal,
        totalCurrent,
        totalDifference,
        warnings
      };
    } catch (error: any) {
      logger.error('[REORDER SERVICE] Validation error:', error);
      throw error;
    }
  }

  /**
   * Add order items to cart
   */
  async addToCart(userId: string, orderId: string, selectedItemIds?: string[]): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('[REORDER SERVICE] Adding order items to cart:', { userId, orderId, selectedItemIds });

      // Validate reorder first
      const validation = await this.validateReorder(userId, orderId, selectedItemIds);

      if (!validation.canReorder || validation.items.length === 0) {
        throw new AppError('No items available to reorder', 400);
      }

      // Get original order
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate('items.product')
        .populate('items.store')
        .lean();

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Get or create cart
      let cart = await Cart.findOne({ user: userId }).session(session).lean();
      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totals: {
            subtotal: 0,
            tax: 0,
            delivery: 0,
            discount: 0,
            cashback: 0,
            total: 0
          }
        }) as any;
      }

      const addedItems: any[] = [];
      const skippedItems: any[] = [];

      // Add available items to cart
      for (const validItem of validation.items) {
        if (!validItem.isAvailable) {
          skippedItems.push({
            productId: validItem.productId,
            reason: validItem.hasStockIssue ? 'Out of stock' : 'Not available'
          });
          continue;
        }

        // Find original order item
        const originalItem = order.items.find(
          item => item.product && item.product._id?.toString() === validItem.productId
        );

        if (!originalItem) continue;

        // Check if item already in cart (only check product items, not events)
        const existingCartItem = cart!.items.find(
          item => item.product && 
                  item.product.toString() === validItem.productId &&
                  JSON.stringify(item.variant) === JSON.stringify(originalItem.variant)
        );

        const quantityToAdd = Math.min(validItem.quantity, validItem.availableStock);

        if (existingCartItem) {
          // Update quantity
          existingCartItem.quantity += quantityToAdd;
        } else {
          // Add new item
          cart!.items.push({
            product: new mongoose.Types.ObjectId(validItem.productId),
            store: originalItem.store._id,
            quantity: quantityToAdd,
            variant: originalItem.variant,
            price: validItem.currentPrice,
            originalPrice: validItem.currentPrice,
            discount: 0,
            itemType: 'product',
            addedAt: new Date()
          });
        }

        addedItems.push({
          productId: validItem.productId,
          name: originalItem.name,
          quantity: quantityToAdd,
          price: validItem.currentPrice
        });
      }

      // Recalculate cart totals
      let subtotal = 0;
      for (const item of cart!.items) {
        subtotal += item.price * item.quantity;
      }

      cart!.totals.subtotal = subtotal;
      cart!.totals.tax = pct(subtotal, 5); // 5% tax
      cart!.totals.delivery = subtotal > 500 ? 0 : 40; // Free delivery above ₹500
      cart!.totals.total = sub(add(subtotal, cart!.totals.tax, cart!.totals.delivery), cart!.totals.discount);

      await cart!.save({ session });

      await session.commitTransaction();
      session.endSession();

      logger.info('[REORDER SERVICE] Items added to cart:', {
        addedCount: addedItems.length,
        skippedCount: skippedItems.length
      });

      return {
        cart,
        addedItems,
        skippedItems,
        validation
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('[REORDER SERVICE] Add to cart error:', error);
      throw error;
    }
  }

  /**
   * Get frequently ordered items
   */
  async getFrequentlyOrdered(userId: string, limit: number = 10): Promise<FrequentlyOrderedItem[]> {
    try {
      logger.info('[REORDER SERVICE] Getting frequently ordered items:', { userId, limit });

      const frequentItems = await Order.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: 'delivered' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            storeId: { $first: '$items.store' },
            orderCount: { $sum: 1 },
            lastOrderDate: { $max: '$createdAt' },
            averageQuantity: { $avg: '$items.quantity' },
            totalSpent: { $sum: '$items.subtotal' }
          }
        },
        { $sort: { orderCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'stores',
            localField: 'storeId',
            foreignField: '_id',
            as: 'store'
          }
        },
        { $unwind: '$store' },
        {
          $project: {
            productId: '$_id',
            productName: '$product.name',
            productImage: { $arrayElemAt: ['$product.images', 0] },
            storeId: '$store._id',
            storeName: '$store.name',
            orderCount: 1,
            lastOrderDate: 1,
            averageQuantity: { $round: ['$averageQuantity', 0] },
            totalSpent: { $round: ['$totalSpent', 2] },
            currentPrice: { $ifNull: ['$product.pricing.selling', '$product.pricing.original', 0] },
            isAvailable: '$product.isActive'
          }
        }
      ]);

      logger.info('[REORDER SERVICE] Found frequent items:', frequentItems.length);

      return frequentItems;
    } catch (error: any) {
      logger.error('[REORDER SERVICE] Frequently ordered error:', error);
      throw error;
    }
  }

  /**
   * Get smart reorder suggestions
   */
  async getReorderSuggestions(userId: string): Promise<ReorderSuggestion[]> {
    try {
      logger.info('[REORDER SERVICE] Getting reorder suggestions:', { userId });

      const suggestions: ReorderSuggestion[] = [];

      // Get user's order history
      const orders = await Order.find({
        user: userId,
        status: 'delivered'
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('items.product')
        .populate('items.store')
        .lean();

      if (orders.length < 2) {
        logger.warn('[REORDER SERVICE] Not enough order history');
        return [];
      }

      // Analyze order patterns
      const productOrders = new Map<string, any[]>();

      for (const order of orders) {
        for (const item of order.items) {
          // Skip event items - only process product items
          if (!item.product) continue;
          
          const productId = item.product._id?.toString() || '';
          if (!productOrders.has(productId)) {
            productOrders.set(productId, []);
          }
          productOrders.get(productId)?.push({
            date: order.createdAt,
            quantity: item.quantity,
            product: item.product,
            store: item.store
          });
        }
      }

      // Generate suggestions based on patterns
      for (const [productId, orderHistory] of productOrders.entries()) {
        if (orderHistory.length < 2) continue;

        const product = orderHistory[0].product;
        const store = orderHistory[0].store;

        // Check if product is still available
        const currentProduct = await Product.findById(productId).lean();
        if (!currentProduct || !(currentProduct as any).isActive) continue;

        // Calculate order frequency (days between orders)
        const dates = orderHistory.map(o => new Date(o.date).getTime()).sort();
        const intervals: number[] = [];
        for (let i = 1; i < dates.length; i++) {
          intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Check if it's time to reorder (consumable pattern)
        const daysSinceLastOrder = (Date.now() - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);

        if (daysSinceLastOrder >= averageInterval * 0.8) {
          suggestions.push({
            type: 'consumable',
            productId,
            productName: product.name,
            productImage: product.images?.[0] || product.image || '',
            storeId: store._id.toString(),
            storeName: store.name,
            reason: `You order this every ${Math.round(averageInterval)} days. Time to restock!`,
            lastOrderDate: new Date(dates[dates.length - 1]),
            orderFrequency: Math.round(averageInterval),
            suggestedQuantity: Math.round(
              orderHistory.reduce((sum, o) => sum + o.quantity, 0) / orderHistory.length
            ),
            currentPrice: (currentProduct as any).basePrice || (currentProduct as any).salePrice || 0,
            isAvailable: true
          });
        }

        // Frequent items (ordered 3+ times)
        if (orderHistory.length >= 3) {
          const lastOrderDate = new Date(dates[dates.length - 1]);
          const daysSince = (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

          // Only suggest if not ordered recently (> 7 days)
          if (daysSince > 7) {
            suggestions.push({
              type: 'frequent',
              productId,
              productName: product.name,
              productImage: product.images?.[0] || product.image || '',
              storeId: store._id.toString(),
              storeName: store.name,
              reason: `You've ordered this ${orderHistory.length} times`,
              lastOrderDate,
              suggestedQuantity: Math.round(
                orderHistory.reduce((sum, o) => sum + o.quantity, 0) / orderHistory.length
              ),
              currentPrice: (currentProduct as any).basePrice || (currentProduct as any).salePrice || 0,
              isAvailable: true
            });
          }
        }

        // Subscription candidates (ordered regularly, 4+ times)
        if (orderHistory.length >= 4 && averageInterval <= 30) {
          suggestions.push({
            type: 'subscription',
            productId,
            productName: product.name,
            productImage: product.images?.[0] || product.image || '',
            storeId: store._id.toString(),
            storeName: store.name,
            reason: `Save with auto-delivery every ${Math.round(averageInterval)} days`,
            orderFrequency: Math.round(averageInterval),
            suggestedQuantity: Math.round(
              orderHistory.reduce((sum, o) => sum + o.quantity, 0) / orderHistory.length
            ),
            currentPrice: (currentProduct as any).basePrice || (currentProduct as any).salePrice || 0,
            isAvailable: true
          });
        }
      }

      // Sort by relevance (consumable > frequent > subscription)
      suggestions.sort((a, b) => {
        const typeOrder = { consumable: 1, frequent: 2, subscription: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      logger.info('[REORDER SERVICE] Generated suggestions:', suggestions.length);

      return suggestions.slice(0, 10); // Return top 10
    } catch (error: any) {
      logger.error('[REORDER SERVICE] Suggestions error:', error);
      throw error;
    }
  }
}

const reorderService = new ReorderService();
export default reorderService;
