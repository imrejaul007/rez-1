import mongoose, { Schema, Document, Types } from 'mongoose';

export type IntegrationType = 'pos' | 'pms' | 'booking' | 'inventory' | 'manual';
export type IntegrationStatus = 'active' | 'paused' | 'error' | 'pending_setup';
export type SyncMode = 'realtime' | 'batch';

export interface IMerchantIntegration extends Document {
  merchant: Types.ObjectId;
  store: Types.ObjectId;
  integrationType: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  syncMode: SyncMode;
  webhookSecret: string;
  apiKeyEncrypted?: string;
  ipWhitelist: string[];
  config: Record<string, any>;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  errorCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantIntegrationSchema = new Schema<IMerchantIntegration>({
  merchant: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  integrationType: {
    type: String,
    required: true,
    enum: ['pos', 'pms', 'booking', 'inventory', 'manual'],
  },
  provider: { type: String, required: true, trim: true, lowercase: true },
  status: {
    type: String,
    enum: ['active', 'paused', 'error', 'pending_setup'],
    default: 'pending_setup',
    index: true,
  },
  syncMode: { type: String, enum: ['realtime', 'batch'], default: 'realtime' },
  webhookSecret: { type: String, required: true },
  apiKeyEncrypted: { type: String },
  ipWhitelist: [{ type: String, trim: true }],
  config: { type: Schema.Types.Mixed, default: {} },
  lastSyncAt: { type: Date },
  lastSyncStatus: { type: String },
  errorCount: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

MerchantIntegrationSchema.index({ merchant: 1, store: 1, provider: 1 }, { unique: true });

export const MerchantIntegration = mongoose.model<IMerchantIntegration>('MerchantIntegration', MerchantIntegrationSchema);
export default MerchantIntegration;
