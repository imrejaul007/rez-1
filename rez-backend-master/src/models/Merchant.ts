import mongoose, { Document, Schema } from 'mongoose';

// Onboarding interfaces
export interface IOnboardingBusinessInfo {
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
}

export interface IOnboardingStoreDetails {
  storeName?: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    landmark?: string;
  };
}

export interface IOnboardingBankDetails {
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
}

export interface IOnboardingDocument {
  type: string; // 'business_license', 'id_proof', 'address_proof'
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt: Date;
}

export interface IOnboardingVerification {
  documents: IOnboardingDocument[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface IOnboarding {
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  currentStep: number;
  completedSteps: number[];
  stepData: {
    businessInfo?: IOnboardingBusinessInfo;
    storeDetails?: IOnboardingStoreDetails;
    bankDetails?: IOnboardingBankDetails;
    verification?: IOnboardingVerification;
  };
  startedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
}

// Interface extending Document for TypeScript
export interface IMerchant extends Document {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  businessLicense?: string;
  taxId?: string;
  website?: string;
  description?: string;
  logo?: string;
  lastLogin?: Date;

  // Password Reset
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;

  // Email Verification
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;

  // Account Security
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIP?: string;

  // Onboarding
  onboarding: IOnboarding;

  createdAt: Date;
  updatedAt: Date;
  
  // Additional properties for profile/sync features
  displayName?: string;
  tagline?: string;
  coverImage?: string;
  galleryImages?: string[];
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  address?: any;
  contact?: any;
  socialMedia?: any;
  businessHours?: any;
  deliveryOptions?: any;
  paymentMethods?: any;
  policies?: any;
  ratings?: any;
  status?: string;
  isFeatured?: boolean;
  categories?: string[];
  tags?: string[];
  
  // Additional properties needed by merchant-profile route
  timezone?: string;
  serviceArea?: any;
  features?: string[];
  reviewSummary?: any;
  verification?: {
    isVerified?: boolean;
  };
  metrics?: {
    totalOrders?: number;
    totalCustomers?: number;
    averageResponseTime?: string;
    fulfillmentRate?: number;
  };
  activePromotions?: any[];
  announcements?: any[];
  searchKeywords?: string[];
  sortOrder?: number;
  lastActiveAt?: Date;
  isPubliclyVisible?: boolean;
  searchable?: boolean;
  acceptingOrders?: boolean;
  showInDirectory?: boolean;
  showContact?: boolean;
  showRatings?: boolean;
  showBusinessHours?: boolean;
  allowCustomerMessages?: boolean;
  showPromotions?: boolean;

  // Merchant tier
  tier?: 'free' | 'pro' | 'enterprise';

  // Subscription (added during Phase 2E merge)
  currentPlan?: string;
  planExpiresAt?: Date;

  // Virtual: single canonical status derived from verificationStatus + isActive
  readonly computedStatus?: 'approved' | 'suspended' | 'rejected' | 'pending';
}

// Merchant Schema
const MerchantSchema = new Schema<IMerchant>({
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessAddress: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tier: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  businessLicense: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  logo: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },

  // Password Reset
  resetPasswordToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  },

  // Email Verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpiry: {
    type: Date,
    select: false
  },

  // Account Security
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },

  // Additional optional fields
  displayName: String,
  tagline: String,
  coverImage: String,
  galleryImages: [String],
  brandColors: {
    primary: String,
    secondary: String,
    accent: String
  },
  address: Schema.Types.Mixed,
  contact: Schema.Types.Mixed,
  socialMedia: Schema.Types.Mixed,
  businessHours: Schema.Types.Mixed,
  deliveryOptions: Schema.Types.Mixed,
  paymentMethods: Schema.Types.Mixed,
  policies: Schema.Types.Mixed,
  ratings: Schema.Types.Mixed,
  status: String,
  isFeatured: { type: Boolean, default: false },
  categories: [String],
  tags: [String],
  
  // Additional fields needed by merchant-profile route
  timezone: String,
  serviceArea: Schema.Types.Mixed,
  features: [String],
  reviewSummary: Schema.Types.Mixed,
  verification: {
    isVerified: { type: Boolean, default: false }
  },
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    averageResponseTime: { type: String, default: '< 1 hour' },
    fulfillmentRate: { type: Number, default: 95 }
  },
  activePromotions: [Schema.Types.Mixed],
  announcements: [Schema.Types.Mixed],
  searchKeywords: [String],
  sortOrder: { type: Number, default: 0 },
  lastActiveAt: Date,
  isPubliclyVisible: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  acceptingOrders: { type: Boolean, default: true },
  showInDirectory: { type: Boolean, default: true },
  showContact: { type: Boolean, default: true },
  showRatings: { type: Boolean, default: true },
  showBusinessHours: { type: Boolean, default: true },
  allowCustomerMessages: { type: Boolean, default: true },
  showPromotions: { type: Boolean, default: true },

  // Onboarding
  onboarding: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'rejected'],
      default: 'pending'
    },
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    completedSteps: [{
      type: Number,
      min: 1,
      max: 5
    }],
    stepData: {
      businessInfo: {
        companyName: String,
        businessType: String,
        registrationNumber: String,
        gstNumber: String,
        panNumber: String
      },
      storeDetails: {
        storeName: String,
        description: String,
        category: String,
        logoUrl: String,
        bannerUrl: String,
        address: {
          street: String,
          city: String,
          state: String,
          zipCode: String,
          country: String,
          landmark: String
        }
      },
      bankDetails: {
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        bankName: String,
        branchName: String
      },
      verification: {
        documents: [{
          type: {
            type: String,
            enum: ['business_license', 'id_proof', 'address_proof', 'gst_certificate', 'pan_card']
          },
          url: String,
          status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
          },
          rejectionReason: String,
          uploadedAt: {
            type: Date,
            default: Date.now
          }
        }],
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending'
        },
        verifiedAt: Date,
        verifiedBy: String
      }
    },
    startedAt: Date,
    completedAt: Date,
    rejectionReason: String
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret: Partial<Record<string, any>>) {
      ret.id = ret._id;
      delete (ret as any)._id;
      delete (ret as any).__v;
      delete (ret as any).password;
      return ret;
    }
  }
});

// Virtual: computedStatus - single canonical status derived from verificationStatus + isActive
MerchantSchema.virtual('computedStatus').get(function (this: IMerchant) {
  if (this.verificationStatus === 'rejected') {
    return 'rejected';
  }
  if (this.verificationStatus === 'verified' && this.isActive) {
    return 'approved';
  }
  if (this.verificationStatus === 'verified' && !this.isActive) {
    return 'suspended';
  }
  return 'pending';
});

// Indexes
// Note: email index is automatically created due to unique: true in schema
MerchantSchema.index({ verificationStatus: 1 });
MerchantSchema.index({ isActive: 1 });
MerchantSchema.index({ 'businessAddress.city': 1 });
MerchantSchema.index({ 'businessAddress.state': 1 });
MerchantSchema.index({ 'onboarding.status': 1 });
MerchantSchema.index({ 'onboarding.currentStep': 1 });
MerchantSchema.index({ verificationStatus: 1, isActive: 1, createdAt: -1 });
MerchantSchema.index({ phone: 1 });

// Add static methods before creating the model
MerchantSchema.statics.update = async function(id: string, updates: any) {
  return await this.findByIdAndUpdate(id, updates, { new: true });
};

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);

// Export MerchantModel for backward compatibility
export { Merchant as MerchantModel };
