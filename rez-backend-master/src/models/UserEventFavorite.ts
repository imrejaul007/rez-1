import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserEventFavorite extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  createdAt: Date;
}

const UserEventFavoriteSchema = new Schema<IUserEventFavorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Unique compound index: one favorite per user per event
UserEventFavoriteSchema.index({ userId: 1, eventId: 1 }, { unique: true });
UserEventFavoriteSchema.index({ userId: 1, createdAt: -1 });
UserEventFavoriteSchema.index({ eventId: 1 });

// Static: toggle favorite (returns { isFavorited, favorite })
UserEventFavoriteSchema.statics.toggle = async function (
  userId: Types.ObjectId | string,
  eventId: Types.ObjectId | string
): Promise<{ isFavorited: boolean; favorite: IUserEventFavorite | null }> {
  const existing = await this.findOne({ userId, eventId });
  if (existing) {
    await this.deleteOne({ _id: existing._id });
    return { isFavorited: false, favorite: null };
  }
  const favorite = await this.create({ userId, eventId });
  return { isFavorited: true, favorite };
};

// Static: check if user has favorited an event
UserEventFavoriteSchema.statics.isFavorited = async function (
  userId: Types.ObjectId | string,
  eventId: Types.ObjectId | string
): Promise<boolean> {
  const count = await this.countDocuments({ userId, eventId });
  return count > 0;
};

// Static: get user's favorited event IDs
UserEventFavoriteSchema.statics.getUserFavoriteIds = async function (
  userId: Types.ObjectId | string
): Promise<Types.ObjectId[]> {
  const favorites = await this.find({ userId }).select('eventId').lean();
  return favorites.map((f: any) => f.eventId);
};

const UserEventFavorite = mongoose.model<IUserEventFavorite>('UserEventFavorite', UserEventFavoriteSchema);

export default UserEventFavorite;
