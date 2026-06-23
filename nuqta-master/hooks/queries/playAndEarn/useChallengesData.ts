import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { challengesApi } from '@/services/challengesApi';

export interface DisplayChallenge {
  id: string;
  title: string;
  progress: number;
  reward: number;
  icon: string;
  timeLeft: string;
  isJoined: boolean;
}

function getEmojiForChallenge(action?: string): string {
  switch (action) {
    case 'visit_stores': return '\u{1F3EA}';
    case 'upload_bills': return '\u{1F4C4}';
    case 'refer_friends': return '\u{1F465}';
    case 'spend_amount': return '\u{1F4B3}';
    case 'order_count': return '\u{1F6D2}';
    case 'review_count': return '\u2B50';
    case 'login_streak': return '\u{1F525}';
    case 'share_deals': return '\u{1F4E4}';
    default: return '\u{1F3AF}';
  }
}

export function useChallengesData() {
  return useQuery<DisplayChallenge[]>({
    queryKey: queryKeys.playAndEarn.challenges(),
    queryFn: async () => {
      const response = await challengesApi.getUnifiedChallenges({
        limit: 6,
        visibility: 'play_and_earn',
      });

      if (response.success && response.data?.challenges) {
        return response.data.challenges.map((item: any) => ({
          id: item.challenge._id,
          title: item.challenge.title,
          progress: item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0,
          reward: item.challenge.rewards?.coins || 0,
          icon: getEmojiForChallenge(item.challenge.requirements?.action),
          timeLeft: challengesApi.getTimeRemaining(item.challenge.endDate),
          isJoined: item.userState !== 'available',
        }));
      }

      return [];
    },
  });
}
