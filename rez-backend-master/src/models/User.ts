import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// User profile interface
export interface IUserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  location?: {
    address?: string;
    neighbourhood?: string; // BTM Layout, HSR Layout, Koramangala, etc.
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    formattedAddress?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  locationHistory?: Array<{
    coordinates: [number, number];
    address: string;
    city?: string;
    timestamp: Date;
    source: 'manual' | 'gps' | 'ip';
  }>;
  timezone?: string;
  ringSize?: string;
  jewelryPreferences?: {
    preferredMetals?: string[];
    preferredStones?: string[];
    style?: 'traditional' | 'modern' | 'vintage' | 'contemporary';
  };
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationDocuments?: {
    documentType: string;
    documentNumber: string;
    documentImage: string;
    submittedAt: Date;
  };
}

// User preferences interface
export interface IUserPreferences {
  language?: string;
  notifications?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  categories?: Types.ObjectId[];
  theme?: 'light' | 'dark';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}

// User wallet interface
export interface IUserWallet {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  pendingAmount: number;
}

// User auth interface
export interface IUserAuth {
  isVerified: boolean;
  isOnboarded: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  otpCode?: string;
  otpExpiry?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  totpSecret?: string;
  totpEnabled?: boolean;
}

// User referral interface
export interface IUserReferral {
  referralCode: string; // User's own referral code
  referredBy?: string; // Referral code of person who referred this user
  referredUsers: string[]; // Array of user IDs that this user referred
  totalReferrals: number;
  referralEarnings: number; // Total cashback earned from referrals
}

// User verifications interface (for exclusive zones)
export interface IUserVerifications {
  student?: {
    verified: boolean;
    verifiedAt?: Date;
    instituteName?: string;
    documentType?: 'student_id' | 'edu_email' | 'enrollment_letter';
    expiresAt?: Date;
  };
  corporate?: {
    verified: boolean;
    verifiedAt?: Date;
    companyName?: string;
    corporateEmail?: string;
    expiresAt?: Date;
  };
  defence?: {
    verified: boolean;
    verifiedAt?: Date;
    documentType?: 'military_id' | 'service_card' | 'canteen_card' | 'ex_servicemen_card';
    serviceType?: 'army' | 'navy' | 'airforce' | 'paramilitary';
  };
  healthcare?: {
    verified: boolean;
    verifiedAt?: Date;
    documentType?: 'hospital_id' | 'medical_council' | 'nursing_license';
    profession?: 'doctor' | 'nurse' | 'paramedic' | 'pharmacist';
  };
  senior?: {
    verified: boolean;
    verifiedAt?: Date;
    dateOfBirth?: Date;
  };
  teacher?: {
    verified: boolean;
    verifiedAt?: Date;
    instituteName?: string;
    documentType?: 'school_id' | 'college_id' | 'ugc_id';
  };
  government?: {
    verified: boolean;
    verifiedAt?: Date;
    department?: string;
    documentType?: 'govt_id' | 'pay_slip';
  };
  differentlyAbled?: {
    verified: boolean;
    verifiedAt?: Date;
    documentType?: 'disability_certificate' | 'udid_card';
    disabilityType?: string;
  };
}

// Main User interface
export interface IUser extends Document {
  phoneNumber: string;
  email?: string;
  password?: string; // For social login or password-based auth
  profile: IUserProfile;
  preferences: IUserPreferences;
  wallet: IUserWallet;
  auth: IUserAuth;
  referral: IUserReferral;
  verifications?: IUserVerifications;
  socialLogin?: {
    googleId?: string;
    facebookId?: string;
    provider?: 'google' | 'facebook';
  };
  role: 'user' | 'admin' | 'merchant' | 'support' | 'operator' | 'super_admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Convenience properties for direct access (flatten nested properties)
  walletBalance?: number; // Direct access to wallet.balance
  referralCode?: string; // Direct access to referral.referralCode
  fullName?: string; // Computed from profile.firstName + profile.lastName
  username?: string; // Username for display
  referralTier?: 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'; // Referral tier level
  isPremium?: boolean; // Premium membership status
  premiumExpiresAt?: Date; // Premium expiry date

  // Denormalized entitlement fields (for fast queries, kept in sync by privilegeResolutionService)
  nuqtaPlusTier?: 'free' | 'premium' | 'vip';
  priveTier?: 'none' | 'entry' | 'signature' | 'elite';
  activeZones?: string[];

  // Additional user properties
  userType?: string; // User type for targeting (e.g., 'regular', 'premium', 'new')
  age?: number; // User age computed from dateOfBirth
  location?: string; // Direct access to profile.location (city or address)
  interests?: string[]; // User interests/categories for personalization
  phone?: string; // Alias for phoneNumber (for compatibility with services)

  // Push notification tokens (multiple devices)
  pushTokens?: Array<{
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceInfo?: Record<string, any>;
    lastUsed: Date;
  }>;

  // Identity layer fields
  featureLevel?: number;
  verificationSegment?: 'none' | 'provisional' | 'pending' | 'verified';
  segment?: 'normal' | 'verified_student' | 'verified_employee' | 'verified_defence' | 'verified_healthcare';
  instituteStatus?: 'not_available' | 'pending_referral' | 'onboarded';
  statedIdentity?: 'student' | 'corporate' | 'other' | 'general';
  isFlagged?: boolean;
  flagReason?: string;
  flaggedBy?: Schema.Types.ObjectId;
  flaggedAt?: Date;

  // Game access control
  gameBanned?: boolean;
  gameBanReason?: string;
  gameBannedAt?: Date;
  lastLogin?: Date; // Alias for auth.lastLogin (for compatibility with services)

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateOTP(): string;
  verifyOTP(otp: string): boolean;
  isAccountLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

// User Schema
const UserSchema = new Schema<IUser>({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    location: {
      address: String,
      neighbourhood: String, // BTM Layout, HSR Layout, Koramangala, etc.
      city: String,
      state: String,
      country: String,
      pincode: {
        type: String,
        match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
      },
      formattedAddress: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere' // For geospatial queries
      }
    },
    locationHistory: [{
      coordinates: {
        type: [Number],
        required: true
      },
      address: {
        type: String,
        required: true
      },
      city: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      source: {
        type: String,
        enum: ['manual', 'gps', 'ip'],
        default: 'manual'
      }
    }],
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    ringSize: {
      type: String,
      enum: ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']
    },
    jewelryPreferences: {
      preferredMetals: [{
        type: String,
        enum: ['gold', 'silver', 'platinum', 'diamond', 'pearl', 'gemstone']
      }],
      preferredStones: [{
        type: String,
        enum: ['diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'amethyst', 'topaz', 'garnet']
      }],
      style: {
        type: String,
        enum: ['traditional', 'modern', 'vintage', 'contemporary']
      }
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'te', 'ta', 'bn']
    },
    notifications: {
      push: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }],
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  auth: {
    isVerified: {
      type: Boolean,
      default: false
    },
    isOnboarded: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date
    },
    refreshToken: {
      type: String,
      select: false
    },
    otpCode: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    totpSecret: {
      type: String,
      select: false
    },
    totpEnabled: {
      type: Boolean,
      default: false
    },
    lockUntil: {
      type: Date,
      select: false
    }
  },
  referral: {
    type: {
      referralCode: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true,
        validate: {
          validator: function (v: string) {
            // Allow undefined/null (will be generated by pre-save hook)
            if (!v) return true;

            // New format: REF + 6 or 8 chars (9 or 11 total)
            if (v.startsWith('REF')) {
              return [9, 11].includes(v.length);
            }

            // Accept legacy codes (any format, min 4 chars) for backward compatibility
            // This ensures existing users with old referral codes can still login
            return v.length >= 4;
          },
          message: 'Invalid referral code format'
        }
      },
      referredBy: {
        type: String,
        uppercase: true,
        trim: true
      },
      referredUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }],
      totalReferrals: {
        type: Number,
        default: 0
      },
      referralEarnings: {
        type: Number,
        default: 0
      }
    },
    default: () => ({
      referredUsers: [],
      totalReferrals: 0,
      referralEarnings: 0
    })
  },
  socialLogin: {
    googleId: String,
    facebookId: String,
    provider: {
      type: String,
      enum: ['google', 'facebook']
    }
  },
  verifications: {
    student: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      instituteName: String,
      documentType: { type: String, enum: ['student_id', 'edu_email', 'enrollment_letter'] },
      expiresAt: Date
    },
    corporate: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      companyName: String,
      corporateEmail: String,
      expiresAt: Date
    },
    defence: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      documentType: { type: String, enum: ['military_id', 'service_card', 'canteen_card', 'ex_servicemen_card'] },
      serviceType: { type: String, enum: ['army', 'navy', 'airforce', 'paramilitary'] }
    },
    healthcare: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      documentType: { type: String, enum: ['hospital_id', 'medical_council', 'nursing_license'] },
      profession: { type: String, enum: ['doctor', 'nurse', 'paramedic', 'pharmacist'] }
    },
    senior: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      dateOfBirth: Date
    },
    teacher: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      instituteName: String,
      documentType: { type: String, enum: ['school_id', 'college_id', 'ugc_id'] }
    },
    government: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      department: String,
      documentType: { type: String, enum: ['govt_id', 'pay_slip'] }
    },
    differentlyAbled: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      documentType: { type: String, enum: ['disability_certificate', 'udid_card'] },
      disabilityType: String
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'merchant', 'support', 'operator', 'super_admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Convenience fields for direct access
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  fullName: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  referralTier: {
    type: String,
    enum: ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
    default: 'STARTER'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: {
    type: Date
  },
  userType: {
    type: String,
    default: 'regular'
  },
  nuqtaPlusTier: {
    type: String,
    enum: ['free', 'premium', 'vip'],
    default: 'free',
    index: true,
  },
  priveTier: {
    type: String,
    enum: ['none', 'entry', 'signature', 'elite'],
    default: 'none',
    index: true,
  },
  activeZones: {
    type: [String],
    default: [],
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  location: {
    type: String,
    trim: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  // Identity layer
  featureLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
    index: true,
  },
  verificationSegment: {
    type: String,
    enum: ['none', 'provisional', 'pending', 'verified'],
    default: 'none',
    index: true,
  },
  segment: {
    type: String,
    enum: ['normal', 'verified_student', 'verified_employee', 'verified_defence', 'verified_healthcare', 'verified_teacher', 'verified_senior', 'verified_government', 'verified_differentlyAbled'],
    default: 'normal',
    index: true,
  },
  instituteStatus: {
    type: String,
    enum: ['not_available', 'pending_referral', 'onboarded'],
    default: 'not_available',
  },
  statedIdentity: {
    type: String,
    enum: ['student', 'corporate', 'other', 'general'],
    index: true,
  },
  isFlagged: {
    type: Boolean,
    default: false,
    index: true,
  },
  flagReason: {
    type: String,
    trim: true,
  },
  flaggedBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  flaggedAt: {
    type: Date,
  },
  gameBanned: {
    type: Boolean,
    default: false,
    index: true
  },
  gameBanReason: {
    type: String,
    trim: true
  },
  gameBannedAt: {
    type: Date
  },
  pushTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    deviceInfo: { type: Schema.Types.Mixed },
    lastUsed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete (ret as any).password;
      if (ret.auth) {
        delete (ret.auth as any).refreshToken;
        delete (ret.auth as any).otpCode;
        delete (ret.auth as any).otpExpiry;
        delete (ret.auth as any).lockUntil;
        delete (ret.auth as any).totpSecret;
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for performance
UserSchema.index({ 'referral.referralCode': 1 });
UserSchema.index({ 'referral.referredBy': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'auth.isVerified': 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ referralTier: 1 });

// Compound index for querying verified active users
UserSchema.index({ 'auth.isVerified': 1, isActive: 1 });

// Cascade cleanup when a user is deleted
UserSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const userId = this._id;
  const db = mongoose.connection;

  // Delete owned single-document records
  await db.collection('wallets').deleteOne({ user: userId });
  await db.collection('carts').deleteOne({ user: userId });

  // Delete owned multi-document records
  await db.collection('addresses').deleteMany({ user: userId });
  await db.collection('wishlists').deleteMany({ user: userId });
  await db.collection('searchhistories').deleteMany({ user: userId });
  await db.collection('cointransactions').deleteMany({ user: userId });

  // Soft-delete orders (preserve financial audit trail)
  await db.collection('orders').updateMany(
    { user: userId },
    { $set: { user: null, deletedAt: new Date() } }
  );
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function () {
  return !!(this.auth.lockUntil && this.auth.lockUntil > new Date());
});

// Virtual properties for compatibility (aliases for nested properties)
UserSchema.virtual('phone').get(function () {
  return this.phoneNumber;
});

UserSchema.virtual('lastLogin').get(function () {
  return this.auth.lastLogin;
});

// Pre-save hook to generate referral code, hash password, and sync fields
UserSchema.pre('save', async function (next) {
  // Ensure referral object exists
  if (!this.referral) {
    this.referral = {
      referredUsers: [],
      totalReferrals: 0,
      referralEarnings: 0
    } as any;
  }

  // Generate referral code for new users
  if (this.isNew && !this.referral.referralCode && !this.referralCode) {
    const code = await generateUniqueReferralCode();
    this.referral.referralCode = code;
    this.referralCode = code;
  }

  // Sync referralCode between nested and top-level
  if (this.isModified('referral.referralCode') && this.referral?.referralCode) {
    this.referralCode = this.referral.referralCode;
  } else if (this.isModified('referralCode') && this.referralCode) {
    if (!this.referral) {
      this.referral = {
        referredUsers: [],
        totalReferrals: 0,
        referralEarnings: 0
      } as any;
    }
    this.referral.referralCode = this.referralCode;
  }

  // Compute fullName from firstName and lastName
  if (this.isModified('profile.firstName') || this.isModified('profile.lastName')) {
    const firstName = this.profile?.firstName || '';
    const lastName = this.profile?.lastName || '';
    this.fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
  }

  // Compute age from dateOfBirth
  if (this.isModified('profile.dateOfBirth') && this.profile?.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.age = age > 0 ? age : undefined;
  }

  // Sync location from profile.location
  if (this.isModified('profile.location')) {
    this.location = this.profile?.location?.city || this.profile?.location?.address || undefined;
  }

  // Sync walletBalance with wallet.balance
  if (this.isModified('wallet.balance')) {
    this.walletBalance = this.wallet.balance;
  } else if (this.isModified('walletBalance') && this.walletBalance !== undefined) {
    this.wallet.balance = this.walletBalance;
  }

  // Only hash the password if it has been modified (or is new)
  if (this.isModified('password') && this.password) {
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

/**
 * Helper function to generate unique cryptographically secure referral code
 * Format: REF + 8 random alphanumeric characters (e.g., REF4A7B2C9D)
 * Uses crypto.randomBytes for cryptographic security
 */
async function generateUniqueReferralCode(): Promise<string> {
  const User = mongoose.model('User');
  let referralCode: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loops

  while (!isUnique && attempts < maxAttempts) {
    attempts++;

    // Generate 8 random hex characters using crypto (cryptographically secure)
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    referralCode = `REF${randomHex}`;

    // Check if code already exists
    const existingUser = await User.findOne({
      $or: [
        { 'referral.referralCode': referralCode },
        { referralCode: referralCode }
      ]
    });

    if (!existingUser) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback: use timestamp + random bytes to ensure uniqueness
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const randomBytes = crypto.randomBytes(2).toString('hex').toUpperCase();
    referralCode = `REF${timestamp}${randomBytes}`;
  }

  return referralCode!;
}

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate OTP
UserSchema.methods.generateOTP = function (): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.auth.otpCode = otp;
  this.auth.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  return otp;
};

// Instance method to verify OTP
//
// SECURITY: previously accepted any 6-digit OTP in NODE_ENV !== 'production'.
// Staging environments (NODE_ENV=staging) and any misconfiguration left the
// account-takeover door wide open. The dev bypass now requires an explicit
// ALLOW_DEV_OTP_BYPASS=true flag — never set in any environment that is
// reachable from the public internet.
UserSchema.methods.verifyOTP = function (otp: string): boolean {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_DEV_OTP_BYPASS === 'true'
  ) {
    // DEV-ONLY MODE: Accept any 6-digit OTP and mark as verified.
    // Refuse to run unless explicitly opted in.
    this.auth.otpCode = undefined;
    this.auth.otpExpiry = undefined;
    this.auth.isVerified = true;
    return true;
  }

  // Production (or any non-opted-in env): Real OTP verification
  if (!this.auth.otpCode || !this.auth.otpExpiry) return false;

  // Timing-safe comparison to prevent timing oracle attacks
  const storedOtp = String(this.auth.otpCode);
  const inputOtp = String(otp);
  let otpMatch = false;
  if (storedOtp.length === inputOtp.length) {
    otpMatch = require('crypto').timingSafeEqual(Buffer.from(storedOtp), Buffer.from(inputOtp));
  }
  const isValid = otpMatch && this.auth.otpExpiry > new Date();

  if (isValid) {
    // Clear OTP after successful verification
    this.auth.otpCode = undefined;
    this.auth.otpExpiry = undefined;
    this.auth.isVerified = true;
  }

  return isValid;
};

// Instance method to check if account is locked
UserSchema.methods.isAccountLocked = function (): boolean {
  return !!(this.auth.lockUntil && this.auth.lockUntil > new Date());
};

// Instance method to increment login attempts
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // Check if we have a previous lock that has expired
  if (this.auth.lockUntil && this.auth.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { 'auth.lockUntil': 1, 'auth.loginAttempts': 1 }
    });
  }

  const updates: any = { $inc: { 'auth.loginAttempts': 1 } };

  // Lock account after 5 failed attempts for 30 minutes
  if (this.auth.loginAttempts + 1 >= 5 && !this.auth.lockUntil) {
    updates.$set = { 'auth.lockUntil': new Date(Date.now() + 30 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  return this.updateOne({
    $unset: { 'auth.lockUntil': 1, 'auth.loginAttempts': 1 }
  });
};

// Static method to find by phone or email
UserSchema.statics.findByCredentials = function (identifier: string) {
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier } : { phoneNumber: identifier };
  return this.findOne(query).select('+password');
};

export const User = mongoose.model<IUser>('User', UserSchema);