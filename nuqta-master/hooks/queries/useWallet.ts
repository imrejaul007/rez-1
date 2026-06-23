// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import walletApi from '@/services/walletApi';

export function useWalletBalance() {
  return useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn: () => walletApi.getBalance(),
    staleTime: 30_000,
  });
}

export function useWalletTransactions(filters?: { page?: number; limit?: number; type?: string; source?: string }) {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(filters),
    queryFn: () => walletApi.getTransactions(filters),
  });
}

export function useWalletTransactionById(id: string) {
  return useQuery({
    queryKey: queryKeys.wallet.transactionDetail(id),
    queryFn: () => walletApi.getTransactionById(id),
    enabled: !!id,
  });
}

export function useWalletSummary(period?: string) {
  return useQuery({
    queryKey: queryKeys.wallet.summary(period),
    queryFn: () => walletApi.getSummary(period),
  });
}

export function useExpiringCoins() {
  return useQuery({
    queryKey: queryKeys.wallet.expiring(),
    queryFn: () => walletApi.getExpiringCoins(),
  });
}
