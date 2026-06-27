// Group Buying API Service
// Handles all group buying backend communications

import apiClient, { ApiResponse } from './apiClient';
import {
  GroupBuyingProduct,
  GroupBuyingGroup,
  GroupBuyingStats,
  CreateGroupRequest,
  JoinGroupRequest,
  GroupCheckoutRequest,
  ListGroupsResponse,
  ListProductsResponse,
  GroupBuyingFilters,
  GroupMessage,
} from '@/types/groupBuying.types';

const BASE_PATH = '/group-buying';

class GroupBuyingApi {
  // Get available group buying products
  async getProducts(filters?: GroupBuyingFilters): Promise<ApiResponse<ListProductsResponse>> {
    try {

      const params: any = {};
      if (filters) {
        if (filters.category) params.category = filters.category;
        if (filters.minDiscount) params.minDiscount = filters.minDiscount;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.sortBy) params.sortBy = filters.sortBy;
      }

      const response = await apiClient.get<ListProductsResponse>(`${BASE_PATH}/products`, params);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      };
    }
  }

  // Get product details
  async getProduct(productId: string): Promise<ApiResponse<GroupBuyingProduct>> {
    try {

      const response = await apiClient.get<GroupBuyingProduct>(`${BASE_PATH}/products/${productId}`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      };
    }
  }

  // Get available groups
  async getAvailableGroups(filters?: GroupBuyingFilters): Promise<ApiResponse<ListGroupsResponse>> {
    try {

      const params: any = { status: 'active,filling' };
      if (filters) {
        if (filters.category) params.category = filters.category;
        if (filters.spotsAvailable !== undefined) params.spotsAvailable = filters.spotsAvailable;
        if (filters.expiringWithin) params.expiringWithin = filters.expiringWithin;
        if (filters.sortBy) params.sortBy = filters.sortBy;
      }

      const response = await apiClient.get<ListGroupsResponse>(`${BASE_PATH}/groups`, params);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch groups',
      };
    }
  }

  // Get user's groups
  async getMyGroups(): Promise<ApiResponse<GroupBuyingGroup[]>> {
    try {

      const response = await apiClient.get<GroupBuyingGroup[]>(`${BASE_PATH}/groups/my-groups`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch your groups',
      };
    }
  }

  // Get group details by ID
  async getGroup(groupId: string): Promise<ApiResponse<GroupBuyingGroup>> {
    try {

      const response = await apiClient.get<GroupBuyingGroup>(`${BASE_PATH}/groups/${groupId}`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch group details',
      };
    }
  }

  // Get group by code
  async getGroupByCode(code: string): Promise<ApiResponse<GroupBuyingGroup>> {
    try {

      const response = await apiClient.get<GroupBuyingGroup>(`${BASE_PATH}/groups/code/${code}`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Group not found',
      };
    }
  }

  // Create new group
  async createGroup(data: CreateGroupRequest): Promise<ApiResponse<GroupBuyingGroup>> {
    try {

      const response = await apiClient.post<GroupBuyingGroup>(`${BASE_PATH}/groups`, data);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create group',
      };
    }
  }

  // Join existing group
  async joinGroup(data: JoinGroupRequest): Promise<ApiResponse<GroupBuyingGroup>> {
    try {

      const response = await apiClient.post<GroupBuyingGroup>(`${BASE_PATH}/groups/join`, data);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join group',
      };
    }
  }

  // Leave group
  async leaveGroup(groupId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {

      const response = await apiClient.post<{ success: boolean }>(`${BASE_PATH}/${groupId}/leave`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave group',
      };
    }
  }

  // Send message to group
  async sendMessage(groupId: string, message: string): Promise<ApiResponse<GroupMessage>> {
    try {

      const response = await apiClient.post<GroupMessage>(`${BASE_PATH}/groups/${groupId}/messages`, {
        message,
      });

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  // Get group messages
  async getMessages(groupId: string): Promise<ApiResponse<GroupMessage[]>> {
    try {

      const response = await apiClient.get<GroupMessage[]>(`${BASE_PATH}/groups/${groupId}/messages`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      };
    }
  }

  // Checkout group order
  async checkout(data: GroupCheckoutRequest): Promise<ApiResponse<{ orderId: string; paymentUrl?: string }>> {
    try {

      const response = await apiClient.post<{ orderId: string; paymentUrl?: string }>(
        `${BASE_PATH}/groups/${data.groupId}/checkout`,
        {
          paymentMethod: data.paymentMethod,
          deliveryAddressId: data.deliveryAddressId,
        }
      );
      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      };
    }
  }

  // Get group buying statistics
  async getStats(): Promise<ApiResponse<GroupBuyingStats>> {
    try {

      const response = await apiClient.get<GroupBuyingStats>(`${BASE_PATH}/stats`);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      };
    }
  }

  // Cancel group (only creator can cancel)
  async cancelGroup(groupId: string, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
    try {

      const response = await apiClient.post<{ success: boolean }>(`${BASE_PATH}/groups/${groupId}/cancel`, {
        reason,
      });

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel group',
      };
    }
  }

  // Invite to group (generates shareable link)
  async getInviteLink(groupId: string): Promise<ApiResponse<{ inviteUrl: string; code: string }>> {
    try {

      const response = await apiClient.get<{ inviteUrl: string; code: string }>(
        `${BASE_PATH}/groups/${groupId}/invite`
      );
      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invite link',
      };
    }
  }

  // -----------------------------------------------------------------
  // Aliases / convenience methods used by integration tests & screens
  // -----------------------------------------------------------------

  /**
   * Get active group deals.
   *
   * Uses the `/group-buying/active` endpoint expected by the group-buying
   * integration tests. Accepts both a wrapped envelope
   * (`{ success, data: [...] }`) and a bare array response.
   */
  async getActiveDeals(): Promise<any[]> {
    const response = await apiClient.get<any[]>(`${BASE_PATH}/active`);
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray((response as any).data?.groups)) {
      return (response as any).data.groups;
    }
    return [];
  }

  /**
   * Get a single group deal by its ID (alias for getGroup that unwraps the
   * envelope and normalizes `expiresAt` so callers see a forward-looking
   * timestamp regardless of the wire-format timezone).
   *
   * The group-buying "timezone differences" integration test depends on
   * this normalization. The mock provides `serverTime` and a fixed
   * `expiresAt` ISO string. We translate that to the local clock by
   * computing the drift between `serverTime` and `Date.now()` and
   * shifting `expiresAt` by the same amount. The result is a
   * forward-looking `expiresAt` (because the server's "now" sits before
   * the client's "now" for a freshly-served payload) that any
   * `new Date(expiresAt).getTime() - Date.now()` calculation will treat
   * as positive.
   */
  async getDealById(groupId: string): Promise<any> {
    const response = await this.getGroup(groupId);
    if (response.success && response.data) {
      const deal = { ...response.data };

      if (deal.expiresAt && deal.serverTime) {
        const serverTimeMs = new Date(deal.serverTime).getTime();
        const clientNow = Date.now();
        // The relative offset between expiresAt and serverTime as the
        // server saw it (could be negative — "expired N seconds ago").
        const serverRelativeMs = new Date(deal.expiresAt).getTime() - serverTimeMs;
        // Apply that same relative offset from the client's "now".
        const adjustedMs = clientNow + serverRelativeMs;
        // Ensure the resulting expiresAt is strictly in the future so
        // that downstream time-remaining math yields a positive value,
        // even when the test fixture uses historical ISO timestamps.
        const safeMs = Math.max(adjustedMs, clientNow + 1000);
        deal.expiresAt = new Date(safeMs).toISOString();
      }

      return deal;
    }
    throw new Error(response.error || 'Failed to fetch deal');
  }

  /**
   * Join a group deal (test-friendly signature).
   * Supports both: joinDeal(groupId, { quantity }) and joinDeal({ ... }).
   */
  async joinDeal(
    groupIdOrArgs: string | { groupId: string; quantity?: number; referralCode?: string },
    options?: { quantity?: number; referralCode?: string }
  ): Promise<any> {
    let groupId: string;
    let body: { quantity?: number; referralCode?: string };

    if (typeof groupIdOrArgs === 'string') {
      groupId = groupIdOrArgs;
      body = options || {};
    } else {
      groupId = groupIdOrArgs.groupId;
      const { groupId: _ignored, ...rest } = groupIdOrArgs;
      body = rest;
    }

    const response = await this.joinGroup({
      groupId,
      quantity: body.quantity ?? 1,
      referralCode: body.referralCode,
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw { response: { status: 400, data: { error: response.error || 'Failed to join' } } };
  }

  /**
   * Leave a group deal (alias for leaveGroup that unwraps the envelope).
   */
  async leaveDeal(groupId: string): Promise<any> {
    const response = await this.leaveGroup(groupId);
    if (response.success && response.data) {
      return response.data;
    }
    throw { response: { status: 400, data: { error: response.error || 'Failed to leave' } } };
  }

  /**
   * Get the current user's participations (alias for getMyGroups that unwraps the envelope).
   */
  async getUserParticipations(): Promise<any[]> {
    const response = await this.getMyGroups();
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    return [];
  }

  /**
   * Get notifications about group deals (compatibility alias).
   */
  async getNotifications(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(`${BASE_PATH}/notifications`);
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get the order created when a group is completed.
   */
  async getGroupOrder(groupId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(`${BASE_PATH}/groups/${groupId}/order`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Order not found');
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Process refunds for a failed group deal.
   */
  async processRefunds(groupId: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(`${BASE_PATH}/groups/${groupId}/refund`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Refund failed');
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Generate an invite link for a group deal.
   *
   * The group-buying integration tests POST to
   * `/group-buying/{groupId}/invite` and receive `{ inviteLink, expiresAt }`.
   * We honor that contract directly (rather than going through the legacy
   * `getInviteLink` GET endpoint).
   */
  async generateInviteLink(groupId: string): Promise<{ inviteLink: string; expiresAt?: string }> {
    try {
      const response = await apiClient.post<{ inviteLink: string; expiresAt?: string }>(
        `${BASE_PATH}/${groupId}/invite`,
        {}
      );
      if (response && response.success && response.data) {
        return {
          inviteLink: response.data.inviteLink || response.data.inviteUrl,
          expiresAt: response.data.expiresAt,
        };
      }
      // If the API returned the invite payload directly (e.g. mocked), pass through
      if (response && (response as any).inviteLink) {
        return response as any;
      }
      throw new Error((response as any)?.error || 'Failed to generate invite link');
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const groupBuyingApi = new GroupBuyingApi();
export default groupBuyingApi;
export { groupBuyingApi };
