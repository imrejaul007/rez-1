// Voucher Redemption Types
// Type definitions for voucher redemption flow

export interface VoucherRedemption {
  id: string;
  userId: string;
  voucherId: string;
  voucher: {
    id: string;
    brand: string;
    brandLogo: string;
    code: string;
    denomination: number;
    cashbackRate: number;
    expiryDate: string;
    termsAndConditions: string[];
  };
  redemptionMethod: 'online' | 'in_store';
  redemptionCode?: string; // Generated code for in-store use
  qrCode?: string; // QR code data URL
  status: 'pending' | 'redeemed' | 'expired' | 'cancelled';
  redeemedAt?: string;
  redeemedLocation?: string;
  amountSaved: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  voucher?: {
    id: string;
    brand: string;
    code: string;
    value: number;
    expiryDate: string;
    isExpired: boolean;
    daysUntilExpiry: number;
  };
}

export interface ValidationError {
  type: 'expired' | 'already_used' | 'min_purchase' | 'category_restriction' | 'usage_limit' | 'invalid_code';
  message: string;
  field?: string;
}

export interface ValidationWarning {
  type: 'expiring_soon' | 'min_purchase_required' | 'limited_categories' | 'single_use_only';
  message: string;
  details?: string;
}

export interface RedemptionRestrictions {
  minPurchaseAmount?: number;
  maxDiscount?: number;
  categories?: string[];
  excludedCategories?: string[];
  usageLimit?: number;
  usesRemaining?: number;
  validDays?: string[]; // ['Monday', 'Tuesday', etc.]
  validHours?: {
    start: string; // '09:00'
    end: string; // '21:00'
  };
  applicableOn?: 'all' | 'sale_items' | 'regular_items';
}

export interface RedemptionStepProps {
  voucher: VoucherRedemption['voucher'];
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export interface SelectVoucherStepProps extends Omit<RedemptionStepProps, 'voucher'> {
  vouchers: VoucherRedemption['voucher'][];
  selectedVoucher?: VoucherRedemption['voucher'];
  onSelect: (voucher: VoucherRedemption['voucher']) => void;
}

export interface MethodSelectionStepProps extends RedemptionStepProps {
  selectedMethod?: 'online' | 'in_store';
  onSelectMethod: (method: 'online' | 'in_store') => void;
}

export interface TermsStepProps extends RedemptionStepProps {
  restrictions: RedemptionRestrictions;
  accepted: boolean;
  onAccept: (accepted: boolean) => void;
}

export interface ConfirmationStepProps extends RedemptionStepProps {
  method: 'online' | 'in_store';
  restrictions: RedemptionRestrictions;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export interface SuccessStepProps {
  redemption: VoucherRedemption;
  onDone: () => void;
  onShareCode: () => void;
  onDownloadQR?: () => void;
}

export interface RedemptionFlowState {
  currentStep: number;
  totalSteps: number;
  selectedVoucher?: VoucherRedemption['voucher'];
  selectedMethod?: 'online' | 'in_store';
  termsAccepted: boolean;
  isProcessing: boolean;
  error?: string;
  redemption?: VoucherRedemption;
}

export interface VoucherHistoryItem {
  id: string;
  voucherId: string;
  brand: string;
  brandLogo: string;
  code: string;
  value: number;
  method: 'online' | 'in_store';
  status: 'redeemed' | 'expired' | 'cancelled';
  redeemedAt: string;
  amountSaved: number;
  location?: string;
}

export interface VoucherSavingsStats {
  totalRedeemed: number;
  totalSavings: number;
  averageSavings: number;
  redemptionsByMethod: {
    online: number;
    in_store: number;
  };
  redemptionsByBrand: Array<{
    brand: string;
    count: number;
    totalSavings: number;
  }>;
  savingsOverTime: Array<{
    month: string;
    savings: number;
    redemptions: number;
  }>;
}

export interface UseRedemptionFlowReturn {
  state: RedemptionFlowState;
  actions: {
    selectVoucher: (voucher: VoucherRedemption['voucher']) => void;
    selectMethod: (method: 'online' | 'in_store') => void;
    acceptTerms: (accepted: boolean) => void;
    nextStep: () => void;
    previousStep: () => void;
    confirmRedemption: () => Promise<void>;
    cancelFlow: () => void;
    reset: () => void;
  };
  validation: {
    validateVoucher: (voucher: VoucherRedemption['voucher']) => Promise<VoucherValidation>;
    canProceed: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}

// API Request/Response types
export interface RedeemVoucherRequest {
  voucherId: string;
  method: 'online' | 'in_store';
  location?: string;
  orderId?: string; // For online redemption
}

export interface RedeemVoucherResponse {
  success: boolean;
  redemption: VoucherRedemption;
  message: string;
}

export interface ValidateVoucherRequest {
  voucherId: string;
  orderAmount?: number;
  orderItems?: Array<{
    productId: string;
    category: string;
    price: number;
  }>;
}

export interface ValidateVoucherResponse {
  valid: boolean;
  validation: VoucherValidation;
  applicableDiscount?: number;
  finalAmount?: number;
}

export interface GetRedemptionHistoryRequest {
  page?: number;
  limit?: number;
  status?: VoucherHistoryItem['status'];
  startDate?: string;
  endDate?: string;
  brand?: string;
}

export interface GetRedemptionHistoryResponse {
  history: VoucherHistoryItem[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  stats: VoucherSavingsStats;
}
