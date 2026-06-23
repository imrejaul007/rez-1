// @ts-nocheck
import { EventItem } from '@/types/homepage.types';
import apiClient from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Region getter - will be set by RegionContext
let getRegionFn: (() => string) | null = null;

export function setEventsApiRegionGetter(fn: (() => string) | null) {
  getRegionFn = fn;
}

// Category mapping: Frontend display categories -> Backend API categories
// Using direct category names as stored in database
const CATEGORY_MAP: Record<string, string> = {
  movies: 'movies',
  concerts: 'concerts',
  parks: 'parks',
  workshops: 'workshops',
  gaming: 'gaming',
  sports: 'sports',
  entertainment: 'entertainment',
};

// Reverse mapping for display purposes: Backend -> Frontend display name
const REVERSE_CATEGORY_MAP: Record<string, string> = {
  movies: 'movies',
  concerts: 'concerts',
  parks: 'parks',
  workshops: 'workshops',
  gaming: 'gaming',
  sports: 'sports',
  entertainment: 'entertainment',
};

// Helper function to map frontend category to backend category
export const mapCategoryToBackend = (frontendCategory: string): string => {
  const normalized = frontendCategory.toLowerCase();
  return CATEGORY_MAP[normalized] || frontendCategory;
};

// Helper function to map backend category to frontend display
export const mapCategoryToFrontend = (backendCategory: string): string => {
  return REVERSE_CATEGORY_MAP[backendCategory] || backendCategory.toLowerCase();
};

export interface EventFilters {
  category?: string;
  location?: string;
  date?: string;
  priceMin?: number;
  priceMax?: number;
  isOnline?: boolean;
  featured?: boolean;
  upcoming?: boolean;
  todayAndFuture?: boolean;
  search?: string;
}

export interface EventSearchResult {
  events: EventItem[];
  total: number;
  hasMore: boolean;
  suggestions?: string[];
}

export interface BookingRequest {
  slotId?: string;
  ticketTypeId?: string;
  idempotencyKey?: string;
  attendeeInfo: {
    name: string;
    email: string;
    phone?: string;
    age?: number;
    specialRequirements?: string;
  };
}

export interface BookingResult {
  success: boolean;
  booking?: any;
  payment?: {
    paymentIntentId?: string;
    clientSecret?: string;
    sessionId?: string;
  } | null;
  message: string;
  error?: string;
}

export interface UserBooking {
  _id: string;
  eventId: any;
  slotId?: string;
  bookingDate: string;
  status: string;
  amount: number;
  currency: string;
  attendeeInfo: any;
  bookingReference: string;
  createdAt: string;
}

class EventsApiService {
  private baseUrl: string;
  private backendAvailable: boolean | null = null;
  private lastBackendCheck: number = 0;
  private BACKEND_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = apiClient.getBaseURL();
  }

  /**
   * Get headers with region included
   */
  private getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    // Add region header if available
    if (getRegionFn) {
      headers['X-Rez-Region'] = getRegionFn();
    }

    return headers;
  }

  /**
   * Check if backend is available
   * Only cache successful checks, not failures
   */
  async isBackendAvailable(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent AND it was successful
    // Don't cache failures - always retry if last check failed
    if (this.backendAvailable === true && 
        (now - this.lastBackendCheck) < this.BACKEND_CHECK_INTERVAL) {
      return true;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    try {
      // Try a simple health check endpoint or the events endpoint
      // Use a timeout to prevent hanging (5 seconds)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/events?limit=1`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const isAvailable = response.ok;
      
      // Only cache successful checks
      if (isAvailable) {
        this.backendAvailable = true;
        this.lastBackendCheck = now;
        devLog.log('✅ Events API is available');
      } else {
        // Don't cache failures - allow retry on next request
        devLog.log('⚠️ Events API returned non-OK status:', response.status);
      }

      return isAvailable;
    } catch (error) {
      // Clear timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Don't cache failures - allow retry on next request
      devLog.warn('❌ Events API availability check failed:', error);
      this.backendAvailable = null; // Reset to null so we retry
      return false;
    }
  }

  /**
   * Get all events with filters
   */
  async getEvents(filters: EventFilters = {}, limit = 20, offset = 0): Promise<EventSearchResult> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`${this.baseUrl}/events?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform backend events to frontend format
        const events = data.data.events.map(this.transformEventToFrontend);
        
        return {
          events,
          total: data.data.total,
          hasMore: data.data.hasMore,
          suggestions: data.data.suggestions
        };
      } else {
        throw new Error(data.message || 'Failed to fetch events');
      }
    } catch (error) {
      devLog.error('❌ Error fetching events:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<EventItem | null> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return this.transformEventToFrontend(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch event');
      }
    } catch (error) {
      devLog.error('❌ Error fetching event:', error);
      throw error;
    }
  }

  /**
   * Get events by category
   * Maps frontend display categories (movies, concerts, etc.) to backend categories (Entertainment, Music, etc.)
   * Also sends the original category as a tag filter for more specific results
   */
  async getEventsByCategory(category: string, limit = 20, offset = 0, dateFilter?: string): Promise<EventSearchResult> {
    try {
      // Map frontend category to backend category
      const backendCategory = mapCategoryToBackend(category);
      const originalCategory = category.toLowerCase();
      devLog.log(`📂 [eventsApi] Mapping category: ${category} -> ${backendCategory}, filtering by tag: ${originalCategory}`);

      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      // Add date filter if specified
      if (dateFilter && dateFilter !== 'all') {
        queryParams.append('dateFilter', dateFilter);
      }

      // Add the original category as a tag filter for more specific results
      // This ensures "movies" shows only movies, not all Entertainment events
      if (backendCategory !== originalCategory && CATEGORY_MAP[originalCategory]) {
        queryParams.append('tags', originalCategory);
      }

      const response = await fetch(`${this.baseUrl}/events/category/${encodeURIComponent(backendCategory)}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const events = data.data.events.map(this.transformEventToFrontend);
        
        return {
          events,
          total: data.data.total,
          hasMore: data.data.hasMore
        };
      } else {
        throw new Error(data.message || 'Failed to fetch events by category');
      }
    } catch (error) {
      devLog.error('❌ Error fetching events by category:', error);
      throw error;
    }
  }

  /**
   * Search events
   */
  async searchEvents(query: string, filters: EventFilters = {}, limit = 20, offset = 0): Promise<EventSearchResult> {
    try {

      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      // Add additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`${this.baseUrl}/events/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const events = data.data.events.map(this.transformEventToFrontend);
        
        return {
          events,
          total: data.data.total,
          hasMore: data.data.hasMore,
          suggestions: data.data.suggestions
        };
      } else {
        throw new Error(data.message || 'Failed to search events');
      }
    } catch (error) {
      devLog.error('❌ Error searching events:', error);
      throw error;
    }
  }

  /**
   * Get featured events for homepage
   */
  async getFeaturedEvents(limit = 10): Promise<EventItem[]> {
    try {

      const response = await fetch(`${this.baseUrl}/events/featured?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data.map(this.transformEventToFrontend);
      } else {
        throw new Error(data.message || 'Failed to fetch featured events');
      }
    } catch (error) {
      devLog.error('❌ Error fetching featured events:', error);
      throw error;
    }
  }

  /**
   * Book event slot
   */
  async bookEventSlot(eventId: string, bookingData: BookingRequest): Promise<BookingResult> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${this.baseUrl}/events/${eventId}/book`;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders({ 'Authorization': `Bearer ${token}` }),
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to book event');
      }

      const data = await response.json();

      return {
        success: data.success,
        booking: data.data?.booking || data.data, // Handle both old and new response format
        payment: data.data?.payment || null, // Payment data from backend
        message: data.message
      };
    } catch (error) {
      devLog.error('❌ [eventsApi] Error booking event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to book event'
      };
    }
  }

  /**
   * Get related events (similar events based on category, location, or date)
   */
  async getRelatedEvents(eventId: string, limit = 6): Promise<EventItem[]> {
    try {

      const response = await fetch(`${this.baseUrl}/events/${eventId}/related?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet, fall back to same category
        if (response.status === 404) {
          devLog.warn('⚠️ [RELATED EVENTS] Related events endpoint not found, using category fallback');
          // Get event first to find category
          const event = await this.getEventById(eventId);
          if (event) {
            return this.getEventsByCategory(event.category, limit, 0).then(result => result.events.filter(e => e.id !== eventId));
          }
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return Array.isArray(data.data) 
          ? data.data.map(this.transformEventToFrontend)
          : (data.data.events || []).map(this.transformEventToFrontend);
      } else {
        // Fallback to category-based events
        const event = await this.getEventById(eventId);
        if (event) {
          return this.getEventsByCategory(event.category, limit, 0).then(result => result.events.filter(e => e.id !== eventId));
        }
        return [];
      }
    } catch (error) {
      devLog.error('❌ Error fetching related events:', error);
      // Fallback to category-based events
      try {
        const event = await this.getEventById(eventId);
        if (event) {
          return this.getEventsByCategory(event.category, limit, 0).then(result => result.events.filter(e => e.id !== eventId));
        }
      } catch (fallbackError) {
        devLog.error('❌ Error in related events fallback:', fallbackError);
      }
      return [];
    }
  }

  /**
   * Get user's event bookings
   */
  async getUserBookings(status?: string, limit = 20, offset = 0): Promise<{ bookings: UserBooking[], total: number, hasMore: boolean }> {
    try {

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`${this.baseUrl}/events/my-bookings?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders({ 'Authorization': `Bearer ${token}` }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          bookings: data.data.bookings,
          total: data.data.total,
          hasMore: data.data.hasMore
        };
      } else {
        throw new Error(data.message || 'Failed to fetch user bookings');
      }
    } catch (error) {
      devLog.error('❌ Error fetching user bookings:', error);
      throw error;
    }
  }

  /**
   * Confirm booking after payment
   */
  async confirmBooking(bookingId: string, paymentIntentId?: string): Promise<{ success: boolean, message: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/events/bookings/${bookingId}/confirm`, {
        method: 'PUT',
        headers: this.getHeaders({ 'Authorization': `Bearer ${token}` }),
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm booking');
      }

      const data = await response.json();
      
      return {
        success: data.success,
        message: data.message || 'Booking confirmed successfully'
      };
    } catch (error) {
      devLog.error('❌ Error confirming booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm booking'
      };
    }
  }

  /**
   * Cancel event booking
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean, message: string }> {
    try {

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/events/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: this.getHeaders({ 'Authorization': `Bearer ${token}` }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      const data = await response.json();
      
      return {
        success: data.success,
        message: data.message
      };
    } catch (error) {
      devLog.error('❌ Error cancelling booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel booking'
      };
    }
  }

  /**
   * Toggle event favorite
   */
  async toggleEventFavorite(eventId: string): Promise<{ success: boolean, message: string, isFavorited?: boolean }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/events/${eventId}/favorite`, {
        method: 'POST',
        headers: this.getHeaders({ 'Authorization': `Bearer ${token}` }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle favorite');
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message,
        isFavorited: data.data?.isFavorited,
      };
    } catch (error) {
      devLog.error('Error toggling favorite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to toggle favorite'
      };
    }
  }

  /**
   * Share event (sends auth token for reward eligibility)
   */
  async shareEvent(eventId: string): Promise<{ success: boolean, message: string, reward?: { coinsAwarded: number } }> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = this.getHeaders();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/events/${eventId}/share`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to share event');
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message,
        reward: data.data?.reward || undefined,
      };
    } catch (error) {
      devLog.error('❌ Error sharing event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to share event'
      };
    }
  }

  /**
   * Transform backend event to frontend format
   */
  private transformEventToFrontend = (backendEvent: any): EventItem => {
    return {
      id: backendEvent._id,
      type: 'event',
      title: backendEvent.title,
      subtitle: backendEvent.subtitle || `${backendEvent.price?.isFree ? 'Free' : `${backendEvent.price?.currency || '₹'}${backendEvent.price?.amount || 0}`} • ${backendEvent.isOnline ? 'Online' : 'Venue'}`,
      description: backendEvent.description,
      image: backendEvent.image,
      price: {
        amount: backendEvent.price?.amount || 0,
        currency: backendEvent.price?.currency || '₹',
        isFree: backendEvent.price?.isFree || false
      },
      location: backendEvent.isOnline ? 'Online' : (backendEvent.location?.name || 'Venue'),
      date: backendEvent.date ? backendEvent.date.split('T')[0] : '', // Convert to YYYY-MM-DD format
      time: backendEvent.time || '',
      category: backendEvent.category,
      organizer: backendEvent.organizer?.name || 'Event Organizer',
      isOnline: backendEvent.isOnline,
      registrationRequired: backendEvent.registrationRequired,
      bookingUrl: backendEvent.bookingUrl,
      availableSlots: backendEvent.availableSlots,
      rating: backendEvent.rating || backendEvent.analytics?.averageRating || 0,
      reviewCount: backendEvent.reviewCount || backendEvent.analytics?.reviews || 0,
      cashback: backendEvent.cashback || 0,
    };
  };

  /**
   * Get authentication token from auth storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Use authStorage utility which handles both web (localStorage) and native (AsyncStorage)
      const { getAuthToken } = await import('@/utils/authStorage');
      const token = await getAuthToken();
      return token;
    } catch (error) {
      devLog.error('❌ [EVENTS API] Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Force refresh backend availability check
   */
  async refreshBackendStatus(): Promise<boolean> {
    // Availability check removed - always return true
    // The actual fetch requests will handle errors
    return true;
  }

  /**
   * Get current backend status
   */
  getBackendStatus(): {
    available: boolean | null;
    lastChecked: Date | null;
    nextCheck: Date | null;
  } {
    return {
      available: this.backendAvailable,
      lastChecked: this.lastBackendCheck > 0 ? new Date(this.lastBackendCheck) : null,
      nextCheck: this.lastBackendCheck > 0
        ? new Date(this.lastBackendCheck + this.BACKEND_CHECK_INTERVAL)
        : null
    };
  }

  /**
   * Helper for authenticated requests
   */
  private async authenticatedFetch(path: string, options: RequestInit = {}): Promise<any> {
    const { getAuthTokens } = await import('@/utils/authStorage');
    const tokens = await getAuthTokens();
    const token = tokens?.accessToken;

    const headers: any = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const region = getRegionFn?.();
    if (region) {
      headers['X-Rez-Region'] = region;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get dynamic event categories from backend
   */
  async getCategories(featured?: boolean): Promise<any[]> {
    try {
      const params = featured ? '?featured=true' : '';
      const response = await fetch(`${this.baseUrl}/events/categories${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data?.categories) {
        return data.data.categories;
      }
      return [];
    } catch (error) {
      devLog.error('[EventsApi] Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get global reward config (for "Ways to earn" display)
   */
  async getGlobalRewardConfig(): Promise<{
    rewards: Array<{ action: string; coins: number; description: string }>;
    totalPotential: number;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/events/reward-config`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      devLog.error('[EventsApi] Error fetching reward config:', error);
      return null;
    }
  }

  /**
   * Get reward info for a specific event
   */
  async getEventRewardInfo(eventId: string): Promise<{
    rewards: Array<{ action: string; coins: number; description: string }>;
    totalPotential: number;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/rewards`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      devLog.error('[EventsApi] Error fetching event reward info:', error);
      return null;
    }
  }

  /**
   * Check in to event
   */
  async checkInToEvent(eventId: string, bookingId: string, method: string, location?: { lat: number; lng: number }): Promise<any> {
    try {
      const response = await this.authenticatedFetch(`/events/${eventId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ bookingId, method, location }),
      });
      return response;
    } catch (error) {
      devLog.error('[EventsApi] Error checking in:', error);
      throw error;
    }
  }

  /**
   * Get user's favorited events
   */
  async getMyFavorites(limit = 20, offset = 0): Promise<{ events: EventItem[]; total: number }> {
    try {
      const response = await this.authenticatedFetch(`/events/my-favorites?limit=${limit}&offset=${offset}`);
      return response?.data || { events: [], total: 0 };
    } catch (error) {
      devLog.error('[EventsApi] Error fetching favorites:', error);
      return { events: [], total: 0 };
    }
  }

  /**
   * Get user's events overview (bookings + favorites + attended)
   */
  async getMyEvents(tab: 'upcoming' | 'past' | 'favorites' = 'upcoming'): Promise<any> {
    try {
      const response = await this.authenticatedFetch(`/events/my-events?tab=${tab}`);
      return response?.data || { bookings: [], tab };
    } catch (error) {
      devLog.error('[EventsApi] Error fetching my events:', error);
      return { bookings: [], tab };
    }
  }

  /**
   * Check if user has favorited an event
   */
  async isFavorited(eventId: string): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      if (!token) return false;

      const response = await this.authenticatedFetch(`/events/${eventId}/favorite-status`);
      return response?.data?.isFavorited === true;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const eventsApiService = new EventsApiService();

export default eventsApiService;
export { EventsApiService };

