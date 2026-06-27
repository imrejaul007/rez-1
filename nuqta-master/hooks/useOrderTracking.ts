import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import ordersService from '@/services/ordersApi';

// Order tracking event types
export const OrderSocketEvents = {
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_UPDATED: 'order:status_updated',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_PREPARING: 'order:preparing',
  ORDER_READY: 'order:ready',
  ORDER_DISPATCHED: 'order:dispatched',
  ORDER_OUT_FOR_DELIVERY: 'order:out_for_delivery',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_LOCATION_UPDATED: 'order:location_updated',
  ORDER_PARTNER_ASSIGNED: 'order:partner_assigned',
  ORDER_PARTNER_ARRIVED: 'order:partner_arrived',
  ORDER_TIMELINE_UPDATED: 'order:timeline_updated',
  SUBSCRIBE_ORDER: 'subscribe:order',
  UNSUBSCRIBE_ORDER: 'unsubscribe:order',
} as const;

// Payload interfaces
export interface OrderStatusUpdate {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  message: string;
  timestamp: Date;
  estimatedDeliveryTime?: Date;
  metadata?: any;
}

export interface OrderLocationUpdate {
  orderId: string;
  orderNumber: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deliveryPartner: {
    name: string;
    phone: string;
    vehicle?: string;
    photoUrl?: string;
  };
  estimatedArrival?: Date;
  distanceToDestination?: number;
  timestamp: Date;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  rating?: number;
}

export interface OrderPartnerAssigned {
  orderId: string;
  orderNumber: string;
  deliveryPartner: DeliveryPartner;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  timestamp: Date;
}

export interface OrderTimelineUpdate {
  orderId: string;
  orderNumber: string;
  timeline: Array<{
    status: string;
    message: string;
    timestamp: Date;
    updatedBy?: string;
    metadata?: any;
  }>;
  timestamp: Date;
}

export interface OrderDelivered {
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
  deliveredTo?: string;
  signature?: string;
  photoUrl?: string;
  otp?: string;
  timestamp: Date;
}

export interface OrderTrackingState {
  order: any | null;
  loading: boolean;
  error: string | null;
  statusUpdate: OrderStatusUpdate | null;
  locationUpdate: OrderLocationUpdate | null;
  deliveryPartner: DeliveryPartner | null;
  timeline: OrderTimelineUpdate['timeline'] | null;
  isLive: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

/**
 * Custom hook for real-time order tracking
 * @param orderId - The order ID to track
 * @param userId - Optional user ID for authentication
 * @param autoSubscribe - Whether to automatically subscribe to order updates (default: true)
 */
export function useOrderTracking(
  orderId: string | null,
  userId?: string,
  autoSubscribe: boolean = true
) {
  const { socket, state: socketState } = useSocket();
  const [trackingState, setTrackingState] = useState<OrderTrackingState>({
    order: null,
    loading: true,
    error: null,
    statusUpdate: null,
    locationUpdate: null,
    deliveryPartner: null,
    timeline: null,
    isLive: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  });

  const subscriptionRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds

  // Fetch initial order data
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setTrackingState(prev => ({ ...prev, loading: true, error: null }));
      const response = await ordersService.getOrderById(orderId);

      if (response.success && response.data) {
        setTrackingState(prev => ({
          ...prev,
          order: response.data,
          timeline: response.data.timeline || null,
          loading: false,
        }));
      }
    } catch (error) {
      setTrackingState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      }));
    }
  }, [orderId]);

  // Subscribe to order updates
  const subscribeToOrder = useCallback(() => {
    if (!socket || !orderId || subscriptionRef.current) return;

    socket.emit(OrderSocketEvents.SUBSCRIBE_ORDER, { orderId, userId });
    subscriptionRef.current = true;
    setTrackingState(prev => ({ ...prev, isLive: true }));
  }, [socket, orderId, userId]);

  // Unsubscribe from order updates
  const unsubscribeFromOrder = useCallback(() => {
    if (!socket || !orderId || !subscriptionRef.current) return;

    socket.emit(OrderSocketEvents.UNSUBSCRIBE_ORDER, { orderId });
    subscriptionRef.current = false;
    setTrackingState(prev => ({ ...prev, isLive: false }));
  }, [socket, orderId]);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !orderId) return;

    // Status update handler
    const handleStatusUpdate = (payload: OrderStatusUpdate) => {
      if (payload.orderId === orderId) {

        setTrackingState(prev => ({
          ...prev,
          statusUpdate: payload,
          order: prev.order ? { ...prev.order, status: payload.status } : prev.order,
        }));
      }
    };

    // Location update handler
    const handleLocationUpdate = (payload: OrderLocationUpdate) => {
      if (payload.orderId === orderId) {

        setTrackingState(prev => ({
          ...prev,
          locationUpdate: payload,
        }));
      }
    };

    // Partner assigned handler
    const handlePartnerAssigned = (payload: OrderPartnerAssigned) => {
      if (payload.orderId === orderId) {

        setTrackingState(prev => ({
          ...prev,
          deliveryPartner: payload.deliveryPartner,
          order: prev.order
            ? {
                ...prev.order,
                delivery: {
                  ...prev.order.delivery,
                  deliveryPartner: payload.deliveryPartner.name,
                  estimatedTime: payload.estimatedDeliveryTime,
                },
              }
            : prev.order,
        }));
      }
    };

    // Timeline update handler
    const handleTimelineUpdate = (payload: OrderTimelineUpdate) => {
      if (payload.orderId === orderId) {

        setTrackingState(prev => ({
          ...prev,
          timeline: payload.timeline,
          order: prev.order ? { ...prev.order, timeline: payload.timeline } : prev.order,
        }));
      }
    };

    // Delivered handler
    const handleDelivered = (payload: OrderDelivered) => {
      if (payload.orderId === orderId) {

        setTrackingState(prev => ({
          ...prev,
          order: prev.order
            ? {
                ...prev.order,
                status: 'delivered',
                delivery: {
                  ...prev.order.delivery,
                  deliveredAt: payload.deliveredAt,
                  status: 'delivered',
                },
              }
            : prev.order,
        }));
      }
    };

    // Register event listeners
    socket.on(OrderSocketEvents.ORDER_STATUS_UPDATED, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_LOCATION_UPDATED, handleLocationUpdate);
    socket.on(OrderSocketEvents.ORDER_PARTNER_ASSIGNED, handlePartnerAssigned);
    socket.on(OrderSocketEvents.ORDER_TIMELINE_UPDATED, handleTimelineUpdate);
    socket.on(OrderSocketEvents.ORDER_DELIVERED, handleDelivered);

    // Specific status event listeners
    socket.on(OrderSocketEvents.ORDER_CONFIRMED, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_PREPARING, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_READY, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_DISPATCHED, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_OUT_FOR_DELIVERY, handleStatusUpdate);
    socket.on(OrderSocketEvents.ORDER_CANCELLED, handleStatusUpdate);

    // Cleanup listeners on unmount
    return () => {
      socket.off(OrderSocketEvents.ORDER_STATUS_UPDATED, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_LOCATION_UPDATED, handleLocationUpdate);
      socket.off(OrderSocketEvents.ORDER_PARTNER_ASSIGNED, handlePartnerAssigned);
      socket.off(OrderSocketEvents.ORDER_TIMELINE_UPDATED, handleTimelineUpdate);
      socket.off(OrderSocketEvents.ORDER_DELIVERED, handleDelivered);
      socket.off(OrderSocketEvents.ORDER_CONFIRMED, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_PREPARING, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_READY, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_DISPATCHED, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_OUT_FOR_DELIVERY, handleStatusUpdate);
      socket.off(OrderSocketEvents.ORDER_CANCELLED, handleStatusUpdate);
    };
  }, [socket, orderId]);

  // Handle reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (!orderId || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setTrackingState(prev => ({ ...prev, isReconnecting: false }));
      return;
    }

    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );

    reconnectAttemptsRef.current += 1;
    setTrackingState(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    reconnectTimerRef.current = setTimeout(() => {
      if (socket && !socketState.connected) {
        // Socket.IO handles reconnection internally, but we re-subscribe
        subscribeToOrder();
      }
    }, delay);
  }, [orderId, socket, socketState.connected, subscribeToOrder]);

  // Fetch order data on mount and subscribe if enabled
  useEffect(() => {
    if (!orderId) return;

    fetchOrder();

    if (autoSubscribe && socketState.connected) {
      subscribeToOrder();
      // Reset reconnect state on successful connection
      reconnectAttemptsRef.current = 0;
      setTrackingState(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: 0,
      }));
    } else if (autoSubscribe && !socketState.connected) {
      // Socket disconnected — try to reconnect
      attemptReconnect();
    }

    // Cleanup: unsubscribe and clear timers on unmount
    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromOrder();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [orderId, autoSubscribe, socketState.connected, fetchOrder, subscribeToOrder, unsubscribeFromOrder, attemptReconnect]);

  // Refresh order data
  const refresh = useCallback(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    ...trackingState,
    refresh,
    subscribe: subscribeToOrder,
    unsubscribe: unsubscribeFromOrder,
    isConnected: socketState.connected,
  };
}

/**
 * Custom hook for listening to new orders (for merchants/admins)
 * @param userId - User ID to listen for new orders
 */
const MAX_NEW_ORDERS = 50; // Limit to prevent memory leak

export function useNewOrders(userId: string | null) {
  const { socket } = useSocket();
  const [newOrders, setNewOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewOrder = (orderData: any) => {
      // Limit array size to prevent memory leak
      setNewOrders(prev => {
        const updated = [orderData, ...prev];
        return updated.length > MAX_NEW_ORDERS ? updated.slice(0, MAX_NEW_ORDERS) : updated;
      });
    };

    socket.on(OrderSocketEvents.ORDER_CREATED, handleNewOrder);

    return () => {
      socket.off(OrderSocketEvents.ORDER_CREATED, handleNewOrder);
    };
  }, [socket, userId]);

  const clearNewOrders = useCallback(() => {
    setNewOrders([]);
  }, []);

  return {
    newOrders,
    clearNewOrders,
    hasNewOrders: newOrders.length > 0,
  };
}
