// types/validation.types.ts - TypeScript definitions for Cart Validation

export interface ValidationIssue {
  itemId: string;
  productId: string;
  productName: string;
  type: 'out_of_stock' | 'low_stock' | 'price_change' | 'unavailable';
  message: string;
  severity: 'error' | 'warning' | 'info';
  currentPrice?: number;
  previousPrice?: number;
  availableQuantity?: number;
  requestedQuantity?: number;
  image?: string;
}

export interface ValidationResult {
  valid: boolean;
  canCheckout: boolean;
  issues: ValidationIssue[];
  validItems: Array<{
    itemId: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  invalidItems: Array<{
    itemId: string;
    productId: string;
    productName: string;
    reason: string;
  }>;
  warnings: string[];
  timestamp: string;
}

export interface ValidationState {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  error: string | null;
  lastValidated: string | null;
}

export interface CartValidationHookResult {
  // State
  validationState: ValidationState;

  // Computed values
  hasInvalidItems: boolean;
  canCheckout: boolean;
  invalidItemCount: number;
  warningCount: number;
  errorCount: number;

  // Methods
  validateCart: () => Promise<ValidationResult | null>;
  clearValidation: () => void;
  removeInvalidItems: () => Promise<void>;
  isItemValid: (itemId: string) => boolean;
}

export interface CartValidationModalProps {
  visible: boolean;
  validationResult: ValidationResult | null;
  loading: boolean;
  onClose: () => void;
  onContinueToCheckout: () => void;
  onRemoveInvalidItems: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export interface StockWarningBannerProps {
  issues: ValidationIssue[];
  onDismiss?: () => void;
  onViewDetails?: () => void;
  autoHide?: boolean;
  autoHideDuration?: number;
}

export interface ValidationSummary {
  totalIssues: number;
  outOfStockCount: number;
  lowStockCount: number;
  priceChangeCount: number;
  unavailableCount: number;
  totalAffectedItems: number;
}

export interface StockUpdate {
  productId: string;
  previousStock: number;
  currentStock: number;
  timestamp: string;
}

export interface RealTimeValidationConfig {
  enableAutoValidation: boolean;
  validationInterval: number; // milliseconds
  enableSocketUpdates: boolean;
  showToastNotifications: boolean;
  autoRemoveOutOfStock: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: RealTimeValidationConfig = {
  enableAutoValidation: true,
  validationInterval: 30000, // 30 seconds
  enableSocketUpdates: false, // Will be enabled when Socket.IO is integrated
  showToastNotifications: true,
  autoRemoveOutOfStock: false,
};

export const VALIDATION_ISSUE_MESSAGES = {
  out_of_stock: 'This item is currently out of stock',
  low_stock: 'Limited stock available',
  price_change: 'Price has changed since adding to cart',
  unavailable: 'This item is no longer available',
} as const;

export const VALIDATION_ISSUE_ICONS = {
  out_of_stock: 'close-circle',
  low_stock: 'alert-circle',
  price_change: 'pricetag',
  unavailable: 'ban',
} as const;

export const VALIDATION_ISSUE_COLORS = {
  out_of_stock: {
    error: '#DC2626',
    bg: '#FEE2E2',
  },
  low_stock: {
    warning: '#D97706',
    bg: '#FEF3C7',
  },
  price_change: {
    info: '#2563EB',
    bg: '#DBEAFE',
  },
  unavailable: {
    error: '#DC2626',
    bg: '#FEE2E2',
  },
} as const;