// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
// Lazy-loaded: socket.io-client (100KB+) only loaded when SocketProvider mounts
type Socket = any;
const getIO = async () => (await import('socket.io-client')).io;
import Constants from 'expo-constants';
import { useSocketStore } from '@/stores/socketStore';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getAuthToken, getUser } from '@/utils/authStorage';
import mainApiClient from '@/services/apiClient';
import {
  SocketEvents,
  SocketState,
  SocketConfig,
  StockUpdatePayload,
  LowStockPayload,
  OutOfStockPayload,
  PriceUpdatePayload,
  ProductAvailabilityPayload,
  FlashSaleStartedPayload,
  FlashSaleEndingSoonPayload,
  FlashSaleEndedPayload,
  FlashSaleStockUpdatedPayload,
  FlashSaleStockLowPayload,
  FlashSaleSoldOutPayload,
  StockUpdateCallback,
  LowStockCallback,
  OutOfStockCallback,
  PriceUpdateCallback,
  ProductAvailabilityCallback,
  FlashSaleStartedCallback,
  FlashSaleEndingSoonCallback,
  FlashSaleEndedCallback,
  FlashSaleStockUpdatedCallback,
  FlashSaleStockLowCallback,
  FlashSaleSoldOutCallback,
  ConnectionCallback,
  ErrorCallback,
} from '@/types/socket.types';

// Get Socket URL from environment.
// Prefer the explicit SOCKET_URL env var (covers cases where the WS host
// differs from the API host, e.g. wss://socket.rezapp.com vs https://api.rezapp.com).
// Falls back to deriving from EXPO_PUBLIC_API_BASE_URL for backward compat.
const getSocketUrl = (): string => {
  const explicitSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }
  const apiBaseUrl = mainApiClient.getBaseURL();
  // Extract the base URL without /api path
  let baseUrl = apiBaseUrl.replace('/api', '');

  // Map http(s) → ws(s) so the socket client speaks the right scheme.
  if (baseUrl.startsWith('https://')) baseUrl = 'wss://' + baseUrl.slice('https://'.length);
  else if (baseUrl.startsWith('http://')) baseUrl = 'ws://' + baseUrl.slice('http://'.length);

  // For web, use the configured URL as-is
  if (Platform.OS === 'web') {
    return baseUrl;
  }

  // For mobile development on Android emulator, replace localhost with emulator host
  // For iOS simulator or physical devices, use your machine's local IP address
  // Android emulator: 10.0.2.2 maps to host machine's localhost
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return baseUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }

  return baseUrl;
};

// Socket configuration with sensible defaults
const DEFAULT_CONFIG: Partial<SocketConfig> = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
};

interface SocketContextType {
  socket: Socket | null;
  state: SocketState;

  // Connection methods
  connect: () => void;
  disconnect: () => void;

  // Event subscription methods
  onStockUpdate: (callback: StockUpdateCallback) => () => void;
  onLowStock: (callback: LowStockCallback) => () => void;
  onOutOfStock: (callback: OutOfStockCallback) => () => void;
  onPriceUpdate: (callback: PriceUpdateCallback) => () => void;
  onProductAvailability: (callback: ProductAvailabilityCallback) => () => void;
  onConnect: (callback: ConnectionCallback) => () => void;
  onDisconnect: (callback: ConnectionCallback) => () => void;
  onError: (callback: ErrorCallback) => () => void;

  // Flash sale event subscription methods
  onFlashSaleStarted: (callback: FlashSaleStartedCallback) => () => void;
  onFlashSaleEndingSoon: (callback: FlashSaleEndingSoonCallback) => () => void;
  onFlashSaleEnded: (callback: FlashSaleEndedCallback) => () => void;
  onFlashSaleStockUpdated: (callback: FlashSaleStockUpdatedCallback) => () => void;
  onFlashSaleStockLow: (callback: FlashSaleStockLowCallback) => () => void;
  onFlashSaleSoldOut: (callback: FlashSaleSoldOutCallback) => () => void;

  // Product/Store subscription methods
  subscribeToProduct: (productId: string) => void;
  unsubscribeFromProduct: (productId: string) => void;
  subscribeToStore: (storeId: string) => void;
  unsubscribeFromStore: (storeId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  config?: Partial<SocketConfig>;
}

export function SocketProvider({ children, config }: SocketProviderProps) {
  const [socketState, setSocketState] = useState<SocketState>({
    connected: false,
    reconnecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  // Phase 17 fix: bump when socketRef.current is assigned so the contextValue
  // useMemo can include it in deps and consumers always see the latest socket.
  const [socketVersion, setSocketVersion] = useState(0);
  const subscribedProducts = useRef<Set<string>>(new Set());
  const subscribedStores = useRef<Set<string>>(new Set());

  // Initialize socket connection (deferred: socket.io-client loaded on demand)
  // FIXED: Properly cleanup event listeners to prevent memory leaks
  useEffect(() => {
    let cancelled = false;
    const socketUrl = getSocketUrl();
    const socketConfig = { ...DEFAULT_CONFIG, ...config };

    Promise.all([getIO(), getAuthToken(), getUser()]).then(([io, token, user]) => {
      if (cancelled) return;
      if (!token) {
        return;
      }
      // Skip socket connection during onboarding to reduce load on Android
      if (!user?.isOnboarded) {
        return;
      }
      try {
        const socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          autoConnect: socketConfig.autoConnect,
          reconnection: socketConfig.reconnection,
          reconnectionAttempts: socketConfig.reconnectionAttempts,
          reconnectionDelay: socketConfig.reconnectionDelay,
          reconnectionDelayMax: socketConfig.reconnectionDelayMax,
          timeout: socketConfig.timeout,
          auth: { token },
        });

        socketRef.current = socket;
        // Phase 17 fix: bump a version counter so the contextValue useMemo below
        // re-runs and consumers see the new socket (the ref's .current is captured
        // at memoization time, not reactive on its own).
        setSocketVersion(v => v + 1);

      // Define all event handlers in an object for easy cleanup
      const handleConnect = () => {
        setSocketState(prev => ({
          ...prev,
          connected: true,
          reconnecting: false,
          error: null,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        }));
        resubscribeAll();
      };

      const handleDisconnect = (reason: string) => {
        setSocketState(prev => ({
          ...prev,
          connected: false,
          reconnecting: reason === 'io server disconnect' ? false : true,
        }));
      };

      const handleConnectError = (error: Error) => {
        setSocketState(prev => ({
          ...prev,
          error: error.message,
          reconnecting: true,
        }));
      };

      const handleReconnectAttempt = (attemptNumber: number) => {
        setSocketState(prev => ({
          ...prev,
          reconnecting: true,
          reconnectAttempts: attemptNumber,
        }));
      };

      const handleReconnect = (attemptNumber: number) => {
        setSocketState(prev => ({
          ...prev,
          connected: true,
          reconnecting: false,
          error: null,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        }));
      };

      const handleReconnectError = (error: Error) => {
        setSocketState(prev => ({
          ...prev,
          error: error.message,
        }));
      };

      const handleReconnectFailed = () => {
        setSocketState(prev => ({
          ...prev,
          reconnecting: false,
          error: 'Failed to reconnect after maximum attempts',
        }));
      };

      // Attach all connection event listeners
      socket.on(SocketEvents.CONNECT, handleConnect);
      socket.on(SocketEvents.DISCONNECT, handleDisconnect);
      socket.on(SocketEvents.CONNECT_ERROR, handleConnectError);
      socket.on(SocketEvents.RECONNECT_ATTEMPT, handleReconnectAttempt);
      socket.on(SocketEvents.RECONNECT, handleReconnect);
      socket.on(SocketEvents.RECONNECT_ERROR, handleReconnectError);
      socket.on(SocketEvents.RECONNECT_FAILED, handleReconnectFailed);

      } catch (error) {
        setSocketState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize socket',
        }));
      }
    }).catch(() => { /* silently handle */ });

    // Pause/resume socket on app background/foreground (native only)
    const handleAppState = (nextAppState: AppStateStatus) => {
      if (!socketRef.current) return;

      if (nextAppState === 'active') {
        // App came to foreground — reconnect if disconnected
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background — disconnect to save battery (native only)
        if (Platform.OS !== 'web' && socketRef.current.connected) {
          socketRef.current.disconnect();
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppState);

    // CRITICAL: Cleanup function to prevent memory leaks
    return () => {
      cancelled = true;
      appStateSubscription.remove();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty deps - only run once

  // Re-subscribe to all products and stores after reconnection
  const resubscribeAll = useCallback(() => {
    if (!socketRef.current) return;

    subscribedProducts.current.forEach(productId => {
      socketRef.current?.emit(SocketEvents.SUBSCRIBE_PRODUCT, { productId });
    });

    subscribedStores.current.forEach(storeId => {
      socketRef.current?.emit(SocketEvents.SUBSCRIBE_STORE, { storeId });
    });
  }, []);

  // Connection methods
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {

      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {

      socketRef.current.disconnect();
    }
  }, []);

  // Event subscription methods
  const onStockUpdate = useCallback((callback: StockUpdateCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.STOCK_UPDATED, callback);

    return () => {
      socketRef.current?.off(SocketEvents.STOCK_UPDATED, callback);
    };
  }, []);

  const onLowStock = useCallback((callback: LowStockCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.STOCK_LOW, callback);

    return () => {
      socketRef.current?.off(SocketEvents.STOCK_LOW, callback);
    };
  }, []);

  const onOutOfStock = useCallback((callback: OutOfStockCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.STOCK_OUT, callback);

    return () => {
      socketRef.current?.off(SocketEvents.STOCK_OUT, callback);
    };
  }, []);

  const onPriceUpdate = useCallback((callback: PriceUpdateCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.PRICE_UPDATED, callback);

    return () => {
      socketRef.current?.off(SocketEvents.PRICE_UPDATED, callback);
    };
  }, []);

  const onProductAvailability = useCallback((callback: ProductAvailabilityCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.PRODUCT_AVAILABILITY, callback);

    return () => {
      socketRef.current?.off(SocketEvents.PRODUCT_AVAILABILITY, callback);
    };
  }, []);

  const onConnect = useCallback((callback: ConnectionCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.CONNECT, callback);

    return () => {
      socketRef.current?.off(SocketEvents.CONNECT, callback);
    };
  }, []);

  const onDisconnect = useCallback((callback: ConnectionCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.DISCONNECT, callback);

    return () => {
      socketRef.current?.off(SocketEvents.DISCONNECT, callback);
    };
  }, []);

  const onError = useCallback((callback: ErrorCallback) => {
    if (!socketRef.current) return () => {};

    const errorHandler = (error: any) => {
      callback(error instanceof Error ? error : new Error(String(error)));
    };

    socketRef.current.on(SocketEvents.CONNECT_ERROR, errorHandler);

    return () => {
      socketRef.current?.off(SocketEvents.CONNECT_ERROR, errorHandler);
    };
  }, []);

  // Flash sale event subscription methods
  const onFlashSaleStarted = useCallback((callback: FlashSaleStartedCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_STARTED, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_STARTED, callback);
    };
  }, []);

  const onFlashSaleEndingSoon = useCallback((callback: FlashSaleEndingSoonCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_ENDING_SOON, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_ENDING_SOON, callback);
    };
  }, []);

  const onFlashSaleEnded = useCallback((callback: FlashSaleEndedCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_ENDED, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_ENDED, callback);
    };
  }, []);

  const onFlashSaleStockUpdated = useCallback((callback: FlashSaleStockUpdatedCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_STOCK_UPDATED, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_STOCK_UPDATED, callback);
    };
  }, []);

  const onFlashSaleStockLow = useCallback((callback: FlashSaleStockLowCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_STOCK_LOW, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_STOCK_LOW, callback);
    };
  }, []);

  const onFlashSaleSoldOut = useCallback((callback: FlashSaleSoldOutCallback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on(SocketEvents.FLASH_SALE_SOLD_OUT, callback);

    return () => {
      socketRef.current?.off(SocketEvents.FLASH_SALE_SOLD_OUT, callback);
    };
  }, []);

  // Product/Store subscription methods
  const subscribeToProduct = useCallback((productId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }

    socketRef.current.emit(SocketEvents.SUBSCRIBE_PRODUCT, { productId });
    subscribedProducts.current.add(productId);
  }, []);

  const unsubscribeFromProduct = useCallback((productId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }

    socketRef.current.emit(SocketEvents.UNSUBSCRIBE_PRODUCT, { productId });
    subscribedProducts.current.delete(productId);
  }, []);

  const subscribeToStore = useCallback((storeId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }

    socketRef.current.emit(SocketEvents.SUBSCRIBE_STORE, { storeId });
    subscribedStores.current.add(storeId);
  }, []);

  const unsubscribeFromStore = useCallback((storeId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }

    socketRef.current.emit(SocketEvents.UNSUBSCRIBE_STORE, { storeId });
    subscribedStores.current.delete(storeId);
  }, []);

  // OPTIMIZED: Memoize context value to prevent unnecessary re-renders
  const contextValue: SocketContextType = useMemo(() => ({
    socket: socketRef.current,
    state: socketState,
    connect,
    disconnect,
    onStockUpdate,
    onLowStock,
    onOutOfStock,
    onPriceUpdate,
    onProductAvailability,
    onConnect,
    onDisconnect,
    onError,
    onFlashSaleStarted,
    onFlashSaleEndingSoon,
    onFlashSaleEnded,
    onFlashSaleStockUpdated,
    onFlashSaleStockLow,
    onFlashSaleSoldOut,
    subscribeToProduct,
    unsubscribeFromProduct,
    subscribeToStore,
    unsubscribeFromStore,
  }), [
    socketState,
    socketVersion, // Phase 17 fix: re-run useMemo when socketRef.current changes
    connect,
    disconnect,
    onStockUpdate,
    onLowStock,
    onOutOfStock,
    onPriceUpdate,
    onProductAvailability,
    onConnect,
    onDisconnect,
    onError,
    onFlashSaleStarted,
    onFlashSaleEndingSoon,
    onFlashSaleEnded,
    onFlashSaleStockUpdated,
    onFlashSaleStockLow,
    onFlashSaleSoldOut,
    subscribeToProduct,
    unsubscribeFromProduct,
    subscribeToStore,
    unsubscribeFromStore,
  ]);

  // Sync connection state to Zustand store for crash-safe fallback
  const _setFromProvider = useSocketStore((s) => s._setFromProvider);
  useEffect(() => {
    _setFromProvider(socketState);
  }, [socketState, _setFromProvider]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to use socket context
// No-op unsubscribe function for safe defaults
const noopUnsubscribe = () => {};

// Safe defaults when provider hasn't loaded yet (deferred loading)
const SOCKET_DEFAULTS: SocketContextType = {
  socket: null,
  state: { connected: false, reconnecting: false, error: null, lastConnected: null, reconnectAttempts: 0 },
  connect: () => {},
  disconnect: () => {},
  onStockUpdate: () => noopUnsubscribe,
  onLowStock: () => noopUnsubscribe,
  onOutOfStock: () => noopUnsubscribe,
  onPriceUpdate: () => noopUnsubscribe,
  onProductAvailability: () => noopUnsubscribe,
  onConnect: () => noopUnsubscribe,
  onDisconnect: () => noopUnsubscribe,
  onError: () => noopUnsubscribe,
  onFlashSaleStarted: () => noopUnsubscribe,
  onFlashSaleEndingSoon: () => noopUnsubscribe,
  onFlashSaleEnded: () => noopUnsubscribe,
  onFlashSaleStockUpdated: () => noopUnsubscribe,
  onFlashSaleStockLow: () => noopUnsubscribe,
  onFlashSaleSoldOut: () => noopUnsubscribe,
  subscribeToProduct: () => {},
  unsubscribeFromProduct: () => {},
  subscribeToStore: () => {},
  unsubscribeFromStore: () => {},
};

// Hook — falls back to Zustand store (connection state only) for crash safety when outside Provider
export function useSocket() {
  const context = useContext(SocketContext);
  const storeState = useSocketStore((s) => s.state);

  if (context !== undefined) {
    return context;
  }

  // Fallback: Zustand has connection state, but socket instance is unavailable
  // Return defaults with connection state from store
  return { ...SOCKET_DEFAULTS, state: storeState };
}

// Custom hook to subscribe to stock updates for a specific product
export function useStockUpdates(productId: string | null) {
  const { subscribeToProduct, unsubscribeFromProduct, onStockUpdate, onLowStock, onOutOfStock } = useSocket();
  const [stockData, setStockData] = useState<StockUpdatePayload | null>(null);
  const [isLowStock, setIsLowStock] = useState(false);
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  useEffect(() => {
    if (!productId) return;

    // Subscribe to product
    subscribeToProduct(productId);

    // Listen for stock updates
    const unsubscribeStock = onStockUpdate((payload) => {
      if (payload.productId === productId) {
        setStockData(payload);
        setIsOutOfStock(payload.status === 'OUT_OF_STOCK');
        setIsLowStock(payload.status === 'LOW_STOCK');
      }
    });

    const unsubscribeLow = onLowStock((payload) => {
      if (payload.productId === productId) {
        setIsLowStock(true);
      }
    });

    const unsubscribeOut = onOutOfStock((payload) => {
      if (payload.productId === productId) {
        setIsOutOfStock(true);
      }
    });

    // Cleanup
    return () => {
      unsubscribeFromProduct(productId);
      unsubscribeStock();
      unsubscribeLow();
      unsubscribeOut();
    };
  }, [productId]);

  return {
    stockData,
    isLowStock,
    isOutOfStock,
    isInStock: stockData?.status === 'IN_STOCK',
  };
}

export { SocketContext };