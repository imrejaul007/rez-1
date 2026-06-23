// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import notificationsApi from '@/services/notificationsApi';

export function useNotifications(query?: { page?: number; limit?: number; type?: string; isRead?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.list(query),
    queryFn: () => notificationsApi.getNotifications(query),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'] as const,
    queryFn: () => notificationsApi.getNotificationPreferences(),
  });
}

export function usePinnedNotifications() {
  return useQuery({
    queryKey: ['notifications', 'pinned'] as const,
    queryFn: () => notificationsApi.getPinnedNotifications(),
  });
}
