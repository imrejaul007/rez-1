import mongoose, { Schema, Document, Types } from 'mongoose';

export type ChallengeAnalyticsEvent =
  | 'impression'
  | 'join'
  | 'progress_update'
  | 'completion'
  | 'claim'
  | 'drop_off';

export interface IChallengeAnalytics extends Document {
  challenge: Types.ObjectId;
  user: Types.ObjectId;
  event: ChallengeAnalyticsEvent;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const challengeAnalyticsSchema = new Schema<IChallengeAnalytics>(
  {
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: {
      type: String,
      required: true,
      enum: ['impression', 'join', 'progress_update', 'completion', 'claim', 'drop_off'],
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Compound indexes for efficient querying
challengeAnalyticsSchema.index({ challenge: 1, event: 1, timestamp: -1 });
challengeAnalyticsSchema.index({ user: 1, timestamp: -1 });
challengeAnalyticsSchema.index({ challenge: 1, user: 1, event: 1 });
challengeAnalyticsSchema.index({ event: 1, timestamp: -1 });

// Static methods
challengeAnalyticsSchema.statics.trackEvent = async function (
  challengeId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
  event: ChallengeAnalyticsEvent,
  metadata?: Record<string, any>
) {
  return this.create({
    challenge: challengeId,
    user: userId,
    event,
    metadata,
    timestamp: new Date(),
  });
};

challengeAnalyticsSchema.statics.trackImpressions = async function (
  challengeIds: (string | Types.ObjectId)[],
  userId: string | Types.ObjectId
) {
  if (challengeIds.length === 0) return;
  const docs = challengeIds.map(cid => ({
    challenge: cid,
    user: userId,
    event: 'impression' as const,
    timestamp: new Date(),
  }));
  return this.insertMany(docs, { ordered: false }).catch(() => {});
};

challengeAnalyticsSchema.statics.getConversionFunnel = async function (
  challengeId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const match: any = {};
  if (challengeId) match.challenge = new mongoose.Types.ObjectId(challengeId);
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = startDate;
    if (endDate) match.timestamp.$lte = endDate;
  }

  const pipeline: any[] = [];
  if (Object.keys(match).length > 0) pipeline.push({ $match: match });

  pipeline.push(
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
      },
    },
    {
      $project: {
        event: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0,
      },
    }
  );

  const results = await this.aggregate(pipeline);
  const funnel: Record<string, { count: number; uniqueUsers: number }> = {};
  for (const r of results) {
    funnel[r.event] = { count: r.count, uniqueUsers: r.uniqueUsers };
  }
  return funnel;
};

challengeAnalyticsSchema.statics.getChallengeAnalytics = async function (
  startDate?: Date,
  endDate?: Date
) {
  const match: any = {};
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = startDate;
    if (endDate) match.timestamp.$lte = endDate;
  }

  const pipeline: any[] = [];
  if (Object.keys(match).length > 0) pipeline.push({ $match: match });

  pipeline.push(
    {
      $group: {
        _id: { challenge: '$challenge', event: '$event' },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
      },
    },
    {
      $group: {
        _id: '$_id.challenge',
        events: {
          $push: {
            event: '$_id.event',
            count: '$count',
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'challenges',
        localField: '_id',
        foreignField: '_id',
        as: 'challengeInfo',
      },
    },
    { $unwind: { path: '$challengeInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        challengeId: '$_id',
        title: '$challengeInfo.title',
        events: 1,
        _id: 0,
      },
    }
  );

  return this.aggregate(pipeline);
};

const ChallengeAnalytics = mongoose.model<IChallengeAnalytics>('ChallengeAnalytics', challengeAnalyticsSchema);

export default ChallengeAnalytics;
