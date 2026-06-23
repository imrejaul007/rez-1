// Outlet Model - Store branches/locations

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOutlet extends Document {
  store: Types.ObjectId;
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  phone: string;
  email?: string;
  openingHours: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  isActive: boolean;
  offers: Types.ObjectId[];
  metadata: {
    manager?: string;
    capacity?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OutletSchema = new Schema<IOutlet>({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  openingHours: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    open: {
      type: String,
      required: true
    },
    close: {
      type: String,
      required: true
    },
    isClosed: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  offers: [{
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  }],
  metadata: {
    manager: String,
    capacity: Number
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
OutletSchema.index({ location: '2dsphere' });
OutletSchema.index({ store: 1, isActive: 1 });

// Static method to find nearby outlets
OutletSchema.statics.findNearby = async function(
  lng: number,
  lat: number,
  radiusInKm: number = 10,
  limit: number = 20
) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusInKm * 1000 // Convert to meters
      }
    },
    isActive: true
  }).limit(limit);
};

const Outlet = mongoose.model<IOutlet>('Outlet', OutletSchema);
export default Outlet;
