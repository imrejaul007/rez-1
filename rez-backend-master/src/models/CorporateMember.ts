/**
 * CorporateMember — employee linked to a Corporate account.
 *
 * A member may or may not have an existing REZ user account.
 * When `userId` is set, distributions credit their REZ wallet directly.
 * When unset, an invite is pending — distributions are held in `pendingCoins`.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export type CorporateMemberStatus = 'active' | 'invited' | 'deactivated';

export interface ICorporateMember extends Document {
  corporateId: Types.ObjectId;
  userId?: Types.ObjectId; // linked REZ user (null until they accept invite)

  name: string;
  email: string;
  phone?: string;
  employeeId?: string; // company's internal employee ID
  department?: string; // department name (matches Corporate.departments[].name)
  designation?: string;

  status: CorporateMemberStatus;
  invitedAt?: Date;
  joinedAt?: Date;

  // Coin tracking for this member
  coinsReceived: number; // lifetime coins sent to them
  coinsSpent: number; // lifetime coins they've redeemed
  pendingCoins: number; // coins held until they join REZ

  createdAt: Date;
  updatedAt: Date;
}

const CorporateMemberSchema = new Schema<ICorporateMember>(
  {
    corporateId: {
      type: Schema.Types.ObjectId,
      ref: 'Corporate',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 15 },
    employeeId: { type: String, trim: true, maxlength: 50 },
    department: { type: String, trim: true, maxlength: 100 },
    designation: { type: String, trim: true, maxlength: 100 },

    status: {
      type: String,
      enum: ['active', 'invited', 'deactivated'],
      default: 'invited',
    },
    invitedAt: Date,
    joinedAt: Date,

    coinsReceived: { type: Number, default: 0, min: 0 },
    coinsSpent: { type: Number, default: 0, min: 0 },
    pendingCoins: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// One employee per company
CorporateMemberSchema.index({ corporateId: 1, email: 1 }, { unique: true });
CorporateMemberSchema.index({ corporateId: 1, department: 1 });
CorporateMemberSchema.index({ corporateId: 1, status: 1 });
// Fast lookup by email alone — needed for pending-coins claim on user registration
CorporateMemberSchema.index({ email: 1 });

export const CorporateMember = mongoose.model<ICorporateMember>('CorporateMember', CorporateMemberSchema);
