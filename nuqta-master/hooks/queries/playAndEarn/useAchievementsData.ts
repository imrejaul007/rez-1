import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { achievementApi } from '@/services/achievementApi';
import leaderboardApi from '@/services/leaderboardApi';

export interface DisplayAchievement {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  coins: number;
  progress?: number;
}

function getEmojiForAchievement(type?: string): string {
  if (!type) return '\u{1F3C6}';
  if (type.includes('ORDER') || type.includes('PURCHASE')) return '\u{1F3AF}';
  if (type.includes('STREAK')) return '\u{1F525}';
  if (type.includes('SOCIAL') || type.includes('REFERRAL')) return '\u{1F98B}';
  if (type.includes('REVIEW')) return '\u2B50';
  if (type.includes('SPENT')) return '\u{1F4B0}';
  if (type.includes('BILL')) return '\u{1F4F7}';
  return '\u{1F3AA}';
}

interface AchievementsQueryData {
  achievements: DisplayAchievement[];
  myRank: number | null;
}

export function useAchievementsData() {
  return useQuery<AchievementsQueryData>({
    queryKey: queryKeys.playAndEarn.achievements(),
    queryFn: async () => {
      const [achievementsResponse, leaderboardResponse] = await Promise.all([
        achievementApi.getAchievementProgress(),
        leaderboardApi.getLeaderboard({ type: 'spending', period: 'weekly' }),
      ]);

      let achievements: DisplayAchievement[] = [];
      if (achievementsResponse.success && achievementsResponse.data?.achievements) {
        achievements = achievementsResponse.data.achievements.slice(0, 4).map((a: any) => ({
          id: a.id,
          title: a.title,
          icon: getEmojiForAchievement(a.type),
          unlocked: a.unlocked,
          coins: a.targetValue || 100,
          progress: a.unlocked ? 100 : a.progress,
        }));
      }

      let myRank: number | null = null;
      if (leaderboardResponse.success && leaderboardResponse.data) {
        myRank = leaderboardResponse.data?.myRank?.rank || null;
      }

      return { achievements, myRank };
    },
  });
}
