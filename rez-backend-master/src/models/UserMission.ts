import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserMissionStatus = 'active' | 'completed' | 'expired' | 'abandoned';

export interface IProgressEvent {
  eventType: string;
  eventData?: Record<string, any>;
  incrementAmount: number;
  timestamp: Date;
}

export interface IUserMission extends Document {
  userId: Types.ObjectId;
  missionId: Types.ObjectId;
  progress: number;
  targetCount: number;
  status: UserMissionStatus;
  progressEvents: IProgressEvent[];
  rewardDistributed: boolean;
  rewardIdempotencyKey: string;
  claimedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserMissionSchema = new Schema<IUserMission>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  missionId: {
    type: Schema.Types.ObjectId,
    ref: 'PriveMission',
    required: true,
    index: true,
  },
  progress: { type: Number, default: 0, min: 0 },
  targetCount: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'abandoned'],
    default: 'active',
    index: true,
  },
  progressEvents: [{
    eventType: { type: String, required: true },
    eventData: { type: Schema.Types.Mixed },
    incrementAmount: { type: Number, default: 1 },
    timestamp: { type: Date, default: Date.now },
  }],
  rewardDistributed: { type: Boolean, default: false },
  rewardIdempotencyKey: { type: String },
  claimedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound unique index: one active mission per user
UserMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });
// Status queries
UserMissionSchema.index({ userId: 1, status: 1 });
// Idempotency
UserMissionSchema.index({ rewardIdempotencyKey: 1 }, { unique: true, sparse: true });

export const UserMission = mongoose.model<IUserMission>('UserMission', UserMissionSchema);
