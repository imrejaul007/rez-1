import mongoose, { Schema, Document, Types } from 'mongoose';

// Stock change types
export type StockChangeType =
  | 'purchase'           // Customer purchase (deduction)
  | 'return'            // Customer return (addition)
  | 'adjustment'        // Manual adjustment by merchant
  | 'restock'           // New stock received (addition)
  | 'reservation'       // Stock reserved for cart (temporary deduction)
  | 'reservation_release' // Reservation expired/cancelled (addition)
  | 'cancellation'      // Order cancelled (addition)
  | 'damage'            // Damaged inventory (deduction)
  | 'expired'           // Expired inventory (deduction)
  | 'theft'             // Theft/loss (deduction)
  | 'correction';       // Inventory correction

// Stock history interface
export interface IStockHistory extends Document {
  product: Types.ObjectId;
  store: Types.ObjectId;
  variant?: {
    type: string;
    value: string;
  };
  previousStock: number;
  newStock: number;
  changeAmount: number;
  changeType: StockChangeType;
  user?: Types.ObjectId;
  order?: Types.ObjectId;
  reservation?: Types.ObjectId;
  reason?: string;
  notes?: string;
  metadata?: {
    customerName?: string;
    orderId?: string;
    batchNumber?: string;
    expiryDate?: Date;
    supplierName?: string;
    invoiceNumber?: string;
    [key: string]: any;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Stock history schema
const StockHistorySchema = new Schema<IStockHistory>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
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
  previousStock: {
    type: Number,
    required: true,
    min: 0
  },
  newStock: {
    type: Number,
    required: true,
    min: 0
  },
  changeAmount: {
    type: Number,
    required: true
  },
  changeType: {
    type: String,
    required: true,
    enum: [
      'purchase',
      'return',
      'adjustment',
      'restock',
      'reservation',
      'reservation_release',
      'cancellation',
      'damage',
      'expired',
      'theft',
      'correction'
    ],
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  reservation: {
    type: Schema.Types.ObjectId,
    ref: 'Cart'
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'stock_history'
});

// Compound indexes for common queries
StockHistorySchema.index({ product: 1, timestamp: -1 });
StockHistorySchema.index({ store: 1, timestamp: -1 });
StockHistorySchema.index({ changeType: 1, timestamp: -1 });
StockHistorySchema.index({ user: 1, timestamp: -1 });
StockHistorySchema.index({
  product: 1,
  'variant.type': 1,
  'variant.value': 1,
  timestamp: -1
});

// Index for analytics queries
StockHistorySchema.index({
  store: 1,
  changeType: 1,
  timestamp: -1
});

// Virtual for absolute change amount
StockHistorySchema.virtual('absoluteChange').get(function() {
  return Math.abs(this.changeAmount);
});

// Virtual for change direction
StockHistorySchema.virtual('direction').get(function() {
  return this.changeAmount > 0 ? 'increase' : this.changeAmount < 0 ? 'decrease' : 'no_change';
});

// Virtual for percentage change
StockHistorySchema.virtual('percentageChange').get(function() {
  if (this.previousStock === 0) return this.changeAmount > 0 ? 100 : 0;
  return (this.changeAmount / this.previousStock) * 100;
});

// Static method to log stock change
StockHistorySchema.statics.logStockChange = async function(data: {
  productId: string | Types.ObjectId;
  storeId: string | Types.ObjectId;
  variant?: { type: string; value: string };
  previousStock: number;
  newStock: number;
  changeType: StockChangeType;
  userId?: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  reservationId?: string | Types.ObjectId;
  reason?: string;
  notes?: string;
  metadata?: any;
}) {
  const changeAmount = data.newStock - data.previousStock;

  const historyEntry = new this({
    product: data.productId,
    store: data.storeId,
    variant: data.variant,
    previousStock: data.previousStock,
    newStock: data.newStock,
    changeAmount,
    changeType: data.changeType,
    user: data.userId,
    order: data.orderId,
    reservation: data.reservationId,
    reason: data.reason,
    notes: data.notes,
    metadata: data.metadata,
    timestamp: new Date()
  });

  await historyEntry.save();
  return historyEntry;
};

// Static method to get stock history for a product
StockHistorySchema.statics.getProductHistory = function(
  productId: string | Types.ObjectId,
  options: {
    variant?: { type: string; value: string };
    startDate?: Date;
    endDate?: Date;
    changeTypes?: StockChangeType[];
    limit?: number;
    skip?: number;
  } = {}
) {
  const query: any = { product: productId };

  if (options.variant) {
    query['variant.type'] = options.variant.type;
    query['variant.value'] = options.variant.value;
  }

  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }

  if (options.changeTypes && options.changeTypes.length > 0) {
    query.changeType = { $in: options.changeTypes };
  }

  return this.find(query)
    .populate('user', 'name email phone')
    .populate('order', 'orderNumber status')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

// Static method to get stock snapshot at a specific date
StockHistorySchema.statics.getStockSnapshot = async function(
  productId: string | Types.ObjectId,
  date: Date,
  variant?: { type: string; value: string }
) {
  const query: any = {
    product: productId,
    timestamp: { $lte: date }
  };

  if (variant) {
    query['variant.type'] = variant.type;
    query['variant.value'] = variant.value;
  }

  const lastEntry = await this.findOne(query)
    .sort({ timestamp: -1 })
    .limit(1);

  return lastEntry ? lastEntry.newStock : 0;
};

// Static method to detect anomalies
StockHistorySchema.statics.detectAnomalies = async function(
  storeId: string | Types.ObjectId,
  options: {
    days?: number;
    threshold?: number;
  } = {}
) {
  const days = options.days || 7;
  const threshold = options.threshold || 50; // Threshold for large changes
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const anomalies = await this.aggregate([
    {
      $match: {
        store: new Types.ObjectId(storeId as string),
        timestamp: { $gte: startDate },
        $expr: { $gte: [{ $abs: '$changeAmount' }, threshold] }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    {
      $unwind: '$productInfo'
    },
    {
      $project: {
        product: 1,
        productName: '$productInfo.name',
        changeAmount: 1,
        changeType: 1,
        timestamp: 1,
        previousStock: 1,
        newStock: 1,
        reason: 1,
        absoluteChange: { $abs: '$changeAmount' },
        percentageChange: {
          $cond: [
            { $eq: ['$previousStock', 0] },
            100,
            { $multiply: [{ $divide: ['$changeAmount', '$previousStock'] }, 100] }
          ]
        }
      }
    },
    {
      $sort: { timestamp: -1 }
    }
  ]);

  return anomalies;
};

// Static method to generate stock report
StockHistorySchema.statics.generateStockReport = async function(
  storeId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  const report = await this.aggregate([
    {
      $match: {
        store: new Types.ObjectId(storeId as string),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          product: '$product',
          changeType: '$changeType'
        },
        totalChanges: { $sum: 1 },
        totalQuantity: { $sum: '$changeAmount' },
        absoluteQuantity: { $sum: { $abs: '$changeAmount' } }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    {
      $unwind: '$productInfo'
    },
    {
      $group: {
        _id: '$_id.product',
        productName: { $first: '$productInfo.name' },
        currentStock: { $first: '$productInfo.inventory.stock' },
        changes: {
          $push: {
            changeType: '$_id.changeType',
            totalChanges: '$totalChanges',
            totalQuantity: '$totalQuantity',
            absoluteQuantity: '$absoluteQuantity'
          }
        }
      }
    },
    {
      $sort: { productName: 1 }
    }
  ]);

  return report;
};

// Model interface with static methods
interface IStockHistoryModel extends mongoose.Model<IStockHistory> {
  logStockChange(data: any): Promise<IStockHistory>;
  getProductHistory(productId: string, options?: any): Promise<IStockHistory[]>;
  getStockSnapshot(productId: string, date?: Date): Promise<any>;
  detectAnomalies(productId: string, threshold?: number): Promise<any[]>;
  generateStockReport(startDate: Date, endDate: Date, productIds?: string[]): Promise<any[]>;
}

export const StockHistory = mongoose.model<IStockHistory, IStockHistoryModel>('StockHistory', StockHistorySchema);
