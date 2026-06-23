// FAQ Model
// Manages frequently asked questions for customer support

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFAQ extends Document {
  category: string;
  subcategory?: string;
  question: string;
  answer: string;
  shortAnswer?: string; // Brief answer for quick view
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[];
  relatedQuestions: Types.ObjectId[];
  order: number; // Display order within category
  imageUrl?: string; // Optional illustration image
  videoUrl?: string; // Optional video tutorial
  relatedArticles: string[]; // URLs to help articles
  createdBy: Types.ObjectId;
  lastUpdatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      index: 'text', // Enable text search
    },
    answer: {
      type: String,
      required: true,
      maxlength: 5000,
      index: 'text', // Enable text search
    },
    shortAnswer: {
      type: String,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    }],
    relatedQuestions: [{
      type: Schema.Types.ObjectId,
      ref: 'FAQ',
    }],
    order: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    relatedArticles: [{
      type: String, // URLs
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
FAQSchema.index({ category: 1, isActive: 1, order: 1 });
FAQSchema.index({ isActive: 1, viewCount: -1 });
FAQSchema.index({ tags: 1, isActive: 1 });

// Text index for search
FAQSchema.index({ question: 'text', answer: 'text', tags: 'text' });

// Virtual for helpfulness ratio
FAQSchema.virtual('helpfulnessRatio').get(function(this: IFAQ) {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return (this.helpfulCount / total) * 100;
});

// Virtual for total feedback
FAQSchema.virtual('totalFeedback').get(function(this: IFAQ) {
  return this.helpfulCount + this.notHelpfulCount;
});

// Instance method to increment view count — uses atomic $inc to avoid race conditions
FAQSchema.methods.incrementView = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { viewCount: 1 }
  });
};

// Instance method to mark as helpful — uses atomic $inc to avoid race conditions
FAQSchema.methods.markAsHelpful = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { helpfulCount: 1 }
  });
};

// Instance method to mark as not helpful — uses atomic $inc to avoid race conditions
FAQSchema.methods.markAsNotHelpful = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { notHelpfulCount: 1 }
  });
};

// Static method to get FAQs by category
FAQSchema.statics.getByCategory = async function(
  category: string,
  subcategory?: string
) {
  const query: any = {
    category,
    isActive: true,
  };

  if (subcategory) {
    query.subcategory = subcategory;
  }

  return this.find(query)
    .sort({ order: 1, viewCount: -1 })
    .populate('relatedQuestions', 'question category')
    .lean();
};

// Static method to search FAQs
FAQSchema.statics.searchFAQs = async function(
  searchQuery: string,
  limit: number = 10
) {
  return this.find(
    {
      $text: { $search: searchQuery },
      isActive: true,
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// Static method to get popular FAQs
FAQSchema.statics.getPopularFAQs = async function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get most helpful FAQs
FAQSchema.statics.getMostHelpfulFAQs = async function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ helpfulCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get FAQ categories
FAQSchema.statics.getCategories = async function() {
  const categories = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        subcategories: { $addToSet: '$subcategory' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return categories.map(cat => ({
    category: cat._id,
    count: cat.count,
    subcategories: cat.subcategories.filter((sub: any) => sub != null),
  }));
};

// Static method to get FAQs by tags
FAQSchema.statics.getByTags = async function(
  tags: string[],
  limit: number = 20
) {
  return this.find({
    tags: { $in: tags },
    isActive: true,
  })
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
};

export const FAQ = mongoose.model<IFAQ>('FAQ', FAQSchema);
