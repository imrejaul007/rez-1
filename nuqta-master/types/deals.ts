export interface Deal {
  id: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumBill: number;
  maxDiscount?: number;
  isOfflineOnly: boolean;
  terms: string[];
  isActive: boolean;
  validUntil: Date;
  category: DealCategory;
  description?: string;
  priority: number; // For sorting deals
  usageLimit?: number; // How many times this deal can be used
  usageCount?: number; // How many times it has been used
  applicableProducts?: string[]; // Product categories this deal applies to
  badge?: DealBadge; // Visual badge information
  // Additional fields from API
  image?: string;
  subtitle?: string;
  originalPrice?: number;
  discountedPrice?: number;
  featured?: boolean;
}

export type DealCategory = 
  | 'instant-discount'
  | 'cashback'
  | 'buy-one-get-one'
  | 'seasonal'
  | 'first-time'
  | 'loyalty'
  | 'clearance';

export interface DealBadge {
  text: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
}

export interface DealModalProps {
  visible: boolean;
  onClose: () => void;
  storeId?: string;
  deals?: Deal[];
}

export interface DealCardProps {
  deal: Deal;
  onAdd: (dealId: string) => void;
  onRemove: (dealId: string) => void;
  isAdded: boolean;
  onMoreDetails: (dealId: string) => void;
}

export interface DealState {
  selectedDeals: string[];
  isLoading: boolean;
  error: string | null;
  appliedDeals: AppliedDeal[];
  totalDiscount: number;
  validationErrors: DealValidationError[];
}

export interface AppliedDeal {
  dealId: string;
  discountAmount: number;
  appliedAt: Date;
  orderId?: string;
}

export interface DealValidationError {
  dealId: string;
  errorType: 'MINIMUM_BILL' | 'EXPIRED' | 'USAGE_LIMIT' | 'PRODUCT_RESTRICTION' | 'STORE_RESTRICTION';
  message: string;
}

export interface DealCalculationResult {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  errors: DealValidationError[];
  warnings: string[];
}

export interface StoreDealConfig {
  storeId: string;
  storeName: string;
  availableDeals: Deal[];
  dealCategories: DealCategory[];
  maxConcurrentDeals: number;
  allowDealStacking: boolean;
}

// Enhanced StoreDeal interface for walk-in deals from API
export interface StoreDeal {
  id: string;
  storeId: string;
  title: string;
  description: string;
  type: 'walk_in' | 'online' | 'combo' | 'cashback' | 'flash_sale';
  discountType: 'percentage' | 'fixed' | 'bogo';
  discountValue: number;
  originalPrice?: number;
  finalPrice?: number;
  validFrom: string;
  validUntil: string;
  terms: string[];
  applicableProducts?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  isActive: boolean;
  isFeatured?: boolean;
  category?: string;
  image?: string;
  priority?: number;
  badge?: DealBadge;
}

// API response type for store deals
export interface StoreDealsResponse {
  deals: StoreDeal[];
  totalCount: number;
  storeInfo?: {
    id: string;
    name: string;
    logo?: string;
  };
}