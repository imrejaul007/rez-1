import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import supportChatApi from '@/services/supportChatApi';

/**
 * Fetch paginated ticket history for the current user.
 * Enabled by default — pass `enabled: false` to defer.
 */
export function useTicketHistory(page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.support.tickets(), page, limit] as const,
    queryFn: () => supportChatApi.getTicketHistory(page, limit),
    enabled,
  });
}

/**
 * Fetch messages for a specific ticket.
 * Only fires when a valid ticketId is provided.
 */
export function useChatMessages(ticketId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: queryKeys.support.messages(ticketId ?? ''),
    queryFn: () => supportChatApi.getMessages(ticketId!, undefined, limit),
    enabled: !!ticketId,
  });
}
