import mongoose, { Schema, Document, Types, Model } from 'mongoose';

// ─── Booking Status ────────────────────────────────────────────────────────────
export type HomeServiceBookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// ─── Address ──────────────────────────────────────────────────────────────────
export interface IHomeServiceAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ─── Timeline Entry ────────────────────────────────────────────────────────────
export interface IHomeServiceTimelineEntry {
  status: HomeServiceBookingStatus;
  message: string;
  timestamp: Date;
  updatedBy?: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IHomeServiceBooking extends Document {
  bookingId: string;
  userId: Types.ObjectId;
  serviceId: Types.ObjectId;
  merchantId: Types.ObjectId;
  categorySlug: string;
  address: IHomeServiceAddress;
  scheduledDate: Date;
  scheduledTime: string; // "HH:MM" 24-hr format
  status: HomeServiceBookingStatus;
  assignedStaffId?: Types.ObjectId;
  assignedStaffName?: string;
  assignedStaffPhone?: string;
  price: number;
  priceType: 'fixed' | 'hourly';
  duration: number; // minutes
  notes?: string;
  merchantNotes?: string;
  customerPhone: string;
  timeline: IHomeServiceTimelineEntry[];
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: 'user' | 'merchant' | 'system';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'online' | 'cash' | 'wallet';
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addTimelineEntry(status: HomeServiceBookingStatus, message: string, updatedBy?: string): Promise<void>;
  canTransitionTo(newStatus: HomeServiceBookingStatus): boolean;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const HomeServiceBookingSchema = new Schema<IHomeServiceBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'HomeService',
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    categorySlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    address: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      phone: { type: String, required: true, trim: true },
      addressLine1: { type: String, required: true, trim: true, maxlength: 200 },
      addressLine2: { type: String, trim: true, maxlength: 200 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      state: { type: String, required: true, trim: true, maxlength: 100 },
      pincode: { type: String, required: true, trim: true, maxlength: 10 },
      landmark: { type: String, trim: true, maxlength: 200 },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM 24-hour format'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
    },
    assignedStaffName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    assignedStaffPhone: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    priceType: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed',
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    merchantNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    timeline: [
      {
        status: {
          type: String,
          required: true,
          enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
        },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: String,
      },
    ],
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancelledBy: {
      type: String,
      enum: ['user', 'merchant', 'system'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash', 'wallet'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
HomeServiceBookingSchema.index({ bookingId: 1 }, { unique: true });
HomeServiceBookingSchema.index({ userId: 1, createdAt: -1 });
HomeServiceBookingSchema.index({ userId: 1, status: 1 });
HomeServiceBookingSchema.index({ merchantId: 1, createdAt: -1 });
HomeServiceBookingSchema.index({ merchantId: 1, status: 1 });
HomeServiceBookingSchema.index({ serviceId: 1, status: 1 });
HomeServiceBookingSchema.index({ categorySlug: 1, status: 1 });
HomeServiceBookingSchema.index({ scheduledDate: 1, status: 1 });
HomeServiceBookingSchema.index({ assignedStaffId: 1, status: 1 });
HomeServiceBookingSchema.index({ status: 1, createdAt: -1 });

// ─── Valid Status Transitions ─────────────────────────────────────────────────
// Defines which status changes are allowed. Prevents invalid FSM jumps.
const VALID_TRANSITIONS: Record<HomeServiceBookingStatus, HomeServiceBookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
};

// ─── Instance Methods ──────────────────────────────────────────────────────────

// canTransitionTo: returns true if the booking can move to newStatus
HomeServiceBookingSchema.methods.canTransitionTo = function (
  this: IHomeServiceBooking,
  newStatus: HomeServiceBookingStatus,
): boolean {
  const currentStatus = this.status as HomeServiceBookingStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(newStatus);
};

// addTimelineEntry: appends a timeline event
HomeServiceBookingSchema.methods.addTimelineEntry = async function (
  this: IHomeServiceBooking,
  status: HomeServiceBookingStatus,
  message: string,
  updatedBy?: string,
): Promise<void> {
  if (!this.timeline) this.timeline = [];
  this.timeline.push({ status, message, timestamp: new Date(), updatedBy });
};

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

HomeServiceBookingSchema.pre('save', async function (this: IHomeServiceBooking, next) {
  // Generate bookingId for new documents
  if (this.isNew && !this.bookingId) {
    const ts = Date.now().toString(36);
    const rand = crypto.randomUUID().replace('-', '').substring(0, 6).toUpperCase();
    this.bookingId = `HSB${ts}${rand}`;
  }

  // Auto-add timeline on status change
  if (this.isModified('status') && !this.isNew) {
    const previousStatus = (this as any)._previousStatus ?? 'pending';
    const nextStatus = this.status as HomeServiceBookingStatus;

    // Enforce FSM
    if (!this.canTransitionTo(nextStatus)) {
      const err = new Error(`Invalid status transition: "${previousStatus}" -> "${nextStatus}"`) as any;
      err.code = 'INVALID_BOOKING_TRANSITION';
      return next(err);
    }

    const messages: Record<HomeServiceBookingStatus, string> = {
      pending: 'Booking created and awaiting confirmation',
      confirmed: 'Booking confirmed by merchant',
      assigned: 'Service professional assigned',
      in_progress: 'Service in progress',
      completed: 'Service completed successfully',
      cancelled: 'Booking cancelled',
    };

    await this.addTimelineEntry(nextStatus, messages[nextStatus] ?? `Status changed to ${nextStatus}`);

    // Set timestamps on terminal states
    if (nextStatus === 'completed') {
      this.completedAt = new Date();
    } else if (nextStatus === 'cancelled') {
      this.cancelledAt = new Date();
    }
  }

  next();
});

// Store previous status before save for transition detection
HomeServiceBookingSchema.pre('save', function (this: IHomeServiceBooking, next) {
  if (this.isModified('status') && !this.isNew) {
    (this as any)._previousStatus = (this as any)._previousStatus ?? this.status;
  }
  next();
});

// ─── Static Methods ───────────────────────────────────────────────────────────

// generateBookingId: produce a unique human-readable booking ID
HomeServiceBookingSchema.statics.generateBookingId = async function (): Promise<string> {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().replace('-', '').substring(0, 6).toUpperCase();
  return `HSB${ts}${rand}`;
};

// findByBookingId: lookup by human-readable booking ID
HomeServiceBookingSchema.statics.findByBookingId = function (bookingId: string) {
  return this.findOne({ bookingId }).populate('serviceId merchantId userId');
};

// findUserBookings: all bookings for a user, optionally filtered by status
HomeServiceBookingSchema.statics.findUserBookings = function (
  userId: string | Types.ObjectId,
  status?: HomeServiceBookingStatus,
) {
  const query: any = { userId };
  if (status) query.status = status;
  return this.find(query)
    .populate('serviceId', 'name basePrice priceType duration images')
    .populate('categorySlug', 'name slug icon')
    .sort({ createdAt: -1 });
};

// findMerchantBookings: all bookings for a merchant
HomeServiceBookingSchema.statics.findMerchantBookings = function (
  merchantId: string | Types.ObjectId,
  filters: { status?: HomeServiceBookingStatus; date?: Date } = {},
) {
  const query: any = { merchantId };
  if (filters.status) query.status = filters.status;
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    query.scheduledDate = { $gte: start, $lte: end };
  }
  return this.find(query)
    .populate('serviceId', 'name basePrice priceType duration')
    .populate('userId', 'profile.firstName profile.lastName phone')
    .populate('assignedStaffId', 'name phone')
    .sort({ scheduledDate: 1, scheduledTime: 1 });
};

// ─── Export ────────────────────────────────────────────────────────────────────
export interface IHomeServiceBookingModel extends Model<IHomeServiceBooking> {
  generateBookingId(): Promise<string>;
  findByBookingId(bookingId: string): Promise<IHomeServiceBooking | null>;
  findUserBookings(userId: string | Types.ObjectId, status?: HomeServiceBookingStatus): Promise<IHomeServiceBooking[]>;
  findMerchantBookings(
    merchantId: string | Types.ObjectId,
    filters?: { status?: HomeServiceBookingStatus; date?: Date },
  ): Promise<IHomeServiceBooking[]>;
}

export const HomeServiceBooking = mongoose.model<IHomeServiceBooking, IHomeServiceBookingModel>(
  'HomeServiceBooking',
  HomeServiceBookingSchema,
);
