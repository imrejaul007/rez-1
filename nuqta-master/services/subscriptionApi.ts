// BUG FIX #4: Import types from types file instead of duplicating
import apiClient from './apiClient';
import type {
  TierBenefits,
  SubscriptionUsage,
  SubscriptionTier as TierType,
  SubscriptionStatus,
  BillingCycle as BillingCycleType,
  SubscriptionPlan
} from '@/types/subscription.types';

// BUG FIX #4: Use SubscriptionPlan from types instead of duplicate definition
export interface SubscriptionTier {
  tier: TierType;
  name: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
  };
  benefits: TierBenefits;
  description: string;
  features: string[];
}

export interface CurrentSubscription {
  _id: string;
  user: string;
  tier: TierType;
  status: SubscriptionStatus;
  billingCycle: BillingCycleType;
  price: number;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  benefits: TierBenefits; // BUG FIX #4: Changed from 'any' to 'TierBenefits'
  usage: SubscriptionUsage;
  daysRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValueProposition {
  estimatedMonthlySavings: number;
  estimatedYearlySavings: number;
  paybackPeriod: number;
  benefits: string[];
}

class SubscriptionAPI {
  /**
   * Get all available subscription tiers
   */
  async getAvailableTiers(): Promise<SubscriptionTier[]> {
    try {
      const response = await apiClient.get<SubscriptionTier[]>('/subscriptions/tiers');
      return response.data || [];
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getAvailableTiers failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(): Promise<CurrentSubscription> {
    try {
      const response = await apiClient.get<CurrentSubscription>('/subscriptions/current');

      // apiClient already extracts the data, so response.data IS the subscription
      const subscription = response.data;

      return subscription as CurrentSubscription;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getCurrentSubscription failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Subscribe to a plan
   */
  async subscribeToPlan(
    tier: 'premium' | 'vip',
    billingCycle: 'monthly' | 'yearly',
    paymentMethod?: string,
    promoCode?: string,
    source?: string
  ): Promise<{ subscription: CurrentSubscription; paymentUrl: string }> {
    try {

      const response = await apiClient.post<{ subscription: CurrentSubscription; paymentUrl: string }>('/subscriptions/subscribe', {
        tier,
        billingCycle,
        paymentMethod,
        promoCode,
        source
      });

      return response.data as { subscription: CurrentSubscription; paymentUrl: string };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] subscribeToPlan failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * @deprecated Use initiateUpgrade + confirmUpgrade for proper payment flow
   */
  async upgradeSubscription(newTier: 'premium' | 'vip'): Promise<{
    subscription: CurrentSubscription;
    proratedAmount: number;
  }> {
    try {
      const response = await apiClient.post<{ subscription: CurrentSubscription; proratedAmount: number }>('/subscriptions/upgrade', { newTier });
      return response.data as { subscription: CurrentSubscription; proratedAmount: number };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] upgradeSubscription failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Phase 1: Initiate upgrade - validates eligibility, calculates prorated price
   */
  async initiateUpgrade(newTier: 'premium' | 'vip', billingCycle?: string, paymentGateway?: string): Promise<{
    upgradeId: string;
    fromTier: string;
    toTier: string;
    proratedAmount: number;
    newTierPrice: number;
    creditFromCurrentPlan: number;
    billingCycle: string;
    expiresAt: string;
  }> {
    try {
      const response = await apiClient.post<any>('/subscriptions/upgrade/initiate', {
        newTier,
        billingCycle,
        paymentGateway: paymentGateway || 'stripe',
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] initiateUpgrade failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Phase 2: Confirm upgrade - after payment verified, activates the new tier
   */
  async confirmUpgrade(upgradeId: string, paymentId?: string, paymentIntentId?: string): Promise<{
    subscription: CurrentSubscription;
    upgrade: { fromTier: string; toTier: string; proratedAmount: number };
  }> {
    try {
      const response = await apiClient.post<any>('/subscriptions/upgrade/confirm', {
        upgradeId,
        paymentId,
        paymentIntentId,
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] confirmUpgrade failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Downgrade subscription
   */
  async downgradeSubscription(newTier: 'free' | 'premium'): Promise<{
    subscription: CurrentSubscription;
    effectiveDate: string;
    creditAmount: number;
  }> {
    try {
      const response = await apiClient.post<{ subscription: CurrentSubscription; effectiveDate: string; creditAmount: number }>('/subscriptions/downgrade', { newTier });
      return response.data as { subscription: CurrentSubscription; effectiveDate: string; creditAmount: number };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] downgradeSubscription failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    options: { reason?: string; feedback?: string; cancelImmediately?: boolean }
  ): Promise<{
    subscription: CurrentSubscription;
    accessUntil: string;
    reactivationEligibleUntil: string;
  }> {
    try {
      const { reason, feedback, cancelImmediately } = options;
      const response = await apiClient.post<{ subscription: CurrentSubscription; accessUntil: string; reactivationEligibleUntil: string }>('/subscriptions/cancel', {
        reason,
        feedback,
        cancelImmediately
      });
      return response.data as { subscription: CurrentSubscription; accessUntil: string; reactivationEligibleUntil: string };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] cancelSubscription failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Renew/reactivate subscription
   */
  async renewSubscription(): Promise<CurrentSubscription> {
    try {
      const response = await apiClient.post<CurrentSubscription>('/subscriptions/renew');
      return response.data as CurrentSubscription;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] renewSubscription failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get subscription benefits
   */
  async getSubscriptionBenefits(): Promise<any> {
    try {
      const response = await apiClient.get<any>('/subscriptions/benefits');
      return response.data;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getSubscriptionBenefits failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(): Promise<{
    usage: any;
    roi: {
      subscriptionCost: number;
      totalSavings: number;
      netSavings: number;
      roiPercentage: number;
    };
    daysRemaining: number;
    isActive: boolean;
  }> {
    try {
      const response = await apiClient.get<{
        usage: any;
        roi: {
          subscriptionCost: number;
          totalSavings: number;
          netSavings: number;
          roiPercentage: number;
        };
        daysRemaining: number;
        isActive: boolean;
      }>('/subscriptions/usage');
      return response.data as {
        usage: any;
        roi: {
          subscriptionCost: number;
          totalSavings: number;
          netSavings: number;
          roiPercentage: number;
        };
        daysRemaining: number;
        isActive: boolean;
      };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getSubscriptionUsage failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get value proposition for upgrading
   */
  async getValueProposition(tier: 'premium' | 'vip'): Promise<ValueProposition> {
    try {
      const response = await apiClient.get<ValueProposition>(`/subscriptions/value-proposition/${tier}`);
      return response.data as ValueProposition;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getValueProposition failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Toggle auto-renewal
   */
  async toggleAutoRenew(autoRenew: boolean): Promise<CurrentSubscription> {
    try {
      const response = await apiClient.patch<CurrentSubscription>('/subscriptions/auto-renew', { autoRenew });
      return response.data as CurrentSubscription;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] toggleAutoRenew failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(
    code: string,
    tier: 'premium' | 'vip',
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{
    success: boolean;
    data?: {
      discount: number;
      finalPrice: number;
      originalPrice: number;
      message: string;
    };
    message: string;
  }> {
    try {
      // apiClient strips the outer { success, data } wrapper.
      // Backend sends: { success: true, data: { discount, finalPrice, ... }, message }
      // So response.data = { discount, finalPrice, originalPrice, message }
      // But callers expect { success, data, message } — reconstruct wrapper
      const response = await apiClient.post<{
        discount: number;
        finalPrice: number;
        originalPrice: number;
        message: string;
      }>('/subscriptions/validate-promo', {
        code,
        tier,
        billingCycle
      });
      return {
        success: true,
        data: response.data as { discount: number; finalPrice: number; originalPrice: number; message: string },
        message: response.data?.message || 'Promo code is valid',
      };
    } catch (error: any) {
      // Return error response in expected format
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to validate promo code'
      };
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(params?: {
    startDate?: string;
    endDate?: string;
    skip?: number;
    limit?: number;
  }): Promise<{
    history: BillingTransaction[];
    pagination: {
      total: number;
      skip: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    try {
      const response = await apiClient.get<{
        history: BillingTransaction[];
        pagination: {
          total: number;
          skip: number;
          limit: number;
          hasMore: boolean;
        };
      }>('/billing/history', params);
      return response.data as {
        history: BillingTransaction[];
        pagination: {
          total: number;
          skip: number;
          limit: number;
          hasMore: boolean;
        };
      };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getBillingHistory failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get billing summary/statistics
   */
  async getBillingSummary(): Promise<{
    totalSpent: number;
    totalTransactions: number;
    totalSavings: number;
    netSavings: number;
    currentTier: string;
    memberSince: string | null;
    lastPayment: string | null;
  }> {
    try {
      const response = await apiClient.get<{
        totalSpent: number;
        totalTransactions: number;
        totalSavings: number;
        netSavings: number;
        currentTier: string;
        memberSince: string | null;
        lastPayment: string | null;
      }>('/billing/summary');
      return response.data as {
        totalSpent: number;
        totalTransactions: number;
        totalSavings: number;
        netSavings: number;
        currentTier: string;
        memberSince: string | null;
        lastPayment: string | null;
      };
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getBillingSummary failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Get specific invoice details
   */
  async getInvoice(transactionId: string): Promise<Invoice> {
    try {
      const response = await apiClient.get<Invoice>(`/billing/invoice/${transactionId}`);
      return response.data as Invoice;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] getInvoice failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }

  /**
   * Download invoice
   */
  async downloadInvoice(transactionId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/billing/invoice/${transactionId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) console.warn('[SubscriptionAPI] downloadInvoice failed:', error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Operation failed',
        data: null,
      } as any;
    }
  }
}

// Types for billing history
export interface BillingTransaction {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  billingCycle: 'monthly' | 'yearly';
  tier: string;
  type: 'subscription' | 'payment';
  invoiceUrl?: string;
  paymentMethod?: string;
  transactionId?: string;
  description: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'failed' | 'pending';
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    description: string;
    billingCycle: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentId: string;
  transactionId: string;
  billingPeriod: {
    start: string;
    end: string;
  };
  notes?: string;
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const SUBSCRIPTION_API_KEY = '__rezSubscriptionApi__';

function getSubscriptionApi(): SubscriptionAPI {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[SUBSCRIPTION_API_KEY]) {
      (globalThis as any)[SUBSCRIPTION_API_KEY] = new SubscriptionAPI();
    }
    return (globalThis as any)[SUBSCRIPTION_API_KEY];
  }
  return new SubscriptionAPI();
}

export default getSubscriptionApi();
