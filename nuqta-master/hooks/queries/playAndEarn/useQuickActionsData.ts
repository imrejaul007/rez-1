import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import apiClient from '@/services/apiClient';
import quickActionsApi, { QuickAction } from '@/services/quickActionsApi';
import valueCardsApi, { ValueCard } from '@/services/valueCardsApi';

export interface QuickActionsQueryData {
  quickActions: QuickAction[];
  valueCards: ValueCard[];
}

export function useQuickActionsData() {
  return useQuery<QuickActionsQueryData>({
    queryKey: queryKeys.playAndEarn.quickActions(),
    queryFn: async () => {
      let quickActions: QuickAction[] = [];
      let valueCards: ValueCard[] = [];

      try {
        // Try batch endpoint first
        const res = await apiClient.get<{ quickActions: any[]; valueCards: any[]; shoppingMethods: any[] }>('/play-earn/batch');
        if (res.success && res.data) {
          if (res.data.quickActions?.length) quickActions = res.data.quickActions;
          if (res.data.valueCards?.length) valueCards = res.data.valueCards;
        }
      } catch {
        // Fallback to individual endpoints
        const [qaRes, vcRes] = await Promise.all([
          quickActionsApi.getPersonalized().catch(() => ({ success: false as const, data: null })),
          valueCardsApi.getAll().catch(() => ({ success: false as const, data: null })),
        ]);

        if (qaRes.success && qaRes.data) quickActions = qaRes.data;
        if (vcRes.success && vcRes.data) valueCards = vcRes.data;
      }

      return { quickActions, valueCards };
    },
  });
}
