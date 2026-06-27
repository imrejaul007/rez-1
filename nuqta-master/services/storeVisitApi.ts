// Store Visit API Service
// Handles store visit scheduling and queue management

import apiClient, { ApiResponse } from './apiClient';

export interface ScheduleVisitRequest {
  storeId: string;
  visitDate: string; // ISO string
  visitTime: string; // e.g., "02:00 PM"
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: 'pay_at_store' | 'none';
}

export interface ScheduleVisitResponse {
  visitNumber: string;
  visitDate: string;
  visitTime: string;
  storeName: string;
  message: string;
}

export interface GetQueueNumberRequest {
  storeId: string;
  customerName: string;
  customerPhone: string;
}

export interface GetQueueNumberResponse {
  queueNumber: number;
  estimatedWaitTime: string;
  currentQueueSize: number;
  message: string;
}

class StoreVisitService {
  /**
   * Schedule a store visit
   * POST /store-visits/schedule
   */
  async scheduleStoreVisit(
    request: ScheduleVisitRequest
  ): Promise<ApiResponse<ScheduleVisitResponse>> {
    return apiClient.post('/store-visits/schedule', request);
  }

  /**
   * Get a queue number for immediate visit
   * POST /store-visits/queue
   */
  async getQueueNumber(
    request: GetQueueNumberRequest
  ): Promise<ApiResponse<GetQueueNumberResponse>> {
    return apiClient.post('/store-visits/queue', request);
  }

  /**
   * Get current store queue status
   * GET /store-visits/queue-status/:storeId
   */
  async getQueueStatus(storeId: string): Promise<ApiResponse<{
    currentQueueSize: number;
    averageWaitTime: string;
    crowdLevel: 'Low' | 'Medium' | 'High';
  }>> {
    return apiClient.get(`/store-visits/queue-status/${storeId}`);
  }

  /**
   * Get user's scheduled visits
   * GET /store-visits/user
   */
  async getUserVisits(): Promise<ApiResponse<Array<{
    id: string;
    visitNumber: string;
    visitDate: string;
    visitTime: string;
    store: {
      id: string;
      name: string;
      logo?: string;
    };
    status: 'pending' | 'checked_in' | 'completed' | 'cancelled';
  }>>> {
    return apiClient.get('/store-visits/user');
  }

  /**
   * Cancel a scheduled visit
   * PUT /store-visits/:visitId/cancel
   */
  async cancelVisit(visitId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.put(`/store-visits/${visitId}/cancel`, {});
  }

  /**
   * Check store availability and crowd status
   * GET /store-visits/availability/:storeId
   */
  async checkStoreAvailability(storeId: string): Promise<ApiResponse<{
    storeId: string;
    storeName: string;
    crowdStatus: 'Low' | 'Medium' | 'High';
    currentVisitors: number;
    isOpen: boolean;
    nextAvailableSlot: string;
    recommendedAction: string;
  }>> {
    return apiClient.get(`/store-visits/availability/${storeId}`);
  }

  /**
   * Get current queue status
   * GET /store-visits/queue-status/:storeId
   */
  async getCurrentQueueStatus(storeId: string): Promise<ApiResponse<{
    storeId: string;
    storeName: string;
    totalInQueue: number;
    currentlyServing: number;
    completed: number;
    lastServedNumber: number | undefined;
    estimatedWaitTime: string;
    queueList: Array<{
      queueNumber: number;
      status: string;
      visitNumber: string;
      customerName: string;
    }>;
  }>> {
    return apiClient.get(`/store-visits/queue-status/${storeId}`);
  }
  /**
   * Get available time slots for a date
   * GET /store-visits/available-slots/:storeId
   */
  async getAvailableSlots(storeId: string, date: string, duration?: number): Promise<ApiResponse<{
    availableSlots: string[];
    date: string;
    storeId: string;
  }>> {
    const params = new URLSearchParams({ date });
    if (duration) params.append('duration', duration.toString());
    return apiClient.get(`/store-visits/available-slots/${storeId}?${params}`);
  }

  /**
   * Reschedule a visit
   * PUT /store-visits/:visitId/reschedule
   */
  async rescheduleVisit(visitId: string, visitDate: string, visitTime: string): Promise<ApiResponse<any>> {
    return apiClient.put(`/store-visits/${visitId}/reschedule`, { visitDate, visitTime });
  }

  /**
   * Offline-aware store visit scheduling.
   * Queues the action if offline, sends immediately if online.
   */
  async scheduleStoreVisitOffline(
    request: ScheduleVisitRequest
  ): Promise<ApiResponse<ScheduleVisitResponse> | { queued: true; actionId: string }> {
    const NetInfo = (await import('@react-native-community/netinfo')).default;
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      const offlineSyncService = (await import('./offlineSyncService')).default;
      const actionId = await offlineSyncService.enqueue('visit_submission', request as any);
      return { queued: true, actionId };
    }

    return this.scheduleStoreVisit(request);
  }
}

// Create singleton instance
const storeVisitService = new StoreVisitService();

export default storeVisitService;
