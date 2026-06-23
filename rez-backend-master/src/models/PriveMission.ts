import mongoose, { Schema, Document, Types } from 'mongoose';

export type MissionActionType = 'order' | 'review' | 'referral' | 'social_share' | 'check_in' | 'redeem' | 'invite' | 'bill_upload';
export type MissionTargetPillar = 'engagement' | 'trust' | 'influence' | 'economicValue' | 'brandAffinity' | 'network';

export interface IPriveMission extends Document {
  title: string;
  description: string;
  shortDescription: string;
  icon: string;
  targetPillar: MissionTargetPillar;
  actionType: MissionActionType;
  targetCount: number;
  reward: {
    coins: number;
    coinType: 'rez' | 'prive';
    pillarBoost: number; // bonus points to the target pillar
    displayText: string;
  };
  startDate: Date;
  endDate: Date;
  tierRequired: 'none' | 'entry' | 'signature' | 'elite';
  maxParticipants: number;
  currentParticipants: number;
  estimatedPillarGain: number;
  pointsPerEffort: number;
  priority: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriveMissionSchema = new Schema<IPriveMission>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  icon: { type: String, default: '🎯' },
  targetPillar: {
    type: String,
    required: true,
    enum: ['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'],
  },
  actionType: {
    type: String,
    required: true,
    enum: ['order', 'review', 'referral', 'social_share', 'check_in', 'redeem', 'invite', 'bill_upload'],
  },
  targetCount: { type: Number, required: true, min: 1 },
  reward: {
    coins: { type: Number, required: true, min: 0 },
    coinType: { type: String, enum: ['rez', 'prive'], default: 'rez' },
    pillarBoost: { type: Number, default: 0, min: 0 },
    displayText: { type: String, default: '' },
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  tierRequired: {
    type: String,
    enum: ['none', 'entry', 'signature', 'elite'],
    default: 'none',
  },
  maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
  currentParticipants: { type: Number, default: 0 },
  estimatedPillarGain: { type: Number, default: 0 },
  pointsPerEffort: { type: Number, default: 1 },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

// Indexes
PriveMissionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
PriveMissionSchema.index({ targetPillar: 1, isActive: 1 });
PriveMissionSchema.index({ tierRequired: 1, isActive: 1, priority: -1 });
PriveMissionSchema.index({ isDeleted: 1, isActive: 1 });

// Static: find available missions for a tier
PriveMissionSchema.statics.findAvailableForTier = async function(tier: string, limit: number = 20) {
  const now = new Date();
  const tierRank: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };
  const userRank = tierRank[tier] || 0;

  const tierOptions = Object.entries(tierRank)
    .filter(([_, rank]) => rank <= userRank)
    .map(([t]) => t);

  return this.find({
    isActive: true,
    isDeleted: false,
    startDate: { $lte: now },
    endDate: { $gte: now },
    tierRequired: { $in: tierOptions },
    $or: [
      { maxParticipants: 0 },
      { $expr: { $lt: ['$currentParticipants', '$maxParticipants'] } },
    ],
  })
    .sort({ priority: -1, endDate: 1 })
    .limit(limit);
};

export const PriveMission = mongoose.model<IPriveMission>('PriveMission', PriveMissionSchema);
