import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// TYPES
// ============================================================================

export type InsuranceType = 'health' | 'life' | 'vehicle' | 'travel' | 'home' | 'business';

export interface InsuranceTypeInfo {
  type: InsuranceType;
  count: number;
  maxCashback: number;
}

export interface InsurancePlan {
  _id: string;
  name: string;
  provider: string;
  providerLogo: string;
  type: InsuranceType;
  coverage: string;
  premium: {
    monthly: number;
    annual: number;
    currency: string;
  };
  cashbackPercent: number;
  features: string[];
  rating: number;
  claimSettlementRatio: number;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePlansResponse {
  plans: InsurancePlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Get distinct insurance types with plan counts
 */
export const getInsuranceTypes = async (): Promise<InsuranceTypeInfo[]> => {
  const response = await apiClient.get<InsuranceTypeInfo[]>('/insurance/types');
  return response.data || [];
};

/**
 * Get paginated insurance plans, optionally filtered by type
 */
export const getInsurancePlans = async (
  params: { type?: InsuranceType; page?: number; limit?: number } = {}
): Promise<InsurancePlansResponse> => {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  query.set('page', String(params.page || 1));
  query.set('limit', String(params.limit || 10));

  const response = await apiClient.get<InsurancePlan[]>(`/insurance/plans?${query.toString()}`);
  return {
    plans: response.data || [],
    pagination: response.meta?.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
  };
};

/**
 * Get featured insurance plans
 */
export const getFeaturedPlans = async (): Promise<InsurancePlan[]> => {
  const response = await apiClient.get<InsurancePlan[]>('/insurance/featured');
  return response.data || [];
};

/**
 * Get insurance plan detail by ID
 */
export const getInsurancePlanDetail = async (id: string): Promise<InsurancePlan | null> => {
  const response = await apiClient.get<InsurancePlan>(`/insurance/plans/${id}`);
  return response.data || null;
};
