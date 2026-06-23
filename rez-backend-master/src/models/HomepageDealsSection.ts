import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Tab Configuration interface
 */
export interface ITabConfig {
  isEnabled: boolean;
  displayName: string;
  sortOrder: number;
  maxItems: number;
}

/**
 * Homepage Deals Section interface
 * Stores configuration for the "Deals that save you money" section on homepage
 */
export interface IHomepageDealsSection extends Document {
  _id: Types.ObjectId;
  sectionId: string; // 'deals-that-save-money'
  title: string;
  subtitle: string;
  icon: string; // Ionicon name like 'flash'
  isActive: boolean;
  regions: ('bangalore' | 'dubai' | 'all')[];

  // Tab configurations
  tabs: {
    offers: ITabConfig;
    cashback: ITabConfig;
    exclusive: ITabConfig;
  };

  // Analytics (cached)
  totalImpressions: number;
  totalClicks: number;

  // Audit
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tab Config Schema
 */
const TabConfigSchema = new Schema<ITabConfig>({
  isEnabled: {
    type: Boolean,
    default: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  maxItems: {
    type: Number,
    default: 6,
    min: 1,
    max: 20,
  },
}, { _id: false });

/**
 * Homepage Deals Section Schema
 */
const HomepageDealsSectionSchema = new Schema<IHomepageDealsSection>({
  sectionId: {
    type: String,
    required: true,
    unique: true,
    default: 'deals-that-save-money',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'Deals that save you money',
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
    default: 'Discover amazing offers & cashback',
  },
  icon: {
    type: String,
    required: true,
    trim: true,
    default: 'flash',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  regions: [{
    type: String,
    enum: ['bangalore', 'dubai', 'all'],
  }],
  tabs: {
    offers: {
      type: TabConfigSchema,
      default: {
        isEnabled: true,
        displayName: 'Offers',
        sortOrder: 0,
        maxItems: 6,
      },
    },
    cashback: {
      type: TabConfigSchema,
      default: {
        isEnabled: true,
        displayName: 'Cashback',
        sortOrder: 1,
        maxItems: 6,
      },
    },
    exclusive: {
      type: TabConfigSchema,
      default: {
        isEnabled: true,
        displayName: 'Exclusive',
        sortOrder: 2,
        maxItems: 6,
      },
    },
  },
  totalImpressions: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalClicks: {
    type: Number,
    default: 0,
    min: 0,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes (sectionId and isActive already indexed via schema definition)

// Static methods
HomepageDealsSectionSchema.statics.getActiveSection = function (region?: string) {
  const query: any = { isActive: true, sectionId: 'deals-that-save-money' };

  if (region && region !== 'all') {
    query.$or = [
      { regions: { $in: [region, 'all'] } },
      { regions: { $size: 0 } }, // Empty means all regions
    ];
  }

  return this.findOne(query);
};

HomepageDealsSectionSchema.statics.getOrCreateDefault = async function () {
  let section = await this.findOne({ sectionId: 'deals-that-save-money' });

  if (!section) {
    section = await this.create({
      sectionId: 'deals-that-save-money',
      title: 'Deals that save you money',
      subtitle: 'Discover amazing offers & cashback',
      icon: 'flash',
      isActive: true,
      regions: ['all'],
      tabs: {
        offers: { isEnabled: true, displayName: 'Offers', sortOrder: 0, maxItems: 6 },
        cashback: { isEnabled: true, displayName: 'Cashback', sortOrder: 1, maxItems: 6 },
        exclusive: { isEnabled: true, displayName: 'Exclusive', sortOrder: 2, maxItems: 6 },
      },
    });
  }

  return section;
};

const HomepageDealsSection = mongoose.model<IHomepageDealsSection>('HomepageDealsSection', HomepageDealsSectionSchema);

export default HomepageDealsSection;
