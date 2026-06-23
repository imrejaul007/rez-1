import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import specialProgramApi, { ProgramListItem } from '@/services/specialProgramApi';
import eventsApiService from '@/services/eventsApi';
import apiClient from '@/services/apiClient';

export interface ProgramsQueryData {
  apiSpecialPrograms: ProgramListItem[];
  shoppingMethods: any[] | null;
  eventCategories: any[];
  eventRewardConfig: any;
}

export function useProgramsData() {
  return useQuery<ProgramsQueryData>({
    queryKey: queryKeys.playAndEarn.programs(),
    queryFn: async () => {
      const [specialProgramsResponse, eventCategoriesResponse, eventRewardConfigResponse, shoppingMethodsResponse] = await Promise.all([
        specialProgramApi.listPrograms().catch(() => ({ success: false as const })),
        eventsApiService.getCategories(true).catch(() => [] as any[]),
        eventsApiService.getGlobalRewardConfig().catch(() => null),
        apiClient.get<{ shoppingMethods: any[] }>('/play-earn/shopping-methods').catch(() => null),
      ]);

      let apiSpecialPrograms: ProgramListItem[] = [];
      if (specialProgramsResponse?.success && 'data' in specialProgramsResponse && specialProgramsResponse.data) {
        const programs = Array.isArray(specialProgramsResponse.data)
          ? specialProgramsResponse.data
          : [];
        apiSpecialPrograms = programs;
      }

      const shoppingMethods = shoppingMethodsResponse?.data?.shoppingMethods || null;

      const eventCategories =
        eventCategoriesResponse && eventCategoriesResponse.length > 0
          ? eventCategoriesResponse
          : [];

      const eventRewardConfig = eventRewardConfigResponse || null;

      return { apiSpecialPrograms, shoppingMethods, eventCategories, eventRewardConfig };
    },
  });
}
