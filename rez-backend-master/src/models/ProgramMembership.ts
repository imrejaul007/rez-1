import mongoose, { Schema, Document, Types } from 'mongoose';
import { SpecialProgramSlug } from './SpecialProgramConfig';

/**
 * Program Membership Model
 *
 * Tracks a user's membership in a special program.
 * One document per user-program pair (enforced by compound unique index).
 *
 * Status workflow:
 *   pending_verification → active → suspended/expired/revoked
 *   (or directly eligible → active if no verification needed)
 *
 * Monthly earning tracking is reset on the 1st of each month via cron.
 * currentMonthEarnings is incremented atomically via $inc when coins are awarded.
 */

export type MembershipStatus = 'pending_verification' | 'active' | 'suspended' | 'expired' | 'revoked';

export interface IStatusHistoryEntry {
  status: MembershipStatus;
  changedAt: Date;
  reason?: string;
  changedBy?: Types.ObjectId;
}

export interface IProgramMembership extends Document {
  user: Types.ObjectId;
  programSlug: SpecialProgramSlug;
  status: MembershipStatus;

  activatedAt?: Date;
  expiresAt?: Date;
  lastEligibilityCheck?: Date;

  currentMonthEarnings: number;
  currentMonthStart: Date;

  totalEarnings: number;
  totalMultiplierBonus: number;
  monthsActive: number;

  statusHistory: IStatusHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const StatusHistorySchema = new Schema<IStatusHistoryEntry>({
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'suspended', 'expired', 'revoked'],
    required: true,
  },
  changedAt: { type: Date, default: Date.now, required: true },
  reason: { type: String },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const ProgramMembershipSchema = new Schema<IProgramMembership>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    programSlug: {
      type: String,
      enum: ['student_zone', 'corporate_perks', 'nuqta_prive'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended', 'expired', 'revoked'],
      default: 'pending_verification',
      required: true,
    },

    activatedAt: { type: Date },
    expiresAt: { type: Date },
    lastEligibilityCheck: { type: Date },

    currentMonthEarnings: { type: Number, default: 0, min: 0 },
    currentMonthStart: {
      type: Date,
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
      },
    },

    totalEarnings: { type: Number, default: 0, min: 0 },
    totalMultiplierBonus: { type: Number, default: 0, min: 0 },
    monthsActive: { type: Number, default: 0, min: 0 },

    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
);

// Compound unique index: one membership per user per program
ProgramMembershipSchema.index({ user: 1, programSlug: 1 }, { unique: true });
ProgramMembershipSchema.index({ programSlug: 1, status: 1 });
ProgramMembershipSchema.index({ user: 1, status: 1 });
ProgramMembershipSchema.index({ expiresAt: 1 }, { sparse: true });

export const ProgramMembership = mongoose.model<IProgramMembership>(
  'ProgramMembership',
  ProgramMembershipSchema
);

export default ProgramMembership;
