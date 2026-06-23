import { Schema, model, Document, Types } from 'mongoose';

/**
 * TeamInvitation — pending invitations to join a merchant's team.
 *
 * Flow:
 * 1. Merchant sends invite (email + role) → creates TeamInvitation with status 'pending'
 * 2. Invited staff clicks email link → token validated, account created/linked
 * 3. TeamInvitation status → 'accepted'; TeamMember record created
 * 4. Expired/cancelled invites → status 'expired'/'cancelled'
 *
 * Used in test utils for DB cleanup and in merchant team management flows.
 */
export interface ITeamInvitation extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  invitedEmail: string;
  invitedPhone?: string;
  role: string; // 'manager' | 'staff' | 'cashier' | 'chef' | 'delivery'
  invitedBy: Types.ObjectId; // merchant user who sent the invite
  token: string; // secure random token for invite URL
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId; // User._id of the staff who accepted
  createdAt: Date;
  updatedAt: Date;
}

const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    invitedEmail: { type: String, required: true, lowercase: true, trim: true },
    invitedPhone: { type: String, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['owner', 'manager', 'staff', 'cashier', 'chef', 'delivery', 'support'],
      default: 'staff',
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true }, // indexed via TTL schema.index below
    acceptedAt: { type: Date },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Compound indexes
TeamInvitationSchema.index({ merchantId: 1, status: 1 });
TeamInvitationSchema.index({ invitedEmail: 1, merchantId: 1, status: 1 });
// Auto-expire: TTL index so MongoDB removes old records automatically
TeamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TeamInvitation = model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);

export default TeamInvitation;
