// @ts-nocheck
import apiClient from '@/services/apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// TypeScript Interfaces
interface IssuedBy {
  name: string;
  type: 'doctor' | 'lab' | 'hospital' | 'pharmacy';
  storeId?: string;
}

interface ShareInfo {
  odId: string;
  userId: string;
  sharedAt: string;
  accessLevel: 'view' | 'download';
  expiresAt?: string;
}

interface HealthRecord {
  _id: string;
  recordNumber: string;
  userId: string;
  recordType: 'prescription' | 'lab_report' | 'diagnosis' | 'vaccination' | 'imaging' | 'discharge_summary' | 'other';
  title: string;
  description?: string;
  documentUrl: string;
  documentThumbnail?: string;
  documentType: 'pdf' | 'image' | 'other';
  fileSize: number;
  issuedBy?: IssuedBy;
  issuedDate?: string;
  expiryDate?: string;
  tags: string[];
  sharedWith: ShareInfo[];
  isArchived: boolean;
  metadata: {
    originalFileName: string;
    uploadedAt: string;
    lastAccessedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateHealthRecordRequest {
  recordType: HealthRecord['recordType'];
  title: string;
  description?: string;
  documentUrl: string;
  documentThumbnail?: string;
  documentType: HealthRecord['documentType'];
  fileSize: number;
  issuedBy?: IssuedBy;
  issuedDate?: string;
  expiryDate?: string;
  tags?: string[];
  originalFileName: string;
}

interface UpdateHealthRecordRequest {
  title?: string;
  description?: string;
  recordType?: HealthRecord['recordType'];
  issuedBy?: IssuedBy;
  issuedDate?: string;
  expiryDate?: string;
  tags?: string[];
}

interface ShareRecordRequest {
  shareWithUserId: string;
  accessLevel?: 'view' | 'download';
  expiresInDays?: number;
}

interface HealthRecordsFilters {
  recordType?: HealthRecord['recordType'];
  isArchived?: boolean;
  tags?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface HealthRecordsResponse {
  records: HealthRecord[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  typeCounts: Record<string, number>;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Health Records API Service
const healthRecordsApi = {
  /**
   * Upload a new health record
   * @param data - Health record details
   * @returns Promise with API response containing health record data
   */
  uploadRecord: async (data: CreateHealthRecordRequest): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Uploading health record:', data.title);
      const response = await apiClient.post('/health-records', data);
      devLog.log('[healthRecordsApi] Health record uploaded successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error uploading health record:', error);
      throw error;
    }
  },

  /**
   * Get user's health records with optional filters
   * @param filters - Optional filters for records
   * @returns Promise with API response containing array of health records
   */
  getRecords: async (filters?: HealthRecordsFilters): Promise<ApiResponse<HealthRecordsResponse>> => {
    try {
      devLog.log('[healthRecordsApi] Fetching health records with filters:', filters);

      const params = new URLSearchParams();
      if (filters?.recordType) params.append('recordType', filters.recordType);
      if (typeof filters?.isArchived === 'boolean') params.append('isArchived', String(filters.isArchived));
      if (filters?.tags) params.append('tags', filters.tags);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const url = queryString ? `/health-records?${queryString}` : '/health-records';

      const response = await apiClient.get(url);
      devLog.log('[healthRecordsApi] Health records fetched successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error fetching health records:', error);
      throw error;
    }
  },

  /**
   * Get a specific health record by ID
   * @param id - ID of the health record
   * @returns Promise with API response containing health record data
   */
  getRecord: async (id: string): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Fetching health record:', id);
      const response = await apiClient.get(`/health-records/${id}`);
      devLog.log('[healthRecordsApi] Health record fetched successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error fetching health record:', error);
      throw error;
    }
  },

  /**
   * Update a health record's metadata
   * @param id - ID of the health record
   * @param data - Fields to update
   * @returns Promise with API response containing updated health record
   */
  updateRecord: async (id: string, data: UpdateHealthRecordRequest): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Updating health record:', id);
      const response = await apiClient.put(`/health-records/${id}`, data);
      devLog.log('[healthRecordsApi] Health record updated successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error updating health record:', error);
      throw error;
    }
  },

  /**
   * Delete a health record
   * @param id - ID of the health record
   * @returns Promise with API response
   */
  deleteRecord: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    try {
      devLog.log('[healthRecordsApi] Deleting health record:', id);
      const response = await apiClient.delete(`/health-records/${id}`);
      devLog.log('[healthRecordsApi] Health record deleted successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error deleting health record:', error);
      throw error;
    }
  },

  /**
   * Share a health record with another user
   * @param id - ID of the health record
   * @param data - Share details
   * @returns Promise with API response containing updated health record
   */
  shareRecord: async (id: string, data: ShareRecordRequest): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Sharing health record:', id, 'with user:', data.shareWithUserId);
      const response = await apiClient.post(`/health-records/${id}/share`, data);
      devLog.log('[healthRecordsApi] Health record shared successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error sharing health record:', error);
      throw error;
    }
  },

  /**
   * Revoke share access for a health record
   * @param recordId - ID of the health record
   * @param shareId - ID of the share to revoke
   * @returns Promise with API response containing updated health record
   */
  revokeShare: async (recordId: string, shareId: string): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Revoking share:', shareId, 'for record:', recordId);
      const response = await apiClient.delete(`/health-records/${recordId}/share/${shareId}`);
      devLog.log('[healthRecordsApi] Share access revoked successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error revoking share:', error);
      throw error;
    }
  },

  /**
   * Archive or unarchive a health record
   * @param id - ID of the health record
   * @param archive - true to archive, false to unarchive
   * @returns Promise with API response containing updated health record
   */
  archiveRecord: async (id: string, archive: boolean = true): Promise<ApiResponse<HealthRecord>> => {
    try {
      devLog.log('[healthRecordsApi] Archiving health record:', id, 'archive:', archive);
      const response = await apiClient.post(`/health-records/${id}/archive`, { archive });
      devLog.log('[healthRecordsApi] Health record archive status updated');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error archiving health record:', error);
      throw error;
    }
  },

  /**
   * Get records shared with the current user
   * @param limit - Number of records to fetch
   * @param offset - Offset for pagination
   * @returns Promise with API response containing shared records
   */
  getSharedWithMe: async (limit: number = 20, offset: number = 0): Promise<ApiResponse<HealthRecordsResponse>> => {
    try {
      devLog.log('[healthRecordsApi] Fetching records shared with me');
      const response = await apiClient.get(`/health-records/shared-with-me?limit=${limit}&offset=${offset}`);
      devLog.log('[healthRecordsApi] Shared records fetched successfully');
      return response;
    } catch (error) {
      devLog.error('[healthRecordsApi] Error fetching shared records:', error);
      throw error;
    }
  },
};

// Export types for use in other files
export type {
  HealthRecord,
  CreateHealthRecordRequest,
  UpdateHealthRecordRequest,
  ShareRecordRequest,
  HealthRecordsFilters,
  HealthRecordsResponse,
  IssuedBy,
  ShareInfo,
  ApiResponse,
};

export default healthRecordsApi;
