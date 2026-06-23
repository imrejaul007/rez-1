// Social Impact API Service
// Handles all social impact event-related API calls

import apiClient from './apiClient';
import { colors } from '@/constants/theme';

// ============ TYPES ============

export interface Sponsor {
  _id: string;
  name: string;
  logo: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  description?: string;
  website?: string;
}

export interface SocialImpactEvent {
  _id: string;
  name: string;
  type: 'social_impact';
  description: string;
  status: string;
  eventType: string;
  sponsor?: Sponsor;
  organizer?: {
    name: string;
    logo?: string;
  };
  location?: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventDate?: string;
  eventTime?: {
    start: string;
    end: string;
  };
  rewards?: {
    rezCoins: number;
    brandCoins: number;
  };
  capacity?: {
    goal: number;
    enrolled: number;
  };
  impact?: {
    description: string;
    metric: string;
    targetValue: number;
    currentValue?: number;
  };
  eventRequirements?: Array<{
    text: string;
    isMandatory: boolean;
  }>;
  benefits?: string[];
  schedule?: Array<{
    time: string;
    activity: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
  };
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isCsrActivity?: boolean;
  featured?: boolean;
  image?: string;
  verificationConfig?: {
    methods: Array<'manual' | 'qr' | 'otp' | 'geo'>;
    geoFenceRadiusMeters?: number;
    requireCheckInBeforeComplete?: boolean;
  };
  // Merchant & store info
  merchant?: {
    _id: string;
    businessName: string;
    logo?: string;
    description?: string;
    phone?: string;
    businessAddress?: {
      street?: string;
      city?: string;
      state?: string;
    };
    website?: string;
  };
  merchantStore?: {
    _id: string;
    name: string;
    logo?: string;
    address?: any;
    phone?: string;
    rating?: { average: number; count: number };
  };
  // User enrollment status (populated when user is logged in)
  isEnrolled?: boolean;
  enrollmentStatus?: string;
  enrollmentId?: string;
  enrolledAt?: string;
}

export interface UserImpactStats {
  totalEventsRegistered: number;
  totalEventsCompleted: number;
  totalEventsAttended: number;
  livesImpacted: number;
  treesPlanted: number;
  hoursContributed: number;
  mealsServed: number;
  studentsEducated?: number;
  totalRezCoinsEarned: number;
  totalBrandCoinsEarned: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserEnrollment {
  enrollmentId: string;
  status: 'registered' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  registeredAt: string;
  checkedInAt?: string;
  completedAt?: string;
  coinsAwarded?: {
    rez: number;
    brand: number;
  };
  event: SocialImpactEvent;
}

export interface EventFilters {
  eventStatus?: 'upcoming' | 'ongoing' | 'completed';
  eventType?: string;
  sponsorId?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    _id: string;
    name: string;
    profile?: {
      avatar?: string;
    };
  };
  totalEventsCompleted: number;
  [key: string]: any; // For dynamic metric value
}

// ============ API CLASS ============

class SocialImpactApi {
  // ======== EVENT LISTINGS ========

  /**
   * Get all social impact events with optional filters
   */
  async getEvents(filters: EventFilters = {}) {
    const params = new URLSearchParams();
    if (filters.eventStatus) params.append('eventStatus', filters.eventStatus);
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.sponsorId) params.append('sponsorId', filters.sponsorId);
    if (filters.city) params.append('city', filters.city);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/programs/social-impact${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<SocialImpactEvent[]>(url);
  }

  /**
   * Get a single event by ID
   */
  async getEventById(eventId: string) {
    return apiClient.get<SocialImpactEvent>(`/programs/social-impact/${eventId}`);
  }

  // ======== USER REGISTRATION ========

  /**
   * Register for a social impact event
   */
  async registerForEvent(eventId: string) {
    return apiClient.post<{ enrollmentId: string }>(`/programs/social-impact/${eventId}/register`);
  }

  /**
   * Cancel registration for an event
   */
  async cancelRegistration(eventId: string, reason?: string) {
    return apiClient.delete<void>(`/programs/social-impact/${eventId}/register`, {
      body: reason ? { reason } : undefined
    });
  }

  // ======== USER STATS & HISTORY ========

  /**
   * Get current user's impact statistics
   */
  async getMyStats() {
    return apiClient.get<UserImpactStats>('/programs/social-impact/my-stats');
  }

  /**
   * Get current user's enrolled events
   */
  async getMyEvents(status?: string) {
    const url = status
      ? `/programs/social-impact/my-events?status=${status}`
      : '/programs/social-impact/my-events';
    return apiClient.get<UserEnrollment[]>(url);
  }

  // ======== LEADERBOARD ========

  /**
   * Get impact leaderboard
   */
  async getLeaderboard(
    metric: 'totalEventsCompleted' | 'livesImpacted' | 'treesPlanted' | 'totalRezCoinsEarned' = 'totalEventsCompleted',
    limit: number = 10
  ) {
    return apiClient.get<LeaderboardEntry[]>(
      `/programs/social-impact/leaderboard?metric=${metric}&limit=${limit}`
    );
  }

  // ======== UTILITY METHODS ========

  /**
   * Check if user is enrolled in a specific event
   */
  async checkEnrollmentStatus(eventId: string): Promise<{ isEnrolled: boolean; status?: string }> {
    try {
      const response = await this.getEventById(eventId);
      if (response.success && response.data) {
        return {
          isEnrolled: response.data.isEnrolled || false,
          status: response.data.enrollmentStatus || undefined
        };
      }
      return { isEnrolled: false };
    } catch {
      return { isEnrolled: false };
    }
  }

  // ======== CHECK-IN VERIFICATION ========

  /**
   * Generate QR code for self check-in (user generates their own)
   */
  async generateMyQR(eventId: string) {
    return apiClient.post<{ qrPayload: string; qrToken: string }>(
      `/programs/social-impact/${eventId}/my-qr`
    );
  }

  /**
   * Verify OTP for self check-in
   */
  async verifyOTP(eventId: string, otpCode: string) {
    return apiClient.post<any>(
      `/programs/social-impact/${eventId}/verify-otp`,
      { otpCode }
    );
  }

  /**
   * Verify geo location for self check-in
   */
  async verifyGeoCheckIn(eventId: string, latitude: number, longitude: number) {
    return apiClient.post<any>(
      `/programs/social-impact/${eventId}/verify-geo`,
      { latitude, longitude }
    );
  }

  /**
   * Get events by status (shorthand methods)
   */
  async getUpcomingEvents(limit?: number) {
    return this.getEvents({ eventStatus: 'upcoming', limit });
  }

  async getOngoingEvents(limit?: number) {
    return this.getEvents({ eventStatus: 'ongoing', limit });
  }

  async getCompletedEvents(limit?: number) {
    return this.getEvents({ eventStatus: 'completed', limit });
  }

  /**
   * Get featured events
   */
  async getFeaturedEvents() {
    // Featured events are typically upcoming events marked as featured
    // The backend should handle this filter, but for now we fetch upcoming
    return this.getEvents({ eventStatus: 'upcoming', limit: 5 });
  }

  /**
   * Calculate fill percentage for an event
   */
  static calculateFillPercentage(event: SocialImpactEvent): number {
    if (!event.capacity || !event.capacity.goal || event.capacity.goal === 0) {
      return 0;
    }
    return Math.min(
      Math.round((event.capacity.enrolled / event.capacity.goal) * 100),
      100
    );
  }

  /**
   * Format event date for display
   */
  static formatEventDate(dateString?: string): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get event type emoji
   */
  static getEventTypeEmoji(eventType?: string): string {
    const emojiMap: Record<string, string> = {
      'blood-donation': '🩸',
      'tree-plantation': '🌳',
      'beach-cleanup': '🏖️',
      'digital-literacy': '💻',
      'food-drive': '🍛',
      'health-camp': '🏥',
      'skill-training': '👩‍💼',
      'women-empowerment': '👩‍💼',
      'education': '📚',
      'environment': '🌍',
      'other': '✨'
    };
    return emojiMap[eventType || 'other'] || '✨';
  }

  /**
   * Get status color
   */
  static getStatusColor(status?: string): string {
    const colorMap: Record<string, string> = {
      'upcoming': '#3B82F6', // blue
      'ongoing': '#10B981', // green
      'completed': '#6B7280', // gray
      'cancelled': colors.error, // red
      'registered': '#3B82F6', // blue
      'checked_in': '#F59E0B', // amber
      'no_show': colors.error // red
    };
    return colorMap[status || 'upcoming'] || '#6B7280';
  }
}

export default new SocialImpactApi();
