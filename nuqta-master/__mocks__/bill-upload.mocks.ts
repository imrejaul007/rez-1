/**
 * Bill Upload Mock Data and Functions
 *
 * Provides mock data, functions, and utilities for testing
 * bill upload functionality.
 */

import {
  OCRExtractedData,
  BillVerificationResult,
  FraudDetectionResult,
  CashbackCalculation,
  MerchantMatch,
  BillImageAnalysis,
} from '@/types/billVerification.types';
import { Bill, BillUploadData } from '@/services/billUploadService';

// =============================================================================
// MOCK BILL DATA
// =============================================================================

export const mockBillImage = 'file://mock-bill.jpg';

export const mockBillUploadData: BillUploadData = {
  billImage: mockBillImage,
  merchantId: 'merchant-123',
  amount: 1000,
  billDate: new Date('2024-01-15'),
  billNumber: 'INV-2024-001',
  notes: 'Monthly grocery shopping',
};

export const mockBill: Bill = {
  _id: 'bill-123',
  user: 'user-123',
  merchant: {
    _id: 'merchant-123',
    name: 'ABC Supermarket',
    logo: 'https://example.com/logo.jpg',
  },
  billImage: {
    url: 'https://example.com/bills/bill-123.jpg',
    thumbnailUrl: 'https://example.com/bills/bill-123-thumb.jpg',
    cloudinaryId: 'cloudinary-123',
  },
  extractedData: {
    merchantName: 'ABC Supermarket',
    amount: 1000,
    date: '2024-01-15',
    billNumber: 'INV-2024-001',
    items: [
      { name: 'Item 1', quantity: 2, price: 500 },
      { name: 'Item 2', quantity: 1, price: 500 },
    ],
  },
  amount: 1000,
  billDate: '2024-01-15T00:00:00.000Z',
  billNumber: 'INV-2024-001',
  notes: 'Monthly grocery shopping',
  verificationStatus: 'pending',
  cashbackAmount: 50,
  cashbackStatus: 'pending',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

// =============================================================================
// MOCK OCR DATA
// =============================================================================

export const mockOCRData: OCRExtractedData = {
  merchantName: 'ABC Supermarket',
  merchantAddress: '123 Main St, City, State 12345',
  amount: 1000,
  totalAmount: 1000,
  subtotal: 950,
  tax: 50,
  date: '2024-01-15',
  time: '14:30:00',
  billNumber: 'INV-2024-001',
  invoiceNumber: 'INV-2024-001',
  gstNumber: 'GST123456789',
  phoneNumber: '+1234567890',
  items: [
    { name: 'Rice 5kg', quantity: 2, price: 400, amount: 800, confidence: 95 },
    { name: 'Oil 1L', quantity: 1, price: 150, amount: 150, confidence: 90 },
  ],
  paymentMethod: 'Cash',
  confidence: 92,
  rawText: 'ABC Supermarket\n123 Main St\n...',
  language: 'en',
};

export const mockLowConfidenceOCRData: OCRExtractedData = {
  ...mockOCRData,
  confidence: 45,
  merchantName: undefined,
  amount: undefined,
};

// =============================================================================
// MOCK VERIFICATION DATA
// =============================================================================

export const mockVerificationResult: BillVerificationResult = {
  isValid: true,
  score: 95,
  checks: {
    imageQuality: {
      passed: true,
      score: 98,
      message: 'Image quality is excellent',
    },
    dateValidity: {
      passed: true,
      score: 100,
      message: 'Bill date is valid',
    },
    amountValidity: {
      passed: true,
      score: 100,
      message: 'Amount is within valid range',
    },
    merchantMatch: {
      passed: true,
      score: 95,
      message: 'Merchant matched successfully',
    },
    duplicateCheck: {
      passed: true,
      score: 100,
      message: 'No duplicate found',
    },
    fraudCheck: {
      passed: true,
      score: 90,
      message: 'No fraud indicators detected',
    },
  },
  warnings: [],
  errors: [],
  requiresManualReview: false,
};

export const mockFailedVerificationResult: BillVerificationResult = {
  isValid: false,
  score: 45,
  checks: {
    imageQuality: {
      passed: false,
      score: 40,
      message: 'Image quality is too low',
    },
    dateValidity: {
      passed: false,
      score: 0,
      message: 'Bill date is too old',
    },
    amountValidity: {
      passed: true,
      score: 100,
      message: 'Amount is valid',
    },
    merchantMatch: {
      passed: true,
      score: 80,
      message: 'Merchant matched',
    },
    duplicateCheck: {
      passed: true,
      score: 100,
      message: 'No duplicate',
    },
    fraudCheck: {
      passed: true,
      score: 75,
      message: 'Low fraud risk',
    },
  },
  warnings: ['Bill is older than recommended'],
  errors: ['Image quality too low', 'Bill exceeds age limit'],
  requiresManualReview: true,
  manualReviewReason: 'Multiple validation failures',
};

// =============================================================================
// MOCK FRAUD DETECTION DATA
// =============================================================================

export const mockFraudCheckPassed: FraudDetectionResult = {
  riskLevel: 'low',
  riskScore: 15,
  flags: [],
  allowSubmission: true,
  requiresManualReview: false,
};

export const mockFraudCheckFailed: FraudDetectionResult = {
  riskLevel: 'critical',
  riskScore: 95,
  flags: [
    {
      type: 'duplicate_image',
      severity: 'critical',
      message: 'This image has been uploaded before',
      timestamp: new Date(),
    },
    {
      type: 'suspicious_amount',
      severity: 'high',
      message: 'Amount pattern matches fraudulent behavior',
      timestamp: new Date(),
    },
  ],
  allowSubmission: false,
  requiresManualReview: true,
  reason: 'Multiple critical fraud indicators detected',
};

// =============================================================================
// MOCK CASHBACK DATA
// =============================================================================

export const mockCashbackCalculation: CashbackCalculation = {
  baseAmount: 1000,
  baseCashbackRate: 5,
  baseCashback: 50,
  bonuses: [
    {
      type: 'category',
      label: 'Grocery Bonus',
      rate: 2,
      amount: 20,
      description: 'Extra 2% for grocery category',
    },
  ],
  totalBonus: 20,
  finalCashbackRate: 7,
  finalCashback: 70,
  caps: {
    dailyLimit: 500,
    monthlyLimit: 5000,
  },
  breakdown: [
    { label: 'Bill Amount', amount: 1000 },
    { label: 'Base Cashback', amount: 50, percentage: 5 },
    { label: 'Category Bonus', amount: 20, percentage: 2 },
    { label: 'Total Cashback', amount: 70, percentage: 7 },
  ],
};

// =============================================================================
// MOCK MERCHANT DATA
// =============================================================================

export const mockMerchantMatches: MerchantMatch[] = [
  {
    merchantId: 'merchant-123',
    merchantName: 'ABC Supermarket',
    logo: 'https://example.com/logo1.jpg',
    matchScore: 95,
    matchMethod: 'exact',
    cashbackPercentage: 5,
    category: 'Grocery',
    address: '123 Main St, City',
    verificationRequired: false,
  },
  {
    merchantId: 'merchant-456',
    merchantName: 'ABC Super Mart',
    logo: 'https://example.com/logo2.jpg',
    matchScore: 75,
    matchMethod: 'fuzzy',
    cashbackPercentage: 3,
    category: 'Retail',
    address: '456 Market St, City',
    verificationRequired: true,
  },
];

// =============================================================================
// MOCK IMAGE ANALYSIS DATA
// =============================================================================

export const mockImageAnalysis: BillImageAnalysis = {
  quality: 'excellent',
  qualityScore: 95,
  resolution: {
    width: 1920,
    height: 1080,
  },
  fileSize: 2048576, // 2MB
  format: 'jpeg',
  issues: [],
  suggestions: [],
  isModified: false,
  hash: 'abc123def456',
};

export const mockPoorImageAnalysis: BillImageAnalysis = {
  quality: 'poor',
  qualityScore: 35,
  resolution: {
    width: 640,
    height: 480,
  },
  fileSize: 102400, // 100KB
  format: 'jpeg',
  issues: [
    'Resolution too low',
    'Image appears blurry',
    'Poor lighting detected',
  ],
  suggestions: [
    'Retake photo in better lighting',
    'Hold camera steady',
    'Ensure bill is fully visible',
  ],
  isModified: true,
  hash: 'xyz789uvw012',
};

// =============================================================================
// MOCK STORES/MERCHANTS
// =============================================================================

export const mockStores = [
  {
    id: 'store-1',
    name: 'ABC Supermarket',
    logo: 'https://example.com/stores/abc.jpg',
    cashbackPercentage: 5,
    category: 'Grocery',
  },
  {
    id: 'store-2',
    name: 'XYZ Electronics',
    logo: 'https://example.com/stores/xyz.jpg',
    cashbackPercentage: 10,
    category: 'Electronics',
  },
  {
    id: 'store-3',
    name: 'Fashion Hub',
    logo: 'https://example.com/stores/fashion.jpg',
    cashbackPercentage: 7,
    category: 'Fashion',
  },
];

// =============================================================================
// MOCK BILL HISTORY
// =============================================================================

export const mockBillHistory: Bill[] = [
  {
    ...mockBill,
    _id: 'bill-1',
    amount: 1000,
    verificationStatus: 'approved',
    cashbackStatus: 'credited',
  },
  {
    ...mockBill,
    _id: 'bill-2',
    amount: 500,
    verificationStatus: 'pending',
    cashbackStatus: 'pending',
  },
  {
    ...mockBill,
    _id: 'bill-3',
    amount: 2000,
    verificationStatus: 'rejected',
    rejectionReason: 'Bill image unclear',
  },
];

// =============================================================================
// MOCK FUNCTIONS
// =============================================================================

/**
 * Create a mock XMLHttpRequest
 */
export function createMockXHR() {
  const listeners: { [key: string]: Function[] } = {};
  const uploadListeners: { [key: string]: Function[] } = {};

  return {
    open: jest.fn(),
    send: jest.fn(),
    abort: jest.fn(),
    setRequestHeader: jest.fn(),
    timeout: 0,
    status: 0,
    statusText: '',
    responseText: '',
    upload: {
      addEventListener: jest.fn((event: string, listener: Function) => {
        if (!uploadListeners[event]) uploadListeners[event] = [];
        uploadListeners[event].push(listener);
      }),
    },
    addEventListener: jest.fn((event: string, listener: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
    }),
    triggerLoad: () => {
      listeners.load?.forEach(fn => fn());
    },
    triggerError: () => {
      listeners.error?.forEach(fn => fn());
    },
    triggerTimeout: () => {
      listeners.timeout?.forEach(fn => fn());
    },
    triggerAbort: () => {
      listeners.abort?.forEach(fn => fn());
    },
    triggerProgress: (loaded: number, total: number) => {
      const event = { loaded, total, lengthComputable: true };
      uploadListeners.progress?.forEach(fn => fn(event));
    },
  };
}

/**
 * Create mock upload progress event
 */
export function createMockProgressEvent(loaded: number, total: number) {
  return {
    loaded,
    total,
    lengthComputable: true,
    percentage: Math.round((loaded / total) * 100),
    speed: loaded / 1, // bytes per second (simplified)
    timeRemaining: (total - loaded) / (loaded / 1),
    startTime: Date.now() - 1000,
    currentTime: Date.now(),
  };
}

/**
 * Create mock API response
 */
export function createMockApiResponse<T>(data: T, success: boolean = true) {
  return {
    success,
    data: success ? data : undefined,
    error: success ? undefined : 'Mock error',
    message: success ? 'Success' : 'Error occurred',
  };
}

/**
 * Create mock upload error
 */
export function createMockUploadError(code: string, message: string, retryable: boolean = true) {
  return {
    code,
    message,
    retryable,
    timestamp: Date.now(),
  };
}

/**
 * Simulate async operation with delay
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock FormData
 */
export class MockFormData {
  private data: Map<string, any> = new Map();

  append(key: string, value: any) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key);
  }

  has(key: string) {
    return this.data.has(key);
  }

  delete(key: string) {
    this.data.delete(key);
  }

  entries() {
    return this.data.entries();
  }
}

// =============================================================================
// MOCK VALIDATION RESULTS
// =============================================================================

export const mockValidationResults = {
  validAmount: {
    isValid: true,
    value: 1000,
  },
  invalidAmount: {
    isValid: false,
    error: 'Amount must be at least ₹50',
  },
  validDate: {
    isValid: true,
    value: new Date(),
  },
  invalidDate: {
    isValid: false,
    error: 'Bill date cannot be in the future',
  },
  validBillNumber: {
    isValid: true,
    value: 'INV-001',
  },
  invalidBillNumber: {
    isValid: false,
    error: 'Bill number must be at least 3 characters',
  },
};

// =============================================================================
// EXPORT CONSOLIDATED MOCKS
// =============================================================================

export const billUploadMocks = {
  billUploadData: mockBillUploadData,
  bill: mockBill,
  ocrData: mockOCRData,
  verificationResult: mockVerificationResult,
  fraudCheck: mockFraudCheckPassed,
  cashbackCalculation: mockCashbackCalculation,
  merchantMatches: mockMerchantMatches,
  imageAnalysis: mockImageAnalysis,
  stores: mockStores,
  billHistory: mockBillHistory,
};

export default billUploadMocks;
