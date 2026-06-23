import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStoreAnalytics extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  store: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId; // Optional for anonymous tracking
  eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
  eventData?: {
    searchQuery?: string;
    category?: string;
    source?: string; // Where the event came from (home, search, category, etc.)
    referrer?: string;
    userAgent?: string;
    location?: {
      coordinates: [number, number];
      address?: string;
    };
    metadata?: any;
  };
  timestamp: Date;
  sessionId?: string;
  ipAddress?: string;
  createdAt: Date;
}

// Interface for static methods
export interface IStoreAnalyticsModel extends Model<IStoreAnalytics> {
  trackEvent(data: {
    storeId: string;
    userId?: string;
    eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
    eventData?: any;
    sessionId?: string;
    ipAddress?: string;
  }): Promise<IStoreAnalytics>;
  
  getStoreAnalytics(storeId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<any[]>;
  
  getPopularStores(options?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    limit?: number;
  }): Promise<any[]>;
  
  getUserAnalytics(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
  }): Promise<any[]>;
}

const StoreAnalyticsSchema = new Schema<IStoreAnalytics>({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'],
    index: true
  },
  eventData: {
    searchQuery: String,
    category: String,
    source: String,
    referrer: String,
    userAgent: String,
    location: {
      coordinates: [Number],
      address: String
    },
    metadata: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
StoreAnalyticsSchema.index({ store: 1, eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ user: 1, eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ store: 1, timestamp: -1 });

// Static method to track an event
StoreAnalyticsSchema.statics.trackEvent = async function(data: {
  storeId: string;
  userId?: string;
  eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
  eventData?: any;
  sessionId?: string;
  ipAddress?: string;
}) {
  const analytics = new this({
    store: data.storeId,
    user: data.userId,
    eventType: data.eventType,
    eventData: data.eventData,
    sessionId: data.sessionId,
    ipAddress: data.ipAddress,
    timestamp: new Date()
  });

  return await analytics.save();
};

// Static method to get store analytics
StoreAnalyticsSchema.statics.getStoreAnalytics = async function(storeId: string, options: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
} = {}) {
  const { startDate, endDate, eventType, groupBy = 'day' } = options;

  const matchStage: any = { store: new mongoose.Types.ObjectId(storeId) };
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }
  
  if (eventType) {
    matchStage.eventType = eventType;
  }

  const groupFormat = {
    hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
    day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
    week: { $dateToString: { format: '%Y-%U', date: '$timestamp' } },
    month: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }
  };

  const analytics = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          period: groupFormat[groupBy],
          eventType: '$eventType'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $group: {
        _id: '$_id.period',
        events: {
          $push: {
            eventType: '$_id.eventType',
            count: '$count',
            uniqueUsers: { $size: '$uniqueUsers' }
          }
        },
        totalEvents: { $sum: '$count' },
        totalUniqueUsers: { $sum: { $size: '$uniqueUsers' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return analytics;
};

// Static method to get popular stores
StoreAnalyticsSchema.statics.getPopularStores = async function(options: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  limit?: number;
} = {}) {
  const { startDate, endDate, eventType, limit = 10 } = options;

  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }
  
  if (eventType) {
    matchStage.eventType = eventType;
  }

  const popularStores = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$store',
        totalEvents: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        eventTypes: { $addToSet: '$eventType' }
      }
    },
    {
      $lookup: {
        from: 'stores',
        localField: '_id',
        foreignField: '_id',
        as: 'storeInfo'
      }
    },
    { $unwind: '$storeInfo' },
    {
      $project: {
        store: '$_id',
        storeName: '$storeInfo.name',
        storeLogo: '$storeInfo.logo',
        totalEvents: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        eventTypes: 1
      }
    },
    { $sort: { totalEvents: -1 } },
    { $limit: limit }
  ]);

  return popularStores;
};

// Static method to get user analytics
StoreAnalyticsSchema.statics.getUserAnalytics = async function(userId: string, options: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
} = {}) {
  const { startDate, endDate, eventType } = options;

  const matchStage: any = { user: new mongoose.Types.ObjectId(userId) };
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }
  
  if (eventType) {
    matchStage.eventType = eventType;
  }

  const userAnalytics = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        stores: { $addToSet: '$store' }
      }
    },
    {
      $lookup: {
        from: 'stores',
        localField: 'stores',
        foreignField: '_id',
        as: 'storeInfo'
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        uniqueStores: { $size: '$stores' },
        stores: {
          $map: {
            input: '$storeInfo',
            as: 'store',
            in: {
              _id: '$$store._id',
              name: '$$store.name',
              logo: '$$store.logo'
            }
          }
        }
      }
    }
  ]);

  return userAnalytics;
};

export const StoreAnalytics = mongoose.model<IStoreAnalytics, IStoreAnalyticsModel>('StoreAnalytics', StoreAnalyticsSchema);
export default StoreAnalytics;
