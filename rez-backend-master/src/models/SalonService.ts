import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { logger } from '../config/logger';

// Salon service category
export type SalonServiceCategory = 'salon' | 'spa' | 'beauty' | 'wellness' | 'other';

export interface ISalonService extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  description?: string;
  category: SalonServiceCategory;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  duration: number; // in minutes
  bufferTimeAfter: number; // cleanup/transition time in minutes
  isActive: boolean;
  imageUrl?: string;
  gender: 'male' | 'female' | 'unisex';
  maxPerSlot: number; // how many simultaneous bookings allowed per slot
  createdAt: Date;
  updatedAt: Date;
}

// Working hours for a single day
export interface IDayWorkingHours {
  open: string; // "09:00"
  close: string; // "21:00"
  closed: boolean;
}

// Staff working schedule
export interface IStaffWorkingSchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  hours: IDayWorkingHours;
}

export interface ISalonStaff extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  merchantUserId: Types.ObjectId; // Reference to MerchantUser
  name: string;
  phone?: string;
  email?: string;
  services: Types.ObjectId[]; // SalonService IDs this staff can perform
  workingHours: IStaffWorkingSchedule[];
  isActive: boolean;
  bio?: string;
  profileImageUrl?: string;
  rating?: number;
  totalReviews?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── SalonService Schema ─────────────────────────────────────────────────────────

const SalonServiceSchema = new Schema<ISalonService>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      enum: ['salon', 'spa', 'beauty', 'wellness', 'other'],
      default: 'salon',
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 480,
      default: 60,
    },
    bufferTimeAfter: {
      type: Number,
      default: 10,
      min: 0,
      max: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      default: 'unisex',
    },
    maxPerSlot: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes
SalonServiceSchema.index({ storeId: 1, isActive: 1, category: 1 });
SalonServiceSchema.index({ merchantId: 1, storeId: 1 });

// Virtual: discount percentage
SalonServiceSchema.virtual('discountPercentage').get(function (this: ISalonService) {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual: effective duration (service + buffer)
SalonServiceSchema.virtual('effectiveDuration').get(function (this: ISalonService) {
  return this.duration + this.bufferTimeAfter;
});

// Static: Find services by store, optionally filtered by category
SalonServiceSchema.statics.findByStore = function (
  storeId: Types.ObjectId,
  options?: { category?: SalonServiceCategory; activeOnly?: boolean },
) {
  const query: any = { storeId };
  if (options?.category) query.category = options.category;
  if (options?.activeOnly !== false) query.isActive = true;
  return this.find(query).sort({ category: 1, price: 1 }).lean();
};

// Static: Find staff who can perform a given service
SalonServiceSchema.statics.findStaffForService = async function (storeId: Types.ObjectId, serviceId: Types.ObjectId) {
  const { SalonStaff } = require('./SalonStaff');
  return SalonStaff.find({
    storeId,
    services: serviceId,
    isActive: true,
  }).lean();
};

export interface ISalonServiceModel extends Model<ISalonService> {
  findByStore(
    storeId: Types.ObjectId,
    options?: { category?: SalonServiceCategory; activeOnly?: boolean },
  ): Promise<ISalonService[]>;
  findStaffForService(storeId: Types.ObjectId, serviceId: Types.ObjectId): Promise<ISalonStaff[]>;
}

export const SalonService = mongoose.model<ISalonService, ISalonServiceModel>('SalonService', SalonServiceSchema);

// ─── SalonStaff Schema ──────────────────────────────────────────────────────────

const SalonStaffSchema = new Schema<ISalonStaff>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    merchantUserId: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantUser',
      required: true,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: 'SalonService',
        index: true,
      },
    ],
    workingHours: [
      {
        dayOfWeek: {
          type: Number,
          required: true,
          min: 0,
          max: 6,
        },
        hours: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '21:00' },
          closed: { type: Boolean, default: false },
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
SalonStaffSchema.index({ storeId: 1, isActive: 1 });
SalonStaffSchema.index({ merchantId: 1, storeId: 1 });

// Instance method: Check if staff works on a given day and time
SalonStaffSchema.methods.isAvailableOn = function (dayOfWeek: number, time: string): boolean {
  const daySchedule = this.workingHours.find((w: IStaffWorkingSchedule) => w.dayOfWeek === dayOfWeek);
  if (!daySchedule || daySchedule.hours.closed) return false;

  const [reqH, reqM] = time.split(':').map(Number);
  const [openH, openM] = daySchedule.hours.open.split(':').map(Number);
  const [closeH, closeM] = daySchedule.hours.close.split(':').map(Number);

  const reqMinutes = reqH * 60 + reqM;
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return reqMinutes >= openMinutes && reqMinutes < closeMinutes;
};

// Instance method: Get working hours for a given day
SalonStaffSchema.methods.getWorkingHoursForDay = function (dayOfWeek: number): IDayWorkingHours | null {
  const schedule = this.workingHours.find((w: IStaffWorkingSchedule) => w.dayOfWeek === dayOfWeek);
  return schedule ? schedule.hours : null;
};

// Static: Find staff by store
SalonStaffSchema.statics.findByStore = function (storeId: Types.ObjectId, activeOnly = true) {
  const query: any = { storeId };
  if (activeOnly) query.isActive = true;
  return this.find(query).populate('services', 'name category duration price').lean();
};

export interface ISalonStaffModel extends Model<ISalonStaff> {
  findByStore(storeId: Types.ObjectId, activeOnly?: boolean): Promise<ISalonStaff[]>;
}

export const SalonStaff = mongoose.model<ISalonStaff, ISalonStaffModel>('SalonStaff', SalonStaffSchema);
