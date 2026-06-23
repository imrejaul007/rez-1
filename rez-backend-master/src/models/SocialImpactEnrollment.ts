import mongoose, { Schema, Document } from 'mongoose';

export type EnrollmentStatus = 'registered' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface ISocialImpactEnrollment extends Document {
  user: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  registeredAt: Date;
  checkedInAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  coinsAwarded: {
    rez: number;
    brand: number;
    awardedAt?: Date;
  };
  checkedInBy?: mongoose.Types.ObjectId;
  completedBy?: mongoose.Types.ObjectId;
  impactContributed?: {
    metric: string;
    value: number;
  };
  feedback?: {
    rating?: number;
    comment?: string;
    submittedAt?: Date;
  };
  cancellationReason?: string;
  rewardIdempotencyKey?: string;
  verification?: {
    method?: 'manual' | 'qr' | 'otp' | 'geo';
    qrToken?: string;
    qrScannedAt?: Date;
    otpCode?: string;
    otpExpiresAt?: Date;
    otpVerifiedAt?: Date;
    geoLocation?: {
      lat: number;
      lng: number;
    };
    geoDistanceMeters?: number;
    geoVerifiedAt?: Date;
    verifiedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialImpactEnrollmentSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['registered', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'registered',
      index: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    checkedInAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    coinsAwarded: {
      rez: { type: Number, default: 0 },
      brand: { type: Number, default: 0 },
      awardedAt: { type: Date }
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    impactContributed: {
      metric: { type: String },
      value: { type: Number, default: 0 }
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      submittedAt: { type: Date }
    },
    cancellationReason: {
      type: String
    },
    rewardIdempotencyKey: {
      type: String
    },
    verification: {
      method: { type: String, enum: ['manual', 'qr', 'otp', 'geo'] },
      qrToken: { type: String },
      qrScannedAt: { type: Date },
      otpCode: { type: String },
      otpExpiresAt: { type: Date },
      otpVerifiedAt: { type: Date },
      geoLocation: {
        lat: { type: Number },
        lng: { type: Number }
      },
      geoDistanceMeters: { type: Number },
      geoVerifiedAt: { type: Date },
      verifiedAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique enrollment per user per program
SocialImpactEnrollmentSchema.index({ user: 1, program: 1 }, { unique: true });

// Index for querying enrollments by status
SocialImpactEnrollmentSchema.index({ program: 1, status: 1 });

// Index for user's enrollments sorted by date
SocialImpactEnrollmentSchema.index({ user: 1, registeredAt: -1 });

// Index for completed enrollments (for stats)
SocialImpactEnrollmentSchema.index({ user: 1, status: 1, completedAt: -1 });

// Unique sparse index for idempotency on reward crediting
SocialImpactEnrollmentSchema.index({ rewardIdempotencyKey: 1 }, { unique: true, sparse: true });

// Sparse index for QR token lookup
SocialImpactEnrollmentSchema.index({ 'verification.qrToken': 1 }, { sparse: true });

export default mongoose.model<ISocialImpactEnrollment>('SocialImpactEnrollment', SocialImpactEnrollmentSchema);
