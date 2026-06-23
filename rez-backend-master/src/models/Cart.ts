import mongoose, { Schema, Document, Types } from 'mongoose';
import { Model } from 'mongoose';
import { mul, sub, pct, round2, add } from '../utils/currency';
import { logger } from '../config/logger';

// Service booking details for cart items
export interface IServiceBookingDetails {
  bookingDate: Date;
  timeSlot: {
    start: string;
    end: string;
  };
  duration: number; // in minutes
  serviceType: 'home' | 'store' | 'online';
  customerNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface ICartItem {
  product?: Types.ObjectId; // Optional - for products
  event?: Types.ObjectId; // Optional - for events
  store: Types.ObjectId | null; // Allow null for products without store
  itemType: 'product' | 'service' | 'event'; // Type of item
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
  price: number;
  originalPrice?: number;
  discount?: number;
  lockedQuantity?: number; // Number of items that have lock fee applied (discount only for these)
  addedAt: Date;
  notes?: string;
  metadata?: any; // For storing event-specific metadata (slotId, etc.)
  serviceBookingDetails?: IServiceBookingDetails; // For service bookings
}

// Reserved item interface for stock reservation
export interface IReservedItem {
  productId: Types.ObjectId;
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
  reservedAt: Date;
  expiresAt: Date;
}

// Locked item interface for price locking with payment
export interface ILockedItem {
  product: Types.ObjectId;
  store: Types.ObjectId;
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
  lockedPrice: number;
  originalPrice?: number;
  lockedAt: Date;
  expiresAt: Date;
  notes?: string;

  // Payment fields for paid lock feature (MakeMyTrip style)
  lockFee?: number;                    // Amount paid to lock
  lockFeePercentage?: number;          // 5, 7, or 10 based on duration
  lockDuration?: number;               // Duration in hours (24, 72, 168)
  paymentMethod?: 'wallet' | 'paybill' | 'upi';
  paymentTransactionId?: Types.ObjectId; // Reference to Transaction
  lockPaymentStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited' | 'applied'; // applied = used in checkout
  isPaidLock?: boolean;                // true if user paid to lock (vs free lock)
}

export interface ICartModel extends Model<ICart> {
  getActiveCart(userId: string): Promise<ICart | null>;
  cleanupExpired(): Promise<{ acknowledged: boolean; deletedCount: number }>;
}


// Cart totals interface
export interface ICartTotals {
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  cashback: number;
  total: number;
  savings: number; // Total amount saved
  platformFee?: number;      // 15% of subtotal - platform commission (preview)
  merchantPayout?: number;   // subtotal - platformFee - what merchant receives (preview)
}

// Cart coupon interface
export interface ICartCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliedAmount: number;
  appliedAt: Date;
}

// Main Cart interface
// Main Cart interface
export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  reservedItems: IReservedItem[]; // Stock reservations
  lockedItems: ILockedItem[]; // Price locked items
  totals: ICartTotals;
  coupon?: ICartCoupon;
  deliveryAddress?: Types.ObjectId;
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addItem(productId: string, quantity: number, variant?: any): Promise<void>;
  removeItem(productId: string, variant?: any): Promise<void>;
  updateItemQuantity(productId: string, quantity: number, variant?: any): Promise<void>;
  calculateTotals(): Promise<void>;
  applyCoupon(couponCode: string): Promise<boolean>;
  removeCoupon(): Promise<void>;
  clearCart(): Promise<void>;
  isExpired(): boolean;
  lockItem(productId: string, quantity: number, variant?: any, lockDuration?: number): Promise<void>;
  unlockItem(productId: string, variant?: any): Promise<void>;
  moveLockedToCart(productId: string, variant?: any): Promise<void>;

  // Virtuals 👇
  itemCount: number;
  storeCount: number;
}


// Cart Schema
const CartSchema = new Schema<ICart>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false // Optional - for products
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: false // Optional - for events
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false // Allow null for products without store
    },
    itemType: {
      type: String,
      enum: ['product', 'service', 'event'],
      default: 'product'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99
    },
    variant: {
      type: {
        type: String,
        trim: true
      },
      value: {
        type: String,
        trim: true
      }
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    lockedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    metadata: {
      type: Schema.Types.Mixed, // For storing event-specific metadata (slotId, etc.)
      required: false
    },
    // Service booking details
    serviceBookingDetails: {
      bookingDate: {
        type: Date
      },
      timeSlot: {
        start: { type: String },
        end: { type: String }
      },
      duration: {
        type: Number, // in minutes
        min: 15
      },
      serviceType: {
        type: String,
        enum: ['home', 'store', 'online']
      },
      customerNotes: {
        type: String,
        trim: true,
        maxlength: 500
      },
      customerName: {
        type: String,
        trim: true
      },
      customerPhone: {
        type: String,
        trim: true
      },
      customerEmail: {
        type: String,
        trim: true,
        lowercase: true
      }
    }
  }],
  reservedItems: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    variant: {
      type: {
        type: String,
        trim: true
      },
      value: {
        type: String,
        trim: true
      }
    },
    reservedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true // Index for efficient cleanup queries
    }
  }],
  lockedItems: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    variant: {
      type: {
        type: String,
        trim: true
      },
      value: {
        type: String,
        trim: true
      }
    },
    lockedPrice: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // Payment fields for paid lock feature (MakeMyTrip style)
    lockFee: {
      type: Number,
      min: 0,
      default: 0
    },
    lockFeePercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    lockDuration: {
      type: Number,
      min: 1
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'paybill', 'upi']
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    lockPaymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'forfeited', 'applied'],
      default: 'pending'
    },
    isPaidLock: {
      type: Boolean,
      default: false
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    delivery: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    cashback: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    savings: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  coupon: {
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    discountValue: {
      type: Number,
      min: 0
    },
    appliedAmount: {
      type: Number,
      min: 0
    },
    appliedAt: {
      type: Date
    }
  },
  deliveryAddress: {
    type: Schema.Types.ObjectId,
    ref: 'Address'
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  estimatedDeliveryTime: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CartSchema.index({ user: 1, isActive: 1 });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
CartSchema.index({ 'items.product': 1 });
CartSchema.index({ 'items.store': 1 });
CartSchema.index({ updatedAt: -1 });

// Compound index for fetching user's active cart sorted by most recent
CartSchema.index({ user: 1, isActive: 1, updatedAt: -1 });

// Virtual for total items count
CartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total: number, item: ICartItem) => total + item.quantity, 0);
});

// Virtual for unique stores count
CartSchema.virtual('storeCount').get(function() {
  const uniqueStores = new Set(
    this.items
      .filter((item: ICartItem) => item.store != null)
      .map((item: ICartItem) => item.store!.toString())
  );
  return uniqueStores.size;
});

// Virtual for expired status
CartSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Pre-save validation: ensure each item has either product or event
CartSchema.pre('save', function(next) {
  for (const item of this.items) {
    if (!item.product && !item.event) {
      return next(new Error('Cart item must have either a product or an event'));
    }
    if (item.product && item.event) {
      return next(new Error('Cart item cannot have both a product and an event'));
    }
  }
  next();
});

// Pre-save hook to calculate totals
CartSchema.pre('save', async function(next) {
  if (this.isModified('items') || this.isModified('coupon')) {
    await this.calculateTotals();
  }
  next();
});

// Method to add item to cart
CartSchema.methods.addItem = async function(
  productId: string, 
  quantity: number = 1, 
  variant?: any
): Promise<void> {
  const Product = this.model('Product');
  const product = await Product.findById(productId).populate('store').lean();
  
  logger.info('🛒 [CART MODEL] Product lookup result:', {
    productId,
    productFound: !!product,
    productName: product?.name,
    productStore: product?.store,
    productIsActive: product?.isActive,
    productInventoryAvailable: product?.inventory?.isAvailable
  });
  
  if (!product || !product.isActive || !product.inventory.isAvailable) {
    throw new Error('Product not available');
  }
  
  // Check stock availability with detailed error messages
  let availableStock = product.inventory.stock;
  let variantInfo = '';

  if (variant && product.inventory.variants) {
    const variantObj = product.getVariantByType(variant.type, variant.value);
    if (!variantObj) {
      throw new Error(`Product variant "${variant.value}" is not available`);
    }
    availableStock = variantObj.stock;
    variantInfo = ` (${variant.type}: ${variant.value})`;
  }

  // Stock validation with user-friendly messages
  if (!product.inventory.unlimited) {
    if (availableStock === 0) {
      throw new Error(`${product.name}${variantInfo} is currently out of stock`);
    }

    if (availableStock < quantity) {
      const message = availableStock === 1
        ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
        : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
      throw new Error(message);
    }
  }
  
  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex((item: ICartItem) => {
    if (!item.product) return false;
    const productMatch = item.product.toString() === productId;
    const variantMatch = variant
      ? item.variant?.type === variant.type && item.variant?.value === variant.value
      : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
    return productMatch && variantMatch;
  });
  
  if (existingItemIndex > -1) {
    // Update existing item quantity
    const newQuantity = this.items[existingItemIndex].quantity + quantity;

    // Check if new total quantity exceeds available stock
    if (!product.inventory.unlimited) {
      if (availableStock === 0) {
        throw new Error(`${product.name}${variantInfo} is currently out of stock`);
      }

      if (availableStock < newQuantity) {
        const message = availableStock === 1
          ? `Only 1 item of ${product.name}${variantInfo} is available. You already have ${this.items[existingItemIndex].quantity} in your cart`
          : `Only ${availableStock} items of ${product.name}${variantInfo} are available. You already have ${this.items[existingItemIndex].quantity} in your cart`;
        throw new Error(message);
      }
    }

    this.items[existingItemIndex].quantity = newQuantity;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    logger.info('🛒 [CART MODEL] Adding new item to cart');
    logger.info('🛒 [CART MODEL] Product price structure:', {
      price: product.price,
      pricing: product.pricing
    });

    const extractedPrice = product.price?.current || product.pricing?.selling || 0;
    const extractedOriginalPrice = product.price?.original || product.pricing?.original || 0;
    // Note: product.price?.discount is the SALE discount, not lock fee
    // The discount field on cart items is ONLY for lock fees (paid at lock)
    // Sale discounts are shown via originalPrice vs price comparison

    logger.info('🛒 [CART MODEL] Extracted prices:', {
      price: extractedPrice,
      originalPrice: extractedOriginalPrice,
      saleDiscount: extractedOriginalPrice - extractedPrice // For logging only
    });

    const cartItem: ICartItem = {
      product: product._id,
      store: product.store?._id || null, // Handle case where store is null
      quantity,
      variant,
      price: extractedPrice,
      originalPrice: extractedOriginalPrice,
      discount: 0, // Only set for lock fees (via moveLockedToCart)
      lockedQuantity: 0, // No locked items for regular cart add
      itemType: 'product',
      addedAt: new Date()
    };

    logger.info('🛒 [CART MODEL] Final cart item:', cartItem);
    this.items.push(cartItem);
  }
  
  // Extend cart expiry
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

// Method to remove item from cart
CartSchema.methods.removeItem = async function(
  productId: string,
  variant?: any
): Promise<void> {
  this.items = this.items.filter((item: ICartItem) => {
    // Skip items with null product (corrupted data)
    if (!item.product) {
      logger.warn('⚠️ [CART] Removing item with null product during filter');
      return false; // Remove null product items
    }

    // Handle both populated and unpopulated product references
    const productRef = item.product as any;
    const itemProductId = productRef._id ? productRef._id.toString() : productRef.toString();
    const productMatch = itemProductId === productId;
    const variantMatch = variant
      ? item.variant?.type === variant.type && item.variant?.value === variant.value
      : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
    return !(productMatch && variantMatch);
  });
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = async function(
  productId: string, 
  quantity: number,
  variant?: any
): Promise<void> {
  if (quantity <= 0) {
    return this.removeItem(productId, variant);
  }
  
  logger.info('🛒 [UPDATE ITEM QTY] Searching for product:', productId);
  logger.info('🛒 [UPDATE ITEM QTY] Cart has items:', this.items.map((item: ICartItem) => {
    // Skip null product items
    if (!item.product) {
      logger.warn('⚠️ [CART] Found item with null product');
      return { productId: null, variant: item.variant };
    }
    const productRef = item.product as any;
    return {
      productId: productRef._id ? productRef._id.toString() : productRef.toString(),
      variant: item.variant
    };
  }));

  const itemIndex = this.items.findIndex((item: ICartItem) => {
    // Skip items with null product
    if (!item.product) {
      logger.warn('⚠️ [CART] Skipping item with null product in findIndex');
      return false;
    }
    // Handle both populated and unpopulated product references
    const productRef = item.product as any;
    const itemProductId = productRef._id ? productRef._id.toString() : productRef.toString();
    const productMatch = itemProductId === productId;
    const variantMatch = variant
      ? item.variant?.type === variant.type && item.variant?.value === variant.value
      : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));

    logger.info(`🛒 [UPDATE ITEM QTY] Comparing item ${itemProductId} with ${productId}:`, {
      productMatch,
      variantMatch,
      itemVariant: item.variant,
      searchVariant: variant
    });

    return productMatch && variantMatch;
  });

  logger.info('🛒 [UPDATE ITEM QTY] Found item index:', itemIndex);

  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }
  
  // Check stock availability with detailed error messages
  const Product = this.model('Product');
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  if (!product.isActive || !product.inventory.isAvailable) {
    throw new Error('Product is no longer available');
  }

  let availableStock = product.inventory.stock;
  let variantInfo = '';

  if (variant && product.inventory.variants) {
    const variantObj = product.getVariantByType(variant.type, variant.value);
    if (!variantObj) {
      throw new Error(`Product variant "${variant.value}" is not available`);
    }
    availableStock = variantObj.stock;
    variantInfo = ` (${variant.type}: ${variant.value})`;
  }

  // Stock validation with user-friendly messages
  if (!product.inventory.unlimited) {
    if (availableStock === 0) {
      throw new Error(`${product.name}${variantInfo} is currently out of stock`);
    }

    if (availableStock < quantity) {
      const message = availableStock === 1
        ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
        : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
      throw new Error(message);
    }
  }
  
  this.items[itemIndex].quantity = quantity;
  this.items[itemIndex].addedAt = new Date();
};

// Method to calculate totals
CartSchema.methods.calculateTotals = async function(): Promise<void> {
  let subtotal = 0;
  let savings = 0;
  let itemDiscounts = 0; // Total of lock fee discounts

  // Calculate subtotal and savings
  this.items.forEach((item: ICartItem) => {
    // Calculate item total based on locked quantity
    // lockedQuantity items get the lock fee discount, remaining items are at full price
    const lockedQty = item.lockedQuantity || 0;
    const regularQty = item.quantity - lockedQty;
    const lockFeeDiscount = item.discount || 0;

    // All items at original price, then subtract lock fee discount
    // This ensures: 2 items at ₹10,000 = ₹20,000, minus ₹500 lock fee = ₹19,500
    const itemTotal = (item.price * item.quantity) - lockFeeDiscount;
    subtotal += itemTotal;

    // Track lock fee discounts for display
    if (lockFeeDiscount > 0) {
      itemDiscounts += lockFeeDiscount;
      savings += lockFeeDiscount;
    }

    // Also track savings from original price differences (sale prices, etc.)
    if (item.originalPrice && item.originalPrice > item.price) {
      savings += (item.originalPrice - item.price) * item.quantity;
    }
  });
  
  // Calculate tax (assume 5% GST for now - this should be configurable)
  const tax = pct(subtotal, 5);
  
  // Calculate delivery fee (this should be based on store policies and distance)
  let delivery = 0;
  const uniqueStores = new Set(
    this.items
      .filter((item: ICartItem) => item.store != null)
      .map((item: ICartItem) => item.store!.toString())
  );

  // Simple delivery calculation - ₹50 per store, free above ₹500
  if (subtotal < 500) {
    delivery = uniqueStores.size * 50;
  }
  
  // Apply coupon discount
  let couponDiscount = 0;
  if (this.coupon && this.coupon.discountValue) {
    logger.info('💳 [CALCULATE TOTALS] Applying coupon:', {
      code: this.coupon.code,
      type: this.coupon.discountType,
      value: this.coupon.discountValue,
      subtotal
    });
    
    if (this.coupon.discountType === 'percentage') {
      couponDiscount = pct(subtotal, this.coupon.discountValue);
    } else {
      couponDiscount = this.coupon.discountValue;
    }
    couponDiscount = Math.min(couponDiscount, subtotal); // Don't exceed subtotal
    couponDiscount = Math.max(0, couponDiscount); // Don't allow negative
    this.coupon.appliedAmount = couponDiscount || 0; // Ensure it's not NaN
    
    logger.info('💳 [CALCULATE TOTALS] Coupon discount calculated:', couponDiscount);
  } else if (this.coupon) {
    logger.warn('⚠️ [CALCULATE TOTALS] Coupon exists but has invalid discountValue:', this.coupon);
  }
  
  // Calculate cashback (simplified - this should be based on store offers)
  const cashback = pct(sub(subtotal, couponDiscount), 2);
  
  // Calculate total with detailed logging
  const total = subtotal + tax + delivery - couponDiscount;
  
  logger.info('💰 [CALCULATE TOTALS] Calculation breakdown:', {
    subtotal,
    tax,
    delivery,
    couponDiscount,
    total,
    formula: `${subtotal} + ${tax} + ${delivery} - ${couponDiscount} = ${total}`
  });
  
  // Ensure all values are valid numbers (rounded to 2dp)
  const finalSubtotal = round2(Number(subtotal) || 0);
  const finalTax = round2(Number(tax) || 0);
  const finalDelivery = round2(Number(delivery) || 0);
  const finalDiscount = round2(Number(couponDiscount) || 0);
  const finalCashback = round2(Number(cashback) || 0);
  const finalTotal = Math.max(0, round2(Number(total) || 0));
  const finalSavings = round2(Number(savings) || 0);

  // Calculate 15% platform fee preview (on subtotal only)
  const finalPlatformFee = pct(finalSubtotal, 15);
  const finalMerchantPayout = sub(finalSubtotal, finalPlatformFee);

  this.totals = {
    subtotal: finalSubtotal,
    tax: finalTax,
    delivery: finalDelivery,
    discount: finalDiscount,
    cashback: finalCashback,
    total: finalTotal,
    savings: finalSavings,
    platformFee: finalPlatformFee,
    merchantPayout: finalMerchantPayout
  };
  
  logger.info('✅ [CALCULATE TOTALS] Final totals set:', this.totals);
};

// Method to apply coupon
CartSchema.methods.applyCoupon = async function(couponCode: string): Promise<boolean> {
  // This is a simplified implementation
  // In a real app, you'd validate the coupon against a Coupon model
  const validCoupons = {
    'WELCOME10': { type: 'percentage', value: 10, minAmount: 200 },
    'SAVE50': { type: 'fixed', value: 50, minAmount: 300 },
    'NEWUSER': { type: 'percentage', value: 15, minAmount: 500 }
  };
  
  const coupon = validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons];
  if (!coupon) {
    return false;
  }
  
  if (this.totals.subtotal < coupon.minAmount) {
    throw new Error(`Minimum order amount of ₹${coupon.minAmount} required for this coupon`);
  }
  
  this.coupon = {
    code: couponCode.toUpperCase(),
    discountType: coupon.type as 'percentage' | 'fixed',
    discountValue: coupon.value,
    appliedAmount: 0,
    appliedAt: new Date()
  };
  
  return true;
};

// Method to remove coupon
CartSchema.methods.removeCoupon = async function(): Promise<void> {
  this.coupon = undefined;
};

// Method to clear cart
CartSchema.methods.clearCart = async function(): Promise<void> {
  this.items = [];
  this.coupon = undefined;
  this.totals = {
    subtotal: 0,
    tax: 0,
    delivery: 0,
    discount: 0,
    cashback: 0,
    total: 0,
    savings: 0
  };
};

// Lock item at current price
CartSchema.methods.lockItem = async function(
  productId: string,
  quantity: number = 1,
  variant?: any,
  lockDurationHours: number = 24
): Promise<void> {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId).populate('store');

  if (!product) {
    throw new Error('Product not found');
  }

  // Debug: Log the full product structure to understand pricing fields
  logger.info('🔒 [LOCK] Product structure:', {
    name: product.name,
    pricing: product.pricing,
    price: product.price,
    hasPrice: !!product.price,
    hasPricing: !!product.pricing,
    pricingKeys: product.pricing ? Object.keys(product.pricing) : [],
    priceKeys: product.price ? Object.keys(product.price) : []
  });

  // Debug: Log specific pricing values (access via _doc to bypass getters)
  const rawProduct = (product as any)._doc || product;
  logger.info('🔒 [LOCK] Detailed pricing values:', {
    'pricing.selling': product.pricing?.selling,
    'pricing.original': product.pricing?.original,
    'pricing.discount': product.pricing?.discount,
    'price.current': rawProduct.price?.current,
    'price.original': rawProduct.price?.original,
    'raw price object': rawProduct.price
  });

  // First, remove any expired locked items
  const now = new Date();
  this.lockedItems = this.lockedItems.filter((item: any) => item.expiresAt > now);
  logger.info('🔒 [LOCK] After removing expired items, locked items count:', this.lockedItems.length);

  // Check if item is already locked (non-expired)
  const existingLockIndex = this.lockedItems.findIndex((item: any) =>
    item.product.toString() === productId &&
    (!variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value))
  );

  // Extract price with proper fallbacks to handle both old and new schema formats
  // Try new schema first (pricing.selling), then old schema (price.current)
  const lockedPrice = product.pricing?.selling ||
                      rawProduct.price?.current ||  // Access raw data for old schema
                      product.pricing?.original ||
                      rawProduct.price?.original ||
                      0;

  logger.info('🔒 [LOCK] Extracted lockedPrice:', lockedPrice);

  if (!lockedPrice || lockedPrice === 0) {
    logger.error('❌ [LOCK] Failed to extract price from product:', {
      pricing: product.pricing,
      price: rawProduct.price,
      rawProduct: rawProduct
    });
    throw new Error('Product price not available');
  }

  const expiresAt = new Date(Date.now() + lockDurationHours * 60 * 60 * 1000);

  if (existingLockIndex > -1) {
    // Update existing locked item (extend lock)
    logger.info('🔒 [LOCK] Extending existing lock for product:', productId);
    this.lockedItems[existingLockIndex].quantity = quantity;
    this.lockedItems[existingLockIndex].lockedPrice = lockedPrice;
    this.lockedItems[existingLockIndex].expiresAt = expiresAt;
    this.lockedItems[existingLockIndex].lockedAt = new Date(); // Update lock time
  } else {
    // Add new locked item
    logger.info('🔒 [LOCK] Creating new lock for product:', productId);
    // Ensure we only store the ObjectId, not the populated object
    const storeId = typeof product.store === 'object' && product.store?._id
      ? product.store._id
      : product.store || null;

    // Extract original price with proper fallbacks for both old and new schemas
    const originalPrice = product.pricing?.original ||
                         rawProduct.price?.original ||  // Access raw data for old schema
                         product.pricing?.mrp ||
                         lockedPrice; // Use lockedPrice as fallback if no original price

    this.lockedItems.push({
      product: productId, // Use the productId parameter directly
      store: storeId,
      quantity,
      variant,
      lockedPrice,
      originalPrice,
      lockedAt: new Date(),
      expiresAt,
      notes: `Locked at ₹${lockedPrice}`
    });
  }

  logger.info('🔒 [LOCK] Total locked items after operation:', this.lockedItems.length);
  await this.save();
};

// Unlock item
CartSchema.methods.unlockItem = async function(
  productId: string,
  variant?: any
): Promise<void> {
  logger.info('🔓 [UNLOCK MODEL] Attempting to unlock product:', productId);
  logger.info('🔓 [UNLOCK MODEL] Current locked items:', this.lockedItems.length);

  this.lockedItems = this.lockedItems.filter((item: any) => {
    // Handle both populated and unpopulated product references
    let itemProductId: string;
    if (typeof item.product === 'object' && item.product._id) {
      // Product is populated
      itemProductId = item.product._id.toString();
    } else if (typeof item.product === 'string' && item.product.includes('{')) {
      // Product is stringified object - extract ID
      const match = item.product.match(/id['"]\s*:\s*['"]([\w]+)['"]/);
      itemProductId = match ? match[1] : item.product;
    } else {
      // Product is just an ID
      itemProductId = item.product.toString();
    }

    logger.info('🔓 [UNLOCK MODEL] Comparing:', { itemProductId, productId, match: itemProductId === productId });

    const productMatch = itemProductId === productId;
    const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);

    // Return true to KEEP the item, false to REMOVE it
    return !(productMatch && variantMatch);
  });

  logger.info('🔓 [UNLOCK MODEL] After filter, locked items:', this.lockedItems.length);
  await this.save();
};

// Move locked item to cart
CartSchema.methods.moveLockedToCart = async function(
  productId: string,
  variant?: any
): Promise<void> {
  logger.info('➡️ [MOVE MODEL] Attempting to move locked item to cart:', productId);
  logger.info('➡️ [MOVE MODEL] Current locked items:', this.lockedItems.length);

  const lockedItemIndex = this.lockedItems.findIndex((item: any) => {
    // Handle both populated and unpopulated product references
    let itemProductId: string;
    if (typeof item.product === 'object' && item.product._id) {
      // Product is populated
      itemProductId = item.product._id.toString();
    } else if (typeof item.product === 'string' && item.product.includes('{')) {
      // Product is stringified object - extract ID
      const match = item.product.match(/id['"]\s*:\s*['"]([\w]+)['"]/);
      itemProductId = match ? match[1] : item.product;
    } else {
      // Product is just an ID
      itemProductId = item.product.toString();
    }

    logger.info('➡️ [MOVE MODEL] Comparing:', { itemProductId, productId, match: itemProductId === productId });

    const productMatch = itemProductId === productId;
    const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);

    return productMatch && variantMatch;
  });

  logger.info('➡️ [MOVE MODEL] Found locked item at index:', lockedItemIndex);

  if (lockedItemIndex === -1) {
    throw new Error('Locked item not found');
  }

  const lockedItem = this.lockedItems[lockedItemIndex];

  // For paid locks, we need to apply the lock fee as a discount
  if (lockedItem.isPaidLock && lockedItem.lockFee) {
    logger.info('➡️ [MOVE MODEL] Moving paid locked item with lock fee applied:', {
      lockedPrice: lockedItem.lockedPrice,
      lockFee: lockedItem.lockFee,
      remainingPrice: lockedItem.lockedPrice - lockedItem.lockFee
    });

    // Get product and store info
    const Product = this.model('Product');
    const product = await Product.findById(productId).populate('store').lean();

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if item already exists in cart
    const existingItemIndex = this.items.findIndex((item: ICartItem) => {
      if (!item.product) return false;
      const itemProductMatch = item.product.toString() === productId;
      const variantMatch = variant
        ? item.variant?.type === variant.type && item.variant?.value === variant.value
        : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
      return itemProductMatch && variantMatch;
    });

    if (existingItemIndex > -1) {
      // Update existing item - add quantities and track locked quantity
      this.items[existingItemIndex].quantity += lockedItem.quantity;
      // Track how many items have the lock fee discount
      this.items[existingItemIndex].lockedQuantity = (this.items[existingItemIndex].lockedQuantity || 0) + lockedItem.quantity;
      // Apply the lock fee discount
      this.items[existingItemIndex].discount = (this.items[existingItemIndex].discount || 0) + lockedItem.lockFee;
      this.items[existingItemIndex].addedAt = new Date();
    } else {
      // Add new item - keep original price and track lockedQuantity
      // The lock fee discount will be applied based on lockedQuantity in calculateTotals
      const cartItem: ICartItem = {
        product: (product as any)._id,
        store: (product as any).store?._id || null,
        quantity: lockedItem.quantity,
        variant: lockedItem.variant,
        price: lockedItem.lockedPrice, // Original price (₹10,000)
        originalPrice: lockedItem.lockedPrice,
        discount: lockedItem.lockFee, // Lock fee (₹500) - only applies to lockedQuantity
        lockedQuantity: lockedItem.quantity, // How many items have the lock fee discount
        itemType: 'product',
        addedAt: new Date(),
        notes: `Lock fee of ₹${lockedItem.lockFee} already paid for ${lockedItem.quantity} item(s)`
      };

      logger.info('➡️ [MOVE MODEL] Adding cart item with lock fee discount:', cartItem);
      this.items.push(cartItem);
    }
  } else {
    // Regular lock (not paid) - use normal addItem
    await this.addItem(productId, lockedItem.quantity, variant);
  }

  // Remove from locked items
  this.lockedItems.splice(lockedItemIndex, 1);

  // Extend cart expiry
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  logger.info('➡️ [MOVE MODEL] Item moved successfully, remaining locked items:', this.lockedItems.length);
  await this.save();
};

// Static method to get active cart for user.
//
// IMPORTANT: We deliberately return the raw cart without Mongoose `.populate()`
// because populate() issues one query per document in the array. For a cart
// with N items + M locked items + K store refs, populate() was 5+N+M+K queries.
//
// Callers (cartController.getCart) now do their own batched lookups using
// a single `$in` query per collection. This method returns the raw cart;
// the controller is responsible for hydrating it.
CartSchema.statics.getActiveCart = function(userId: string) {
  return this.findOne({ user: userId, isActive: true });
};

// Static method to cleanup expired carts
CartSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isActive: false
  });
};

export const Cart = mongoose.model<ICart, ICartModel>('Cart', CartSchema);
