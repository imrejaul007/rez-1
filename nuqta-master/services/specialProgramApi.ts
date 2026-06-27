/**
 * Special Program API Service
 *
 * Client for the Special Programs eligibility engine.
 * Used by ProgramDetailModal and Play & Earn page.
 */

import apiClient from './apiClient';

// Types

export type SpecialProgramSlug = 'student_zone' | 'corporate_perks' | 'nuqta_prive';

export type EligibilityState =
  | 'eligible'
  | 'not_eligible'
  | 'pending_verification'
  | 'active_member'
  | 'suspended'
  | 'expired'
  | 'revoked'
  | 'unknown';

export interface ProgramBenefit {
  title: string;
  description: string;
  icon: string;
  type: 'earning_multiplier' | 'exclusive_campaign' | 'task_reward' | 'perk' | 'recognition';
}

export interface RequirementCheck {
  met: boolean;
  label: string;
  type: string;
}

export interface ProgramInfo {
  slug: string;
  name: string;
  description: string;
  badge: string;
  icon: string;
  benefits: ProgramBenefit[];
  earningsDisplayText: string;
  gradientColors: string[];
}

export interface EarningActivity {
  source: string;
  label: string;
  icon: string;
  description: string;
}

export interface MembershipData {
  status: string;
  activatedAt?: string;
  currentMonthEarnings: number;
  monthlyCap: number;
  multiplier: number;
  totalEarnings: number;
  totalMultiplierBonus: number;
  monthsActive: number;
  linkedCampaigns?: Array<{ id: string; title: string; badge: string }>;
  earningActivities?: EarningActivity[];
}

export interface EligibilityResult {
  state: EligibilityState;
  program: ProgramInfo;
  requirements: RequirementCheck[];
  membership?: MembershipData;
  message: string;
  verificationRejected?: boolean;
  rejectionReason?: string;
}

export interface ProgramListItem {
  slug: SpecialProgramSlug;
  name: string;
  description: string;
  badge: string;
  icon: string;
  earningsDisplayText: string;
  benefits: ProgramBenefit[];
  userStatus: EligibilityState;
  gradientColors: string[];
  priority: number;
}

export interface DashboardData {
  monthlyCap: number;
  currentMonthEarnings: number;
  multiplier: number;
  multiplierAppliesTo: string[];
  memberSince: string;
  totalEarnings: number;
  totalMultiplierBonus: number;
  monthsActive: number;
  linkedCampaigns: Array<{ id: string; title: string; badge: string }>;
  benefits: ProgramBenefit[];
  status: string;
}

// API Client

class SpecialProgramApi {
  /**
   * List all programs with user's current status
   */
  async listPrograms(): Promise<{ success: boolean; data?: ProgramListItem[]; message?: string }> {
    try {
      const response = await apiClient.get<ProgramListItem[]>('/special-programs');
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to load programs' };
    }
  }

  /**
   * Check eligibility for a specific program
   */
  async checkEligibility(slug: SpecialProgramSlug): Promise<{ success: boolean; data?: EligibilityResult; message?: string }> {
    try {
      const response = await apiClient.get<EligibilityResult>(`/special-programs/${slug}/check-eligibility`);
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to check eligibility' };
    }
  }

  /**
   * Activate program membership
   */
  async activate(slug: SpecialProgramSlug): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await apiClient.post(`/special-programs/${slug}/activate`);
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to activate program' };
    }
  }

  /**
   * Get dashboard data for active member
   */
  async getDashboard(slug: SpecialProgramSlug): Promise<{ success: boolean; data?: DashboardData; message?: string }> {
    try {
      const response = await apiClient.get<DashboardData>(`/special-programs/${slug}/dashboard`);
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to load dashboard' };
    }
  }

  /**
   * Get user's memberships
   */
  async getMyMemberships(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await apiClient.get('/special-programs/my-memberships');
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to load memberships' };
    }
  }
}

const specialProgramApi = new SpecialProgramApi();
export default specialProgramApi;
