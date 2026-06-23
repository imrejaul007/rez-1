// Service Appointment API Service
// Handles service appointment booking operations (salon, spa, etc.)

import apiClient, { ApiResponse } from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// TypeScript Interfaces
export interface ServiceAppointmentRequest {
  storeId: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  duration?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialInstructions?: string;
  staffMember?: string;
  /** @deprecated Use serviceType instead */
  serviceId?: string;
  /** @deprecated Use appointmentDate instead */
  date?: string;
  /** @deprecated Use appointmentTime instead */
  time?: string;
  /** @deprecated Use specialInstructions instead */
  notes?: string;
}

export interface ServiceAppointment {
  id: string;
  appointmentId: string;
  storeId: string;
  store: {
    id: string;
    name: string;
    logo?: string;
    address: string;
    phone: string;
  };
  serviceId: string;
  service: {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
  };
  userId: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  confirmationCode?: string;
  staffMember?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  staffAvailable?: number;
}

export interface ServiceAvailability {
  date: string;
  slots: TimeSlot[];
  fullyBooked: boolean;
}

export interface ServiceAppointmentsResponse {
  appointments: ServiceAppointment[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

class ServiceAppointmentApi {
  /**
   * Create a new service appointment
   * POST /api/service-appointments
   */
  async createServiceAppointment(data: ServiceAppointmentRequest): Promise<ApiResponse<ServiceAppointment>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - CREATE        │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('📅 Appointment Data:', JSON.stringify(data, null, 2));

    try {
      const response = await apiClient.post<ServiceAppointment>('/service-appointments', data);

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Appointment created successfully');
        devLog.log('📝 Appointment ID:', response.data?.appointmentId);
        devLog.log('🎫 Confirmation Code:', response.data?.confirmationCode);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to create appointment:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Create appointment error:', error);
      throw error;
    }
  }

  /**
   * Get all service appointments for the current user
   * GET /api/service-appointments/user
   */
  async getUserServiceAppointments(
    page: number = 1,
    limit: number = 20,
    status?: ServiceAppointment['status']
  ): Promise<ApiResponse<ServiceAppointmentsResponse>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - GET USER APPTS│');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('📄 Page:', page);
    devLog.log('📊 Limit:', limit);
    devLog.log('📌 Status Filter:', status || 'all');

    try {
      const params: Record<string, any> = { page, limit };
      if (status) {
        params.status = status;
      }

      const response = await apiClient.get<ServiceAppointmentsResponse>('/service-appointments/user', params);

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] User appointments fetched successfully');
        devLog.log('📊 Total appointments:', response.data?.pagination.total);
        devLog.log('📄 Current page:', response.data?.pagination.current);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to fetch user appointments:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Get user appointments error:', error);
      throw error;
    }
  }

  /**
   * Get a specific service appointment by ID
   * GET /api/service-appointments/:appointmentId
   */
  async getServiceAppointment(appointmentId: string): Promise<ApiResponse<ServiceAppointment>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - GET APPT      │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('🎫 Appointment ID:', appointmentId);

    try {
      const response = await apiClient.get<ServiceAppointment>(`/service-appointments/${appointmentId}`);

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Appointment details fetched successfully');
        devLog.log('📝 Status:', response.data?.status);
        devLog.log('🏪 Store:', response.data?.store.name);
        devLog.log('💇 Service:', response.data?.service.name);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to fetch appointment:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Get appointment error:', error);
      throw error;
    }
  }

  /**
   * Cancel a service appointment
   * PUT /api/service-appointments/:appointmentId/cancel
   */
  async cancelServiceAppointment(
    appointmentId: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string; appointment: ServiceAppointment }>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - CANCEL        │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('🎫 Appointment ID:', appointmentId);
    devLog.log('📝 Reason:', reason || 'Not provided');

    try {
      const response = await apiClient.put<{ message: string; appointment: ServiceAppointment }>(
        `/service-appointments/${appointmentId}/cancel`,
        { reason }
      );

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Appointment cancelled successfully');
        devLog.log('📝 New Status:', response.data?.appointment.status);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to cancel appointment:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Cancel appointment error:', error);
      throw error;
    }
  }

  /**
   * Check service availability for a specific store, date, and time
   * GET /api/service-appointments/availability/:storeId
   */
  async checkAvailability(
    storeId: string,
    date: string,
    time?: string,
    serviceId?: string
  ): Promise<ApiResponse<ServiceAvailability>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - CHECK AVAIL   │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('🏪 Store ID:', storeId);
    devLog.log('📅 Date:', date);
    devLog.log('⏰ Time:', time || 'all');
    devLog.log('💇 Service ID:', serviceId || 'any');

    try {
      const params: Record<string, any> = { date };
      if (time) {
        params.time = time;
      }
      if (serviceId) {
        params.serviceId = serviceId;
      }

      const response = await apiClient.get<ServiceAvailability>(
        `/service-appointments/availability/${storeId}`,
        params
      );

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Availability checked successfully');
        devLog.log('📊 Total slots:', response.data?.slots.length);
        devLog.log('🚫 Fully booked:', response.data?.fullyBooked);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to check availability:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Check availability error:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for a specific date
   * GET /api/service-appointments/slots/:storeId
   */
  async getAvailableSlots(
    storeId: string,
    date: string,
    serviceId?: string
  ): Promise<ApiResponse<TimeSlot[]>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - GET SLOTS     │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('🏪 Store ID:', storeId);
    devLog.log('📅 Date:', date);
    devLog.log('💇 Service ID:', serviceId || 'any');

    try {
      const params: Record<string, any> = { date };
      if (serviceId) {
        params.serviceId = serviceId;
      }

      const response = await apiClient.get<TimeSlot[]>(
        `/service-appointments/slots/${storeId}`,
        params
      );

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Available slots fetched successfully');
        devLog.log('📊 Available slots:', response.data?.filter(s => s.available).length);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to fetch slots:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Get slots error:', error);
      throw error;
    }
  }

  /**
   * Get services offered by a store
   * GET /api/service-appointments/services/:storeId
   */
  async getStoreServices(storeId: string): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    duration: number;
    category?: string;
  }>>> {
    devLog.log('\n┌─────────────────────────────────────────┐');
    devLog.log('│ SERVICE APPOINTMENT API - GET SERVICES  │');
    devLog.log('└─────────────────────────────────────────┘');
    devLog.log('🏪 Store ID:', storeId);

    try {
      const response = await apiClient.get<Array<{
        id: string;
        name: string;
        description?: string;
        price: number;
        duration: number;
        category?: string;
      }>>(`/service-appointments/services/${storeId}`);

      if (response.success) {
        devLog.log('✅ [SERVICE APPOINTMENT API] Services fetched successfully');
        devLog.log('📊 Total services:', response.data?.length);
      } else {
        devLog.error('❌ [SERVICE APPOINTMENT API] Failed to fetch services:', response.error);
      }

      return response;
    } catch (error) {
      devLog.error('❌ [SERVICE APPOINTMENT API] Get services error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const serviceAppointmentApi = new ServiceAppointmentApi();

export default serviceAppointmentApi;
