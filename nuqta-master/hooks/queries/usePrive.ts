// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import priveApi from '@/services/priveApi';

export function usePriveEligibility() {
  return useQuery({
    queryKey: queryKeys.prive.eligibility(),
    queryFn: () => priveApi.getEligibility(),
  });
}

export function usePriveTier() {
  return useQuery({
    queryKey: queryKeys.prive.tier(),
    queryFn: () => priveApi.getTier(),
  });
}

export function usePriveSummary() {
  return useQuery({
    queryKey: queryKeys.prive.summary(),
    queryFn: () => priveApi.getSummary(),
  });
}

export function usePriveOffers(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.prive.offers(filters),
    queryFn: () => priveApi.getOffers(filters),
  });
}

export function usePriveCatalog() {
  return useQuery({
    queryKey: queryKeys.prive.catalog(),
    queryFn: () => priveApi.getCatalog(),
  });
}

export function usePriveHabits() {
  return useQuery({
    queryKey: queryKeys.prive.habits(),
    queryFn: () => priveApi.getHabits(),
  });
}
