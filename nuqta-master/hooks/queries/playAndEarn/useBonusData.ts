import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import bonusZoneApi, { BonusZoneCampaign } from '@/services/bonusZoneApi';
import gamificationApi, { BonusOpportunity } from '@/services/gamificationApi';

export interface BonusQueryData {
  bonusCampaigns: BonusZoneCampaign[];
  bonusOpportunities: BonusOpportunity[];
}

export function useBonusData(region?: string) {
  return useQuery<BonusQueryData>({
    queryKey: queryKeys.playAndEarn.bonus(),
    queryFn: async () => {
      const [bonusResponse, bonusOpportunitiesResponse] = await Promise.all([
        bonusZoneApi.getBonusCampaigns(region).catch(() => ({ success: false as const, data: null })),
        gamificationApi.getBonusOpportunities().catch(() => ({ success: false as const, data: null })),
      ]);

      const bonusCampaigns: BonusZoneCampaign[] =
        bonusResponse.success && bonusResponse.data?.campaigns
          ? bonusResponse.data.campaigns
          : [];

      const bonusOpportunities: BonusOpportunity[] =
        bonusOpportunitiesResponse.success && bonusOpportunitiesResponse.data?.opportunities
          ? bonusOpportunitiesResponse.data.opportunities
          : [];

      return { bonusCampaigns, bonusOpportunities };
    },
  });
}
