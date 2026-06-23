// WhatsNewStoryView Model
// Tracks which stories each user has viewed

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IWhatsNewStoryView extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  storyId: Types.ObjectId;
  viewedAt: Date;
  completed: boolean; // Viewed all slides
  clickedCta: boolean;
  slideProgress: number; // Last slide index viewed (0-based)
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IWhatsNewStoryViewModel extends Model<IWhatsNewStoryView> {
  findUserViews(userId: Types.ObjectId): Promise<IWhatsNewStoryView[]>;
  hasUserViewedStory(userId: Types.ObjectId, storyId: Types.ObjectId): Promise<boolean>;
  getUnseenStoriesCount(userId: Types.ObjectId, activeStoryIds: Types.ObjectId[]): Promise<number>;
  markAsViewed(userId: Types.ObjectId, storyId: Types.ObjectId): Promise<IWhatsNewStoryView>;
  markAsCompleted(userId: Types.ObjectId, storyId: Types.ObjectId): Promise<IWhatsNewStoryView | null>;
  markCtaClicked(userId: Types.ObjectId, storyId: Types.ObjectId): Promise<IWhatsNewStoryView | null>;
}

const WhatsNewStoryViewSchema = new Schema<IWhatsNewStoryView>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  storyId: {
    type: Schema.Types.ObjectId,
    ref: 'WhatsNewStory',
    required: [true, 'Story ID is required'],
    index: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  clickedCta: {
    type: Boolean,
    default: false,
  },
  slideProgress: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound index for unique user-story pair
WhatsNewStoryViewSchema.index({ userId: 1, storyId: 1 }, { unique: true });

// Static methods
WhatsNewStoryViewSchema.statics.findUserViews = function(userId: Types.ObjectId): Promise<IWhatsNewStoryView[]> {
  return this.find({ userId })
    .sort({ viewedAt: -1 })
    .populate('storyId', 'title icon');
};

WhatsNewStoryViewSchema.statics.hasUserViewedStory = async function(
  userId: Types.ObjectId,
  storyId: Types.ObjectId
): Promise<boolean> {
  const view = await this.findOne({ userId, storyId });
  return !!view;
};

WhatsNewStoryViewSchema.statics.getUnseenStoriesCount = async function(
  userId: Types.ObjectId,
  activeStoryIds: Types.ObjectId[]
): Promise<number> {
  if (!activeStoryIds.length) return 0;

  const viewedStories = await this.find({
    userId,
    storyId: { $in: activeStoryIds },
  }).select('storyId');

  const viewedStoryIds = new Set(viewedStories.map((v: IWhatsNewStoryView) => v.storyId.toString()));
  return activeStoryIds.filter(id => !viewedStoryIds.has(id.toString())).length;
};

WhatsNewStoryViewSchema.statics.markAsViewed = async function(
  userId: Types.ObjectId,
  storyId: Types.ObjectId
): Promise<IWhatsNewStoryView> {
  return this.findOneAndUpdate(
    { userId, storyId },
    {
      $setOnInsert: {
        userId,
        storyId,
        viewedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

WhatsNewStoryViewSchema.statics.markAsCompleted = async function(
  userId: Types.ObjectId,
  storyId: Types.ObjectId
): Promise<IWhatsNewStoryView | null> {
  return this.findOneAndUpdate(
    { userId, storyId },
    {
      $set: {
        completed: true,
      },
    },
    { new: true }
  );
};

WhatsNewStoryViewSchema.statics.markCtaClicked = async function(
  userId: Types.ObjectId,
  storyId: Types.ObjectId
): Promise<IWhatsNewStoryView | null> {
  return this.findOneAndUpdate(
    { userId, storyId },
    {
      $set: {
        clickedCta: true,
      },
    },
    { new: true }
  );
};

// Create and export the model
const WhatsNewStoryView = mongoose.model<IWhatsNewStoryView, IWhatsNewStoryViewModel>(
  'WhatsNewStoryView',
  WhatsNewStoryViewSchema
);

export default WhatsNewStoryView;
