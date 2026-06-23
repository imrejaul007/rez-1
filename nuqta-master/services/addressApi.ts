// Address Management API Service
// Handles delivery addresses CRUD operations

import apiClient, { ApiResponse } from './apiClient';

export enum AddressType {
  HOME = 'HOME',
  OFFICE = 'OFFICE',
  OTHER = 'OTHER'
}

export interface Address {
  id: string;
  type: AddressType;
  title: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressCreate {
  type: AddressType;
  title: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
  instructions?: string;
}

export interface AddressUpdate {
  type?: AddressType;
  title?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
  instructions?: string;
}

class AddressApiService {
  private baseUrl = '/addresses';

  // Get all user addresses (returns the array directly for ergonomic use by
  // checkout flows and integration tests that expect `address[0]` style access)
  async getUserAddresses(): Promise<ApiResponse<Address[]>> {
    return apiClient.get(this.baseUrl);
  }

  // Alias for getUserAddresses that unwraps the response envelope to return
  // the address array directly. Used by checkout integration tests.
  async getAddresses(): Promise<Address[]> {
    const response = await apiClient.get<Address[]>(this.baseUrl);
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return [];
  }

  // Get single address by ID
  async getAddressById(id: string): Promise<ApiResponse<Address>> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  // Create new address (unwraps the response envelope to return the created
  // address directly so callers (and integration tests) can use
  // `createdAddress.id`, `createdAddress.street`, etc. without going through
  // `.data`).
  // Phase 19 fix: return type was changed by audit agent which broke callers
  // that still expect ApiResponse envelope (response.success/data/message).
  // Restored to match the other methods (getUserAddresses, updateAddress, etc.)
  // which all return Promise<ApiResponse<T>>.
  async createAddress(data: AddressCreate): Promise<ApiResponse<Address>> {
    return apiClient.post<Address>(this.baseUrl, data);
  }

  // Update address
  async updateAddress(id: string, data: AddressUpdate): Promise<ApiResponse<Address>> {
    return apiClient.put(`${this.baseUrl}/${id}`, data);
  }

  // Delete address
  async deleteAddress(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // Set default address
  async setDefaultAddress(id: string): Promise<ApiResponse<Address>> {
    return apiClient.patch(`${this.baseUrl}/${id}/default`, {});
  }
}

export const addressApi = new AddressApiService();
export default addressApi;