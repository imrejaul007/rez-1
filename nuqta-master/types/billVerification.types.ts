// Bill Verification Types
// Types for OCR, verification, and cashback calculation

/**
 * OCR Extraction Result
 */
export interface OCRExtractedData {
  merchantName?: string;
  merchantAddress?: string;
  amount?: number;
  totalAmount?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  time?: string;
  billNumber?: string;
  invoiceNumber?: string;
  gstNumber?: string;
  phoneNumber?: string;
  items?: OCRExtractedItem[];
  paymentMethod?: string;
  confidence: number; // 0-100
  rawText?: string;
  language?: string;
}

/**
 * OCR Extracted Item
 */
export interface OCRExtractedItem {
  name: string;
  quantity?: number;
  price?: number;
  amount?: number;
  confidence: number;
}

/**
 * Bill Upload Data
 */
export interface BillUploadData {
  storeId: string;
  amount: number;
  date: Date;
  categoryId?: string;
  imageUri?: string;
  billImage?: string;
  merchantId?: string;
  billNumber?: string;
  notes?: string;
  billDate?: Date;
  ocrData?: OCRExtractedData;
  verificationResult?: BillVerificationResult;
  fraudCheck?: FraudDetectionResult;
  cashbackCalculation?: CashbackCalculation;
}

/**
 * Bill Verification Status
 */
export type BillVerificationStatus =
  | 'uploading'
  | 'ocr_processing'
  | 'ocr_completed'
  | 'user_verification'
  | 'merchant_matching'
  | 'amount_verification'
  | 'fraud_check'
  | 'cashback_calculation'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'failed';

/**
 * Verification State
 */
export interface BillVerificationState {
  status: BillVerificationStatus;
  currentStep: number;
  totalSteps: number;
  message: string;
  progress: number; // 0-100
  timestamp: Date;
}

/**
 * Merchant Match
 */
export interface MerchantMatch {
  merchantId: string;
  merchantName: string;
  logo?: string;
  matchScore: number; // 0-100
  matchMethod: 'exact' | 'fuzzy' | 'manual';
  cashbackPercentage: number;
  category?: string;
  address?: string;
  verificationRequired: boolean;
}

/**
 * Bill Verification Result
 */
export interface BillVerificationResult {
  isValid: boolean;
  score: number; // 0-100
  checks: {
    imageQuality: CheckResult;
    dateValidity: CheckResult;
    amountValidity: CheckResult;
    merchantMatch: CheckResult;
    duplicateCheck: CheckResult;
    fraudCheck: CheckResult;
  };
  warnings: string[];
  errors: string[];
  requiresManualReview: boolean;
  manualReviewReason?: string;
}

/**
 * Check Result
 */
export interface CheckResult {
  passed: boolean;
  score: number;
  message: string;
  details?: any;
}

/**
 * Cashback Calculation
 */
export interface CashbackCalculation {
  baseAmount: number;
  baseCashbackRate: number;
  baseCashback: number;
  bonuses: CashbackBonus[];
  totalBonus: number;
  finalCashbackRate: number;
  finalCashback: number;
  caps: {
    categoryLimit?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  appliedCap?: {
    type: string;
    limit: number;
    reason: string;
  };
  breakdown: {
    label: string;
    amount: number;
    percentage?: number;
  }[];
}

/**
 * Cashback Bonus
 */
export interface CashbackBonus {
  type: 'category' | 'merchant' | 'promotional' | 'tier' | 'special';
  label: string;
  rate: number;
  amount: number;
  description: string;
}

/**
 * Cashback Rule
 */
export interface CashbackRule {
  id: string;
  category?: string;
  merchantId?: string;
  cashbackRate: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  isActive: boolean;
  priority: number;
}

/**
 * Fraud Detection Result
 */
export interface FraudDetectionResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  flags: FraudFlag[];
  allowSubmission: boolean;
  requiresManualReview: boolean;
  reason?: string;
}

/**
 * Fraud Flag
 */
export interface FraudFlag {
  type: 'duplicate_image' | 'duplicate_bill' | 'suspicious_amount' | 'old_bill'
    | 'velocity_exceeded' | 'unusual_pattern' | 'modified_image' | 'invalid_merchant';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Bill Image Analysis
 */
export interface BillImageAnalysis {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  qualityScore: number; // 0-100
  resolution: {
    width: number;
    height: number;
  };
  fileSize: number;
  format: string;
  issues: string[];
  suggestions: string[];
  isModified: boolean;
  hash: string;
}

/**
 * Manual Correction Data
 */
export interface ManualCorrectionData {
  merchantId?: string;
  merchantName?: string;
  amount?: number;
  billDate?: string;
  billNumber?: string;
  items?: OCRExtractedItem[];
  notes?: string;
}

/**
 * Bill Upload Request
 */
export interface BillUploadRequest {
  billImage: string; // File URI or base64
  extractedData?: OCRExtractedData;
  manualCorrections?: ManualCorrectionData;
  merchantId?: string;
  amount?: number;
  billDate?: Date;
  billNumber?: string;
  notes?: string;
}

/**
 * Bill Upload Response
 */
export interface BillUploadResponse {
  billId: string;
  verificationStatus: BillVerificationStatus;
  ocrData?: OCRExtractedData;
  merchantMatches?: MerchantMatch[];
  cashbackEstimate?: CashbackCalculation;
  verificationResult?: BillVerificationResult;
  fraudCheck?: FraudDetectionResult;
  requiresUserConfirmation: boolean;
  message: string;
}

/**
 * Bill Verification Workflow State
 */
export interface BillVerificationWorkflow {
  billId?: string;
  imageUri: string;
  imageAnalysis?: BillImageAnalysis;
  ocrData?: OCRExtractedData;
  selectedMerchant?: MerchantMatch;
  manualCorrections?: ManualCorrectionData;
  cashbackCalculation?: CashbackCalculation;
  verificationResult?: BillVerificationResult;
  fraudCheck?: FraudDetectionResult;
  currentState: BillVerificationState;
  isComplete: boolean;
  canSubmit: boolean;
  errors: string[];
}

/**
 * Bill Requirements
 */
export interface BillRequirements {
  imageFormats: string[];
  maxFileSize: number; // bytes
  minResolution: { width: number; height: number };
  maxBillAge: number; // days
  minAmount: number;
  maxAmount: number;
  requiredFields: string[];
  acceptedMerchantTypes: string[];
}

/**
 * Bill History Item
 */
export interface BillHistoryItem {
  _id: string;
  billImage: {
    url: string;
    thumbnailUrl?: string;
  };
  merchant: {
    _id: string;
    name: string;
    logo?: string;
  };
  amount: number;
  billDate: string;
  billNumber?: string;
  verificationStatus: BillVerificationStatus;
  cashbackAmount?: number;
  cashbackStatus?: 'pending' | 'credited' | 'failed';
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  creditedAt?: string;
}

/**
 * OCR Service Config
 */
export interface OCRServiceConfig {
  provider: 'google_vision' | 'tesseract' | 'aws_textract' | 'azure';
  apiKey?: string;
  endpoint?: string;
  language: string;
  confidence: number;
}

/**
 * User Verification Preferences
 */
export interface UserVerificationPreferences {
  autoSubmitHighConfidence: boolean; // Auto-submit if OCR confidence > 90%
  enableNotifications: boolean;
  defaultMerchant?: string;
  preferredCategories: string[];
}
