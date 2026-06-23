// @ts-nocheck
/**
 * User entity — canonical shape for the `users` collection.
 *
 * Mirrors rezbackend/src/models/User.ts (1200+ lines). Fields covered:
 *   - identity (phoneNumber, email, password)
 *   - profile (firstName, lastName, avatar, bio, location, locationHistory, jewelry)
 *   - preferences (notifications, categories, theme, currency)
 *   - auth (OTP, TOTP, PIN, login attempts, lock)
 *   - referral (code, referredBy, earnings, reward dedup flag)
 *   - verifications (8 exclusive zones with per-zone fields)
 *   - social logins (google, facebook)
 *   - role + status (active/suspended/inactive)
 *   - entitlement denormalizations (rezPlus, prive, loyalty tiers)
 *   - push tokens, patch tests, fraud flags
 *   - TOS / privacy acceptance
 *   - soft-delete
 *
 * The `wallet?` sub-doc is intentionally deprecated — live balances live
 * in the Wallet collection. See the `@deprecated` JSDoc.
 */
import {
  UserRole,
  Gender,
  VerificationStatus,
  JewelryStyle,
  Theme,
  ReferralTier,
  RezPlusTier,
  PriveTier,
  LoyaltyTier,
  LocationSource,
  DocumentType,
  ProfessionType,
  ServiceType,
} from '../enums/index';
import type { UserId, StoreId } from '../branded/ids';
export interface IUserLocation {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  /** [longitude, latitude]. */
  coordinates?: [number, number];
}
export interface IUserLocationHistory {
  /** [longitude, latitude]. */
  coordinates: [number, number];
  address: string;
  city?: string;
  timestamp: Date | string;
  source: LocationSource;
}
export interface IUserJewelryPreferences {
  preferredMetals?: string[];
  preferredStones?: string[];
  style?: JewelryStyle;
}
export interface IUserVerificationDocument {
  documentType: string;
  documentNumber: string;
  documentImage: string;
  submittedAt: Date | string;
}
export interface IUserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  dateOfBirth?: Date | string;
  gender?: Gender;
  location?: IUserLocation;
  locationHistory?: IUserLocationHistory[];
  timezone?: string;
  ringSize?: string;
  jewelryPreferences?: IUserJewelryPreferences;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: IUserVerificationDocument;
}
export interface IUserNotificationPreferences {
  push?: boolean;
  email?: boolean;
  sms?: boolean;
}
export interface IUserPreferences {
  language?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  notifications?: IUserNotificationPreferences;
  /** Category ObjectId hexes. */
  categories?: string[];
  theme?: Theme;
  /** Flat mirrors — kept for backward compatibility with older APIs. */
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}
/**
 * @deprecated Wallet data lives in the Wallet collection (rez-wallet-service).
 * Present on some old documents — new code must NOT read this field.
 */
export interface IUserWallet {
  balance: number;
  isFrozen?: boolean;
}
export interface IUserAuth {
  isVerified: boolean;
  isOnboarded: boolean;
  lastLogin?: Date | string;
  /** Hash stored server-side only — should never appear in client responses. */
  refreshToken?: string;
  otpCode?: string;
  otpExpiry?: Date | string;
  loginAttempts: number;
  lockUntil?: Date | string;
  totpSecret?: string;
  totpEnabled?: boolean;
  pinHash?: string;
  pinSetAt?: Date | string;
  pinAttempts?: number;
  pinLockedUntil?: Date | string;
}
export interface IUserReferral {
  /** This user's OWN referral code (what they share). */
  referralCode: string;
  /** Code of the user who referred THIS user (if any). */
  referredBy?: string;
  /** User IDs this user has referred. */
  referredUsers: string[];
  totalReferrals: number;
  referralEarnings: number;
  /** Dedup flag — prevents a referral reward being credited twice. */
  referralRewardIssued?: boolean;
}
/** Base shape shared by every exclusive-zone verification. */
export interface IExclusiveZoneVerification {
  verified: boolean;
  verifiedAt?: Date | string;
}
export interface IStudentVerification extends IExclusiveZoneVerification {
  instituteName?: string;
  documentType?: DocumentType;
  expiresAt?: Date | string;
}
export interface ICorporateVerification extends IExclusiveZoneVerification {
  companyName?: string;
  corporateEmail?: string;
  expiresAt?: Date | string;
}
export interface IDefenceVerification extends IExclusiveZoneVerification {
  documentType?: DocumentType;
  serviceType?: ServiceType;
}
export interface IHealthcareVerification extends IExclusiveZoneVerification {
  documentType?: DocumentType;
  profession?: ProfessionType;
}
export interface ISeniorVerification extends IExclusiveZoneVerification {
  dateOfBirth?: Date | string;
}
export interface ITeacherVerification extends IExclusiveZoneVerification {
  instituteName?: string;
  documentType?: DocumentType;
}
export interface IGovernmentVerification extends IExclusiveZoneVerification {
  department?: string;
  documentType?: DocumentType;
}
export interface IDifferentlyAbledVerification extends IExclusiveZoneVerification {
  documentType?: DocumentType;
  disabilityType?: string;
}
export interface IUserVerifications {
  student?: IStudentVerification;
  corporate?: ICorporateVerification;
  defence?: IDefenceVerification;
  healthcare?: IHealthcareVerification;
  senior?: ISeniorVerification;
  teacher?: ITeacherVerification;
  government?: IGovernmentVerification;
  differentlyAbled?: IDifferentlyAbledVerification;
}
export interface IUserSocialLogin {
  googleId?: string;
  facebookId?: string;
  provider?: 'google' | 'facebook';
}
export interface IUserPushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo?: Record<string, string | number | boolean | null>;
  lastUsed: Date | string;
}
/** Patch-test record for services where a prior allergy test is required. */
export interface IUserPatchTest {
  serviceCategory: string;
  testedAt: Date | string;
  expiresAt: Date | string;
  result: 'pass' | 'reaction';
  conductedBy: string;
  storeId: string | StoreId;
}
/** Fraud detection flags written by the fraudDetection cron job. */
export interface IUserFraudFlags {
  coinVelocity?: {
    flaggedAt: Date | string;
    /** Coins earned in the 24h window at flag time. */
    earnedLast24h: number;
    /** Statistical z-score vs. platform mean. */
    zScore: number;
    cleared?: boolean;
    clearedAt?: Date | string;
  };
  referralAbuse?: {
    flaggedAt: Date | string;
    reason: string;
  };
}
export type UserAccountStatus = 'active' | 'suspended' | 'inactive';
export type UserVerificationSegment = 'none' | 'provisional' | 'pending' | 'verified';
export type UserSegment =
  | 'normal'
  | 'verified_student'
  | 'verified_employee'
  | 'verified_defence'
  | 'verified_healthcare';
export type UserInstituteStatus = 'not_available' | 'pending_referral' | 'onboarded';
export type UserStatedIdentity = 'student' | 'corporate' | 'other' | 'general';
/** Canonical User document. */
export interface IUser {
  _id?: string | UserId;
  phoneNumber: string;
  email?: string;
  /** Bcrypt hash. Should be stripped from API responses (backend uses `select: false`). */
  password?: string;
  profile: IUserProfile;
  preferences: IUserPreferences;
  /** @deprecated Use the Wallet collection. */
  wallet?: IUserWallet;
  auth: IUserAuth;
  referral: IUserReferral;
  verifications?: IUserVerifications;
  socialLogin?: IUserSocialLogin;
  role: UserRole;
  isActive: boolean;
  /** Admin-controlled suspension flag. */
  isSuspended?: boolean;
  /** Mirrors isActive/isSuspended (kept in sync by a pre-save hook). */
  status?: UserAccountStatus;
  suspendedAt?: Date | string;
  suspendReason?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  referralCode?: string;
  fullName?: string;
  username?: string;
  referralTier?: ReferralTier;
  isPremium?: boolean;
  premiumExpiresAt?: Date | string;
  rezPlusTier?: RezPlusTier;
  priveTier?: PriveTier;
  activeZones?: string[];
  loyaltyTier?: LoyaltyTier;
  userType?: string;
  age?: number;
  location?: string;
  interests?: string[];
  /** Alias for phoneNumber — some services read this flat form. */
  phone?: string;
  pushTokens?: IUserPushToken[];
  patchTests?: IUserPatchTest[];
  featureLevel?: number;
  verificationSegment?: UserVerificationSegment;
  segment?: UserSegment;
  instituteStatus?: UserInstituteStatus;
  statedIdentity?: UserStatedIdentity;
  isFlagged?: boolean;
  flagReason?: string;
  flaggedBy?: string;
  flaggedAt?: Date | string;
  gameBanned?: boolean;
  gameBanReason?: string;
  gameBannedAt?: Date | string;
  lastLogin?: Date | string;
  tosAcceptedAt?: Date | string | null;
  tosVersion?: string | null;
  privacyPolicyAcceptedAt?: Date | string | null;
  privacyPolicyVersion?: string | null;
  fraudFlags?: IUserFraudFlags;
  deletedAt?: Date | string | null;
  isDeleted?: boolean;
  /** Cleared on account deletion per BED-023. Present while active. */
  deviceInfo?: unknown;
}
//# sourceMappingURL=user.d.ts.map
