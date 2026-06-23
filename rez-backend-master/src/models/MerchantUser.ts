import mongoose, { Document, Schema } from 'mongoose';

// Role type definition
export type MerchantUserRole = 'owner' | 'admin' | 'manager' | 'staff';

// Status type definition
export type MerchantUserStatus = 'active' | 'inactive' | 'suspended';

// Interface extending Document for TypeScript
export interface IMerchantUser extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  email: string;
  password: string; // hashed
  name: string;
  role: MerchantUserRole;
  permissions: string[]; // granular permissions
  status: MerchantUserStatus;
  invitedBy: mongoose.Types.ObjectId;
  invitedAt: Date;
  acceptedAt?: Date;
  lastLoginAt?: Date;

  // Invitation fields
  invitationToken?: string;
  invitationExpiry?: Date;

  // Password Reset
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;

  // Account Security
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  lastLoginIP?: string;

  // Push Notifications
  pushTokens: Array<{
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceName?: string;
    lastUsed?: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// MerchantUser Schema
const MerchantUserSchema = new Schema<IMerchantUser>({
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false, // Not required initially for invited users
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'staff'],
    required: true,
    default: 'staff'
  },
  permissions: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive', // Inactive until invitation accepted
    index: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'MerchantUser',
    required: true
  },
  invitedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },

  // Invitation fields
  invitationToken: {
    type: String,
    select: false
  },
  invitationExpiry: {
    type: Date,
    select: false
  },

  // Password Reset
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  },

  // Account Security
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  pushTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    deviceName: { type: String },
    lastUsed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: Partial<Record<string, any>>) {
      ret.id = ret._id;
      delete (ret as any)._id;
      delete (ret as any).__v;
      delete (ret as any).password;
      delete (ret as any).invitationToken;
      delete (ret as any).resetPasswordToken;
      return ret;
    }
  }
});

// Indexes
MerchantUserSchema.index({ merchantId: 1, email: 1 }, { unique: true }); // Unique email per merchant
MerchantUserSchema.index({ merchantId: 1, role: 1 });
MerchantUserSchema.index({ merchantId: 1, status: 1 });
MerchantUserSchema.index({ invitationToken: 1 });

// Instance method to check if account is locked
MerchantUserSchema.methods.isAccountLocked = function(): boolean {
  return this.accountLockedUntil ? this.accountLockedUntil > new Date() : false;
};

export const MerchantUser = mongoose.model<IMerchantUser>('MerchantUser', MerchantUserSchema);
