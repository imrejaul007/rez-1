// Shared types for backend
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UUID = string;
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'INR';

// Cashback types
export type CashbackStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'expired'
  | 'cancelled';

export interface CashbackRequest {
  id: string;
  requestNumber: string;
  merchantId: string;
  customerId: string;
  orderId: string;
  customer: CashbackCustomer;
  order: CashbackOrder;
  requestedAmount: number;
  approvedAmount?: number;
  cashbackRate: number;
  calculationBreakdown: CashbackCalculation[];
  status: CashbackStatus;
  priority: 'normal' | 'high' | 'urgent';
  riskScore: number;
  riskFactors: RiskFactor[];
  flaggedForReview: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  paymentMethod?: 'wallet' | 'bank_transfer' | 'check';
  paymentReference?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  timeline: Array<{
    status: CashbackStatus;
    timestamp: Date;
    notes?: string;
    by?: string;
  }>;
  paidAmount?: number;
  // Payment gateway fields for cashback payouts
  payoutId?: string;
  paymentStatus?: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  customerBankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
}

export interface CashbackCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  totalCashbackEarned: number;
  accountAge: number;
  verificationStatus: 'verified' | 'pending' | 'unverified';
}

export interface CashbackOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orderDate: Date;
  items: CashbackOrderItem[];
}

export interface CashbackOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cashbackEligible: boolean;
}

export interface CashbackCalculation {
  productId: string;
  productName: string;
  quantity: number;
  productPrice: number;
  cashbackRate: number;
  cashbackAmount: number;
  categoryId: string;
  categoryName: string;
}

export interface RiskFactor {
  type: 'velocity' | 'amount' | 'pattern' | 'device' | 'location' | 'account';
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: string | number;
}

export interface CashbackSearchRequest {
  merchantId: string;
  status?: CashbackStatus;
  customerId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  flaggedOnly?: boolean;
  sortBy?: 'created' | 'amount' | 'risk_score' | 'expires';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CashbackSearchResponse {
  requests: CashbackRequest[];
  totalCount: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApproveCashbackRequest {
  requestId: string;
  approvedAmount: number;
  notes?: string;
}

export interface RejectCashbackRequest {
  requestId: string;
  reason: string;
}

export interface BulkCashbackAction {
  requestIds: string[];
  action: 'approve' | 'reject';
  notes?: string;
  approvedAmount?: number;
  rejectionReason?: string;
}

export interface CashbackMetrics {
  totalPendingRequests: number;
  totalPendingAmount: number;
  highRiskRequests: number;
  autoApprovedToday: number;
  avgApprovalTime: number;
  cashbackROI: number;
  customerRetentionImpact: number;
}

export interface CashbackRule {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  applicationType: 'global' | 'category' | 'product' | 'customer_segment';
  categoryIds?: string[];
  productIds?: string[];
  customerSegments?: string[];
  cashbackType: 'percentage' | 'fixed_amount' | 'tiered';
  cashbackValue: number;
  maxCashbackAmount?: number;
  minOrderAmount?: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  maxUsagePerCustomer?: number;
  maxTotalUsage?: number;
  currentUsage: number;
  autoApproveThreshold?: number;
  requiresReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashbackAnalytics {
  totalPaid: number;
  totalPending: number;
  averageApprovalTime: number;
  approvalRate: number;
  fraudDetectionRate: number;
  customerRetentionImpact: number;
  revenueImpact: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    cashbackPaid: number;
    orderCount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    cashbackPaid: number;
    ordersWithCashback: number;
    fraudAttempts: number;
  }>;
}

// Order types
// Canonical order status — must match Order model schema enum
export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  _id?: string;
  merchantId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional properties for Order model
  internalNotes?: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  fulfilledAt?: Date;
  fulfillmentStatus?: string;
  cancelledAt?: Date;
  payment?: any;
  pricing?: any;
  priority?: 'normal' | 'high' | 'urgent';
  customer?: any;
  delivery?: any;
  cashback?: any;
  source?: any;
  timeline?: Array<{
    status: OrderStatus;
    timestamp: Date;
    notes?: string;
    by?: string;
  }>;
  deliveryAddress?: Address;
  estimatedDelivery?: Date;
  tracking?: {
    trackingNumber?: string;
    carrier?: string;
    status?: string;
  };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  id?: string;
  totalPrice?: number;
  productImage?: string;
  sku?: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Product types
export interface IProduct {
  _id?: string;
  id?: string;
  merchantId: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  costPrice?: number;
  compareAtPrice?: number;
  currency: Currency;
  inventory: ProductInventory;
  images: ProductImage[];
  weight?: number;
  dimensions?: ProductDimensions;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  searchKeywords: string[];
  status: 'active' | 'inactive' | 'draft' | 'archived';
  visibility: 'public' | 'hidden' | 'featured';
  cashback: ProductCashback;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional properties
  shipping?: any;
  ratings?: ProductRatings;
  variants?: ProductVariant[];
  attributes?: Record<string, any>;
  slug?: string;
  seo?: ProductSEO;
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface ProductInventory {
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorders: boolean;
}

export interface ProductImage {
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
}

export interface ProductCashback {
  percentage: number;
  maxAmount?: number;
  isActive: boolean;
  conditions?: any;
}

// Additional product properties
export interface ProductRatings {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku: string;
  inventory: ProductInventory;
}

export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
}

// Business Metrics types
export interface BusinessMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  profitMargin: number;
  customerSatisfactionScore: number;
  monthlyRevenue: number;
  averageOrderProcessingTime: number;
  inventoryTurnover: number;
  returningCustomers: number;
  totalCustomers: number;
}