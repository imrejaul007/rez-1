import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Homepage Deals Item interface
 * Represents individual items in the "Deals that save you money" section tabs
 */
export interface IHomepageDealsItem extends Document {
  _id: Types.ObjectId;

  // Tab assignment
  tabType: 'offers' | 'cashback' | 'exclusive';

  // Item type
  itemType: 'category' | 'campaign' | 'zone' | 'custom';

  // Display properties
  title: string;
  subtitle: string;
  icon: string; // emoji or Ionicon name
  iconType: 'emoji' | 'ionicon' | 'url';
  gradientColors: string[];
  backgroundColor?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;

  // Navigation
  navigationPath: string; // e.g., "/offers?category=flash"

  // Reference to other entities (for linked items)
  referenceType?: 'ExclusiveZone' | 'DoubleCashbackCampaign' | 'OfferCategory' | 'Campaign';
  referenceId?: Types.ObjectId;

  // Dynamic count (e.g., "50 offers")
  showCount: boolean;
  countLabel: string; // "offers", "stores", "deals"
  cachedCount: number;

  // Verification (for exclusive zones)
  requiresVerification: boolean;
  verificationType?: 'student' | 'corporate' | 'defence' | 'senior' | 'birthday' | 'women' | 'none';

  // Settings
  isActive: boolean;
  sortOrder: number;
  regions: ('bangalore' | 'dubai' | 'all')[];

  // Analytics
  impressions: number;
  clicks: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Homepage Deals Item Schema
 */
const HomepageDealsItemSchema = new Schema<IHomepageDealsItem>({
  tabType: {
    type: String,
    required: true,
    enum: ['offers', 'cashback', 'exclusive'],
    index: true,
  },
  itemType: {
    type: String,
    required: true,
    enum: ['category', 'campaign', 'zone', 'custom'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  icon: {
    type: String,
    required: true,
    trim: true,
  },
  iconType: {
    type: String,
    enum: ['emoji', 'ionicon', 'url'],
    default: 'emoji',
  },
  gradientColors: [{
    type: String,
    trim: true,
  }],
  backgroundColor: {
    type: String,
    trim: true,
  },
  badgeText: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  badgeBg: {
    type: String,
    default: '#22C55E',
  },
  badgeColor: {
    type: String,
    default: '#FFFFFF',
  },
  navigationPath: {
    type: String,
    required: true,
    trim: true,
  },
  referenceType: {
    type: String,
    enum: ['ExclusiveZone', 'DoubleCashbackCampaign', 'OfferCategory', 'Campaign'],
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  showCount: {
    type: Boolean,
    default: true,
  },
  countLabel: {
    type: String,
    default: 'offers',
    trim: true,
  },
  cachedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  requiresVerification: {
    type: Boolean,
    default: false,
  },
  verificationType: {
    type: String,
    enum: ['student', 'corporate', 'defence', 'senior', 'birthday', 'women', 'none'],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true,
  },
  regions: [{
    type: String,
    enum: ['bangalore', 'dubai', 'all'],
  }],
  impressions: {
    type: Number,
    default: 0,
    min: 0,
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
HomepageDealsItemSchema.index({ tabType: 1, isActive: 1, sortOrder: 1 });
HomepageDealsItemSchema.index({ tabType: 1, regions: 1, isActive: 1 });
HomepageDealsItemSchema.index({ referenceType: 1, referenceId: 1 });

// Virtual for click-through rate
HomepageDealsItemSchema.virtual('ctr').get(function() {
  if (this.impressions === 0) return 0;
  return ((this.clicks / this.impressions) * 100).toFixed(2);
});

// Static methods
HomepageDealsItemSchema.statics.getActiveItemsByTab = function (tabType: string, region?: string) {
  const query: any = {
    tabType,
    isActive: true
  };

  if (region && region !== 'all') {
    query.$or = [
      { regions: { $in: [region, 'all'] } },
      { regions: { $size: 0 } },
    ];
  }

  return this.find(query).sort({ sortOrder: 1 });
};

HomepageDealsItemSchema.statics.getAllItemsForAdmin = function (tabType?: string) {
  const query: any = {};
  if (tabType) {
    query.tabType = tabType;
  }
  return this.find(query).sort({ tabType: 1, sortOrder: 1 });
};

HomepageDealsItemSchema.statics.reorderItems = async function (items: { id: string; sortOrder: number }[]) {
  const bulkOps = items.map(item => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { sortOrder: item.sortOrder } },
    },
  }));

  return this.bulkWrite(bulkOps);
};

HomepageDealsItemSchema.statics.incrementImpressions = function (itemIds: string[]) {
  return this.updateMany(
    { _id: { $in: itemIds } },
    { $inc: { impressions: 1 } }
  );
};

HomepageDealsItemSchema.statics.incrementClicks = function (itemId: string) {
  return this.findByIdAndUpdate(
    itemId,
    { $inc: { clicks: 1 } },
    { new: true }
  );
};

const HomepageDealsItem = mongoose.model<IHomepageDealsItem>('HomepageDealsItem', HomepageDealsItemSchema);

export default HomepageDealsItem;
