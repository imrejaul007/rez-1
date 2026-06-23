// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import priveApi from '@/services/priveApi';

export function useRedeemPriveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { offerId: string; idempotencyKey: string }) =>
      priveApi.redeemOffer(data.offerId, data),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prive.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
    },
  });
}
