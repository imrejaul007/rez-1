import mongoose, { Document, Schema, Model } from 'mongoose';

// HotspotArea interface
export interface IHotspotArea extends Document {
  name: string;
  slug: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number; // km
  city: string;
  state?: string;
  country: string;
  image?: string;
  isActive: boolean;
  priority: number;
  totalDeals: number;
  createdAt: Date;
  updatedAt: Date;
}

const HotspotAreaSchema = new Schema<IHotspotArea>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    radius: {
      type: Number,
      default: 5, // 5 km default radius
      min: 1,
      max: 50,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalDeals: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for geospatial queries
HotspotAreaSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

// Pre-save hook to generate slug
HotspotAreaSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const HotspotArea = mongoose.model<IHotspotArea>('HotspotArea', HotspotAreaSchema);

export default HotspotArea;
