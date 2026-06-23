import mongoose, { Document, Schema, Types } from 'mongoose';

// Event Review Interface
export interface IEventReview extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  bookingId?: Types.ObjectId; // Reference to the booking that allows this review
  rating: number; // 1-5 stars
  title: string;
  review: string;
  helpfulCount: number;
  reportCount: number;
  isVerifiedBooking: boolean; // True if user actually booked the event
  status: 'pending' | 'approved' | 'rejected';
  response?: {
    text: string;
    respondedBy: Types.ObjectId;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Event Review Schema
const EventReviewSchema = new Schema<IEventReview>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'EventBooking',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    isVerifiedBooking: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Auto-approve reviews (can be changed to 'pending' for moderation)
    },
    response: {
      text: { type: String, maxlength: 1000 },
      respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      respondedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
EventReviewSchema.index({ eventId: 1, userId: 1 }, { unique: true }); // One review per user per event
EventReviewSchema.index({ eventId: 1, status: 1, createdAt: -1 });
EventReviewSchema.index({ eventId: 1, rating: -1 });
EventReviewSchema.index({ userId: 1, createdAt: -1 });

// Static method to calculate average rating for an event
EventReviewSchema.statics.calculateEventRating = async function (eventId: Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { eventId, status: 'approved' } },
    {
      $group: {
        _id: '$eventId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    return {
      rating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: result[0].reviewCount,
    };
  }

  return { rating: 0, reviewCount: 0 };
};

// Post-save hook to update event rating
EventReviewSchema.post('save', async function (doc) {
  const Event = mongoose.model('Event');
  const EventReview = mongoose.model('EventReview');

  // Calculate new rating
  const stats = await (EventReview as any).calculateEventRating(doc.eventId);

  // Update event
  await Event.findByIdAndUpdate(doc.eventId, {
    rating: stats.rating,
    reviewCount: stats.reviewCount,
  });
});

// Post-remove hook to update event rating
EventReviewSchema.post('deleteOne', { document: true, query: false }, async function (doc: any) {
  if (doc && doc.eventId) {
    const Event = mongoose.model('Event');
    const EventReview = mongoose.model('EventReview');

    // Calculate new rating
    const stats = await (EventReview as any).calculateEventRating(doc.eventId);

    // Update event
    await Event.findByIdAndUpdate(doc.eventId, {
      rating: stats.rating,
      reviewCount: stats.reviewCount,
    });
  }
});

const EventReview = mongoose.model<IEventReview>('EventReview', EventReviewSchema);

export default EventReview;
