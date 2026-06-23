import apiClient from './apiClient';

// Types
export interface IdentityState {
  statedIdentity: string | null;
  featureLevel: number;
  segment: string;
  verificationSegment: string;
  instituteStatus: string;
  instituteName?: string;
  companyName?: string;
  activeZones?: string[];
}

export interface VerificationResult {
  autoVerified: boolean;
  provisionalUnlock: boolean;
  institutionName?: string;
  id?: string;
  status?: string;
}

export interface InstitutionSearchResult {
  _id: string;
  name: string;
  type: 'college' | 'company';
  city: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalEarned: number;
}

export interface LeaderboardData {
  institutionName?: string;
  companyName?: string;
  leaderboard: LeaderboardEntry[];
  totalSaved: number;
  studentCount?: number;
  employeeCount?: number;
  currentUserRank: number | null;
}

/** Helper: throw if API response is not successful */
function assertSuccess<T>(response: any, fallbackMsg: string): T {
  if (!response.success) {
    throw new Error(response.message || response.error || fallbackMsg);
  }
  return response.data as T;
}

/**
 * Set the user's stated identity during onboarding
 */
export async function setStatedIdentity(
  statedIdentity: string
): Promise<void> {
  const response = await apiClient.put('/user/auth/profile', { statedIdentity });
  // Non-blocking: don't throw on failure
}

/**
 * Fetch identity state from the user profile response
 * Call this on app startup / login to hydrate the identity store
 */
export async function fetchIdentityFromProfile(): Promise<IdentityState | null> {
  try {
    const response = await apiClient.get<any>('/user/auth/me');
    if (!response.success || !response.data) return null;
    const d = response.data;
    return {
      statedIdentity: d.statedIdentity || null,
      featureLevel: d.featureLevel || 1,
      segment: d.segment || 'normal',
      verificationSegment: d.verificationSegment || 'none',
      instituteStatus: d.instituteStatus || 'not_available',
      instituteName: d.verifications?.student?.instituteName || null,
      companyName: d.verifications?.corporate?.companyName || null,
      activeZones: d.activeZones || [],
    };
  } catch {
    return null;
  }
}

/**
 * Submit student verification
 */
export async function submitStudentVerification(data: {
  instituteName: string;
  email?: string;
  documentType?: string;
  documentUrl?: string;
}): Promise<VerificationResult> {
  const response = await apiClient.post<VerificationResult>(
    '/zones/student/verify',
    data
  );
  return assertSuccess<VerificationResult>(response, 'Student verification failed');
}

/**
 * Submit corporate verification
 */
export async function submitCorporateVerification(data: {
  companyName: string;
  email?: string;
  documentType?: string;
}): Promise<VerificationResult> {
  const response = await apiClient.post<VerificationResult>(
    '/zones/corporate/verify',
    data
  );
  return assertSuccess<VerificationResult>(response, 'Corporate verification failed');
}

/**
 * Submit defence verification
 */
export async function submitDefenceVerification(data: {
  documentType: string;
  serviceType: string;
  serviceNumber?: string;
}): Promise<VerificationResult> {
  const response = await apiClient.post<VerificationResult>(
    '/zones/defence/verify',
    data
  );
  return assertSuccess<VerificationResult>(response, 'Defence verification failed');
}

/**
 * Submit healthcare verification
 */
export async function submitHealthcareVerification(data: {
  documentType: string;
  profession: string;
}): Promise<VerificationResult> {
  const response = await apiClient.post<VerificationResult>(
    '/zones/healthcare/verify',
    data
  );
  return assertSuccess<VerificationResult>(response, 'Healthcare verification failed');
}

/**
 * Submit teacher verification
 */
export async function submitTeacherVerification(data: {
  documentType: string;
  instituteName: string;
}): Promise<VerificationResult> {
  const response = await apiClient.post<VerificationResult>(
    '/zones/teacher/verify',
    data
  );
  return assertSuccess<VerificationResult>(response, 'Teacher verification failed');
}

/**
 * Search institutions for autocomplete (uses public search)
 */
export async function searchInstitutions(
  query: string
): Promise<InstitutionSearchResult[]> {
  try {
    // Try public institution search first
    const response = await apiClient.get<{ institutions: InstitutionSearchResult[] }>(
      `/zones/institutions?search=${encodeURIComponent(query)}&limit=10`
    );
    return response.data?.institutions || [];
  } catch {
    return [];
  }
}

/**
 * Submit institute referral
 */
export async function referInstitute(data: {
  instituteName: string;
  instituteType: 'college' | 'company';
  city: string;
  adminContactEmail?: string;
}): Promise<{ id: string; instituteName: string; status: string }> {
  const response = await apiClient.post<{
    id: string;
    instituteName: string;
    status: string;
  }>('/institute-referrals', data);
  return assertSuccess(response, 'Referral submission failed');
}

/**
 * Get student-exclusive offers
 */
export async function getStudentOffers(
  page = 1,
  limit = 20
): Promise<{ offers: any[]; total: number }> {
  const response = await apiClient.get<{ offers: any[] }>(
    `/offers/exclusive-zones/student/offers?limit=${limit}`
  );
  return {
    offers: response.data?.offers || [],
    total: (response as any).meta?.pagination?.total || 0,
  };
}

/**
 * Get corporate-exclusive offers
 */
export async function getCorporateOffers(
  page = 1,
  limit = 20
): Promise<{ offers: any[]; total: number }> {
  const response = await apiClient.get<{ offers: any[] }>(
    `/offers/exclusive-zones/corporate/offers?limit=${limit}`
  );
  return {
    offers: response.data?.offers || [],
    total: (response as any).meta?.pagination?.total || 0,
  };
}

/**
 * Get campus savings leaderboard
 */
export async function getCampusLeaderboard(
  institutionName: string
): Promise<LeaderboardData> {
  const response = await apiClient.get<LeaderboardData>(
    `/leaderboard/campus?institutionName=${encodeURIComponent(institutionName)}`
  );
  return assertSuccess<LeaderboardData>(response, 'Failed to load campus leaderboard');
}

/**
 * Get company savings leaderboard
 */
export async function getCompanyLeaderboard(
  companyName: string
): Promise<LeaderboardData> {
  const response = await apiClient.get<LeaderboardData>(
    `/leaderboard/company?companyName=${encodeURIComponent(companyName)}`
  );
  return assertSuccess<LeaderboardData>(response, 'Failed to load company leaderboard');
}
