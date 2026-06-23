/**
 * PriveAccess Model
 *
 * Single source of truth for whether a user has Privé access.
 * Access is gated by invite codes — users must be invited by an existing
 * Privé member or whitelisted by admin.
 *
 * Access methods:
 * - invite: User applied a valid Privé invite code
 * - admin_whitelist: Admin manually granted permanent access
 * - auto_qualify: Grandfathered from existing eligible reputation
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type PriveAccessStatus = 'active' | 'suspended' | 'revoked';
export type PriveGrantMethod = 'invite' | 'admin_whitelist' | 'auto_qualify';
export type PriveAuditAction = 'granted' | 'suspended' | 'revoked' | 'whitelisted' | 'un_whitelisted' | 'tier_override' | 'reactivated';

export interface IPriveAuditEntry {
  action: PriveAuditAction;
  by: Types.ObjectId;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IPriveAccess extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: PriveAccessStatus;
  grantMethod: PriveGrantMethod;

  // Invite chain tracking
  invitedBy?: Types.ObjectId;
  inviteCodeUsed?: string;

  // Admin override
  isWhitelisted: boolean;
  whitelistedBy?: Types.ObjectId;
  whitelistReason?: string;

  // Tier override (admin can force a specific tier)
  tierOverride?: 'entry' | 'signature' | 'elite' | null;

  // Timestamps
  activatedAt: Date;
  suspendedAt?: Date;
  suspendReason?: string;
  revokedAt?: Date;
  revokeReason?: string;

  // Audit trail
  auditLog: IPriveAuditEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export interface IPriveAccessModel extends Model<IPriveAccess> {
  hasAccess(userId: string | Types.ObjectId): Promise<boolean>;
  getByUserId(userId: string | Types.ObjectId): Promise<IPriveAccess | null>;
  getActiveMembers(options?: { page?: number; limit?: number }): Promise<{ members: IPriveAccess[]; total: number }>;
  getInviteCount(inviterId: string | Types.ObjectId): Promise<number>;
}

const PriveAuditEntrySchema = new Schema<IPriveAuditEntry>(
  {
    action: {
      type: String,
      enum: ['granted', 'suspended', 'revoked', 'whitelisted', 'un_whitelisted', 'tier_override', 'reactivated'],
      required: true,
    },
    by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const PriveAccessSchema = new Schema<IPriveAccess>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active',
      index: true,
    },
    grantMethod: {
      type: String,
      enum: ['invite', 'admin_whitelist', 'auto_qualify'],
      required: [true, 'Grant method is required'],
    },

    // Invite chain
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inviteCodeUsed: {
      type: String,
    },

    // Admin override
    isWhitelisted: {
      type: Boolean,
      default: false,
      index: true,
    },
    whitelistedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    whitelistReason: {
      type: String,
    },

    // Tier override
    tierOverride: {
      type: String,
      enum: ['entry', 'signature', 'elite', null],
      default: null,
    },

    // Timestamps
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    suspendedAt: {
      type: Date,
    },
    suspendReason: {
      type: String,
    },
    revokedAt: {
      type: Date,
    },
    revokeReason: {
      type: String,
    },

    // Audit trail
    auditLog: {
      type: [PriveAuditEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PriveAccessSchema.index({ invitedBy: 1, status: 1 });
PriveAccessSchema.index({ grantMethod: 1, status: 1 });
PriveAccessSchema.index({ createdAt: -1 });

// Static: check if user has active access
PriveAccessSchema.statics.hasAccess = async function (
  userId: string | Types.ObjectId
): Promise<boolean> {
  const record = await this.findOne({
    userId,
    status: 'active',
  });
  return !!record;
};

// Static: get access record by userId
PriveAccessSchema.statics.getByUserId = async function (
  userId: string | Types.ObjectId
): Promise<IPriveAccess | null> {
  return this.findOne({ userId });
};

// Static: get active members (paginated)
PriveAccessSchema.statics.getActiveMembers = async function (
  options: { page?: number; limit?: number } = {}
): Promise<{ members: IPriveAccess[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const [members, total] = await Promise.all([
    this.find({ status: 'active' })
      .populate('userId', 'profile.firstName profile.lastName email phoneNumber')
      .populate('invitedBy', 'profile.firstName profile.lastName')
      .sort({ activatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ status: 'active' }),
  ]);

  return { members, total };
};

// Static: count how many people a user has invited (active only)
PriveAccessSchema.statics.getInviteCount = async function (
  inviterId: string | Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    invitedBy: inviterId,
    status: 'active',
  });
};

const PriveAccess = mongoose.model<IPriveAccess, IPriveAccessModel>(
  'PriveAccess',
  PriveAccessSchema
);

export default PriveAccess;
