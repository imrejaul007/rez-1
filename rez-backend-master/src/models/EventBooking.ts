import mongoose, { Document, Schema, Types } from 'mongoose';

// Reward earned summary
export interface IBookingRewardEarned {
  action: string;
  coins: number;
  grantedAt: Date;
}

// Event Booking Interface
export interface IEventBooking extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  slotId?: string; // For events with time slots
  ticketTypeId?: string; // For multi-tier ticket pricing
  quantity: number; // Number of tickets (default 1)
  bookingDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  paymentId?: Types.ObjectId;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  attendeeInfo: {
    name: string;
    email: string;
    phone?: string;
    age?: number;
    specialRequirements?: string;
  };
  bookingReference: string; // Unique booking reference
  idempotencyKey?: string; // Client-generated UUID to prevent duplicate bookings
  qrCode?: string; // QR code for event entry
  lockedUntil?: Date; // Inventory lock expiry for pending payment (10-min TTL)
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  rewardsEarned: IBookingRewardEarned[]; // Summary of all rewards from this booking
  createdAt: Date;
  updatedAt: Date;
}

// Event Booking Schema
const EventBookingSchema = new Schema<IEventBooking>({
  eventId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  slotId: { type: String },
  ticketTypeId: { type: String },
  quantity: { type: Number, default: 1, min: 1, max: 20 },
  bookingDate: {
    type: Date, 
    required: true,
    default: Date.now
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
    default: 'pending'
  },
  paymentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Payment' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: '₹' 
  },
  attendeeInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{10,}$/, 'Please provide a valid phone number']
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [150, 'Invalid age']
    },
    specialRequirements: {
      type: String,
      maxlength: [500, 'Special requirements cannot exceed 500 characters']
    }
  },
  bookingReference: {
    type: String,
    required: true,
    unique: true
  },
  idempotencyKey: {
    type: String,
    sparse: true, // Allow null but enforce uniqueness when present
  },
  qrCode: { type: String },
  lockedUntil: { type: Date },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    validate: {
      validator: function(this: any, value: number) {
        // Refund amount cannot exceed booking amount
        return !value || value <= (this.amount || 0);
      },
      message: 'Refund amount cannot exceed booking amount'
    }
  },
  refundReason: {
    type: String,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  refundedAt: { type: Date },
  rewardsEarned: [{
    action: { type: String, required: true },
    coins: { type: Number, required: true, min: 0 },
    grantedAt: { type: Date, required: true, default: Date.now },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
EventBookingSchema.index({ eventId: 1, userId: 1 });
EventBookingSchema.index({ userId: 1, status: 1 });
EventBookingSchema.index({ status: 1, bookingDate: 1 });
EventBookingSchema.index({ paymentStatus: 1 });
EventBookingSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
EventBookingSchema.index({ lockedUntil: 1 }); // For expired lock cleanup

// Pre-save middleware to generate booking reference
EventBookingSchema.pre('save', function(next) {
  if (!this.bookingReference) {
    // Generate unique booking reference: EVT + timestamp + random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.bookingReference = `EVT${timestamp}${random}`;
  }
  next();
});

// Static methods
EventBookingSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).populate('eventId');
};

EventBookingSchema.statics.findByEvent = function(eventId: string) {
  return this.find({ eventId }).populate('userId');
};

EventBookingSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).populate('eventId userId');
};

// Instance methods
EventBookingSchema.methods.confirm = function() {
  this.status = 'confirmed';
  this.paymentStatus = 'completed';
  return this.save();
};

EventBookingSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  this.notes = reason || 'Booking cancelled';
  return this.save();
};

EventBookingSchema.methods.checkIn = function() {
  this.checkInTime = new Date();
  this.status = 'completed';
  return this.save();
};

EventBookingSchema.methods.checkOut = function() {
  this.checkOutTime = new Date();
  return this.save();
};

// Create and export the model
const EventBooking = mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);

export default EventBooking;
