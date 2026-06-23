// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import walletApi from '@/services/walletApi';

export function useTopupWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string }) =>
      walletApi.topup(data),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
  });
}

export function useWithdrawFunds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; bankDetails: any }) =>
      walletApi.withdraw(data),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
  });
}

export function useInitiateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { recipientId: string; amount: number; message?: string }) =>
      walletApi.initiateTransfer(data),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
  });
}

export function useSendGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { recipientPhone: string; amount: number; message?: string }) =>
      walletApi.sendGift(data),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
  });
}

export function useSyncBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => walletApi.syncBalance(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
    },
  });
}
