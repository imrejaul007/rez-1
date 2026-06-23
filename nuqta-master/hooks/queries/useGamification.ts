// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import gamificationApi from '@/services/gamificationApi';

export function useCheckInRewards() {
  return useQuery({
    queryKey: queryKeys.gamification.checkIn(),
    queryFn: () => gamificationApi.getCheckInRewards(),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.gamification.streak(),
    queryFn: () => gamificationApi.getStreakData(),
  });
}

export function useAchievements(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.gamification.achievements(filters),
    queryFn: () => gamificationApi.getAchievements(filters),
  });
}

export function useSpinWheel() {
  return useQuery({
    queryKey: queryKeys.gamification.spinWheel(),
    queryFn: () => gamificationApi.getSpinWheelData(),
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: queryKeys.gamification.challenges(),
    queryFn: () => gamificationApi.getChallenges(),
  });
}
