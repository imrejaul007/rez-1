import { logger } from '../config/logger';
// Admin Wallet Model
// Singleton wallet for platform commission tracking (5% of order subtotals)

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdminWalletTransaction {
  type: 'commission' | 'adjustment';
  amount: number;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  description: string;
  createdAt: Date;
}

export interface IAdminWallet extends Document {
  singleton: boolean;
  balance: {
    total: number;
    available: number;
  };
  statistics: {
    totalCommissions: number;
    totalOrders: number;
    averageCommission: number;
  };
  transactions: IAdminWalletTransaction[];

  // Instance methods
  creditCommission(orderId: Types.ObjectId, orderNumber: string, amount: number): Promise<IAdminWallet>;
}

export interface IAdminWalletModel extends mongoose.Model<IAdminWallet> {
  getOrCreate(): Promise<IAdminWallet>;
}

const AdminWalletTransactionSchema = new Schema<IAdminWalletTransaction>({
  type: {
    type: String,
    required: true,
    enum: ['commission', 'adjustment']
  },
  amount: {
    type: Number,
    required: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderNumber: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const AdminWalletSchema = new Schema<IAdminWallet>({
  singleton: {
    type: Boolean,
    default: true,
    unique: true
  },
  balance: {
    total: { type: Number, default: 0, min: 0 },
    available: { type: Number, default: 0, min: 0 }
  },
  statistics: {
    totalCommissions: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    averageCommission: { type: Number, default: 0 }
  },
  transactions: [AdminWalletTransactionSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Instance method: credit commission from an order
AdminWalletSchema.methods.creditCommission = async function(
  orderId: Types.ObjectId,
  orderNumber: string,
  amount: number
): Promise<IAdminWallet> {
  this.transactions.push({
    type: 'commission',
    amount,
    orderId,
    orderNumber,
    description: `5% commission from order ${orderNumber}`,
    createdAt: new Date()
  });

  this.balance.total += amount;
  this.balance.available += amount;

  this.statistics.totalCommissions += amount;
  this.statistics.totalOrders += 1;
  this.statistics.averageCommission = this.statistics.totalOrders > 0
    ? Math.round(this.statistics.totalCommissions / this.statistics.totalOrders)
    : 0;

  return this.save();
};

// Static method: get or create the singleton wallet
AdminWalletSchema.statics.getOrCreate = async function(): Promise<IAdminWallet> {
  let wallet = await this.findOne({ singleton: true });
  if (!wallet) {
    wallet = await this.create({
      singleton: true,
      balance: { total: 0, available: 0 },
      statistics: { totalCommissions: 0, totalOrders: 0, averageCommission: 0 },
      transactions: []
    });
    logger.info('[ADMIN WALLET] Created new admin wallet');
  }
  return wallet;
};

// Index for efficient transaction queries
AdminWalletSchema.index({ 'transactions.createdAt': -1 });
AdminWalletSchema.index({ 'transactions.orderId': 1 });

const AdminWallet = mongoose.model<IAdminWallet, IAdminWalletModel>('AdminWallet', AdminWalletSchema);

export default AdminWallet;
