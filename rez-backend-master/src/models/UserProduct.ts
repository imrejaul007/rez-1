import { logger } from '../config/logger';
// UserProduct Model
// Tracks products purchased by users with warranty, registration, installation, and AMC details

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWarranty {
  hasWarranty: boolean;
  startDate?: Date;
  endDate?: Date;
  duration?: number; // months
  warrantyCard?: string; // URL
  terms?: string[];
}

export interface IRegistration {
  isRegistered: boolean;
  registrationDate?: Date;
  serialNumber?: string;
  registrationNumber?: string;
}

export interface IInstallation {
  required: boolean;
  scheduled: boolean;
  scheduledDate?: Date;
  completed: boolean;
  completedDate?: Date;
  technician?: string;
  notes?: string;
}

export interface IAMC {
  hasAMC: boolean;
  startDate?: Date;
  endDate?: Date;
  serviceCount: number;
  amount?: number;
  renewalDue: boolean;
}

export interface IUserProduct extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  product: Types.ObjectId;
  order: Types.ObjectId;
  purchaseDate: Date;
  quantity: number;
  totalPrice: number;
  warranty: IWarranty;
  registration: IRegistration;
  installation: IInstallation;
  amc: IAMC;
  status: 'active' | 'warranty_expired' | 'returned' | 'replaced';
  serviceRequests: Types.ObjectId[];
  documents: string[]; // URLs to manuals, receipts, etc.
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  warrantyDaysRemaining?: number;
  warrantyStatus?: 'active' | 'expiring_soon' | 'expired' | 'no_warranty';
  isWarrantyExpiringSoon?: boolean;
  amcDaysRemaining?: number;
  isAMCExpiringSoon?: boolean;
}

const WarrantySchema = new Schema({
  hasWarranty: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  duration: { type: Number }, // months
  warrantyCard: { type: String }, // URL
  terms: [{ type: String }],
}, { _id: false });

const RegistrationSchema = new Schema({
  isRegistered: { type: Boolean, default: false },
  registrationDate: { type: Date },
  serialNumber: { type: String },
  registrationNumber: { type: String },
}, { _id: false });

const InstallationSchema = new Schema({
  required: { type: Boolean, default: false },
  scheduled: { type: Boolean, default: false },
  scheduledDate: { type: Date },
  completed: { type: Boolean, default: false },
  completedDate: { type: Date },
  technician: { type: String },
  notes: { type: String },
}, { _id: false });

const AMCSchema = new Schema({
  hasAMC: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  serviceCount: { type: Number, default: 0 },
  amount: { type: Number },
  renewalDue: { type: Boolean, default: false },
}, { _id: false });

const UserProductSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    warranty: {
      type: WarrantySchema,
      default: () => ({ hasWarranty: false }),
    },
    registration: {
      type: RegistrationSchema,
      default: () => ({ isRegistered: false }),
    },
    installation: {
      type: InstallationSchema,
      default: () => ({ required: false, scheduled: false, completed: false }),
    },
    amc: {
      type: AMCSchema,
      default: () => ({ hasAMC: false, serviceCount: 0, renewalDue: false }),
    },
    status: {
      type: String,
      enum: ['active', 'warranty_expired', 'returned', 'replaced'],
      default: 'active',
    },
    serviceRequests: [{
      type: Schema.Types.ObjectId,
      ref: 'ServiceRequest',
    }],
    documents: [{
      type: String, // URLs
    }],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
UserProductSchema.index({ user: 1, purchaseDate: -1 });
UserProductSchema.index({ user: 1, status: 1 });
UserProductSchema.index({ 'warranty.endDate': 1 });
UserProductSchema.index({ 'amc.endDate': 1 });

// Virtual: Warranty days remaining
UserProductSchema.virtual('warrantyDaysRemaining').get(function(this: IUserProduct) {
  if (!this.warranty.hasWarranty || !this.warranty.endDate) {
    return null;
  }

  const now = new Date();
  const endDate = new Date(this.warranty.endDate);
  const diff = endDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return days > 0 ? days : 0;
});

// Virtual: Warranty status
UserProductSchema.virtual('warrantyStatus').get(function(this: IUserProduct) {
  if (!this.warranty.hasWarranty) {
    return 'no_warranty';
  }

  const daysRemaining = this.warrantyDaysRemaining || 0;

  if (daysRemaining === 0) {
    return 'expired';
  } else if (daysRemaining <= 30) {
    return 'expiring_soon';
  } else {
    return 'active';
  }
});

// Virtual: Is warranty expiring soon (within 30 days)
UserProductSchema.virtual('isWarrantyExpiringSoon').get(function(this: IUserProduct) {
  if (!this.warranty.hasWarranty) {
    return false;
  }

  const daysRemaining = this.warrantyDaysRemaining || 0;
  return daysRemaining > 0 && daysRemaining <= 30;
});

// Virtual: AMC days remaining
UserProductSchema.virtual('amcDaysRemaining').get(function(this: IUserProduct) {
  if (!this.amc.hasAMC || !this.amc.endDate) {
    return null;
  }

  const now = new Date();
  const endDate = new Date(this.amc.endDate);
  const diff = endDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return days > 0 ? days : 0;
});

// Virtual: Is AMC expiring soon (within 30 days)
UserProductSchema.virtual('isAMCExpiringSoon').get(function(this: IUserProduct) {
  if (!this.amc.hasAMC) {
    return false;
  }

  const daysRemaining = this.amcDaysRemaining || 0;
  return daysRemaining > 0 && daysRemaining <= 30;
});

// Static method: Get user's products
UserProductSchema.statics.getUserProducts = async function(
  userId: Types.ObjectId,
  filters: any = {}
): Promise<IUserProduct[]> {
  const query: any = { user: userId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    // Will need to populate product and filter by category
  }

  if (filters.hasWarranty !== undefined) {
    query['warranty.hasWarranty'] = filters.hasWarranty;
  }

  if (filters.hasAMC !== undefined) {
    query['amc.hasAMC'] = filters.hasAMC;
  }

  return this.find(query)
    .populate('product', 'name images category basePrice')
    .populate('order', 'orderNumber totalAmount purchaseDate')
    .sort({ purchaseDate: -1 })
    .lean();
};

// Static method: Get products with expiring warranties
UserProductSchema.statics.getExpiringWarranties = async function(
  userId: Types.ObjectId,
  days: number = 30
): Promise<IUserProduct[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    user: userId,
    'warranty.hasWarranty': true,
    'warranty.endDate': {
      $gte: now,
      $lte: futureDate,
    },
  })
    .populate('product', 'name images category')
    .sort({ 'warranty.endDate': 1 })
    .lean();
};

// Static method: Get products with expiring AMC
UserProductSchema.statics.getExpiringAMC = async function(
  userId: Types.ObjectId,
  days: number = 30
): Promise<IUserProduct[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    user: userId,
    'amc.hasAMC': true,
    'amc.endDate': {
      $gte: now,
      $lte: futureDate,
    },
  })
    .populate('product', 'name images category')
    .sort({ 'amc.endDate': 1 })
    .lean();
};

// Static method: Mark expired warranties
UserProductSchema.statics.markExpiredWarranties = async function(): Promise<number> {
  const now = new Date();

  const result = await this.updateMany(
    {
      status: 'active',
      'warranty.hasWarranty': true,
      'warranty.endDate': { $lt: now },
    },
    {
      $set: { status: 'warranty_expired' },
    }
  );

  logger.info(`✅ Marked ${result.modifiedCount} products with expired warranties`);
  return result.modifiedCount;
};

// Instance method: Register product
UserProductSchema.methods.registerProduct = async function(
  serialNumber: string,
  registrationNumber?: string
): Promise<IUserProduct> {
  this.registration.isRegistered = true;
  this.registration.registrationDate = new Date();
  this.registration.serialNumber = serialNumber;

  if (registrationNumber) {
    this.registration.registrationNumber = registrationNumber;
  } else {
    // Auto-generate registration number
    const timestamp = Date.now();
    this.registration.registrationNumber = `REG-${timestamp}`;
  }

  await this.save();

  logger.info(`✅ Product registered: ${this.registration.registrationNumber}`);
  return this as unknown as unknown as IUserProduct;
};

// Instance method: Schedule installation
UserProductSchema.methods.scheduleInstallation = async function(
  scheduledDate: Date,
  technician?: string,
  notes?: string
): Promise<IUserProduct> {
  this.installation.scheduled = true;
  this.installation.scheduledDate = scheduledDate;

  if (technician) {
    this.installation.technician = technician;
  }

  if (notes) {
    this.installation.notes = notes;
  }

  await this.save();

  logger.info(`✅ Installation scheduled for: ${scheduledDate}`);
  return this as unknown as unknown as IUserProduct;
};

// Instance method: Complete installation
UserProductSchema.methods.completeInstallation = async function(
  notes?: string
): Promise<IUserProduct> {
  this.installation.completed = true;
  this.installation.completedDate = new Date();

  if (notes) {
    this.installation.notes = notes;
  }

  await this.save();

  logger.info(`✅ Installation completed for product`);
  return this as unknown as unknown as IUserProduct;
};

// Instance method: Renew AMC
UserProductSchema.methods.renewAMC = async function(
  duration: number, // months
  amount: number
): Promise<IUserProduct> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + duration);

  this.amc.hasAMC = true;
  this.amc.startDate = startDate;
  this.amc.endDate = endDate;
  this.amc.amount = amount;
  this.amc.renewalDue = false;

  await this.save();

  logger.info(`✅ AMC renewed until: ${endDate}`);
  return this as unknown as unknown as IUserProduct;
};

export const UserProduct = mongoose.model<IUserProduct>('UserProduct', UserProductSchema);
