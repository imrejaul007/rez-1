import { logger } from '../config/logger';
/**
 * Price Alert Model
 *
 * Manages user price alert subscriptions.
 * Users get notified when product prices drop below their target price.
 *
 * Features:
 * - Target price alerts
 * - Percentage drop alerts
 * - Multiple notification methods
 * - Automatic triggering on price changes
 * - Alert expiration
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

interface IPriceAlert extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: string;
  alertType: 'target_price' | 'percentage_drop' | 'any_drop';
  targetPrice?: number;
  percentageDrop?: number;
  currentPriceAtCreation: number;
  notificationMethod: ('email' | 'push' | 'sms')[];
  contact: {
    email?: string;
    phone?: string;
  };
  status: 'active' | 'triggered' | 'expired' | 'cancelled';
  triggeredAt?: Date;
  triggeredPrice?: number;
  expiresAt: Date;
  metadata?: {
    productName?: string;
    productImage?: string;
    variantAttributes?: any;
    ipAddress?: string;
    userAgent?: string;
  };
  shouldTrigger(newPrice: number): boolean;
  trigger(triggeredPrice: number): Promise<IPriceAlert>;
  cancel(): Promise<IPriceAlert>;
  daysUntilExpiration?: number;
}

interface IPriceAlertModel extends Model<IPriceAlert> {
  findActiveForProduct(productId: string, variantId?: string | null): Promise<IPriceAlert[]>;
  hasActiveAlert(userId: string, productId: string, variantId?: string | null): Promise<boolean>;
  getUserAlerts(userId: string, options?: any): Promise<IPriceAlert[]>;
  checkAndTriggerAlerts(productId: string, variantId: string | null, newPrice: number): Promise<IPriceAlert[]>;
  expireOldAlerts(): Promise<number>;
  getProductStats(productId: string): Promise<any>;
}

const priceAlertSchema = new Schema<IPriceAlert>(
  {
    // User who created the alert
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Product to monitor
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    // Optional variant
    variantId: {
      type: String,
      required: false,
      index: true,
    },

    // Alert conditions
    alertType: {
      type: String,
      enum: ['target_price', 'percentage_drop', 'any_drop'],
      required: true,
    },

    targetPrice: {
      type: Number,
      required: false, // Required for target_price type
    },

    percentageDrop: {
      type: Number,
      required: false, // Required for percentage_drop type
      min: 1,
      max: 100,
    },

    // Current price when alert was created
    currentPriceAtCreation: {
      type: Number,
      required: true,
    },

    // Notification preferences
    notificationMethod: {
      type: [String],
      enum: ['email', 'push', 'sms'],
      default: ['push'],
    },

    contact: {
      email: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'triggered', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },

    // When alert was triggered
    triggeredAt: {
      type: Date,
      required: false,
    },

    triggeredPrice: {
      type: Number,
      required: false,
    },

    // Alert expiration (default: 90 days)
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },

    // Metadata
    metadata: {
      productName: String,
      productImage: String,
      variantAttributes: Schema.Types.Mixed,
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
priceAlertSchema.index({ productId: 1, variantId: 1, status: 1 });
priceAlertSchema.index({ userId: 1, status: 1 });
priceAlertSchema.index({ status: 1, expiresAt: 1 });

/**
 * Find active alerts for a product
 */
priceAlertSchema.statics.findActiveForProduct = function (productId: string, variantId: string | null = null) {
  const query: any = {
    productId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (variantId) {
    query.variantId = variantId;
  }

  return this.find(query).populate('userId', 'name email phone');
};

/**
 * Check if user has active alert for product
 */
priceAlertSchema.statics.hasActiveAlert = async function (userId: string, productId: string, variantId: string | null = null) {
  const query: any = {
    userId,
    productId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (variantId) {
    query.variantId = variantId;
  }

  const count = await this.countDocuments(query);
  return count > 0;
};

/**
 * Get user's alerts
 */
priceAlertSchema.statics.getUserAlerts = function (userId: string, options: any = {}) {
  const { page = 1, limit = 20, status } = options;

  const query: any = { userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('productId', 'name images pricing')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

/**
 * Check if alert should trigger based on new price
 */
priceAlertSchema.methods.shouldTrigger = function (newPrice: number): boolean {
  if (this.status !== 'active') {
    return false;
  }

  if (new Date() > this.expiresAt) {
    return false;
  }

  switch (this.alertType) {
    case 'target_price':
      return newPrice <= (this.targetPrice || 0);

    case 'percentage_drop':
      const dropPercentage = ((this.currentPriceAtCreation - newPrice) / this.currentPriceAtCreation) * 100;
      return dropPercentage >= (this.percentageDrop || 0);

    case 'any_drop':
      return newPrice < this.currentPriceAtCreation;

    default:
      return false;
  }
};

/**
 * Trigger the alert
 */
priceAlertSchema.methods.trigger = function (triggeredPrice: number) {
  this.status = 'triggered';
  this.triggeredAt = new Date();
  this.triggeredPrice = triggeredPrice;
  return this.save();
};

/**
 * Cancel the alert
 */
priceAlertSchema.methods.cancel = function () {
  this.status = 'cancelled';
  return this.save();
};

/**
 * Check and trigger alerts for a price change
 */
priceAlertSchema.statics.checkAndTriggerAlerts = async function (productId: string, variantId: string | null, newPrice: number) {
  logger.info(`🔍 [PriceAlert] Checking alerts for product ${productId}, new price: ${newPrice}`);

  const activeAlerts = await (this as any).findActiveForProduct(productId, variantId);

  const triggeredAlerts: IPriceAlert[] = [];

  for (const alert of activeAlerts) {
    if (alert.shouldTrigger(newPrice)) {
      await alert.trigger(newPrice);
      triggeredAlerts.push(alert);

      // Send notifications via user's selected methods (fire-and-forget)
      (async () => {
        try {
          const { Product } = await import('./Product');
          const product = await Product.findById(alert.productId).select('name').lean();
          const productName = (product as any)?.name || 'Product';
          const message = `Price alert: ${productName} dropped to ${newPrice.toFixed(2)}!`;

          if (alert.notificationMethod.includes('push')) {
            const pushService = (await import('../services/pushNotificationService')).default;
            const { User } = await import('./User');
            const user = await User.findById(alert.userId).select('phoneNumber').lean();
            if (user?.phoneNumber) {
              await pushService.sendOrderUpdate(
                String(alert._id),
                user.phoneNumber,
                'Price Drop Alert',
                message
              );
            }
          }
          if (alert.notificationMethod.includes('email') && alert.contact.email) {
            const EmailService = (await import('../services/EmailService')).default;
            await EmailService.send({
              to: alert.contact.email,
              subject: `Price Drop Alert: ${productName}`,
              text: message,
            });
          }
          if (alert.notificationMethod.includes('sms') && alert.contact.phone) {
            const SMSService = (await import('../services/SMSService')).default;
            await SMSService.send({ to: alert.contact.phone, message });
          }
        } catch (err) {
          // Notification failure should not block alert processing
        }
      })();
    }
  }

  return triggeredAlerts;
};

/**
 * Expire old alerts
 */
priceAlertSchema.statics.expireOldAlerts = async function () {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  );

  logger.info(`🧹 [PriceAlert] Expired ${result.modifiedCount} old alerts`);

  return result.modifiedCount;
};

/**
 * Get alert statistics for a product
 */
priceAlertSchema.statics.getProductStats = async function (productId: string) {
  const stats = await this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result: any = {
    total: 0,
    active: 0,
    triggered: 0,
    expired: 0,
    cancelled: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  // Get average target price for active target_price alerts
  const avgTargetPrice = await this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        alertType: 'target_price',
        status: 'active',
      },
    },
    {
      $group: {
        _id: null,
        avgTargetPrice: { $avg: '$targetPrice' },
      },
    },
  ]);

  if (avgTargetPrice.length > 0) {
    result.averageTargetPrice = avgTargetPrice[0].avgTargetPrice;
  }

  return result;
};

// Pre-save validation
priceAlertSchema.pre('save', function (next) {
  // Validate target price for target_price type
  if (this.alertType === 'target_price' && !this.targetPrice) {
    return next(new Error('Target price is required for target_price alerts'));
  }

  // Validate percentage drop for percentage_drop type
  if (this.alertType === 'percentage_drop' && !this.percentageDrop) {
    return next(new Error('Percentage drop is required for percentage_drop alerts'));
  }

  // Ensure at least one contact method if email/sms is selected
  if (this.notificationMethod.includes('email') && !this.contact.email) {
    return next(new Error('Email is required when email notification is selected'));
  }

  if (this.notificationMethod.includes('sms') && !this.contact.phone) {
    return next(new Error('Phone number is required when SMS notification is selected'));
  }

  next();
});

// Virtual for days until expiration
priceAlertSchema.virtual('daysUntilExpiration').get(function () {
  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON
priceAlertSchema.set('toJSON', { virtuals: true });
priceAlertSchema.set('toObject', { virtuals: true });

const PriceAlert = mongoose.model<IPriceAlert, IPriceAlertModel>('PriceAlert', priceAlertSchema);

export default PriceAlert;
