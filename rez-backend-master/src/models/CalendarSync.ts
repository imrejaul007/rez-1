import mongoose, { Document, Schema } from 'mongoose';

export interface ICalendarSync extends Document {
  storeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  provider: 'google' | 'apple';
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  calendarId?: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarSyncSchema = new Schema<ICalendarSync>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['google', 'apple'], required: true },
    accessToken: { type: String, required: true },
    refreshToken: String,
    tokenExpiry: Date,
    calendarId: String,
    syncEnabled: { type: Boolean, default: true },
    lastSyncAt: Date,
  },
  { timestamps: true },
);

CalendarSyncSchema.index({ storeId: 1, userId: 1, provider: 1 }, { unique: true });

export default mongoose.model<ICalendarSync>('CalendarSync', CalendarSyncSchema);
