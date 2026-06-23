/**
 * Event Review API Service
 * Handles all review-related API calls for events
 */

import { getAuthToken } from '@/utils/authStorage';
import apiClient from './apiClient';

const API_BASE_URL = apiClient.getBaseURL();

// Region getter - will be set by RegionContext
let getRegionFn: (() => string) | null = null;

export function setEventReviewApiRegionGetter(fn: (() => string) | null) {
  getRegionFn = fn;
}

export interface ReviewUser {
  id?: string;
  name: string;
  profilePicture?: string;
}

export interface EventReviewData {
  id: string;
  rating: number;
  title: string;
  review: string;
  helpfulCount: number;
  isVerifiedBooking: boolean;
  createdAt: string;
  updatedAt?: string;
  user: ReviewUser;
  response?: {
    text: string;
    respondedAt: string;
  };
}

export interface ReviewsResponse {
  success: boolean;
  data: {
    reviews: EventReviewData[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      hasMore: boolean;
    };
    summary: {
      averageRating: number;
      totalReviews: number;
      distribution: Record<number, number>;
    };
  };
}

export interface UserReviewResponse {
  success: boolean;
  data: {
    review: EventReviewData | null;
    canReview: boolean;
    hasBooking: boolean;
  };
}

export interface SubmitReviewData {
  rating: number;
  title: string;
  review: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

class EventReviewApiService {
  private async getHeaders(requireAuth: boolean = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add region header if available
    if (getRegionFn) {
      headers['X-Rez-Region'] = getRegionFn();
    }

    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Get reviews for an event
   */
  async getEventReviews(
    eventId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: SortOption = 'newest'
  ): Promise<ReviewsResponse['data']> {
    try {
      const url = `${API_BASE_URL}/events/${eventId}/reviews?page=${page}&limit=${limit}&sortBy=${sortBy}`;
      const headers = await this.getHeaders(false);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      return data.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get user's own review for an event
   */
  async getUserReview(eventId: string): Promise<UserReviewResponse['data']> {
    try {
      const url = `${API_BASE_URL}/events/${eventId}/my-review`;
      const headers = await this.getHeaders(true);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch your review');
      }

      return data.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Submit a new review for an event
   */
  async submitReview(eventId: string, reviewData: SubmitReviewData): Promise<EventReviewData> {
    try {
      const url = `${API_BASE_URL}/events/${eventId}/reviews`;
      const headers = await this.getHeaders(true);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      return data.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Update an existing review
   */
  async updateReview(reviewId: string, reviewData: Partial<SubmitReviewData>): Promise<EventReviewData> {
    try {
      const url = `${API_BASE_URL}/events/reviews/${reviewId}`;
      const headers = await this.getHeaders(true);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      return data.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/events/reviews/${reviewId}`;
      const headers = await this.getHeaders(true);

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Mark a review as helpful
   */
  async markReviewHelpful(reviewId: string): Promise<{ helpfulCount: number }> {
    try {
      const url = `${API_BASE_URL}/events/reviews/${reviewId}/helpful`;
      const headers = await this.getHeaders(false);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark review as helpful');
      }

      return data.data;
    } catch (error: any) {
      throw error;
    }
  }
}

const eventReviewApi = new EventReviewApiService();
export default eventReviewApi;
