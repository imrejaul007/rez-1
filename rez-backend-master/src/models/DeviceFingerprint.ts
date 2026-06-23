import mongoose, { Document, Schema, Types } from 'mongoose';

// ── Interfaces ──

export interface IDeviceUser {
  userId: Types.ObjectId;
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
}

export interface IMerchantAccess {
  merchantId: Types.ObjectId;
  merchantName: string;
  firstAccess: Date;
  lastAccess: Date;
  accessCount: number;
  transactionCount: number;
}

export interface IDeviceFlag {
  type: 'multi_account' | 'merchant_overlap' | 'velocity' | 'emulator' | 'vpn' | 'geographic_anomaly' | 'manual';
  reason: string;
  flaggedAt: Date;
  flaggedBy: string; // 'system' or admin userId
  resolved: boolean;
  resolvedAt?: Date;
}

export interface IDeviceLocation {
  ip: string;
  country: string;
  city: string;
  seenAt: Date;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';
export type DevicePlatform = 'ios' | 'android' | 'web';

export interface IDeviceFingerprint extends Document {
  deviceHash: string;
  users: IDeviceUser[];
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  platform: DevicePlatform;
  merchantsAccessed: IMerchantAccess[];
  trustScore: number;
  riskLevel: RiskLevel;
  flags: IDeviceFlag[];
  isBlocked: boolean;
  blockedAt?: Date;
  blockedReason?: string;
  blockedBy?: string;
  locations: IDeviceLocation[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──

const deviceUserSchema = new Schema<IDeviceUser>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const merchantAccessSchema = new Schema<IMerchantAccess>({
  merchantId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  merchantName: { type: String, required: true },
  firstAccess: { type: Date, default: Date.now },
  lastAccess: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 1 },
  transactionCount: { type: Number, default: 0 },
}, { _id: false });

const deviceFlagSchema = new Schema<IDeviceFlag>({
  type: {
    type: String,
    enum: ['multi_account', 'merchant_overlap', 'velocity', 'emulator', 'vpn', 'geographic_anomaly', 'manual'],
    required: true,
  },
  reason: { type: String, required: true },
  flaggedAt: { type: Date, default: Date.now },
  flaggedBy: { type: String, default: 'system' },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
}, { _id: false });

const deviceLocationSchema = new Schema<IDeviceLocation>({
  ip: { type: String, required: true },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  seenAt: { type: Date, default: Date.now },
}, { _id: false });

const deviceFingerprintSchema = new Schema<IDeviceFingerprint>(
  {
    deviceHash: { type: String, required: true, unique: true, index: true },
    users: [deviceUserSchema],
    osVersion: { type: String, default: '' },
    deviceModel: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    merchantsAccessed: [merchantAccessSchema],
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'blocked'], default: 'low' },
    flags: [deviceFlagSchema],
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date },
    blockedReason: { type: String },
    blockedBy: { type: String },
    locations: [deviceLocationSchema],
  },
  { timestamps: true }
);

// ── Indexes ──
deviceFingerprintSchema.index({ 'users.userId': 1 });
deviceFingerprintSchema.index({ 'merchantsAccessed.merchantId': 1 });
deviceFingerprintSchema.index({ riskLevel: 1 });
// TTL index: auto-delete device fingerprints after 90 days of inactivity.
// `updatedAt` is refreshed on every save/update (via timestamps: true),
// so active devices keep getting extended while stale ones expire.
deviceFingerprintSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days

// Cap arrays to prevent unbounded growth
deviceFingerprintSchema.pre('save', function () {
  if (this.locations.length > 100) {
    this.locations = this.locations.slice(-100);
  }
  if (this.merchantsAccessed.length > 500) {
    this.merchantsAccessed = this.merchantsAccessed.slice(-500);
  }
});

export const DeviceFingerprint = mongoose.model<IDeviceFingerprint>('DeviceFingerprint', deviceFingerprintSchema);
export default DeviceFingerprint;
