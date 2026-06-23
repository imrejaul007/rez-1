// Group Buying Hook
// Manages group buying state and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useIsAuthenticated } from '@/stores/selectors';
import groupBuyingApi from '@/services/groupBuyingApi';
import {
  GroupBuyingState,
  GroupBuyingGroup,
  GroupBuyingProduct,
  GroupUpdatePayload,
  GroupBuyingSocketEvents,
  CreateGroupRequest,
  JoinGroupRequest,
  GroupCheckoutRequest,
  GroupBuyingFilters,
  GroupNotification,
  DiscountTier,
} from '@/types/groupBuying.types';

export function useGroupBuying() {
  const { socket, state: socketState } = useSocket();
  const isAuthenticated = useIsAuthenticated();
  const [state, setState] = useState<GroupBuyingState>({
    myGroups: [],
    availableGroups: [],
    currentGroup: null,
    availableProducts: [],
    stats: null,
    loading: false,
    error: null,
    notifications: [],
  });

  const subscribedGroupIds = useRef<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all groups on unmount
      subscribedGroupIds.current.forEach((groupId) => {
        if (socket) {
          socket.emit(GroupBuyingSocketEvents.LEAVE_GROUP_ROOM, { groupId });
        }
      });
      subscribedGroupIds.current.clear();
    };
  }, [socket]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket || !socketState.connected) return;

    // Listen for group updates
    const handleGroupUpdate = (payload: GroupUpdatePayload) => {

      setState((prev) => {
        const updateGroup = (group: GroupBuyingGroup) => {
          if (group.id !== payload.groupId) return group;

          switch (payload.type) {
            case 'member_joined':
              return {
                ...group,
                members: [...group.members, payload.data.member],
                currentMemberCount: group.currentMemberCount + 1,
                currentTier: calculateCurrentTier(group, group.currentMemberCount + 1),
              };

            case 'member_left':
              return {
                ...group,
                members: group.members.filter((m) => m.userId !== payload.data.userId),
                currentMemberCount: group.currentMemberCount - 1,
                currentTier: calculateCurrentTier(group, group.currentMemberCount - 1),
              };

            case 'tier_changed':
              return {
                ...group,
                currentTier: payload.data.tier,
              };

            case 'status_changed':
              return {
                ...group,
                status: payload.data.status,
              };

            case 'message':
              // Limit messages to last 100 to prevent memory growth
              const updatedMessages = [...group.messages, payload.data.message];
              return {
                ...group,
                messages: updatedMessages.slice(-100),
              };

            case 'expired':
              return {
                ...group,
                status: 'expired',
              };

            default:
              return group;
          }
        };

        return {
          ...prev,
          myGroups: prev.myGroups.map(updateGroup),
          availableGroups: prev.availableGroups.map(updateGroup),
          currentGroup: prev.currentGroup ? updateGroup(prev.currentGroup) : null,
        };
      });

      // Add notification
      addNotification(payload);
    };

    socket.on(GroupBuyingSocketEvents.GROUP_UPDATE, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.MEMBER_JOINED, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.MEMBER_LEFT, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.TIER_CHANGED, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.GROUP_READY, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.GROUP_EXPIRED, handleGroupUpdate);
    socket.on(GroupBuyingSocketEvents.NEW_MESSAGE, handleGroupUpdate);

    return () => {
      socket.off(GroupBuyingSocketEvents.GROUP_UPDATE, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.MEMBER_JOINED, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.MEMBER_LEFT, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.TIER_CHANGED, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.GROUP_READY, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.GROUP_EXPIRED, handleGroupUpdate);
      socket.off(GroupBuyingSocketEvents.NEW_MESSAGE, handleGroupUpdate);
    };
  }, [socket, socketState.connected]);

  // Load initial data
  const loadInitialData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [productsRes, myGroupsRes, availableGroupsRes, statsRes] = await Promise.all([
        groupBuyingApi.getProducts(),
        groupBuyingApi.getMyGroups(),
        groupBuyingApi.getAvailableGroups(),
        groupBuyingApi.getStats(),
      ]);

      setState((prev) => ({
        ...prev,
        availableProducts: productsRes.success ? productsRes.data?.products || [] : [],
        myGroups: myGroupsRes.success ? myGroupsRes.data || [] : [],
        availableGroups: availableGroupsRes.success ? availableGroupsRes.data?.groups || [] : [],
        stats: statsRes.success ? statsRes.data || null : null,
        loading: false,
        error: null,
      }));

      // Subscribe to all user's groups
      if (myGroupsRes.success && myGroupsRes.data) {
        myGroupsRes.data.forEach((group) => subscribeToGroup(group.id));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  };

  // Subscribe to group updates
  const subscribeToGroup = useCallback(
    (groupId: string) => {
      if (!socket || !socketState.connected || subscribedGroupIds.current.has(groupId)) {
        return;
      }

      socket.emit(GroupBuyingSocketEvents.JOIN_GROUP_ROOM, { groupId });
      subscribedGroupIds.current.add(groupId);
    },
    [socket, socketState.connected]
  );

  // Unsubscribe from group updates
  const unsubscribeFromGroup = useCallback(
    (groupId: string) => {
      if (!socket || !subscribedGroupIds.current.has(groupId)) {
        return;
      }

      socket.emit(GroupBuyingSocketEvents.LEAVE_GROUP_ROOM, { groupId });
      subscribedGroupIds.current.delete(groupId);
    },
    [socket]
  );

  // Create new group
  const createGroup = async (data: CreateGroupRequest): Promise<GroupBuyingGroup | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.createGroup(data);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create group');
      }

      setState((prev) => ({
        ...prev,
        myGroups: [response.data!, ...prev.myGroups],
        loading: false,
      }));

      // Subscribe to new group
      subscribeToGroup(response.data.id);

      return response.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create group',
      }));
      return null;
    }
  };

  // Join existing group
  const joinGroup = async (data: JoinGroupRequest): Promise<GroupBuyingGroup | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.joinGroup(data);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to join group');
      }

      setState((prev) => ({
        ...prev,
        myGroups: [response.data!, ...prev.myGroups],
        availableGroups: prev.availableGroups.map((g) =>
          g.id === response.data!.id ? response.data! : g
        ),
        loading: false,
      }));

      // Subscribe to joined group
      subscribeToGroup(response.data.id);

      return response.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to join group',
      }));
      return null;
    }
  };

  // Leave group
  const leaveGroup = async (groupId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.leaveGroup(groupId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to leave group');
      }

      setState((prev) => ({
        ...prev,
        myGroups: prev.myGroups.filter((g) => g.id !== groupId),
        loading: false,
      }));

      // Unsubscribe from group
      unsubscribeFromGroup(groupId);

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to leave group',
      }));
      return false;
    }
  };

  // Send message
  const sendMessage = async (groupId: string, message: string): Promise<boolean> => {
    try {
      if (socket && socketState.connected) {
        socket.emit(GroupBuyingSocketEvents.SEND_MESSAGE, { groupId, message });
        return true;
      }

      // Fallback to API if socket not available
      const response = await groupBuyingApi.sendMessage(groupId, message);
      return response.success;
    } catch (error) {
      return false;
    }
  };

  // Get group details
  const getGroupDetails = async (groupId: string): Promise<GroupBuyingGroup | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.getGroup(groupId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch group details');
      }

      setState((prev) => ({
        ...prev,
        currentGroup: response.data!,
        loading: false,
      }));

      // Subscribe to group
      subscribeToGroup(groupId);

      return response.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch group details',
      }));
      return null;
    }
  };

  // Get group by code
  const getGroupByCode = async (code: string): Promise<GroupBuyingGroup | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.getGroupByCode(code);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Group not found');
      }

      setState((prev) => ({
        ...prev,
        currentGroup: response.data!,
        loading: false,
      }));

      return response.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Group not found',
      }));
      return null;
    }
  };

  // Checkout
  const checkout = async (data: GroupCheckoutRequest): Promise<{ orderId: string; paymentUrl?: string } | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await groupBuyingApi.checkout(data);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Checkout failed');
      }

      setState((prev) => ({ ...prev, loading: false }));

      return response.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      }));
      return null;
    }
  };

  // Refresh available groups
  const refreshAvailableGroups = async (filters?: GroupBuyingFilters) => {
    try {
      const response = await groupBuyingApi.getAvailableGroups(filters);

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          availableGroups: response.data!.groups,
        }));
      }
    } catch (_error) {
      // silently handle
    }
  };

  // Refresh my groups
  const refreshMyGroups = async () => {
    try {
      const response = await groupBuyingApi.getMyGroups();

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          myGroups: response.data!,
        }));
      }
    } catch (_error) {
      // silently handle
    }
  };

  // Calculate current tier
  const calculateCurrentTier = (group: GroupBuyingGroup, memberCount: number): DiscountTier => {
    const tiers = group.product.discountTiers.sort((a, b) => b.minMembers - a.minMembers);

    for (const tier of tiers) {
      if (memberCount >= tier.minMembers) {
        return tier;
      }
    }

    return group.product.discountTiers[0];
  };

  // Add notification
  const addNotification = (payload: GroupUpdatePayload) => {
    let title = '';
    let message = '';
    let type: GroupNotification['type'] = 'member_joined';

    switch (payload.type) {
      case 'member_joined':
        title = 'New Member!';
        message = `${payload.data.member.userName} joined the group`;
        type = 'member_joined';
        break;

      case 'member_left':
        title = 'Member Left';
        message = 'A member left the group';
        type = 'member_left';
        break;

      case 'tier_changed':
        title = 'Discount Unlocked!';
        message = `Congratulations! New discount tier reached: ${payload.data.tier.discountPercentage}% off`;
        type = 'tier_reached';
        break;

      case 'status_changed':
        if (payload.data.status === 'ready') {
          title = 'Group Ready!';
          message = 'Your group is ready for checkout';
          type = 'ready';
        }
        break;

      case 'expired':
        title = 'Group Expired';
        message = 'This group has expired';
        type = 'expired';
        break;
    }

    if (title) {
      const notification: GroupNotification = {
        id: `${Date.now()}-${Math.random()}`,
        groupId: payload.groupId,
        type,
        title,
        message,
        createdAt: new Date(),
        isRead: false,
      };

      setState((prev) => ({
        ...prev,
        notifications: [notification, ...prev.notifications.slice(0, 49)], // Keep last 50
      }));
    }
  };

  // Mark notification as read
  const markNotificationRead = (notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));
  };

  // Clear error
  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return {
    ...state,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage,
    getGroupDetails,
    getGroupByCode,
    checkout,
    refreshAvailableGroups,
    refreshMyGroups,
    markNotificationRead,
    clearError,
    subscribeToGroup,
    unsubscribeFromGroup,
  };
}
