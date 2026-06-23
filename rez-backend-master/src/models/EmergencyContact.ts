import mongoose, { Document, Schema, Types } from 'mongoose';

// Emergency Contact Interface
export interface IEmergencyContact extends Document {
  _id: Types.ObjectId;
  name: string;
  type: 'ambulance' | 'hospital' | 'blood_bank' | 'fire' | 'police' | 'poison_control' | 'mental_health' | 'women_helpline' | 'child_helpline' | 'disaster' | 'covid' | 'other';
  phoneNumbers: string[];
  tollFree?: string;
  isNational: boolean;
  city?: string;
  state?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  operatingHours: string;
  description?: string;
  icon?: string;
  priority: number;
  isActive: boolean;
  isVerified: boolean;
  services?: string[];
  website?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Emergency Booking Interface
export interface IEmergencyBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;
  userId: Types.ObjectId;
  serviceType: 'ambulance' | 'doctor_visit' | 'hospital_admission';
  emergencyType: 'accident' | 'cardiac' | 'respiratory' | 'pregnancy' | 'injury' | 'other';
  status: 'pending' | 'confirmed' | 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  patientName: string;
  patientAge?: number;
  patientPhone: string;
  patientCondition?: string;
  pickupAddress: {
    address: string;
    landmark?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  destinationAddress?: {
    address: string;
    hospitalName?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  assignedUnit?: {
    name: string;
    phone: string;
    vehicleNumber?: string;
    driverName?: string;
  };
  estimatedArrival?: Date;
  actualArrival?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateStatus(newStatus: string, additionalData?: any): Promise<IEmergencyBooking>;
}

// Emergency Contact Schema
const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['ambulance', 'hospital', 'blood_bank', 'fire', 'police', 'poison_control', 'mental_health', 'women_helpline', 'child_helpline', 'disaster', 'covid', 'other'],
    required: true
  },
  phoneNumbers: [{
    type: String,
    required: true,
    trim: true
  }],
  tollFree: {
    type: String,
    trim: true
  },
  isNational: {
    type: Boolean,
    default: false
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  operatingHours: {
    type: String,
    default: '24x7'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String
  },
  priority: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  services: [{
    type: String,
    trim: true
  }],
  website: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Emergency Booking Schema
const EmergencyBookingSchema = new Schema<IEmergencyBooking>({
  bookingNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['ambulance', 'doctor_visit', 'hospital_admission'],
    required: true
  },
  emergencyType: {
    type: String,
    enum: ['accident', 'cardiac', 'respiratory', 'pregnancy', 'injury', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dispatched', 'en_route', 'arrived', 'completed', 'cancelled'],
    default: 'pending'
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientAge: {
    type: Number,
    min: 0,
    max: 150
  },
  patientPhone: {
    type: String,
    required: true,
    trim: true
  },
  patientCondition: {
    type: String,
    trim: true,
    maxlength: 500
  },
  pickupAddress: {
    address: {
      type: String,
      required: true
    },
    landmark: {
      type: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  destinationAddress: {
    address: {
      type: String
    },
    hospitalName: {
      type: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  assignedUnit: {
    name: {
      type: String
    },
    phone: {
      type: String
    },
    vehicleNumber: {
      type: String
    },
    driverName: {
      type: String
    }
  },
  estimatedArrival: {
    type: Date
  },
  actualArrival: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for EmergencyContact
EmergencyContactSchema.index({ type: 1, isActive: 1 });
EmergencyContactSchema.index({ isNational: 1, isActive: 1 });
EmergencyContactSchema.index({ city: 1, isActive: 1 });
EmergencyContactSchema.index({ state: 1, isActive: 1 });
EmergencyContactSchema.index({ priority: 1 });
EmergencyContactSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Indexes for EmergencyBooking
EmergencyBookingSchema.index({ bookingNumber: 1 }, { unique: true });
EmergencyBookingSchema.index({ userId: 1, status: 1 });
EmergencyBookingSchema.index({ userId: 1, createdAt: -1 });
EmergencyBookingSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware for EmergencyBooking to generate booking number
EmergencyBookingSchema.pre('save', function(next) {
  if (!this.bookingNumber) {
    // Generate unique booking number: EMR-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingNumber = `EMR-${timestamp}-${random}`;
  }
  next();
});

// Static method: Get contacts by type
EmergencyContactSchema.statics.getByType = function(type: string) {
  return this.find({ type, isActive: true })
    .sort({ priority: 1, name: 1 });
};

// Static method: Get national emergency contacts
EmergencyContactSchema.statics.getNationalContacts = function() {
  return this.find({ isNational: true, isActive: true })
    .sort({ priority: 1, name: 1 });
};

// Static method: Get contacts by city
EmergencyContactSchema.statics.getByCity = function(city: string) {
  return this.find({
    $or: [
      { city: new RegExp(city, 'i') },
      { isNational: true }
    ],
    isActive: true
  }).sort({ priority: 1, name: 1 });
};

// Static method: Get nearby contacts
EmergencyContactSchema.statics.getNearby = function(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 50
) {
  const maxDistanceMeters = maxDistanceKm * 1000;

  return this.find({
    'coordinates.latitude': { $exists: true },
    'coordinates.longitude': { $exists: true },
    isActive: true
  }).then((contacts: IEmergencyContact[]) => {
    // Calculate distance for each contact
    return contacts
      .map((contact: IEmergencyContact) => {
        if (!contact.coordinates) return null;
        const distance = calculateDistance(
          latitude,
          longitude,
          contact.coordinates.latitude,
          contact.coordinates.longitude
        );
        return { ...contact.toObject(), distance };
      })
      .filter((c: any) => c && c.distance <= maxDistanceKm)
      .sort((a: any, b: any) => a.distance - b.distance);
  });
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Instance method for EmergencyBooking: Update status
EmergencyBookingSchema.methods.updateStatus = async function(
  newStatus: string,
  additionalData?: any
): Promise<IEmergencyBooking> {
  const validStatuses = ['pending', 'confirmed', 'dispatched', 'en_route', 'arrived', 'completed', 'cancelled'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completedAt = new Date();
  }

  if (newStatus === 'cancelled' && additionalData?.reason) {
    this.cancelledAt = new Date();
    this.cancellationReason = additionalData.reason;
  }

  if (newStatus === 'arrived') {
    this.actualArrival = new Date();
  }

  if (additionalData?.assignedUnit) {
    this.assignedUnit = additionalData.assignedUnit;
  }

  if (additionalData?.estimatedArrival) {
    this.estimatedArrival = additionalData.estimatedArrival;
  }

  return await this.save();
};

// Static method for EmergencyBooking: Get user's bookings
EmergencyBookingSchema.statics.getUserBookings = function(
  userId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
) {
  const query: any = { userId };

  if (options.status) {
    query.status = options.status;
  }

  let queryBuilder = this.find(query)
    .sort({ createdAt: -1 });

  if (options.offset) {
    queryBuilder = queryBuilder.skip(options.offset);
  }

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  return queryBuilder;
};

// Static method for EmergencyBooking: Get active booking
EmergencyBookingSchema.statics.getActiveBooking = function(userId: string) {
  return this.findOne({
    userId,
    status: { $in: ['pending', 'confirmed', 'dispatched', 'en_route'] }
  });
};

// Create and export the models
const EmergencyContact = mongoose.model<IEmergencyContact>('EmergencyContact', EmergencyContactSchema);
const EmergencyBooking = mongoose.model<IEmergencyBooking>('EmergencyBooking', EmergencyBookingSchema);

export { EmergencyContact, EmergencyBooking };
export default EmergencyContact;
