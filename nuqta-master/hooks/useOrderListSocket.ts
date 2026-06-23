/**
 * useOrderListSocket
 *
 * Subscribes to the user's general order room for list-level updates.
 * Used by the tracking page to update order cards in real-time
 * without full re-fetch.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export interface OrderListUpdate {
  orderId: string;
  orderNumber: string;
  newStatus: string;
  previousStatus?: string;
  counts?: { active: number; past: number };
  timestamp: Date;
}

const ORDER_LIST_UPDATED = 'order:list_updated';

/**
 * Hook that listens for order list updates via socket.
 * Returns the latest update and a list of all updates since mount.
 */
export function useOrderListSocket() {
  const { socket, state: socketState } = useSocket();
  const [lastUpdate, setLastUpdate] = useState<OrderListUpdate | null>(null);
  const [counts, setCounts] = useState<{ active: number; past: number } | null>(null);
  const callbackRef = useRef<((update: OrderListUpdate) => void) | null>(null);

  // Allow parent to register a callback for updates
  const onUpdate = useCallback((callback: (update: OrderListUpdate) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleListUpdate = (data: OrderListUpdate) => {
      setLastUpdate(data);

      if (data.counts) {
        setCounts(data.counts);
      }

      // Call registered callback
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    socket.on(ORDER_LIST_UPDATED, handleListUpdate);

    return () => {
      socket.off(ORDER_LIST_UPDATED, handleListUpdate);
    };
  }, [socket]);

  return {
    lastUpdate,
    counts,
    onUpdate,
    isConnected: socketState.connected,
  };
}
