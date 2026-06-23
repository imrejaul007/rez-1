import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import supportChatApi from '@/services/supportChatApi';
import type {
  CreateTicketRequest,
  SendMessageRequest,
} from '@/types/supportChat.types';

/**
 * Mutation for creating a new support ticket.
 * Invalidates the ticket list cache on success.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTicketRequest) =>
      supportChatApi.createTicket(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets() });
    },
  });
}

/**
 * Mutation for sending a message on an existing ticket.
 * Invalidates that ticket's message cache on success.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SendMessageRequest) =>
      supportChatApi.sendMessage(request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.messages(variables.ticketId),
      });
    },
  });
}
