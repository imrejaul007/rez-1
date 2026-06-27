import apiClient from '@/services/apiClient';
import { devLog } from '@/utils/devLogger';

// TypeScript Interfaces
interface CreateConsultationRequest {
  storeId: string;
  consultationType: string;
  consultationDate: string; // ISO date
  consultationTime: string; // HH:MM format
  duration?: number; // default 30 minutes
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientEmail?: string;
  reasonForConsultation: string;
  medicalHistory?: string;
}

interface Consultation {
  _id: string;
  consultationNumber: string;
  storeId: string;
  userId: string;
  consultationType: string;
  consultationDate: string;
  consultationTime: string;
  duration: number;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientEmail?: string;
  reasonForConsultation: string;
  medicalHistory?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  doctorName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Consultation API Service
const consultationApi = {
  /**
   * Create a new medical consultation
   * @param data - Consultation details
   * @returns Promise with API response containing consultation data
   */
  createConsultation: async (data: CreateConsultationRequest): Promise<ApiResponse<Consultation>> => {
    try {
      devLog.log('[consultationApi] Creating consultation with data:', data);
      devLog.log('[consultationApi] Store ID:', data.storeId);
      devLog.log('[consultationApi] Consultation Type:', data.consultationType);
      devLog.log('[consultationApi] Date:', data.consultationDate);
      devLog.log('[consultationApi] Time:', data.consultationTime);
      devLog.log('[consultationApi] Patient:', data.patientName);

      const response = await apiClient.post('/consultations', data);

      devLog.log('[consultationApi] Consultation created successfully:', response);
      if (response.success && response.data) {
        devLog.log('[consultationApi] Consultation Number:', response.data.consultationNumber);
        devLog.log('[consultationApi] Status:', response.data.status);
      }

      return response;
    } catch (error) {
      devLog.error('[consultationApi] Error creating consultation:', error);
      throw error;
    }
  },

  /**
   * Get all consultations for the current user
   * @returns Promise with API response containing array of consultations
   */
  getUserConsultations: async (): Promise<ApiResponse<Consultation[]>> => {
    try {
      devLog.log('[consultationApi] Fetching user consultations');

      const response = await apiClient.get('/consultations/user');

      devLog.log('[consultationApi] User consultations fetched successfully');
      if (response.success && response.data) {
        devLog.log('[consultationApi] Total consultations:', response.data.length);
        devLog.log('[consultationApi] Consultations:', response.data);
      }

      return response;
    } catch (error) {
      devLog.error('[consultationApi] Error fetching user consultations:', error);
      throw error;
    }
  },

  /**
   * Get details of a specific consultation
   * @param consultationId - ID of the consultation
   * @returns Promise with API response containing consultation data
   */
  getConsultation: async (consultationId: string): Promise<ApiResponse<Consultation>> => {
    try {
      devLog.log('[consultationApi] Fetching consultation with ID:', consultationId);

      const response = await apiClient.get(`/consultations/${consultationId}`);

      devLog.log('[consultationApi] Consultation fetched successfully');
      if (response.success && response.data) {
        devLog.log('[consultationApi] Consultation Number:', response.data.consultationNumber);
        devLog.log('[consultationApi] Status:', response.data.status);
        devLog.log('[consultationApi] Patient:', response.data.patientName);
        devLog.log('[consultationApi] Doctor:', response.data.doctorName || 'Not assigned');
      }

      return response;
    } catch (error) {
      devLog.error('[consultationApi] Error fetching consultation:', error);
      throw error;
    }
  },

  /**
   * Cancel a consultation
   * @param consultationId - ID of the consultation to cancel
   * @returns Promise with API response containing updated consultation data
   */
  cancelConsultation: async (consultationId: string): Promise<ApiResponse<Consultation>> => {
    try {
      devLog.log('[consultationApi] Cancelling consultation with ID:', consultationId);

      const response = await apiClient.put(`/consultations/${consultationId}/cancel`, {});

      devLog.log('[consultationApi] Consultation cancelled successfully');
      if (response.success && response.data) {
        devLog.log('[consultationApi] Updated Status:', response.data.status);
        devLog.log('[consultationApi] Consultation Number:', response.data.consultationNumber);
      }

      return response;
    } catch (error) {
      devLog.error('[consultationApi] Error cancelling consultation:', error);
      throw error;
    }
  },

  /**
   * Check available time slots for a store on a specific date
   * @param storeId - ID of the store/clinic
   * @param date - Date to check availability (ISO format)
   * @returns Promise with API response containing availability data
   */
  checkAvailability: async (storeId: string, date: string): Promise<ApiResponse<any>> => {
    try {
      devLog.log('[consultationApi] Checking availability');
      devLog.log('[consultationApi] Store ID:', storeId);
      devLog.log('[consultationApi] Date:', date);

      const response = await apiClient.get(`/consultations/availability/${storeId}?date=${date}`);

      devLog.log('[consultationApi] Availability data fetched successfully');
      if (response.success && response.data) {
        devLog.log('[consultationApi] Availability:', response.data);
      }

      return response;
    } catch (error) {
      devLog.error('[consultationApi] Error checking availability:', error);
      throw error;
    }
  },
};

// Export types for use in other files
export type {
  CreateConsultationRequest,
  Consultation,
  ApiResponse,
};

export default consultationApi;
