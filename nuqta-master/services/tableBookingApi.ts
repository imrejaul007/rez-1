// Table Booking API Service
// Handles restaurant table booking operations

import apiClient from '@/services/apiClient';

/**
 * Create Table Booking Request Interface
 */
interface CreateTableBookingRequest {
  storeId: string;
  bookingDate: string; // ISO date
  bookingTime: string; // HH:MM format
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialRequests?: string;
}

/**
 * Table Booking Interface
 */
interface TableBooking {
  _id: string;
  bookingNumber: string;
  storeId: string;
  userId: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response Interface
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Table Booking API Service
 * Handles all table booking related API calls
 */
const tableBookingApi = {
  /**
   * Create a new table booking
   * @param data - Table booking details
   * @returns Promise with created booking data
   */
  createTableBooking: async (data: CreateTableBookingRequest): Promise<ApiResponse<TableBooking>> => {
    try {
      const response = await apiClient.post('/table-bookings', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get table bookings for the current user
   * @param params - Optional filters: status, page, limit
   * @returns Promise with bookings and pagination info
   */
  getUserTableBookings: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    try {
      const query: Record<string, string> = {};
      if (params?.status) query.status = params.status;
      if (params?.page) query.page = String(params.page);
      if (params?.limit) query.limit = String(params.limit);

      const queryString = Object.keys(query).length
        ? '?' + new URLSearchParams(query).toString()
        : '';

      const response = await apiClient.get(`/table-bookings/user${queryString}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a specific table booking by ID
   * @param bookingId - Booking ID
   * @returns Promise with booking details
   */
  getTableBooking: async (bookingId: string): Promise<ApiResponse<TableBooking>> => {
    try {
      const response = await apiClient.get(`/table-bookings/${bookingId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cancel a table booking
   * @param bookingId - Booking ID to cancel
   * @returns Promise with cancelled booking data
   */
  cancelTableBooking: async (bookingId: string): Promise<ApiResponse<TableBooking>> => {
    try {
      const response = await apiClient.put(`/table-bookings/${bookingId}/cancel`, {});
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check table availability for a store on a specific date
   * @param storeId - Store ID
   * @param date - Date to check availability (ISO format)
   * @returns Promise with availability data
   */
  checkAvailability: async (storeId: string, date: string): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.get(`/table-bookings/availability/${storeId}?date=${date}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default tableBookingApi;
export type { CreateTableBookingRequest, TableBooking, ApiResponse };
