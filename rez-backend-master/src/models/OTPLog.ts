import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPLog extends Document {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPLogSchema = new Schema<IOTPLog>(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    otp: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically delete expired OTPs after 24 hours
OTPLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

// Index for efficient lookup
OTPLogSchema.index({ phoneNumber: 1, createdAt: -1 });

export const OTPLog = mongoose.model<IOTPLog>('OTPLog', OTPLogSchema);
