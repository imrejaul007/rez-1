import mongoose, { Schema, Document } from 'mongoose';

export interface IMfaConfig extends Document {
  userId: mongoose.Types.ObjectId;
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

const MfaConfigSchema = new Schema<IMfaConfig>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
      // AUTH-HIGH-02: Encrypted at rest via AES-256-GCM (totpEncryption.ts).
      // Format: base64(JSON) containing { v: 1, iv: <hex>, ct: <hex> }.
      // Encryption is mandatory — service throws at startup if OTP_TOTP_ENCRYPTION_KEY is absent.
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

// Index for finding MFA configs by user and enabled status
MfaConfigSchema.index({ userId: 1, isEnabled: 1 });

export const MfaConfig = mongoose.model<IMfaConfig>('MfaConfig', MfaConfigSchema);
