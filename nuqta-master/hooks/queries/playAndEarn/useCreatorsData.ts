import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import creatorsApi, { Creator, CreatorPick } from '@/services/creatorsApi';
import socialImpactApi from '@/services/socialImpactApi';

export interface CreatorsQueryData {
  featuredCreators: Creator[];
  trendingPicks: CreatorPick[];
  creatorStatus: 'none' | 'pending' | 'approved' | 'rejected';
  socialImpactPreview: Array<{ icon: string; label: string; coins: number }>;
}

export function useCreatorsData() {
  return useQuery<CreatorsQueryData>({
    queryKey: queryKeys.playAndEarn.creators(),
    queryFn: async () => {
      const [creatorsResponse, trendingPicksResponse] = await Promise.all([
        creatorsApi.getFeaturedCreators(4),
        creatorsApi.getTrendingPicks(6),
      ]);

      const featuredCreators: Creator[] =
        creatorsResponse.success && creatorsResponse.data?.creators
          ? creatorsResponse.data.creators
          : [];

      const trendingPicks: CreatorPick[] =
        trendingPicksResponse.success && trendingPicksResponse.data?.picks
          ? trendingPicksResponse.data.picks
          : [];

      // Creator status (non-blocking)
      let creatorStatus: CreatorsQueryData['creatorStatus'] = 'none';
      try {
        const profileRes = await creatorsApi.getMyCreatorProfile();
        if (profileRes.success && profileRes.data) {
          creatorStatus = profileRes.data?.status || 'approved';
        }
      } catch {
        // Not a creator
      }

      // Social Impact preview (non-blocking)
      let socialImpactPreview: CreatorsQueryData['socialImpactPreview'] = [];
      try {
        const siResponse = await socialImpactApi.getEvents({ eventStatus: 'upcoming', limit: 4 });
        if (siResponse.success && siResponse.data) {
          const events = Array.isArray(siResponse.data) ? siResponse.data : (siResponse.data as any)?.events || [];
          if (events.length > 0) {
            const emojiMap: Record<string, string> = {
              'blood-donation': '\u{1FA78}', 'tree-plantation': '\u{1F333}', 'beach-cleanup': '\u{1F3D6}\uFE0F',
              'digital-literacy': '\u{1F4BB}', 'food-drive': '\u{1F372}', 'health-camp': '\u{1F3E5}',
              'skill-training': '\u{1F393}', 'women-empowerment': '\u{1F469}', 'education': '\u{1F4DA}',
              'environment': '\u{1F30D}',
            };
            socialImpactPreview = events.slice(0, 4).map((e: any) => ({
              icon: emojiMap[e.eventType || ''] || '\u2728',
              label: e.name?.length > 18 ? e.name.slice(0, 16) + '...' : e.name || 'Event',
              coins: e.rewards?.rezCoins || 0,
            }));
          }
        }
      } catch {
        // Keep empty fallback
      }

      return { featuredCreators, trendingPicks, creatorStatus, socialImpactPreview };
    },
  });
}
