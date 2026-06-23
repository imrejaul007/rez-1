import mongoose, { Document, Schema, Types } from 'mongoose';

// Event Slot Interface
export interface IEventSlot {
  id: string;
  time: string;
  available: boolean;
  maxCapacity: number;
  bookedCount: number;
}

// Event Location Interface
export interface IEventLocation {
  name: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  isOnline: boolean;
  meetingUrl?: string; // For online events
}

// Event Organizer Interface
export interface IEventOrganizer {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  logo?: string;
}

// Event Price Interface
export interface IEventPrice {
  amount: number;
  currency: string;
  isFree: boolean;
  originalPrice?: number; // For discounted events
  discount?: number; // Percentage discount
}

// Event Analytics Interface
export interface IEventAnalytics {
  views: number;
  bookings: number;
  shares: number;
  favorites: number;
  lastViewed?: Date;
}

// Event Sponsor Interface
export interface IEventSponsor {
  name: string;
  logo?: string;
  brandId?: Types.ObjectId;
  fundingAmount?: number;
}

// Event Schedule Item Interface
export interface IEventScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

// Event Ticket Type Interface
export interface IEventTicketType {
  name: string;
  price: number;
  currency: string;
  maxQuantity: number;
  soldCount: number;
  description?: string;
}

// Structured Cancellation Policy Interface
export interface IEventCancellationPolicy {
  isRefundable: boolean;
  refundPercentage?: number; // 0-100
  refundDeadlineHours?: number; // Hours before event
  policyText?: string;
}

// Main Event Interface
export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  images?: string[]; // Additional images
  price: IEventPrice;
  location: IEventLocation;
  date: Date;
  time: string;
  endTime?: string;
  category: string;
  categoryId?: Types.ObjectId; // Reference to EventCategory model
  subcategory?: string;
  organizer: IEventOrganizer;
  merchantId?: Types.ObjectId; // Reference to merchant who hosts this event
  isOnline: boolean;
  registrationRequired: boolean;
  bookingUrl?: string; // External booking URL
  availableSlots?: IEventSlot[];
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'sold_out';
  tags: string[];
  maxCapacity?: number; // Overall event capacity
  minAge?: number; // Age restriction
  requirements?: string[]; // Event requirements
  includes?: string[]; // What's included in the event
  refundPolicy?: string;
  cancellationPolicy?: string;
  cancellationPolicyDetails?: IEventCancellationPolicy;
  analytics: IEventAnalytics;
  featured: boolean; // For homepage display
  priority: number; // For sorting
  rating: number; // Average rating (1-5)
  reviewCount: number; // Total number of reviews
  cashback: number; // Cashback percentage (merchant-configured)
  // New fields for production system
  sponsors?: IEventSponsor[];
  rewardConfigId?: Types.ObjectId; // Reference to EventRewardConfig (falls back to global)
  geoLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  schedule?: IEventScheduleItem[];
  ticketTypes?: IEventTicketType[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  expiresAt?: Date; // Event expiry date

  // Instance methods
  incrementViews(): Promise<IEvent>;
  incrementBookings(): Promise<IEvent>;
  incrementShares(): Promise<IEvent>;
  incrementFavorites(): Promise<IEvent>;
}

// Event Schema
const EventSlotSchema = new Schema<IEventSlot>({
  id: { type: String, required: true },
  time: { type: String, required: true },
  available: { type: Boolean, default: true },
  maxCapacity: { type: Number, required: true },
  bookedCount: { type: Number, default: 0 }
}, { _id: false });

const EventLocationSchema = new Schema<IEventLocation>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  country: { type: String, default: 'India' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  isOnline: { type: Boolean, default: false },
  meetingUrl: { type: String }
}, { _id: false });

const EventOrganizerSchema = new Schema<IEventOrganizer>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  website: { type: String },
  description: { type: String },
  logo: { type: String }
}, { _id: false });

const EventPriceSchema = new Schema<IEventPrice>({
  amount: { type: Number, required: true },
  currency: { type: String, default: '₹' },
  isFree: { type: Boolean, default: false },
  originalPrice: { type: Number },
  discount: { type: Number }
}, { _id: false });

const EventAnalyticsSchema = new Schema<IEventAnalytics>({
  views: { type: Number, default: 0 },
  bookings: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  lastViewed: { type: Date }
}, { _id: false });

const EventSchema = new Schema<IEvent>({
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  subtitle: { 
    type: String, 
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  image: { 
    type: String, 
    required: true 
  },
  images: [{ type: String }],
  price: { 
    type: EventPriceSchema, 
    required: true 
  },
  location: { 
    type: EventLocationSchema, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  endTime: { type: String },
  category: {
    type: String,
    required: true,
    enum: [
      // New categories (lowercase)
      'movies', 'concerts', 'parks', 'workshops', 'gaming', 'sports', 'entertainment',
      // Legacy categories (title case)
      'Music', 'Technology', 'Wellness', 'Sports', 'Education', 'Business', 'Arts', 'Food', 'Entertainment', 'Other'
    ]
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'EventCategory',
    index: true,
  },
  subcategory: { type: String },
  organizer: { 
    type: EventOrganizerSchema, 
    required: true 
  },
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    index: true
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  registrationRequired: { 
    type: Boolean, 
    default: true 
  },
  bookingUrl: { type: String },
  availableSlots: [EventSlotSchema],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed', 'sold_out'],
    default: 'draft'
  },
  tags: [{ type: String }],
  maxCapacity: { type: Number },
  minAge: { type: Number },
  requirements: [{ type: String }],
  includes: [{ type: String }],
  refundPolicy: { type: String },
  cancellationPolicy: { type: String },
  cancellationPolicyDetails: {
    isRefundable: { type: Boolean, default: false },
    refundPercentage: { type: Number, min: 0, max: 100 },
    refundDeadlineHours: { type: Number, min: 0 },
    policyText: { type: String, maxlength: 1000 },
  },
  analytics: {
    type: EventAnalyticsSchema,
    default: () => ({})
  },
  featured: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  cashback: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Percentage (0-100%)
  },
  // New production fields
  sponsors: [{
    name: { type: String, required: true },
    logo: { type: String },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand' },
    fundingAmount: { type: Number, min: 0 },
  }],
  rewardConfigId: {
    type: Schema.Types.ObjectId,
    ref: 'EventRewardConfig',
  },
  geoLocation: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [lng, lat]
  },
  schedule: [{
    title: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    description: { type: String },
  }],
  ticketTypes: [{
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: '₹' },
    maxQuantity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    description: { type: String },
  }],
  publishedAt: { type: Date },
  expiresAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
EventSchema.index({ status: 1, date: 1 });
EventSchema.index({ category: 1, status: 1 });
EventSchema.index({ 'location.city': 1, status: 1 });
EventSchema.index({ featured: 1, status: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ title: 'text', description: 'text' });
EventSchema.index({ date: 1, status: 1, featured: 1 });

// Additional indexes for production performance
EventSchema.index({ merchantId: 1 }); // For merchant event queries
EventSchema.index({ subcategory: 1, status: 1 }); // For subcategory filtering
EventSchema.index({ publishedAt: 1, status: 1 }); // For time-based queries
EventSchema.index({ 'organizer.email': 1 }); // For organizer lookups
EventSchema.index({ rating: -1, status: 1 }); // For sorting by rating
EventSchema.index({ cashback: -1, status: 1 }); // For sorting by cashback
EventSchema.index({ geoLocation: '2dsphere' }); // For geo-based discovery
EventSchema.index({ categoryId: 1, status: 1, date: 1 }); // For category + date filtering
EventSchema.index({ status: 1, date: 1, categoryId: 1, featured: 1 }); // For combined queries

// Virtual for available capacity
EventSchema.virtual('availableCapacity').get(function() {
  if (this.maxCapacity && this.availableSlots) {
    const totalBooked = this.availableSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    return this.maxCapacity - totalBooked;
  }
  return null;
});

// Virtual for is sold out
EventSchema.virtual('isSoldOut').get(function() {
  if (this.maxCapacity && this.availableSlots) {
    const totalBooked = this.availableSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    return totalBooked >= this.maxCapacity;
  }
  return false;
});

// Pre-save middleware
EventSchema.pre('save', function(next) {
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-set isOnline based on location
  if (this.location && this.location.isOnline !== undefined) {
    this.isOnline = this.location.isOnline;
  }

  // Auto-populate geoLocation from location.coordinates for geo-queries
  if (this.location?.coordinates?.lat && this.location?.coordinates?.lng) {
    this.geoLocation = {
      type: 'Point',
      coordinates: [this.location.coordinates.lng, this.location.coordinates.lat],
    };
  }

  next();
});

// Static methods
EventSchema.statics.findPublished = function() {
  return this.find({ status: 'published' });
};

EventSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, status: 'published' });
};

EventSchema.statics.findFeatured = function() {
  return this.find({ featured: true, status: 'published' });
};

EventSchema.statics.findUpcoming = function() {
  return this.find({ 
    status: 'published', 
    date: { $gte: new Date() } 
  });
};

// Instance methods — use atomic $inc to avoid race conditions
EventSchema.methods.incrementViews = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.views': 1 },
    $set: { 'analytics.lastViewed': new Date() }
  });
};

EventSchema.methods.incrementBookings = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.bookings': 1 }
  });
};

EventSchema.methods.incrementShares = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.shares': 1 }
  });
};

EventSchema.methods.incrementFavorites = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.favorites': 1 }
  });
};

// Create and export the model
const Event = mongoose.model<IEvent>('Event', EventSchema);

export default Event;
