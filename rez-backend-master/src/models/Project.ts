import mongoose, { Schema, Document, Types } from 'mongoose';
import redisService from '../services/redisService';

// Project requirements interface
export interface IProjectRequirements {
  minWords?: number; // For text/review projects
  minDuration?: number; // For video projects (in seconds)
  maxDuration?: number;
  minPhotos?: number; // For photo projects
  location?: {
    required: boolean;
    specific?: string; // Specific location name
    radius?: number; // Radius in km from specific location
    coordinates?: [number, number]; // [longitude, latitude]
  };
  products?: Types.ObjectId[]; // Specific products to review/feature
  stores?: Types.ObjectId[]; // Specific stores to visit
  categories?: Types.ObjectId[]; // Specific categories
  demographics?: {
    minAge?: number;
    maxAge?: number;
    gender?: 'male' | 'female' | 'any';
    languages?: string[];
  };
  skills?: string[]; // Required skills/expertise
  deviceRequirements?: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
  };
}

// Project reward interface
export interface IProjectReward {
  amount: number;
  currency: string;
  type: 'fixed' | 'variable' | 'milestone';
  bonusMultiplier?: number; // For quality bonus
  milestones?: {
    target: number; // Number of completions or metric
    bonus: number; // Bonus amount per milestone
  }[];
  paymentMethod: 'wallet' | 'bank' | 'upi';
  paymentSchedule: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

// Project limits interface
export interface IProjectLimits {
  maxCompletions?: number; // Per user
  totalBudget?: number;
  dailyBudget?: number;
  maxCompletionsPerDay?: number;
  maxCompletionsPerUser?: number;
  expiryDate?: Date;
  startDate?: Date;
}

// Survey question interface
export interface ISurveyQuestion {
  id: string;
  type: 'multiple_choice' | 'single_choice' | 'rating' | 'text' | 'scale';
  question: string;
  options?: string[];
  required: boolean;
  order: number;
  minLength?: number; // For text questions
  maxLength?: number;
  minValue?: number; // For scale questions
  maxValue?: number;
}

// Survey config interface
export interface ISurveyConfig {
  questions: ISurveyQuestion[];
  estimatedTime: number; // minutes
  targetResponses: number;
  allowSkip: boolean;
  randomizeQuestions: boolean;
  showProgress: boolean;
}

// Project submission interface
export interface IProjectSubmission {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  submittedAt: Date;
  content: {
    type: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
    data: string | string[]; // URL(s) or text content
    metadata?: {
      location?: [number, number];
      duration?: number; // For videos
      wordCount?: number; // For text
      rating?: number; // For reviews
      additional?: any;
    };
  };
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewComments?: string;
  qualityScore?: number; // 1-10
  paidAmount?: number;
  paidAt?: Date;
  rejectionReason?: string;
}

// Project analytics interface
export interface IProjectAnalytics {
  totalViews: number;
  totalApplications: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  avgCompletionTime: number; // in hours
  avgQualityScore: number;
  totalPayout: number;
  conversionRate: number; // applications to submissions
  approvalRate: number; // approved / total submissions
  likes: number;
  comments: number;
  engagement: number; // calculated engagement score
  participantDemographics: {
    ageGroups: { [range: string]: number };
    genderSplit: { [gender: string]: number };
    locationSplit: { [city: string]: number };
  };
  dailyStats: {
    date: Date;
    views: number;
    applications: number;
    submissions: number;
  }[];
}

// Main Project interface
export interface IProject extends Document {
  title: string;
  description: string;
  shortDescription?: string;
  category: 'review' | 'social_share' | 'ugc_content' | 'store_visit' | 'survey' | 'photo' | 'video' | 'data_collection' | 'mystery_shopping' | 'referral';
  subcategory?: string;
  type: 'video' | 'photo' | 'text' | 'visit' | 'checkin' | 'survey' | 'rating' | 'social' | 'referral';
  brand?: string;
  sponsor?: Types.ObjectId; // Reference to sponsoring store/brand
  requirements: IProjectRequirements;
  reward: IProjectReward;
  limits: IProjectLimits;
  instructions: string[];
  examples?: string[]; // URLs to example submissions
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  status: 'draft' | 'active' | 'paused' | 'completed' | 'expired' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submissions: IProjectSubmission[];
  analytics: IProjectAnalytics;
  isFeatured: boolean;
  isSponsored: boolean;
  approvalRequired: boolean;
  qualityControl: {
    enabled: boolean;
    minScore?: number;
    manualReview: boolean;
    autoApprove?: boolean;
  };
  targetAudience: {
    size?: number; // Expected number of participants
    demographics?: string;
    interests?: string[];
  };
  surveyConfig?: ISurveyConfig; // Survey-specific configuration
  likedBy: Types.ObjectId[]; // Users who liked this project
  comments: Array<{
    user: Types.ObjectId;
    content: string;
    timestamp: Date;
    replies?: Array<{
      user: Types.ObjectId;
      content: string;
      timestamp: Date;
    }>;
  }>;
  createdBy: Types.ObjectId;
  managedBy?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  canUserParticipate(userId: string): Promise<boolean>;
  getUserSubmission(userId: string): IProjectSubmission | null;
  submitWork(userId: string, content: any): Promise<IProjectSubmission>;
  reviewSubmission(submissionId: string, status: string, comments?: string): Promise<void>;
  calculatePayout(submission: IProjectSubmission): number;
  updateAnalytics(): Promise<void>;
  isActive(): boolean;
  getRemainingBudget(): number;
}

// Project Schema
const ProjectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },
  category: {
    type: String,
    required: true,
    enum: ['review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral'],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['video', 'photo', 'text', 'visit', 'checkin', 'survey', 'rating', 'social', 'referral']
  },
  brand: {
    type: String,
    trim: true
  },
  sponsor: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  requirements: {
    minWords: {
      type: Number,
      min: 1
    },
    minDuration: {
      type: Number,
      min: 1
    },
    maxDuration: {
      type: Number,
      min: 1
    },
    minPhotos: {
      type: Number,
      min: 1,
      max: 10
    },
    location: {
      required: {
        type: Boolean,
        default: false
      },
      specific: String,
      radius: {
        type: Number,
        min: 0.1,
        max: 100
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    products: [{
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }],
    stores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store'
    }],
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }],
    demographics: {
      minAge: {
        type: Number,
        min: 13,
        max: 100
      },
      maxAge: {
        type: Number,
        min: 13,
        max: 100
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'any'],
        default: 'any'
      },
      languages: [String]
    },
    skills: [String],
    deviceRequirements: {
      camera: { type: Boolean, default: false },
      microphone: { type: Boolean, default: false },
      location: { type: Boolean, default: false }
    }
  },
  reward: {
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    type: {
      type: String,
      enum: ['fixed', 'variable', 'milestone'],
      default: 'fixed'
    },
    bonusMultiplier: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    milestones: [{
      target: { type: Number, min: 1 },
      bonus: { type: Number, min: 0 }
    }],
    paymentMethod: {
      type: String,
      enum: ['wallet', 'bank', 'upi'],
      default: 'wallet'
    },
    paymentSchedule: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  limits: {
    maxCompletions: {
      type: Number,
      min: 1
    },
    totalBudget: {
      type: Number,
      min: 0
    },
    dailyBudget: {
      type: Number,
      min: 0
    },
    maxCompletionsPerDay: {
      type: Number,
      min: 1
    },
    maxCompletionsPerUser: {
      type: Number,
      default: 1,
      min: 1,
      max: 100
    },
    expiryDate: Date,
    startDate: Date
  },
  instructions: [{
    type: String,
    required: true,
    trim: true
  }],
  examples: [String],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  estimatedTime: {
    type: Number,
    required: true,
    min: 1,
    max: 480 // 8 hours max
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'expired', 'cancelled'],
    default: 'draft',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  submissions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    content: {
      type: {
        type: String,
        enum: ['text', 'image', 'video', 'rating', 'checkin', 'receipt'],
        required: true
      },
      data: Schema.Types.Mixed, // String or Array of strings
      metadata: {
        location: [Number],
        duration: Number,
        wordCount: Number,
        rating: { type: Number, min: 1, max: 5 },
        additional: Schema.Types.Mixed
      }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewComments: String,
    qualityScore: {
      type: Number,
      min: 1,
      max: 10
    },
    paidAmount: {
      type: Number,
      min: 0
    },
    paidAt: Date,
    rejectionReason: String
  }],
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    approvedSubmissions: { type: Number, default: 0 },
    rejectedSubmissions: { type: Number, default: 0 },
    avgCompletionTime: { type: Number, default: 0 },
    avgQualityScore: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    approvalRate: { type: Number, default: 0 },
    participantDemographics: {
      ageGroups: { type: Map, of: Number, default: {} },
      genderSplit: { type: Map, of: Number, default: {} },
      locationSplit: { type: Map, of: Number, default: {} }
    },
    dailyStats: [{
      date: { type: Date, required: true },
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      submissions: { type: Number, default: 0 }
    }]
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  approvalRequired: {
    type: Boolean,
    default: true
  },
  qualityControl: {
    enabled: { type: Boolean, default: true },
    minScore: { type: Number, min: 1, max: 10, default: 6 },
    manualReview: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false }
  },
  targetAudience: {
    size: { type: Number, min: 1 },
    demographics: String,
    interests: [String]
  },
  surveyConfig: {
    questions: [{
      id: { type: String, required: true },
      type: {
        type: String,
        enum: ['multiple_choice', 'single_choice', 'rating', 'text', 'scale'],
        required: true
      },
      question: { type: String, required: true },
      options: [String],
      required: { type: Boolean, default: true },
      order: { type: Number, required: true },
      minLength: Number,
      maxLength: Number,
      minValue: Number,
      maxValue: Number
    }],
    estimatedTime: { type: Number, min: 1 },
    targetResponses: { type: Number, min: 1 },
    allowSkip: { type: Boolean, default: false },
    randomizeQuestions: { type: Boolean, default: false },
    showProgress: { type: Boolean, default: true }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProjectSchema.index({ category: 1, status: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, isFeatured: 1 });
ProjectSchema.index({ 'reward.amount': -1, status: 1 });
ProjectSchema.index({ difficulty: 1, status: 1 });
ProjectSchema.index({ 'limits.expiryDate': 1 });
ProjectSchema.index({ tags: 1, status: 1 });
ProjectSchema.index({ sponsor: 1, status: 1 });
ProjectSchema.index({ createdBy: 1, createdAt: -1 });

// Text search index
ProjectSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

// Virtual for completion rate
ProjectSchema.virtual('completionRate').get(function() {
  if (this.analytics.totalApplications === 0) return 0;
  return (this.analytics.totalSubmissions / this.analytics.totalApplications) * 100;
});

// Virtual for remaining slots
ProjectSchema.virtual('remainingSlots').get(function() {
  if (!this.limits.maxCompletions) return null;
  return Math.max(0, this.limits.maxCompletions - this.analytics.approvedSubmissions);
});

// Virtual for days remaining
ProjectSchema.virtual('daysRemaining').get(function() {
  if (!this.limits.expiryDate) return null;
  const diff = this.limits.expiryDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Method to check if user can participate
ProjectSchema.methods.canUserParticipate = async function(userId: string): Promise<boolean> {
  // Check if project is active
  if (!this.isActive()) return false;
  
  // Check if user already has max submissions
  const userSubmissions = this.submissions.filter(
    (sub: IProjectSubmission) => sub.user.toString() === userId
  );
  
  if (userSubmissions.length >= (this.limits.maxCompletionsPerUser || 1)) {
    return false;
  }
  
  // Check user demographics if required
  if (this.requirements.demographics) {
    const User = this.model('User');
    const user = await User.findById(userId);
    
    if (!user) return false;
    
    // Age check
    if (this.requirements.demographics.minAge || this.requirements.demographics.maxAge) {
      if (!user.profile.dateOfBirth) return false;
      
      const age = new Date().getFullYear() - user.profile.dateOfBirth.getFullYear();
      
      if (this.requirements.demographics.minAge && age < this.requirements.demographics.minAge) {
        return false;
      }
      
      if (this.requirements.demographics.maxAge && age > this.requirements.demographics.maxAge) {
        return false;
      }
    }
    
    // Gender check
    if (this.requirements.demographics.gender && 
        this.requirements.demographics.gender !== 'any' &&
        user.profile.gender !== this.requirements.demographics.gender) {
      return false;
    }
  }
  
  // Check remaining budget
  if (this.limits.totalBudget && 
      this.analytics.totalPayout >= this.limits.totalBudget) {
    return false;
  }
  
  return true;
};

// Method to get user's submission
ProjectSchema.methods.getUserSubmission = function(userId: string): IProjectSubmission | null {
  const submission = this.submissions.find(
    (sub: IProjectSubmission) => sub.user.toString() === userId
  );
  return submission || null;
};

// Method to submit work
ProjectSchema.methods.submitWork = async function(
  userId: string, 
  content: any
): Promise<IProjectSubmission> {
  // Validate user can participate
  const canParticipate = await this.canUserParticipate(userId);
  if (!canParticipate) {
    throw new Error('User cannot participate in this project');
  }
  
  // Create submission
  const submission: IProjectSubmission = {
    user: new mongoose.Types.ObjectId(userId),
    submittedAt: new Date(),
    content,
    status: this.approvalRequired ? 'pending' : 'approved'
  };
  
  this.submissions.push(submission);
  this.analytics.totalSubmissions += 1;
  
  // Auto-approve if configured
  if (!this.approvalRequired || this.qualityControl.autoApprove) {
    submission.status = 'approved';
    submission.qualityScore = 8; // Default good score
    submission.paidAmount = this.reward.amount;
    submission.paidAt = new Date();
    
    this.analytics.approvedSubmissions += 1;
    this.analytics.totalPayout += this.reward.amount;
  }
  
  await this.save();
  return submission;
};

// Method to review submission
ProjectSchema.methods.reviewSubmission = async function(
  submissionId: string,
  status: 'approved' | 'rejected',
  comments?: string,
  qualityScore?: number
): Promise<void> {
  const submission = this.submissions.find(
    (sub: IProjectSubmission) => sub._id?.toString() === submissionId
  );
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  submission.status = status;
  submission.reviewedAt = new Date();
  submission.reviewComments = comments;
  submission.qualityScore = qualityScore;
  
  if (status === 'approved') {
    const payout = this.calculatePayout(submission);
    submission.paidAmount = payout;
    submission.paidAt = new Date();

    this.analytics.approvedSubmissions += 1;
    this.analytics.totalPayout += payout;
  } else {
    this.analytics.rejectedSubmissions += 1;
  }

  await this.save();

  // Invalidate earnings cache for the submitter (pending amount changed)
  if (submission.user) {
    try { await redisService.delPattern(`earnings:consolidated:${submission.user.toString()}:*`); } catch (e) {}
  }
};

// Method to calculate payout
ProjectSchema.methods.calculatePayout = function(submission: IProjectSubmission): number {
  let amount = this.reward.amount;
  
  // Apply quality bonus
  if (submission.qualityScore && submission.qualityScore >= 8) {
    amount *= (this.reward.bonusMultiplier || 1);
  }
  
  return Math.round(amount * 100) / 100;
};

// Method to update analytics
ProjectSchema.methods.updateAnalytics = async function(): Promise<void> {
  const totalSubmissions = this.submissions.length;
  const approvedSubmissions = this.submissions.filter((s: any) => s.status === 'approved').length;
  const rejectedSubmissions = this.submissions.filter((s: any) => s.status === 'rejected').length;
  
  this.analytics.totalSubmissions = totalSubmissions;
  this.analytics.approvedSubmissions = approvedSubmissions;
  this.analytics.rejectedSubmissions = rejectedSubmissions;
  
  if (totalSubmissions > 0) {
    this.analytics.approvalRate = (approvedSubmissions / totalSubmissions) * 100;
    
    const qualityScores = this.submissions
      .filter((s: any) => s.qualityScore)
      .map((s: any) => s.qualityScore!);
    
    if (qualityScores.length > 0) {
      this.analytics.avgQualityScore = qualityScores.reduce((a: any, b: any) => a + b, 0) / qualityScores.length;
    }
  }
  
  await this.save();
};

// Method to check if project is active
ProjectSchema.methods.isActive = function(): boolean {
  if (this.status !== 'active') return false;
  if (this.limits.expiryDate && this.limits.expiryDate < new Date()) return false;
  if (this.limits.startDate && this.limits.startDate > new Date()) return false;
  if (this.limits.maxCompletions && this.analytics.approvedSubmissions >= this.limits.maxCompletions) return false;
  if (this.limits.totalBudget && this.analytics.totalPayout >= this.limits.totalBudget) return false;
  
  return true;
};

// Method to get remaining budget
ProjectSchema.methods.getRemainingBudget = function(): number {
  if (!this.limits.totalBudget) return Infinity;
  return Math.max(0, this.limits.totalBudget - this.analytics.totalPayout);
};

// Static method to get active projects
ProjectSchema.statics.getActiveProjects = function(
  filters: any = {},
  limit: number = 50
) {
  const query: any = {
    status: 'active',
    $and: [
      {
        $or: [
          { 'limits.expiryDate': { $exists: false } },
          { 'limits.expiryDate': { $gte: new Date() } }
        ]
      },
      {
        $or: [
          { 'limits.startDate': { $exists: false } },
          { 'limits.startDate': { $lte: new Date() } }
        ]
      }
    ]
  };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }
  
  if (filters.minReward) {
    query['reward.amount'] = { $gte: filters.minReward };
  }
  
  return this.find(query)
    .populate('sponsor', 'name logo')
    .sort({ isFeatured: -1, 'reward.amount': -1, createdAt: -1 })
    .limit(limit);
};

export const Project = mongoose.model<IProject>('Project', ProjectSchema);