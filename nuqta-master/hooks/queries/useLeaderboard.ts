import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import leaderboardApi from '@/services/leaderboardApi';

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

export function useLeaderboard(params: { configId?: string; period?: Period; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(params.configId, params),
    queryFn: () => leaderboardApi.getLeaderboard(params),
  });
}

export function useSpendingLeaderboard(period: Period = 'weekly', limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', 'spending', period, limit] as const,
    queryFn: () => leaderboardApi.getSpendingLeaderboard(period, limit),
  });
}

export function useReviewLeaderboard(period: Period = 'weekly', limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', 'review', period, limit] as const,
    queryFn: () => leaderboardApi.getReviewLeaderboard(period, limit),
  });
}

export function useReferralLeaderboard(period: Period = 'weekly', limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', 'referral', period, limit] as const,
    queryFn: () => leaderboardApi.getReferralLeaderboard(period, limit),
  });
}

export function useAllLeaderboards() {
  return useQuery({
    queryKey: ['leaderboard', 'all'] as const,
    queryFn: () => leaderboardApi.getAllLeaderboards(),
  });
}

export function useMyRank(period: Period = 'weekly') {
  return useQuery({
    queryKey: queryKeys.leaderboard.userRank(period),
    queryFn: () => leaderboardApi.getMyRank(period),
  });
}
