import mongoose, { Schema, Document, Types } from 'mongoose';

// Address Type
export enum AddressType {
  HOME = 'HOME',
  OFFICE = 'OFFICE',
  OTHER = 'OTHER'
}

// Address Interface
export interface IAddress extends Document {
  user: Types.ObjectId;
  type: AddressType;
  title: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Address Schema
const AddressSchema = new Schema<IAddress>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(AddressType),
    default: AddressType.HOME,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'India'
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
  isDefault: {
    type: Boolean,
    default: false
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index({ user: 1, createdAt: -1 });

// Pre-save hook to ensure only one default address per user
AddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Set all other addresses for this user to non-default
    await mongoose.model('Address').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export const Address = mongoose.model<IAddress>('Address', AddressSchema);