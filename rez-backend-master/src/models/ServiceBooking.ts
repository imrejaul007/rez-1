import mongoose, { Schema, Document, Types } from 'mongoose';

// Address interface for service location
export interface IServiceAddress {
  street: string;
  apartment?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Pricing interface
export interface IServiceBookingPricing {
  basePrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
  taxes?: number;
  convenienceFee?: number;
  total: number;
  cashbackEarned?: number;
  cashbackPercentage?: number;
  currency: string;
}

// Time slot interface
export interface ITimeSlot {
  start: string; // "09:00"
  end: string;   // "10:00"
}

// Cashback status type for travel bookings
export type CashbackStatus = 'pending' | 'held' | 'credited' | 'clawed_back';

// Travel details interface
export interface ITravelDetails {
  route?: {
    from: string;
    to: string;
    fromCode?: string;
    toCode?: string;
  };
  class?: string;
  passengers?: {
    adults: number;
    children: number;
    infants?: number;
  };
  tripType?: 'one-way' | 'round-trip';
  returnDate?: Date;
}

// Refund policy interface
export interface IRefundPolicy {
  tiers: Array<{
    hoursBeforeDeparture: number;
    refundPercentage: number;
  }>;
}

// Service Booking interface
export interface IServiceBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;
  user: Types.ObjectId;
  service: Types.ObjectId;      // Product with type 'service'
  serviceCategory: Types.ObjectId;
  store: Types.ObjectId;
  merchantId: Types.ObjectId;

  // Customer details
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Booking details
  bookingDate: Date;
  timeSlot: ITimeSlot;
  duration: number;             // in minutes
  serviceType: 'home' | 'store' | 'online';

  // Service location (for home services)
  serviceAddress?: IServiceAddress;

  // Pricing
  pricing: IServiceBookingPricing;

  // Payment
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
  paymentMethod?: 'online' | 'cash' | 'wallet';
  paymentId?: string;
  requiresPaymentUpfront: boolean;

  // Status tracking
  status: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  statusHistory: {
    status: string;
    timestamp: Date;
    updatedBy?: Types.ObjectId;
    note?: string;
  }[];

  // Assignment
  assignedStaff?: string;
  assignedStaffPhone?: string;

  // Notes
  customerNotes?: string;
  merchantNotes?: string;
  internalNotes?: string;

  // Timestamps
  confirmedAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: 'user' | 'merchant' | 'system';

  // Rating (after completion)
  rating?: {
    score: number;
    review?: string;
    ratedAt: Date;
  };

  // Rescheduling
  isRescheduled: boolean;
  originalBookingDate?: Date;
  originalTimeSlot?: ITimeSlot;
  rescheduleCount: number;
  maxReschedules: number;

  // Travel-specific fields
  pnr?: string;
  externalReference?: string;
  eTicketUrl?: string;
  cashbackStatus: CashbackStatus;
  cashbackCreditedAt?: Date;
  cashbackHeldAt?: Date;
  verificationDays: number;
  travelDetails?: ITravelDetails;
  refundPolicy?: IRefundPolicy;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateStatus(newStatus: string, updatedBy?: Types.ObjectId, note?: string): Promise<IServiceBooking>;
  cancel(reason: string, cancelledBy: 'user' | 'merchant' | 'system'): Promise<IServiceBooking>;
  confirm(assignedStaff?: string): Promise<IServiceBooking>;
  start(): Promise<IServiceBooking>;
  complete(): Promise<IServiceBooking>;
  reschedule(newDate: Date, newTimeSlot: ITimeSlot): Promise<IServiceBooking>;
  addRating(score: number, review?: string): Promise<IServiceBooking>;
}

// Service Booking Model interface for static methods
export interface IServiceBookingModel extends mongoose.Model<IServiceBooking> {
  generateBookingNumber(prefix?: string): Promise<string>;
  findByBookingNumber(bookingNumber: string): Promise<IServiceBooking | null>;
  findUserBookings(userId: Types.ObjectId, status?: string): Promise<IServiceBooking[]>;
  findMerchantBookings(merchantId: Types.ObjectId, date?: Date, status?: string): Promise<IServiceBooking[]>;
  checkSlotAvailability(
    serviceId: Types.ObjectId,
    storeId: Types.ObjectId,
    date: Date,
    timeSlot: ITimeSlot,
    duration: number,
    excludeBookingId?: Types.ObjectId
  ): Promise<boolean>;
  getAvailableSlots(
    storeId: Types.ObjectId,
    date: Date,
    duration: number,
    storeHours: { open: string; close: string },
    serviceId?: Types.ObjectId
  ): Promise<ITimeSlot[]>;
}

const ServiceBookingSchema = new Schema<IServiceBooking>(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    serviceCategory: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true
    },

    // Customer details
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },

    // Booking details
    bookingDate: {
      type: Date,
      required: true,
      index: true
    },
    timeSlot: {
      start: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
      },
      end: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
      }
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 480 // max 8 hours
    },
    serviceType: {
      type: String,
      enum: ['home', 'store', 'online'],
      required: true,
      default: 'store'
    },

    // Service location
    serviceAddress: {
      street: { type: String, trim: true },
      apartment: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },

    // Pricing
    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 0
      },
      discount: {
        type: Number,
        min: 0
      },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      discountAmount: {
        type: Number,
        min: 0
      },
      taxes: {
        type: Number,
        min: 0,
        default: 0
      },
      convenienceFee: {
        type: Number,
        min: 0,
        default: 0
      },
      total: {
        type: Number,
        required: true,
        min: 0
      },
      cashbackEarned: {
        type: Number,
        min: 0,
        default: 0
      },
      cashbackPercentage: {
        type: Number,
        min: 0,
        max: 100
      },
      currency: {
        type: String,
        default: 'INR'
      }
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'refunded', 'failed'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash', 'wallet']
    },
    paymentId: {
      type: String,
      trim: true
    },
    requiresPaymentUpfront: {
      type: Boolean,
      default: false
    },

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true
    },
    statusHistory: [{
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      note: { type: String, trim: true }
    }],

    // Assignment
    assignedStaff: {
      type: String,
      trim: true
    },
    assignedStaffPhone: {
      type: String,
      trim: true
    },

    // Notes
    customerNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    merchantNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    // Timestamps
    confirmedAt: { type: Date },
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'merchant', 'system']
    },

    // Rating
    rating: {
      score: { type: Number, min: 1, max: 5 },
      review: { type: String, trim: true, maxlength: 500 },
      ratedAt: { type: Date }
    },

    // Rescheduling
    isRescheduled: {
      type: Boolean,
      default: false
    },
    originalBookingDate: { type: Date },
    originalTimeSlot: {
      start: { type: String },
      end: { type: String }
    },
    rescheduleCount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxReschedules: {
      type: Number,
      default: 2
    },

    // Travel-specific fields
    pnr: {
      type: String,
      trim: true,
      index: true
    },
    externalReference: {
      type: String,
      trim: true
    },
    eTicketUrl: {
      type: String,
      trim: true
    },
    cashbackStatus: {
      type: String,
      enum: ['pending', 'held', 'credited', 'clawed_back'],
      default: 'pending',
      index: true
    },
    cashbackCreditedAt: { type: Date },
    cashbackHeldAt: { type: Date },
    verificationDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 30
    },
    travelDetails: {
      route: {
        from: { type: String, trim: true },
        to: { type: String, trim: true },
        fromCode: { type: String, trim: true },
        toCode: { type: String, trim: true }
      },
      class: { type: String, trim: true },
      passengers: {
        adults: { type: Number, min: 0 },
        children: { type: Number, min: 0 },
        infants: { type: Number, min: 0 }
      },
      tripType: {
        type: String,
        enum: ['one-way', 'round-trip']
      },
      returnDate: { type: Date }
    },
    refundPolicy: {
      tiers: [{
        hoursBeforeDeparture: { type: Number, required: true },
        refundPercentage: { type: Number, required: true, min: 0, max: 100 }
      }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
ServiceBookingSchema.index({ store: 1, bookingDate: 1 });
ServiceBookingSchema.index({ user: 1, status: 1 });
ServiceBookingSchema.index({ user: 1, createdAt: -1 });
ServiceBookingSchema.index({ merchantId: 1, status: 1 });
ServiceBookingSchema.index({ merchantId: 1, bookingDate: 1 });
ServiceBookingSchema.index({ store: 1, status: 1, bookingDate: 1 });
ServiceBookingSchema.index({ bookingDate: 1, status: 1 });
ServiceBookingSchema.index({ serviceCategory: 1, status: 1 });
ServiceBookingSchema.index({ service: 1, bookingDate: 1 });
// Travel cashback indexes
ServiceBookingSchema.index({ user: 1, status: 1, cashbackStatus: 1, createdAt: -1 });
ServiceBookingSchema.index({ cashbackStatus: 1, completedAt: 1 });
ServiceBookingSchema.index({ service: 1, bookingDate: 1, status: 1 });
ServiceBookingSchema.index({ paymentStatus: 1, requiresPaymentUpfront: 1, createdAt: 1 });

// Virtual: Formatted date and time
ServiceBookingSchema.virtual('formattedDateTime').get(function () {
  const date = new Date(this.bookingDate);
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  return `${dateStr} at ${this.timeSlot.start}`;
});

// Virtual: Is upcoming
ServiceBookingSchema.virtual('isUpcoming').get(function () {
  const now = new Date();
  const bookingDateTime = new Date(this.bookingDate);
  const [hours, minutes] = this.timeSlot.start.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);
  return bookingDateTime > now && ['pending', 'confirmed', 'assigned'].includes(this.status);
});

// Virtual: Can be cancelled
ServiceBookingSchema.virtual('canBeCancelled').get(function () {
  const now = new Date();
  const bookingDateTime = new Date(this.bookingDate);
  const [hours, minutes] = this.timeSlot.start.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  // Can cancel if more than 2 hours before booking
  const twoHoursBefore = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);
  return now < twoHoursBefore && ['pending', 'confirmed', 'assigned'].includes(this.status);
});

// Virtual: Can be rescheduled
ServiceBookingSchema.virtual('canBeRescheduled').get(function () {
  // Check reschedule limits
  if (this.rescheduleCount >= this.maxReschedules) return false;
  if (!['pending', 'confirmed'].includes(this.status)) return false;

  // Inline canBeCancelled logic - can cancel if more than 2 hours before booking
  const now = new Date();
  const bookingDateTime = new Date(this.bookingDate);
  const [hours, minutes] = this.timeSlot.start.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);
  const twoHoursBefore = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000);

  return now < twoHoursBefore;
});

// Static method: Generate booking number
ServiceBookingSchema.statics.generateBookingNumber = async function (prefix: string = 'SB'): Promise<string> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp.toString().slice(-8)}`;
};

// Static method: Find booking by booking number
ServiceBookingSchema.statics.findByBookingNumber = async function (
  bookingNumber: string
): Promise<IServiceBooking | null> {
  return this.findOne({ bookingNumber })
    .populate('store', 'name logo location contact operationalInfo')
    .populate('service', 'name images pricing serviceDetails')
    .populate('serviceCategory', 'name icon cashbackPercentage')
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
    .lean();
};

// Static method: Get user's bookings
ServiceBookingSchema.statics.findUserBookings = async function (
  userId: Types.ObjectId,
  status?: string
): Promise<IServiceBooking[]> {
  const query: any = { user: userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('store', 'name logo location contact')
    .populate('service', 'name images pricing')
    .populate('serviceCategory', 'name icon')
    .sort({ bookingDate: -1, createdAt: -1 })
    .lean();
};

// Static method: Get merchant's bookings
ServiceBookingSchema.statics.findMerchantBookings = async function (
  merchantId: Types.ObjectId,
  date?: Date,
  status?: string
): Promise<IServiceBooking[]> {
  const query: any = { merchantId };

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query.bookingDate = { $gte: startOfDay, $lte: endOfDay };
  }

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber')
    .populate('service', 'name images pricing')
    .populate('serviceCategory', 'name icon')
    .sort({ bookingDate: 1, 'timeSlot.start': 1 })
    .lean();
};

// Static method: Check slot availability
ServiceBookingSchema.statics.checkSlotAvailability = async function (
  serviceId: Types.ObjectId,
  storeId: Types.ObjectId,
  date: Date,
  timeSlot: ITimeSlot,
  duration: number,
  excludeBookingId?: Types.ObjectId
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query: any = {
    store: storeId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed', 'assigned', 'in_progress'] }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBookings = await this.find(query).lean();

  // Parse requested time
  const [reqStartHour, reqStartMin] = timeSlot.start.split(':').map(Number);
  const reqStartTime = reqStartHour * 60 + reqStartMin;
  const reqEndTime = reqStartTime + duration;

  // Check for conflicts
  for (const booking of existingBookings) {
    const [bookStartHour, bookStartMin] = booking.timeSlot.start.split(':').map(Number);
    const bookStartTime = bookStartHour * 60 + bookStartMin;
    const bookEndTime = bookStartTime + booking.duration;

    // Check if times overlap
    if (
      (reqStartTime >= bookStartTime && reqStartTime < bookEndTime) ||
      (reqEndTime > bookStartTime && reqEndTime <= bookEndTime) ||
      (reqStartTime <= bookStartTime && reqEndTime >= bookEndTime)
    ) {
      return false; // Conflict found
    }
  }

  return true; // No conflicts
};

// Static method: Get available time slots for a date
ServiceBookingSchema.statics.getAvailableSlots = async function (
  storeId: Types.ObjectId,
  date: Date,
  duration: number,
  storeHours: { open: string; close: string },
  serviceId?: Types.ObjectId
): Promise<ITimeSlot[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get existing bookings for the day
  const existingBookings = await this.find({
    store: storeId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed', 'assigned', 'in_progress'] }
  }).lean();

  // Fetch blocked slots for this date and store
  const { BlockedSlot } = require('./BlockedSlot');
  const blockedQuery: any = {
    storeId,
    date: { $gte: startOfDay, $lte: endOfDay },
  };
  // Include blocks for all services (serviceId=null) AND blocks for this specific service
  if (serviceId) {
    blockedQuery.$or = [{ serviceId }, { serviceId: null }];
  }
  const blockedSlots = await BlockedSlot.find(blockedQuery).lean();

  // Parse store hours
  const [openHour, openMin] = storeHours.open.split(':').map(Number);
  const [closeHour, closeMin] = storeHours.close.split(':').map(Number);
  const storeOpenTime = openHour * 60 + openMin;
  const storeCloseTime = closeHour * 60 + closeMin;

  // Generate all possible slots (30-minute intervals)
  const slots: ITimeSlot[] = [];
  const slotInterval = 30; // 30-minute intervals

  for (let time = storeOpenTime; time + duration <= storeCloseTime; time += slotInterval) {
    const startHour = Math.floor(time / 60);
    const startMin = time % 60;
    const endTime = time + duration;
    const endHour = Math.floor(endTime / 60);
    const endMin = endTime % 60;

    const slotStart = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    const slotEnd = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const slot: ITimeSlot = { start: slotStart, end: slotEnd };

    // Check if slot conflicts with any existing booking
    let hasConflict = false;
    for (const booking of existingBookings) {
      const [bookStartHour, bookStartMin] = booking.timeSlot.start.split(':').map(Number);
      const bookStartTime = bookStartHour * 60 + bookStartMin;
      const bookEndTime = bookStartTime + booking.duration;

      if (
        (time >= bookStartTime && time < bookEndTime) ||
        (endTime > bookStartTime && endTime <= bookEndTime) ||
        (time <= bookStartTime && endTime >= bookEndTime)
      ) {
        hasConflict = true;
        break;
      }
    }

    // Check if slot falls within any blocked window
    if (!hasConflict) {
      for (const blocked of blockedSlots) {
        if ((blocked as any).isAllDay) {
          hasConflict = true;
          break;
        }
        // Overlap: slot starts before blocked ends AND slot ends after blocked starts
        if (slotStart < (blocked as any).endTime && slotEnd > (blocked as any).startTime) {
          hasConflict = true;
          break;
        }
      }
    }

    if (!hasConflict) {
      slots.push(slot);
    }
  }

  return slots;
};

// Instance method: Update status
ServiceBookingSchema.methods.updateStatus = async function (
  newStatus: string,
  updatedBy?: Types.ObjectId,
  note?: string
): Promise<IServiceBooking> {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    note
  });

  if (newStatus === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  } else if (newStatus === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  } else if (newStatus === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Cancel booking
ServiceBookingSchema.methods.cancel = async function (
  reason: string,
  cancelledBy: 'user' | 'merchant' | 'system'
): Promise<IServiceBooking> {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;

  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Cancelled by ${cancelledBy}: ${reason}`
  });

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Confirm booking
ServiceBookingSchema.methods.confirm = async function (
  assignedStaff?: string
): Promise<IServiceBooking> {
  this.status = 'confirmed';
  this.confirmedAt = new Date();

  if (assignedStaff) {
    this.assignedStaff = assignedStaff;
    this.assignedAt = new Date();
    this.status = 'assigned';
  }

  this.statusHistory.push({
    status: this.status,
    timestamp: new Date(),
    note: assignedStaff ? `Confirmed and assigned to ${assignedStaff}` : 'Booking confirmed'
  });

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Start service
ServiceBookingSchema.methods.start = async function (): Promise<IServiceBooking> {
  this.status = 'in_progress';
  this.startedAt = new Date();

  this.statusHistory.push({
    status: 'in_progress',
    timestamp: new Date(),
    note: 'Service started'
  });

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Complete service
ServiceBookingSchema.methods.complete = async function (): Promise<IServiceBooking> {
  this.status = 'completed';
  this.completedAt = new Date();

  if (this.requiresPaymentUpfront === false && this.paymentStatus === 'pending') {
    this.paymentStatus = 'paid';
    this.paymentMethod = 'cash';
  }

  this.statusHistory.push({
    status: 'completed',
    timestamp: new Date(),
    note: 'Service completed'
  });

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Reschedule booking
ServiceBookingSchema.methods.reschedule = async function (
  newDate: Date,
  newTimeSlot: ITimeSlot
): Promise<IServiceBooking> {
  if (this.rescheduleCount >= this.maxReschedules) {
    throw new Error('Maximum reschedule limit reached');
  }

  // Store original if first reschedule
  if (!this.isRescheduled) {
    this.originalBookingDate = this.bookingDate;
    this.originalTimeSlot = { ...this.timeSlot };
    this.isRescheduled = true;
  }

  this.bookingDate = newDate;
  this.timeSlot = newTimeSlot;
  this.rescheduleCount += 1;

  this.statusHistory.push({
    status: 'rescheduled',
    timestamp: new Date(),
    note: `Rescheduled to ${newDate.toDateString()} at ${newTimeSlot.start}`
  });

  await this.save();
  return this as unknown as IServiceBooking;
};

// Instance method: Add rating
ServiceBookingSchema.methods.addRating = async function (
  score: number,
  review?: string
): Promise<IServiceBooking> {
  if (this.status !== 'completed') {
    throw new Error('Can only rate completed bookings');
  }

  this.rating = {
    score,
    review,
    ratedAt: new Date()
  };

  await this.save();
  return this as unknown as IServiceBooking;
};

// Pre-save hook to add initial status to history
ServiceBookingSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'Booking created'
    });
  }
  next();
});

export const ServiceBooking = mongoose.model<IServiceBooking, IServiceBookingModel>('ServiceBooking', ServiceBookingSchema);
