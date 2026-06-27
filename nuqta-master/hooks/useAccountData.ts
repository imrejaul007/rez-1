// useAccountData Hook
// Fetches dynamic badge data + user stats and merges with static section definitions

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountTabType,
  AccountSettingsCategory,
  AccountSection,
} from '@/types/account.types';
import { getSectionsForTab } from '@/data/accountData';
import { fetchAccountBadges, AccountBadgeData } from '@/services/accountApi';
import apiClient from '@/services/apiClient';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

export interface UserStats {
  totalOrders?: number;
  totalSaved?: number;
  memberSince?: string;
}

interface UseAccountDataReturn {
  sections: AccountSection[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
  userStats: UserStats | null;
}

/** Merge dynamic badge data into section items */
function mergeBadgesIntoSections(
  sections: AccountSection[],
  badges: AccountBadgeData
): AccountSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((cat) => {
      switch (cat.id) {
        case 'push_notifications':
          return badges.unreadNotifications > 0
            ? { ...cat, badge: String(badges.unreadNotifications) }
            : cat;
        case 'live-chat':
          return badges.openTickets > 0
            ? { ...cat, badge: `${badges.openTickets} open` }
            : { ...cat, badge: 'ONLINE' };
        case 'coupon':
          return badges.activeCoupons > 0
            ? { ...cat, badge: String(badges.activeCoupons) }
            : cat;
        case 'voucher':
          return badges.activeVouchers > 0
            ? { ...cat, badge: String(badges.activeVouchers) }
            : cat;
        default:
          return cat;
      }
    }),
  }));
}

export default function useAccountData(
  activeTab: AccountTabType
): UseAccountDataReturn {
  const [sections, setSections] = useState<AccountSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const fetchingRef = useRef(false);
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const staticSections = getSectionsForTab(activeTab);
        const badges = await fetchAccountBadges();
        const merged = mergeBadgesIntoSections(staticSections, badges);
        setSections(merged);
      } catch (err: any) {
        // Still show static sections even if badge fetch fails
        const staticSections = getSectionsForTab(activeTab);
        setSections(staticSections);
        setError(err?.message || 'Failed to load account data');
      } finally {
        setLoading(false);
        setRefreshing(false);
        fetchingRef.current = false;
      }
    },
    [activeTab]
  );

  // Fetch user stats (orders count, savings, member since) for overview tab
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (activeTab === 'overview') {
      apiClient.get('/user/stats').then((res: any) => {
        if (res.success && res.data) {
          setUserStats(res.data);
        }
      }).catch(() => { /* non-blocking */ });
    }
  }, [activeTab, authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadData(false);
  }, [loadData, authLoading, isAuthenticated]);

  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  return { sections, loading, error, refreshing, refresh, userStats };
}
