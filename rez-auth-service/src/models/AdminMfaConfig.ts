import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminMfaConfig extends Document {
  adminId: mongoose.Types.ObjectId;
  secret: string; // encrypted TOTP secret (base32)
  isEnabled: boolean;
  backupCodes: Array<{
    code: string; // hashed backup code
    used: boolean;
    usedAt?: Date;
  }>;
  enabledAt?: Date;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminMfaConfigSchema = new Schema<IAdminMfaConfig>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
      // Encrypted at rest via AES-256-GCM (totpEncryption.ts).
    },
    isEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    backupCodes: [
      {
        code: { type: String, required: true }, // hashed
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
      },
    ],
    enabledAt: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for finding MFA configs by admin and enabled status
AdminMfaConfigSchema.index({ adminId: 1, isEnabled: 1 });

export const AdminMfaConfig = mongoose.model<IAdminMfaConfig>('AdminMfaConfig', AdminMfaConfigSchema);
