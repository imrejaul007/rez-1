// UserOfferInteraction Model
// Tracks user interactions with offers (likes, shares, views, claims)

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IUserOfferInteraction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  offer: Types.ObjectId;
  action: 'like' | 'share' | 'view' | 'claim' | 'click' | 'favorite';
  timestamp: Date;
  metadata?: {
    source?: string; // 'offers_page', 'home_page', 'search', etc.
    device?: string; // 'mobile', 'desktop', 'tablet'
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IUserOfferInteractionModel extends Model<IUserOfferInteraction> {
  trackInteraction(userId: Types.ObjectId, offerId: Types.ObjectId, action: string, metadata?: any): Promise<IUserOfferInteraction>;
  getUserInteractions(userId: Types.ObjectId, action?: string): Promise<IUserOfferInteraction[]>;
  getOfferInteractions(offerId: Types.ObjectId, action?: string): Promise<IUserOfferInteraction[]>;
  getInteractionStats(offerId: Types.ObjectId): Promise<any>;
  getUserEngagementStats(userId: Types.ObjectId): Promise<any>;
}

const UserOfferInteractionSchema = new Schema<IUserOfferInteraction>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  offer: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: [true, 'Offer reference is required'],
    index: true
  },
  action: {
    type: String,
    enum: ['like', 'share', 'view', 'claim', 'click', 'favorite'],
    required: [true, 'Action is required'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    source: {
      type: String,
      trim: true
    },
    device: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet'],
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(v: number[]) {
            // Allow empty array or undefined, but if provided must be valid
            if (!v || v.length === 0) return true; // Allow empty/undefined
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Invalid coordinates format'
        }
      }
    },
    userAgent: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    referrer: {
      type: String,
      trim: true
    },
    sessionId: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
UserOfferInteractionSchema.index({ user: 1, offer: 1, action: 1 });
// Prevent duplicate like/favorite/claim per user per offer (views/clicks/shares are allowed multiple times)
UserOfferInteractionSchema.index(
  { user: 1, offer: 1, action: 1 },
  { unique: true, partialFilterExpression: { action: { $in: ['like', 'favorite', 'claim'] } } }
);
UserOfferInteractionSchema.index({ offer: 1, action: 1, timestamp: -1 });
UserOfferInteractionSchema.index({ user: 1, action: 1, timestamp: -1 });
UserOfferInteractionSchema.index({ timestamp: -1 });

// Static methods
UserOfferInteractionSchema.statics.trackInteraction = async function(
  userId: Types.ObjectId, 
  offerId: Types.ObjectId, 
  action: string, 
  metadata?: any
): Promise<IUserOfferInteraction> {
  // Clean metadata - remove location if coordinates are empty/invalid
  const cleanMetadata = metadata ? { ...metadata } : {};
  if (cleanMetadata.location) {
    const coords = cleanMetadata.location.coordinates;
    if (!coords || coords.length !== 2 || 
        coords[0] < -180 || coords[0] > 180 || 
        coords[1] < -90 || coords[1] > 90) {
      // Remove invalid location
      delete (cleanMetadata as any).location;
    }
  }
  
  const interaction = new this({
    user: userId,
    offer: offerId,
    action,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined,
    timestamp: new Date()
  });
  
  return await interaction.save();
};

UserOfferInteractionSchema.statics.getUserInteractions = function(
  userId: Types.ObjectId, 
  action?: string
): Promise<IUserOfferInteraction[]> {
  const query: any = { user: userId };
  if (action) {
    query.action = action;
  }
  
  return this.find(query)
    .populate('offer', 'title image cashbackPercentage category')
    .sort({ timestamp: -1 });
};

UserOfferInteractionSchema.statics.getOfferInteractions = function(
  offerId: Types.ObjectId, 
  action?: string
): Promise<IUserOfferInteraction[]> {
  const query: any = { offer: offerId };
  if (action) {
    query.action = action;
  }
  
  return this.find(query)
    .populate('user', 'name email')
    .sort({ timestamp: -1 });
};

UserOfferInteractionSchema.statics.getInteractionStats = async function(
  offerId: Types.ObjectId
): Promise<any> {
  const stats = await this.aggregate([
    { $match: { offer: offerId } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
  
  return stats.reduce((acc: any, stat: any) => {
    acc[stat.action] = {
      count: stat.count,
      uniqueUsers: stat.uniqueUserCount
    };
    return acc;
  }, {});
};

UserOfferInteractionSchema.statics.getUserEngagementStats = async function(
  userId: Types.ObjectId
): Promise<any> {
  const stats = await this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueOffers: { $addToSet: '$offer' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueOffersCount: { $size: '$uniqueOffers' }
      }
    }
  ]);
  
  return stats.reduce((acc: any, stat: any) => {
    acc[stat.action] = {
      count: stat.count,
      uniqueOffers: stat.uniqueOffersCount
    };
    return acc;
  }, {});
};

// Create and export the model
const UserOfferInteraction = mongoose.model<IUserOfferInteraction, IUserOfferInteractionModel>('UserOfferInteraction', UserOfferInteractionSchema);

export default UserOfferInteraction;
