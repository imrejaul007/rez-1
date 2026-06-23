// Service Booking API Service
// Handles service bookings, time slots, and booking management

import apiClient, { ApiResponse } from './apiClient';

// ===== TYPE DEFINITIONS =====

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "10:00"
}

export interface ServiceAddress {
  street: string;
  apartment?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BookingPricing {
  basePrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
  taxes?: number;
  convenienceFee?: number;
  total: number;
  cashbackEarned?: number;
  cashbackPercentage?: number;
  currency: string;
}

export type CashbackStatus = 'pending' | 'held' | 'credited' | 'clawed_back';

export interface TravelDetails {
  route?: {
    from: string;
    to: string;
    fromCode?: string;
    toCode?: string;
  };
  class?: string;
  passengers?: {
    adults: number;
    children: number;
    infants?: number;
  };
  tripType?: 'one-way' | 'round-trip';
  returnDate?: string;
}

export interface RefundTier {
  hoursBeforeDeparture: number;
  refundPercentage: number;
}

export interface ServiceBooking {
  _id: string;
  bookingNumber: string;
  user: string;
  service: {
    _id: string;
    name: string;
    images: string[];
    pricing: {
      original: number;
      selling: number;
    };
    serviceDetails?: {
      duration: number;
      serviceType: 'home' | 'store' | 'online';
    };
  };
  serviceCategory: {
    _id: string;
    name: string;
    slug?: string;
    icon: string;
    cashbackPercentage?: number;
  };
  store: {
    _id: string;
    name: string;
    logo?: string;
    location?: any;
    contact?: any;
    operationalInfo?: any;
  };
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingDate: string;
  timeSlot: TimeSlot;
  duration: number;
  serviceType: 'home' | 'store' | 'online';
  serviceAddress?: ServiceAddress;
  pricing: BookingPricing;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
  paymentMethod?: 'online' | 'cash' | 'wallet';
  requiresPaymentUpfront: boolean;
  status: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  assignedStaff?: string;
  customerNotes?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rating?: {
    score: number;
    review?: string;
    ratedAt: string;
  };
  isRescheduled: boolean;
  rescheduleCount: number;
  maxReschedules: number;
  formattedDateTime?: string;
  isUpcoming?: boolean;
  canBeCancelled?: boolean;
  canBeRescheduled?: boolean;
  // Travel-specific fields
  pnr?: string;
  externalReference?: string;
  eTicketUrl?: string;
  cashbackStatus?: CashbackStatus;
  cashbackCreditedAt?: string;
  cashbackHeldAt?: string;
  verificationDays?: number;
  travelDetails?: TravelDetails;
  refundPolicy?: {
    tiers: RefundTier[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  serviceId: string;
  bookingDate: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  serviceType?: 'home' | 'store' | 'online';
  serviceAddress?: ServiceAddress;
  customerNotes?: string;
  paymentMethod?: 'online' | 'cash' | 'wallet';
}

export interface AvailableSlotsResponse {
  serviceId: string;
  date: string;
  duration: number;
  storeHours: {
    open: string;
    close: string;
  };
  slots: TimeSlot[];
}

export interface BookingsQueryParams {
  status?: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  page?: number;
  limit?: number;
}

// ===== SERVICE CLASS =====

class ServiceBookingService {
  /**
   * Create a new service booking
   */
  async createBooking(data: CreateBookingData): Promise<ApiResponse<ServiceBooking>> {
    try {
      if (!data.serviceId || !data.bookingDate || !data.timeSlot) {
        return {
          success: false,
          error: 'Service ID, booking date, and time slot are required'
        };
      }

      const response = await apiClient.post<ServiceBooking>(
        '/service-bookings',
        data
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create booking'
        };
      }

      return {
        success: true,
        data: response.data,
        message: 'Booking created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking'
      };
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(params?: BookingsQueryParams): Promise<ApiResponse<ServiceBooking[]>> {
    try {
      const queryParams = {
        status: params?.status,
        page: params?.page || 1,
        limit: params?.limit || 20
      };

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined)
      );

      const response = await apiClient.get<ServiceBooking[]>(
        '/service-bookings',
        cleanParams
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch bookings'
        };
      }

      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : [],
        meta: { pagination: response.meta?.pagination }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bookings'
      };
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<ApiResponse<ServiceBooking>> {
    try {
      if (!bookingId) {
        return {
          success: false,
          error: 'Booking ID is required'
        };
      }

      const response = await apiClient.get<ServiceBooking>(
        `/service-bookings/${bookingId}`
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch booking'
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch booking'
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<ApiResponse<ServiceBooking>> {
    try {
      if (!bookingId) {
        return {
          success: false,
          error: 'Booking ID is required'
        };
      }

      const response = await apiClient.put<ServiceBooking>(
        `/service-bookings/${bookingId}/cancel`,
        { reason }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to cancel booking'
        };
      }

      return {
        success: true,
        data: response.data,
        message: 'Booking cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel booking'
      };
    }
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(
    bookingId: string,
    bookingDate: string,
    timeSlot: TimeSlot
  ): Promise<ApiResponse<ServiceBooking>> {
    try {
      if (!bookingId || !bookingDate || !timeSlot) {
        return {
          success: false,
          error: 'Booking ID, new date, and time slot are required'
        };
      }

      const response = await apiClient.put<ServiceBooking>(
        `/service-bookings/${bookingId}/reschedule`,
        { bookingDate, timeSlot }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to reschedule booking'
        };
      }

      return {
        success: true,
        data: response.data,
        message: 'Booking rescheduled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule booking'
      };
    }
  }

  /**
   * Rate a completed booking
   */
  async rateBooking(
    bookingId: string,
    score: number,
    review?: string
  ): Promise<ApiResponse<{ bookingId: string; rating: any }>> {
    try {
      if (!bookingId || !score) {
        return {
          success: false,
          error: 'Booking ID and rating score are required'
        };
      }

      if (score < 1 || score > 5) {
        return {
          success: false,
          error: 'Rating score must be between 1 and 5'
        };
      }

      const response = await apiClient.post<{ bookingId: string; rating: any }>(
        `/service-bookings/${bookingId}/rate`,
        { score, review }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to add rating'
        };
      }

      return {
        success: true,
        data: response.data,
        message: 'Rating added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add rating'
      };
    }
  }

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableSlots(
    serviceId: string,
    date: string
  ): Promise<ApiResponse<AvailableSlotsResponse>> {
    try {
      if (!serviceId || !date) {
        return {
          success: false,
          error: 'Service ID and date are required'
        };
      }

      const response = await apiClient.get<AvailableSlotsResponse>(
        '/service-bookings/available-slots',
        { serviceId, date }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch available slots'
        };
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available slots'
      };
    }
  }

  /**
   * Get upcoming bookings (convenience method)
   */
  async getUpcomingBookings(limit: number = 5): Promise<ApiResponse<ServiceBooking[]>> {
    const response = await this.getUserBookings({ limit });

    if (!response.success) {
      return response;
    }

    // Filter to only upcoming bookings
    const now = new Date();
    const upcomingBookings = (response.data || []).filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      const [hours, minutes] = booking.timeSlot.start.split(':').map(Number);
      bookingDate.setHours(hours, minutes, 0, 0);
      return bookingDate > now && ['pending', 'confirmed', 'assigned'].includes(booking.status);
    });

    return {
      success: true,
      data: upcomingBookings
    };
  }

  /**
   * Get past bookings (convenience method)
   */
  async getPastBookings(params?: { page?: number; limit?: number }): Promise<ApiResponse<ServiceBooking[]>> {
    return this.getUserBookings({
      ...params,
      status: 'completed'
    });
  }
}

// Create singleton instance
const serviceBookingService = new ServiceBookingService();

export default serviceBookingService;
