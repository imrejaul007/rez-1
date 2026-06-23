import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import streakApi from '@/services/streakApi';

export interface StreakBonusMilestone {
  day: number;
  coins: number;
  completed: boolean;
  special?: boolean;
}

export interface StreakQueryData {
  currentStreak: number;
  hasCheckedInToday: boolean;
  streakBonusMilestones: StreakBonusMilestone[];
}

const DEFAULT_MILESTONES: StreakBonusMilestone[] = [
  { day: 3, coins: 50, completed: false },
  { day: 7, coins: 200, completed: false },
  { day: 14, coins: 500, completed: false },
  { day: 30, coins: 2000, completed: false, special: true },
  { day: 60, coins: 5000, completed: false, special: true },
  { day: 100, coins: 10000, completed: false, special: true },
];

export function useStreakData() {
  return useQuery<StreakQueryData>({
    queryKey: queryKeys.playAndEarn.streak(),
    queryFn: async () => {
      const [streakResponse, streakBonusesResponse] = await Promise.all([
        streakApi.getStreakStatus('login'),
        streakApi.getStreakBonuses(),
      ]);

      let currentStreak = 0;
      let hasCheckedInToday = false;

      if (streakResponse.success && streakResponse.data) {
        currentStreak = streakResponse.data.current || 0;
        hasCheckedInToday = !!streakResponse.data.hasCheckedInToday;
      }

      let streakBonusMilestones = DEFAULT_MILESTONES;
      const bonusesArray = Array.isArray(streakBonusesResponse.data)
        ? streakBonusesResponse.data
        : (streakBonusesResponse.data as any)?.bonuses || [];

      if (streakBonusesResponse.success && bonusesArray.length > 0) {
        const streak = streakResponse?.data?.current || 0;
        streakBonusMilestones = bonusesArray.map((b: any) => ({
          day: b.days || b.day,
          coins: b.reward || b.coins,
          completed: b.achieved || streak >= (b.days || b.day),
          special: (b.days || b.day) >= 30,
        }));
      }

      return { currentStreak, hasCheckedInToday, streakBonusMilestones };
    },
  });
}
