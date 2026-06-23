import mongoose, { Document, Schema, Types } from 'mongoose';

export type CheckInMethod = 'qr_scan' | 'geo_fence' | 'otp' | 'organiser_manual' | 'manual';

export type EventRewardActionType =
  | 'event_booking'
  | 'event_checkin'
  | 'event_participation'
  | 'event_sharing'
  | 'event_entry'
  | 'event_rating'
  | 'event_review';

export interface IRewardGranted {
  action: EventRewardActionType;
  coinTransactionId: Types.ObjectId;
  amount: number;
  grantedAt: Date;
}

export interface IEventAttendance extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  bookingId: Types.ObjectId;
  checkInMethod?: CheckInMethod;
  checkInTime?: Date;
  checkOutTime?: Date;
  checkInLocation?: {
    lat: number;
    lng: number;
  };
  isVerified: boolean;
  rewardsGranted: IRewardGranted[];
  createdAt: Date;
  updatedAt: Date;
}

const RewardGrantedSchema = new Schema<IRewardGranted>({
  action: {
    type: String,
    required: true,
    enum: ['event_booking', 'event_checkin', 'event_participation', 'event_sharing', 'event_entry', 'event_rating', 'event_review'],
  },
  coinTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'CoinTransaction',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  grantedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const EventAttendanceSchema = new Schema<IEventAttendance>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookingId: {
    type: Schema.Types.ObjectId,
    ref: 'EventBooking',
    required: true,
  },
  checkInMethod: {
    type: String,
    enum: ['qr_scan', 'geo_fence', 'otp', 'organiser_manual', 'manual'],
  },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  checkInLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  rewardsGranted: {
    type: [RewardGrantedSchema],
    default: [],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index for idempotency: one attendance record per user per event
EventAttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventAttendanceSchema.index({ userId: 1, createdAt: -1 });
EventAttendanceSchema.index({ eventId: 1, isVerified: 1 });
EventAttendanceSchema.index({ bookingId: 1 });

// Static: check if a specific reward has already been granted
EventAttendanceSchema.statics.hasRewardBeenGranted = async function (
  eventId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  action: EventRewardActionType
): Promise<boolean> {
  const attendance = await this.findOne({
    eventId,
    userId,
    'rewardsGranted.action': action,
  });
  return !!attendance;
};

// Static: get or create attendance record (race-safe via upsert)
EventAttendanceSchema.statics.getOrCreate = async function (
  eventId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  bookingId: Types.ObjectId | string
): Promise<IEventAttendance> {
  const attendance = await this.findOneAndUpdate(
    { eventId, userId },
    { $setOnInsert: { eventId, userId, bookingId, isVerified: false, rewardsGranted: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return attendance;
};

// Instance: add reward record (idempotent per action)
EventAttendanceSchema.methods.addReward = function (
  action: EventRewardActionType,
  coinTransactionId: Types.ObjectId,
  amount: number
) {
  const existing = this.rewardsGranted.find((r: IRewardGranted) => r.action === action);
  if (existing) return this; // Already granted, skip

  this.rewardsGranted.push({
    action,
    coinTransactionId,
    amount,
    grantedAt: new Date(),
  });
  return this.save();
};

// Static: get daily reward count for a user+action (across all events)
EventAttendanceSchema.statics.getDailyRewardCount = async function (
  userId: Types.ObjectId | string,
  action: EventRewardActionType
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        'rewardsGranted.action': action,
        'rewardsGranted.grantedAt': { $gte: startOfDay },
      },
    },
    { $unwind: '$rewardsGranted' },
    {
      $match: {
        'rewardsGranted.action': action,
        'rewardsGranted.grantedAt': { $gte: startOfDay },
      },
    },
    { $count: 'count' },
  ]);

  return result.length > 0 ? result[0].count : 0;
};

const EventAttendance = mongoose.model<IEventAttendance>('EventAttendance', EventAttendanceSchema);

export default EventAttendance;
