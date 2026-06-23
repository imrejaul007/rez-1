import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPrizeEntry {
  userId: Types.ObjectId;
  rank: number;
  score: number;
  prizeAmount: number;
  coinTransactionId?: Types.ObjectId;
  status: 'pending' | 'distributed' | 'failed' | 'flagged';
  flagReason?: string;
}

export interface ILeaderboardPrizeDistribution extends Document {
  leaderboardConfigId: Types.ObjectId;
  cycleStartDate: Date;
  cycleEndDate: Date;
  period: string;
  distributedAt: Date;
  entries: IPrizeEntry[];
  totalDistributed: number;
  totalFlagged: number;
  status: 'pending' | 'processing' | 'completed' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

const PrizeEntrySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true },
  score: { type: Number, required: true },
  prizeAmount: { type: Number, required: true, min: 0 },
  coinTransactionId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  status: {
    type: String,
    enum: ['pending', 'distributed', 'failed', 'flagged'],
    default: 'pending'
  },
  flagReason: { type: String }
}, { _id: false });

const LeaderboardPrizeDistributionSchema = new Schema<ILeaderboardPrizeDistribution>({
  leaderboardConfigId: {
    type: Schema.Types.ObjectId,
    ref: 'LeaderboardConfig',
    required: true,
    index: true
  },
  cycleStartDate: {
    type: Date,
    required: true
  },
  cycleEndDate: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'all-time']
  },
  distributedAt: {
    type: Date,
    default: Date.now
  },
  entries: {
    type: [PrizeEntrySchema],
    default: []
  },
  totalDistributed: {
    type: Number,
    default: 0,
    min: 0
  },
  totalFlagged: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'partial'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Idempotency: prevent duplicate prize distributions for the same cycle
LeaderboardPrizeDistributionSchema.index(
  { leaderboardConfigId: 1, cycleStartDate: 1, cycleEndDate: 1 },
  { unique: true }
);
LeaderboardPrizeDistributionSchema.index({ status: 1, createdAt: -1 });

const LeaderboardPrizeDistribution = mongoose.model<ILeaderboardPrizeDistribution>(
  'LeaderboardPrizeDistribution',
  LeaderboardPrizeDistributionSchema
);
export default LeaderboardPrizeDistribution;
