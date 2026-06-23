// Fraud Detection Type Definitions
// Comprehensive type definitions for the anti-fraud system

// ============================================================================
// FRAUD DETECTION TYPES
// ============================================================================

export interface FraudCheckResult {
  allowed: boolean;
  riskScore: number; // 0-100, higher = more risky
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  blockedReasons: string[];
  warnings: string[];
  metadata: {
    checksPassed: number;
    totalChecks: number;
    timestamp: number;
  };
}

export interface SubmissionRecord {
  url: string;
  postId: string;
  timestamp: number;
  deviceId: string;
  ipHash?: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingSubmissions: number;
  resetTime: number;
  message?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingSubmissionId?: string;
  submittedAt?: Date;
  reason?: string;
}

export interface AccountVerification {
  isVerified: boolean;
  accountAge?: number; // days
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  verificationBadge?: boolean;
  riskFactors: string[];
}

export interface FraudPattern {
  patternType: 'velocity' | 'similarity' | 'behavior' | 'device';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: number;
}

export interface FraudStats {
  totalSubmissions: number;
  submissionsToday: number;
  submissionsThisWeek: number;
  lastSubmission?: Date;
  isBlocked: boolean;
  remainingDailySubmissions: number;
}

// ============================================================================
// INSTAGRAM VERIFICATION TYPES
// ============================================================================

export interface InstagramPostData {
  id: string;
  permalink: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  username: string;
}

export interface InstagramAccountData {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  is_verified?: boolean;
}

export interface PostVerificationResult {
  isValid: boolean;
  exists: boolean;
  isAccessible: boolean;
  postData?: InstagramPostData;
  accountData?: InstagramAccountData;
  contentMatches?: {
    hasBrandMention: boolean;
    hasRequiredHashtags: boolean;
    hasProductMention: boolean;
    matchScore: number;
  };
  errors: string[];
  warnings: string[];
}

export interface InstagramUrlParsed {
  username?: string;
  postId?: string;
  postType?: 'post' | 'reel';
  isValid: boolean;
}

// ============================================================================
// SECURITY TYPES
// ============================================================================

export interface DeviceFingerprint {
  id: string;
  platform: string;
  osVersion: string;
  deviceModel: string;
  deviceName: string;
  appVersion: string;
  uniqueId: string;
  timestamp: number;
  hash: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  deviceFingerprint: DeviceFingerprint;
  isBlacklisted: boolean;
  isSuspicious: boolean;
  trustScore: number; // 0-100, higher = more trustworthy
  flags: string[];
  recommendations: string[];
}

export interface CaptchaVerification {
  required: boolean;
  token?: string;
  verified: boolean;
  expiresAt?: number;
}

export interface IPInfo {
  ip?: string;
  country?: string;
  city?: string;
  isp?: string;
  isVPN?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  riskScore: number;
}

export interface MultiAccountDetection {
  detected: boolean;
  accountCount: number;
  deviceIds: string[];
  suspicionLevel: 'low' | 'medium' | 'high';
  details: string[];
}

export interface SecurityStats {
  deviceId: string;
  trustScore: number;
  isBlacklisted: boolean;
  suspiciousActivityCount: number;
  lastSecurityCheck?: Date;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface FraudAnalytics {
  totalSubmissions: number;
  fraudulentSubmissions: number;
  fraudRate: number;
  blockedDevices: number;
  topRiskPatterns: {
    pattern: string;
    count: number;
  }[];
  recentFlags: {
    postId: string;
    reason: string;
    timestamp: number;
  }[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface SuspiciousPost {
  id: string;
  userId: string;
  deviceId: string;
  url: string;
  platform: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  warnings: string[];
  submittedAt: Date;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface DeviceHistory {
  deviceId: string;
  trustScore: number;
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistUntil?: Date;
  submissions: {
    id: string;
    url: string;
    status: string;
    submittedAt: Date;
  }[];
  accounts: {
    userId: string;
    username: string;
    email: string;
  }[];
  ipAddresses: string[];
  flags: {
    type: string;
    description: string;
    timestamp: Date;
  }[];
}

export interface BlacklistEntry {
  deviceId: string;
  reason: string;
  duration: number; // milliseconds
  until: number; // timestamp
  addedBy: string;
  addedAt: Date;
}

export interface FraudReviewAction {
  postId: string;
  action: 'approve' | 'reject' | 'flag' | 'whitelist' | 'blacklist';
  notes: string;
  reviewedBy: string;
  reviewedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface SubmitPostWithFraudData {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  orderId?: string;
  fraudMetadata: {
    deviceId: string;
    trustScore: number;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    checksPassed: number;
    totalChecks: number;
    warnings: string[];
  };
}

export interface CheckDuplicateRequest {
  url: string;
  postId: string;
}

export interface CheckDuplicateResponse {
  isDuplicate: boolean;
  existingSubmissionId?: string;
  submittedAt?: Date;
}

export interface VerifyPostRequest {
  url: string;
  postId: string;
  username?: string;
}

export interface VerifyPostResponse {
  exists: boolean;
  isAccessible: boolean;
  postData?: InstagramPostData;
  accountData?: InstagramAccountData;
}

export interface BlacklistDeviceRequest {
  deviceId: string;
  reason: string;
  duration: number;
}

export interface ReportSuspiciousRequest {
  deviceId: string;
  activityType: string;
  details: any;
  timestamp: number;
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

export interface FraudWarningProps {
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  onDismiss?: () => void;
}

export interface RateLimitDisplayProps {
  remainingSubmissions: number;
  maxSubmissions: number;
  resetTime: number;
  nextSubmissionTime?: number;
}

export interface SecurityIndicatorProps {
  trustScore: number;
  isBlacklisted: boolean;
  isSuspicious: boolean;
  flags: string[];
}

export interface RequirementsChecklistProps {
  requirements: {
    id: string;
    label: string;
    met: boolean;
    required: boolean;
  }[];
}

export interface FraudDashboardFilters {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  platform?: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  dateFrom?: Date;
  dateTo?: Date;
  deviceId?: string;
  userId?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface FraudDetectionConfig {
  MAX_SUBMISSIONS_PER_DAY: number;
  MAX_SUBMISSIONS_PER_WEEK: number;
  MAX_SUBMISSIONS_PER_MONTH: number;
  MIN_TIME_BETWEEN_SUBMISSIONS: number;
  COOLDOWN_AFTER_REJECTION: number;
  MIN_ACCOUNT_AGE_DAYS: number;
  MIN_FOLLOWER_COUNT: number;
  MIN_POST_COUNT: number;
  RISK_THRESHOLD_LOW: number;
  RISK_THRESHOLD_MEDIUM: number;
  RISK_THRESHOLD_HIGH: number;
  CACHE_TTL_HOURS: number;
}

export interface InstagramConfig {
  REQUIRED_BRAND_MENTIONS: string[];
  REQUIRED_HASHTAGS: string[];
  OPTIONAL_HASHTAGS: string[];
  MIN_CAPTION_LENGTH: number;
  MAX_POST_AGE_DAYS: number;
  CONTENT_MATCH_THRESHOLD: number;
}

export interface SecurityConfig {
  TRUST_SCORE_THRESHOLD_LOW: number;
  TRUST_SCORE_THRESHOLD_MEDIUM: number;
  CAPTCHA_EXPIRY_MINUTES: number;
  CAPTCHA_REQUIRED_AFTER_FAILURES: number;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface UseFraudDetectionReturn {
  checkFraud: (url: string) => Promise<FraudCheckResult>;
  checkDuplicate: (url: string) => Promise<DuplicateCheckResult>;
  checkRateLimit: () => Promise<RateLimitStatus>;
  getStats: () => Promise<FraudStats>;
  recordSubmission: (url: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseSecurityReturn {
  performCheck: () => Promise<SecurityCheckResult>;
  getFingerprint: () => Promise<DeviceFingerprint>;
  getStats: () => Promise<SecurityStats>;
  reportSuspicious: (type: string, details: any) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseInstagramVerificationReturn {
  verifyPost: (url: string) => Promise<PostVerificationResult>;
  verifyAccount: (username: string) => Promise<{ isValid: boolean; accountData?: InstagramAccountData; errors: string[] }>;
  parseUrl: (url: string) => InstagramUrlParsed;
  validateUrl: (url: string) => { isValid: boolean; error?: string };
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type FraudEvent =
  | { type: 'DUPLICATE_DETECTED'; url: string; timestamp: number }
  | { type: 'RATE_LIMIT_EXCEEDED'; remainingTime: number }
  | { type: 'SUSPICIOUS_PATTERN'; pattern: string; severity: string }
  | { type: 'BLACKLIST_TRIGGERED'; deviceId: string }
  | { type: 'SECURITY_FLAG'; flag: string; details: any }
  | { type: 'VERIFICATION_FAILED'; reason: string }
  | { type: 'FRAUD_CHECK_PASSED'; riskScore: number };

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Platform = 'instagram' | 'facebook' | 'twitter' | 'tiktok';

export type PostStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'credited';

export type FraudCheckStep =
  | 'basic_validation'
  | 'security_check'
  | 'fraud_detection'
  | 'instagram_verification'
  | 'captcha_check'
  | 'backend_submission';

export type AdminAction = 'approve' | 'reject' | 'flag' | 'whitelist' | 'blacklist' | 'review';

export interface FraudCheckProgress {
  currentStep: FraudCheckStep;
  stepsPassed: number;
  totalSteps: number;
  message: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class FraudDetectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FraudDetectionError';
  }
}

export class SecurityCheckError extends Error {
  constructor(
    message: string,
    public trustScore: number,
    public flags: string[]
  ) {
    super(message);
    this.name = 'SecurityCheckError';
  }
}

export class InstagramVerificationError extends Error {
  constructor(
    message: string,
    public verificationErrors: string[],
    public warnings: string[]
  ) {
    super(message);
    this.name = 'InstagramVerificationError';
  }
}
