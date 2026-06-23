// Payment Verification Types
// Defines all interfaces for payment method verification

export enum VerificationStatus {
  NOT_VERIFIED = 'NOT_VERIFIED',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REQUIRES_ACTION = 'REQUIRES_ACTION'
}

export enum VerificationType {
  CARD_3DS = 'CARD_3DS',
  BANK_MICRO_DEPOSIT = 'BANK_MICRO_DEPOSIT',
  UPI = 'UPI',
  KYC_DOCUMENT = 'KYC_DOCUMENT',
  OTP = 'OTP',
  IDENTITY = 'IDENTITY',
  BIOMETRIC = 'BIOMETRIC'
}

export enum VerificationLevel {
  BASIC = 'BASIC', // Minimal verification
  STANDARD = 'STANDARD', // Normal verification
  ENHANCED = 'ENHANCED', // Enhanced verification with KYC
  PREMIUM = 'PREMIUM' // Full KYC with biometric
}

export enum DocumentType {
  PAN = 'PAN',
  AADHAAR = 'AADHAAR',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VOTER_ID = 'VOTER_ID',
  BANK_STATEMENT = 'BANK_STATEMENT',
  UTILITY_BILL = 'UTILITY_BILL'
}

// Card Verification (3D Secure)
export interface CardVerificationRequest {
  paymentMethodId: string;
  cardNumber?: string; // Last 4 digits or full for new cards
  returnUrl?: string; // For 3DS redirect
}

export interface CardVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  requiresAuthentication: boolean;
  authenticationUrl?: string; // For 3DS redirect
  clientSecret?: string; // For Stripe
  threeDSUrl?: string; // For Razorpay
  expiresAt?: string;
}

// Bank Account Verification
export interface BankVerificationRequest {
  paymentMethodId: string;
  accountNumber: string; // Masked
  ifscCode: string;
  accountHolderName: string;
}

export interface MicroDepositVerification {
  amount1: number; // First micro-deposit amount
  amount2: number; // Second micro-deposit amount
}

export interface BankVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  method: 'MICRO_DEPOSIT' | 'INSTANT' | 'MANUAL';
  estimatedTime?: string; // e.g., "2-3 business days"
  instructionsText?: string;
  depositsExpectedBy?: string;
}

// UPI Verification
export interface UPIVerificationRequest {
  paymentMethodId: string;
  vpa: string; // UPI ID
  phoneNumber?: string;
}

export interface UPIVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  vpaValid: boolean;
  nameAtBank?: string; // Retrieved from UPI
  requestId?: string;
  expiresAt?: string;
}

// KYC Document Upload
export interface KYCDocumentUpload {
  documentType: DocumentType;
  frontImage: string; // Base64 or URI
  backImage?: string; // For documents with back side
  documentNumber?: string;
  expiryDate?: string;
}

export interface KYCVerificationRequest {
  paymentMethodId?: string;
  userId?: string;
  documents: KYCDocumentUpload[];
  selfieImage?: string; // For liveness check
}

export interface KYCVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  documentsUploaded: number;
  processingTime?: string;
  reviewRequired: boolean;
  rejectionReasons?: string[];
}

// OTP Verification
export interface OTPVerificationRequest {
  phoneNumber?: string;
  email?: string;
  purpose: 'PAYMENT_METHOD' | 'TRANSACTION' | 'IDENTITY';
  verificationId?: string;
}

export interface OTPVerificationResponse {
  verificationId: string;
  otpSent: boolean;
  expiresIn: number; // seconds
  resendAvailableIn: number; // seconds
  maskedContact: string; // e.g., "****1234"
}

export interface OTPValidationRequest {
  verificationId: string;
  otp: string;
}

export interface OTPValidationResponse {
  verified: boolean;
  attemptsRemaining: number;
  error?: string;
}

// Identity Verification
export interface IdentityVerificationRequest {
  fullName: string;
  dateOfBirth: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  documentType: DocumentType;
  documentNumber: string;
}

export interface IdentityVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  matchScore?: number; // 0-100
  verifiedFields: string[];
  failedFields?: string[];
}

// Biometric Verification
export interface BiometricVerificationRequest {
  paymentMethodId?: string;
  biometricType: 'FINGERPRINT' | 'FACE_ID' | 'IRIS';
  deviceId?: string;
}

export interface BiometricVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  biometricMatched: boolean;
  confidence?: number; // 0-100
}

// Complete Verification Status
export interface PaymentMethodVerificationStatus {
  paymentMethodId: string;
  overallStatus: VerificationStatus;
  verificationLevel: VerificationLevel;
  verificationsCompleted: {
    card3DS?: boolean;
    bankAccount?: boolean;
    upi?: boolean;
    kyc?: boolean;
    otp?: boolean;
    identity?: boolean;
    biometric?: boolean;
  };
  lastVerifiedAt?: string;
  expiresAt?: string;
  requiresReverification: boolean;
  nextVerificationDate?: string;
}

// Verification History
export interface VerificationHistoryItem {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  initiatedAt: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

// Fraud Detection Signals
export interface FraudDetectionSignals {
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  deviceFingerprint?: string;
  ipAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  velocityChecks: {
    recentVerificationAttempts: number;
    recentPaymentMethods: number;
    recentFailures: number;
  };
}

// Verification Requirements
export interface VerificationRequirements {
  paymentMethodId: string;
  paymentMethodType: 'CARD' | 'BANK_ACCOUNT' | 'UPI' | 'WALLET';
  requiredVerifications: VerificationType[];
  optionalVerifications: VerificationType[];
  currentLevel: VerificationLevel;
  canUpgradeTo?: VerificationLevel;
  transactionLimits: {
    perTransaction: number;
    daily: number;
    monthly: number;
  };
}

// Verification Analytics
export interface VerificationAnalytics {
  totalVerifications: number;
  successRate: number;
  averageCompletionTime: number; // in seconds
  dropOffPoints: {
    step: string;
    dropOffRate: number;
  }[];
  fraudAttempts: number;
  commonFailureReasons: {
    reason: string;
    count: number;
  }[];
}

// Verification Session
export interface VerificationSession {
  sessionId: string;
  paymentMethodId?: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  startedAt: string;
  expiresAt: string;
  completedAt?: string;
  currentStep: number;
  totalSteps: number;
  context: {
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
  errors?: string[];
}

// Re-verification Request
export interface ReverificationRequest {
  paymentMethodId: string;
  reason: 'EXPIRED' | 'SUSPICIOUS_ACTIVITY' | 'POLICY_CHANGE' | 'USER_REQUEST';
  verificationType: VerificationType[];
}

// Verification Challenge
export interface VerificationChallenge {
  challengeId: string;
  type: 'SMS_OTP' | 'EMAIL_OTP' | 'SECURITY_QUESTION' | 'BIOMETRIC';
  prompt: string;
  expiresIn: number; // seconds
  attemptsAllowed: number;
  attemptsRemaining: number;
}

export interface VerificationChallengeResponse {
  challengeId: string;
  response: string;
  metadata?: Record<string, any>;
}

// Device Binding
export interface DeviceBinding {
  deviceId: string;
  deviceName: string;
  deviceType: 'IOS' | 'ANDROID' | 'WEB';
  isTrusted: boolean;
  boundAt: string;
  lastUsedAt: string;
  biometricEnabled: boolean;
}

// Session Timeout Configuration
export interface SessionTimeoutConfig {
  idleTimeout: number; // seconds
  absoluteTimeout: number; // seconds
  warningThreshold: number; // seconds before timeout
  extendable: boolean;
}

// Risk-Based Verification
export interface RiskBasedVerificationDecision {
  requiresVerification: boolean;
  verificationsNeeded: VerificationType[];
  riskScore: number;
  riskFactors: {
    factor: string;
    weight: number;
    description: string;
  }[];
  skipVerificationAllowed: boolean;
  verificationLevel: VerificationLevel;
}
