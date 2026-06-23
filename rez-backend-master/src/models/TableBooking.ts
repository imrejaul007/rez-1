import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

// TableBooking interface
export interface ITableBooking extends Document {
  bookingNumber: string;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancellationReason?: string;
  preOrderId?: Types.ObjectId;
  preOrderStatus?: 'none' | 'pending' | 'paid' | 'confirmed';
  advancePaymentAmount?: number;
  advancePaymentId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateStatus(newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'): Promise<void>;
}

// TableBooking Schema
const TableBookingSchema = new Schema<ITableBooking>({
  bookingNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookingDate: {
    type: Date,
    required: true,
    index: true
  },
  bookingTime: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Validate time format HH:MM (24-hour format)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format (24-hour)'
    }
  },
  partySize: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  specialRequests: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  preOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  preOrderStatus: {
    type: String,
    enum: ['none', 'pending', 'paid', 'confirmed'],
    default: 'none',
  },
  advancePaymentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  advancePaymentId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for performance
TableBookingSchema.index({ storeId: 1, bookingDate: 1 });
TableBookingSchema.index({ userId: 1, createdAt: -1 });
TableBookingSchema.index({ status: 1, bookingDate: 1 });

// Virtual for formatted booking date/time
TableBookingSchema.virtual('formattedDateTime').get(function() {
  const date = new Date(this.bookingDate);
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `${dateStr} at ${this.bookingTime}`;
});

// Pre-validate hook to generate booking number (runs before validation so 'required' passes)
TableBookingSchema.pre('validate', async function(next) {
  if (this.isNew && !this.bookingNumber) {
    // Generate booking number: TB-TIMESTAMP-RANDOM
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.bookingNumber = `TB-${timestamp}-${random}`;
  }
  next();
});

// Instance method to update status
TableBookingSchema.methods.updateStatus = async function(
  newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
): Promise<void> {
  this.status = newStatus;
  await this.save();
};

// Static method to find by booking number
TableBookingSchema.statics.findByBookingNumber = function(bookingNumber: string) {
  return this.findOne({ bookingNumber })
    .populate('storeId', 'name logo location contact')
    .populate('userId', 'profile.firstName profile.lastName phoneNumber email');
};

// Static method to find store bookings
TableBookingSchema.statics.findStoreBookings = function(
  storeId: Types.ObjectId | string,
  date?: Date
) {
  const query: any = { storeId };

  if (date) {
    // Find bookings for the specific date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query.bookingDate = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }

  return this.find(query)
    .populate('userId', 'profile.firstName profile.lastName phoneNumber email')
    .sort({ bookingDate: 1, bookingTime: 1 });
};

// Static method to find user bookings
TableBookingSchema.statics.findUserBookings = function(userId: Types.ObjectId | string) {
  return this.find({ userId })
    .populate('storeId', 'name logo location contact')
    .sort({ bookingDate: -1, createdAt: -1 });
};

// Static method to mark no-shows (past bookings that were never completed)
TableBookingSchema.statics.markNoShows = async function(
  filter: Record<string, any> = {},
  graceHours: number = 1
): Promise<number> {
  const now = new Date();

  // Find pending/confirmed bookings where bookingDate is in the past
  const query: any = {
    ...filter,
    status: { $in: ['pending', 'confirmed'] },
    bookingDate: { $lte: now }
  };

  // Get candidates
  const candidates = await this.find(query)
    .select('_id bookingDate bookingTime')
    .lean();

  if (candidates.length === 0) return 0;

  // Filter by bookingDate + bookingTime + graceHours < now
  const expiredIds: Types.ObjectId[] = [];
  for (const booking of candidates) {
    const [hours, minutes] = (booking.bookingTime || '00:00').split(':').map(Number);
    const bookingDateTime = new Date(booking.bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    // Add grace period
    bookingDateTime.setHours(bookingDateTime.getHours() + graceHours);

    if (bookingDateTime < now) {
      expiredIds.push(booking._id);
    }
  }

  if (expiredIds.length === 0) return 0;

  const result = await this.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { status: 'no_show' } }
  );

  if (result.modifiedCount > 0) {
    logger.info(`📅 [TABLE BOOKING] Marked ${result.modifiedCount} bookings as no_show`);
  }

  return result.modifiedCount;
};

// Add static method types to the model
interface ITableBookingModel extends mongoose.Model<ITableBooking> {
  findByBookingNumber(bookingNumber: string): Promise<ITableBooking | null>;
  findStoreBookings(storeId: Types.ObjectId | string, date?: Date): Promise<ITableBooking[]>;
  findUserBookings(userId: Types.ObjectId | string): Promise<ITableBooking[]>;
  markNoShows(filter?: Record<string, any>, graceHours?: number): Promise<number>;
}

export const TableBooking = mongoose.model<ITableBooking, ITableBookingModel>(
  'TableBooking',
  TableBookingSchema
);
