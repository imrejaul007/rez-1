// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import subscriptionApi from '@/services/subscriptionApi';

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscription.plans(),
    queryFn: () => subscriptionApi.getPlans(),
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription.current(),
    queryFn: () => subscriptionApi.getCurrentSubscription(),
  });
}

export function useSubscriptionBenefits(tier?: string) {
  return useQuery({
    queryKey: queryKeys.subscription.benefits(tier),
    queryFn: () => subscriptionApi.getBenefits(tier),
    enabled: !!tier,
  });
}
