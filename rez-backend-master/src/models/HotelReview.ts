import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReviewAspects {
  cleanliness?: number; // 1-5
  service?: number; // 1-5
  location?: number; // 1-5
  value?: number; // 1-5
  amenities?: number; // 1-5
}

export interface IHotelReview extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  hotelId: mongoose.Types.ObjectId;
  hotelPartnerId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  rating: number; // 1-5 overall rating
  title?: string;
  comment: string;
  aspects: IReviewAspects;
  photos: string[];
  status: 'pending' | 'approved' | 'published' | 'rejected';
  verified: boolean; // confirmed stay via OtaBooking
  helpfulCount: number;
  hasResponse: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHotelReviewModel extends Model<IHotelReview> {
  getHotelRatingStats(hotelId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    aspectAverages: IReviewAspects;
  }>;
  hasUserReviewedHotel(hotelId: string, userId: string): Promise<boolean>;
  getVerifiedStats(hotelId: string): Promise<{
    verifiedCount: number;
    totalCount: number;
    verifiedPercentage: number;
  }>;
}

// Denormalized aspect average aggregator helper
function buildAspectAverageAgg(aspectField: string) {
  return {
    $avg: {
      $cond: {
        if: { $gt: [{ $ifNull: [`$${aspectField}`, null] }, null] },
        then: `$${aspectField}`,
        else: '$$REMOVE',
      },
    },
  };
}

const HotelReviewSchema = new Schema<IHotelReview>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'OtaHotel',
      required: true,
      index: true,
    },
    hotelPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
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
      ref: 'OtaBooking',
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    aspects: {
      type: Schema.Types.Mixed,
      default: {},
      // Each aspect stored as { cleanliness: 4, service: 5, ... }
      validate: {
        validator: function (v: any) {
          if (!v || typeof v !== 'object') return true;
          const allowed = ['cleanliness', 'service', 'location', 'value', 'amenities'];
          return Object.keys(v).every(
            (k) => allowed.includes(k) && (v[k] === null || (Number.isInteger(v[k]) && v[k] >= 1 && v[k] <= 5)),
          );
        },
        message: 'Aspect ratings must be integers 1-5 for: cleanliness, service, location, value, amenities',
      },
    },
    photos: [
      {
        type: String,
        validate: {
          validator: function (v: string) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
          },
          message: 'Invalid photo URL format — must be a direct image link (jpg|jpeg|png|gif|webp)',
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'published', 'rejected'],
      default: 'pending',
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasResponse: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for efficient queries
HotelReviewSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
HotelReviewSchema.index({ hotelId: 1, moderationStatus: 1, createdAt: -1 });
HotelReviewSchema.index({ hotelId: 1, rating: 1, createdAt: -1 });

// Unique constraint: one review per user per hotel (idempotency guard)
HotelReviewSchema.index({ userId: 1, hotelId: 1 }, { unique: true });

// User queries
HotelReviewSchema.index({ userId: 1, createdAt: -1 });

// Full-text search index
HotelReviewSchema.index({ comment: 'text', title: 'text' });

// ── Virtual: populated user info ─────────────────────────────────────────────
HotelReviewSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'profile.name profile.avatar' },
});

// ── Static: aggregate hotel rating statistics ─────────────────────────────────
HotelReviewSchema.statics.getHotelRatingStats = async function (hotelId: string) {
  const pipeline = [
    {
      $match: {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        moderationStatus: 'approved',
        status: { $in: ['approved', 'published'] },
      },
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
              ratings: { $push: '$rating' },
            },
          },
        ],
        aspects: [
          {
            $group: {
              _id: null,
              cleanliness: buildAspectAverageAgg('aspects.cleanliness'),
              service: buildAspectAverageAgg('aspects.service'),
              location: buildAspectAverageAgg('aspects.location'),
              value: buildAspectAverageAgg('aspects.value'),
              amenities: buildAspectAverageAgg('aspects.amenities'),
            },
          },
        ],
      },
    },
  ];

  const [result] = await this.aggregate(pipeline);

  const overview = result?.overview?.[0];
  if (!overview) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      aspectAverages: {},
    };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of overview.ratings) {
    distribution[r as keyof typeof distribution]++;
  }

  const rawAspects = result?.aspects?.[0] ?? {};
  const aspectAverages: IReviewAspects = {};
  for (const key of ['cleanliness', 'service', 'location', 'value', 'amenities'] as const) {
    const val = rawAspects[key];
    if (typeof val === 'number' && !isNaN(val)) {
      (aspectAverages as any)[key] = Math.round(val * 10) / 10;
    }
  }

  return {
    averageRating: Math.round((overview.averageRating || 0) * 10) / 10,
    totalReviews: overview.totalReviews,
    ratingDistribution: distribution,
    aspectAverages,
  };
};

// ── Static: check if user already reviewed a hotel ──────────────────────────
HotelReviewSchema.statics.hasUserReviewedHotel = async function (hotelId: string, userId: string) {
  const existing = await this.findOne({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    userId: new mongoose.Types.ObjectId(userId),
    moderationStatus: { $ne: 'rejected' },
  }).lean();
  return !!existing;
};

// ── Static: verified vs total stats ─────────────────────────────────────────
HotelReviewSchema.statics.getVerifiedStats = async function (hotelId: string) {
  const pipeline = [
    {
      $match: {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        moderationStatus: 'approved',
        status: { $in: ['approved', 'published'] },
      },
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        verifiedCount: { $sum: { $cond: ['$verified', 1, 0] } },
      },
    },
  ];

  const [result] = await this.aggregate(pipeline);
  const totalCount = result?.totalCount ?? 0;
  const verifiedCount = result?.verifiedCount ?? 0;

  return {
    verifiedCount,
    totalCount,
    verifiedPercentage: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0,
  };
};

export const HotelReview = mongoose.model<IHotelReview, IHotelReviewModel>('HotelReview', HotelReviewSchema);
export default HotelReview;
