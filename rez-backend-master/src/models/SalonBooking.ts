import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { logger } from '../config/logger';

export type SalonBookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface ISalonBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  serviceId: Types.ObjectId;
  serviceName: string;
  staffId?: Types.ObjectId;
  staffName?: string;
  bookingDate: Date;
  timeSlot: string; // "HH:MM" format
  duration: number; // service duration in minutes
  effectiveDuration: number; // duration + buffer time
  price: number;
  status: SalonBookingStatus;
  notes?: string;
  // Customer details (denormalized for display speed)
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  // Status history for audit trail
  statusHistory: Array<{ status: SalonBookingStatus; timestamp: Date; note?: string }>;
  // Timestamps
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalonBookingSchema = new Schema<ISalonBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
    },
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'SalonService',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'SalonStaff',
    },
    staffName: {
      type: String,
      trim: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Time must be in HH:MM format (24-hour)',
      },
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 480,
    },
    effectiveDuration: {
      type: Number,
      required: true,
      min: 15,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
        },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, trim: true },
      },
    ],
    confirmedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for performance
SalonBookingSchema.index({ storeId: 1, bookingDate: 1, status: 1 });
SalonBookingSchema.index({ userId: 1, bookingDate: -1 });
SalonBookingSchema.index({ staffId: 1, bookingDate: 1 });
SalonBookingSchema.index({ storeId: 1, status: 1, bookingDate: 1 });

// Virtual: formatted date-time string
SalonBookingSchema.virtual('formattedDateTime').get(function (this: ISalonBooking) {
  const date = new Date(this.bookingDate);
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr} at ${this.timeSlot}`;
});

// Pre-validate: generate booking number
SalonBookingSchema.pre('validate', async function (next) {
  if (this.isNew && !this.bookingNumber) {
    const timestamp = Date.now();
    const random = crypto.randomUUID().replace('-', '').substring(0, 4);
    this.bookingNumber = `SB-${timestamp}-${random}`;
  }
  next();
});

// Pre-validate: record initial status in history
SalonBookingSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status as SalonBookingStatus,
      timestamp: new Date(),
      note: 'Booking created',
    });
  }
  next();
});

// Static: Find by booking number
SalonBookingSchema.statics.findByBookingNumber = function (bookingNumber: string) {
  return this.findOne({ bookingNumber })
    .populate('storeId', 'name logo location contact')
    .populate('serviceId', 'name category duration price')
    .populate('staffId', 'name profileImageUrl')
    .lean();
};

// Static: Get user's bookings
SalonBookingSchema.statics.findUserBookings = function (
  userId: Types.ObjectId,
  options?: { limit?: number; skip?: number },
) {
  return this.find({ userId })
    .populate('storeId', 'name logo location')
    .populate('serviceId', 'name category duration price imageUrl')
    .populate('staffId', 'name profileImageUrl')
    .sort({ bookingDate: -1, createdAt: -1 })
    .limit(options?.limit ?? 20)
    .skip(options?.skip ?? 0)
    .lean();
};

// Static: Get store's bookings for a date
SalonBookingSchema.statics.findStoreBookings = function (storeId: Types.ObjectId, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    storeId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate('userId', 'profile.firstName profile.lastName')
    .populate('serviceId', 'name category duration')
    .populate('staffId', 'name')
    .sort({ timeSlot: 1 })
    .lean();
};

// Static: Check if a time slot is available for a staff member on a date
SalonBookingSchema.statics.isSlotAvailable = async function (
  storeId: Types.ObjectId,
  staffId: Types.ObjectId | null,
  date: Date,
  time: string,
  duration: number,
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [reqHour, reqMin] = time.split(':').map(Number);
  const reqStart = reqHour * 60 + reqMin;
  const reqEnd = reqStart + duration;

  const query: any = {
    storeId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  };
  if (staffId) query.staffId = staffId;

  const conflicts = await this.find(query).lean();

  for (const booking of conflicts) {
    const [bHour, bMin] = booking.timeSlot.split(':').map(Number);
    const bStart = bHour * 60 + bMin;
    const bEnd = bStart + booking.effectiveDuration;

    // Overlap check: ranges intersect if one starts before the other ends
    if (reqStart < bEnd && reqEnd > bStart) {
      return false;
    }
  }

  return true;
};

// Static: Get available time slots for a staff member on a date
SalonBookingSchema.statics.getAvailableSlots = async function (
  storeId: Types.ObjectId,
  staffId: Types.ObjectId,
  date: Date,
  serviceDuration: number,
  workingHours: { open: string; close: string },
): Promise<Array<{ time: string; available: boolean }>> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [openH, openM] = workingHours.open.split(':').map(Number);
  const [closeH, closeM] = workingHours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Fetch all bookings for the staff on this date
  const bookings = await this.find({
    storeId,
    staffId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  }).lean();

  const slots: Array<{ time: string; available: boolean }> = [];

  // Generate slots at 30-minute intervals
  for (let mins = openMinutes; mins + serviceDuration <= closeMinutes; mins += 30) {
    const slotStart = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    const slotEnd = mins + serviceDuration;

    let available = true;

    for (const booking of bookings) {
      const [bHour, bMin] = booking.timeSlot.split(':').map(Number);
      const bStart = bHour * 60 + bMin;
      const bEnd = bStart + booking.effectiveDuration;

      if (mins < bEnd && slotEnd > bStart) {
        available = false;
        break;
      }
    }

    slots.push({ time: slotStart, available });
  }

  return slots;
};

// Instance method: Update status
SalonBookingSchema.methods.updateStatus = async function (newStatus: SalonBookingStatus, note?: string) {
  this.status = newStatus;

  if (newStatus === 'confirmed') {
    this.confirmedAt = new Date();
  } else if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }

  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
  });

  await this.save();
  logger.info(`[SalonBooking] ${this.bookingNumber} status updated to: ${newStatus}`);
  return this;
};

export interface ISalonBookingModel extends Model<ISalonBooking> {
  findByBookingNumber(bookingNumber: string): Promise<ISalonBooking | null>;
  findUserBookings(userId: Types.ObjectId, options?: { limit?: number; skip?: number }): Promise<ISalonBooking[]>;
  findStoreBookings(storeId: Types.ObjectId, date: Date): Promise<ISalonBooking[]>;
  isSlotAvailable(
    storeId: Types.ObjectId,
    staffId: Types.ObjectId | null,
    date: Date,
    time: string,
    duration: number,
  ): Promise<boolean>;
  getAvailableSlots(
    storeId: Types.ObjectId,
    staffId: Types.ObjectId,
    date: Date,
    serviceDuration: number,
    workingHours: { open: string; close: string },
  ): Promise<Array<{ time: string; available: boolean }>>;
}

export const SalonBooking = mongoose.model<ISalonBooking, ISalonBookingModel>('SalonBooking', SalonBookingSchema);
