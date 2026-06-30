// @ts-nocheck
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CartItem as CartItemType } from '@/types/cart';
import { CartItem as ApiCartItemType, UnifiedCartItem, UnifiedCart } from '@/services/cartApi';
import cartService from '@/services/cartApi';
import { mapBackendCartToFrontend } from '@/utils/dataMappers';
import offlineQueueService from '@/services/offlineQueueService';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useCartStore } from '@/stores/cartStore';
import { devLog } from '@/utils/devLogger';

// Lazy-loaded heavy deps (not in synchronous dependency chain)
const getNetInfo = async () => (await import('@react-native-community/netinfo')).default;
const getCacheService = async () => (await import('@/services/cacheService')).default;
const getBillAnalytics = async () => (await import('@/services/billUploadAnalytics')).billUploadAnalytics;

/**
 * Cross-platform string size estimation
 * Uses Blob on web, byte length calculation on native
 */
const estimateStringSize = (str: string): number => {
  if (Platform.OS === 'web' && typeof Blob !== 'undefined') {
    try {
      return new Blob([str]).size;
    } catch (e) {
      // Fallback to byte calculation
    }
  }
  // UTF-8 encoding: ASCII = 1 byte, most others = 2-4 bytes
  // This is an approximation - JSON strings are mostly ASCII
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode < 128) bytes += 1;
    else if (charCode < 2048) bytes += 2;
    else if (charCode < 65536) bytes += 3;
    else bytes += 4;
  }
  return bytes;
};
import {
  CartItem as UnifiedCartItemType,
  toCartItem,
  validateCartItem as validateUnifiedCartItem,
  isCartItemAvailable
} from '@/types/unified';
import {
  validateCartItem,
  validateQuantity,
  MAX_QUANTITY_PER_ITEM,
  MIN_QUANTITY,
} from '@/utils/cartValidation';

// Extended cart item with quantity and selected state
interface CartItemWithQuantity extends CartItemType {
  quantity: number;
  selected: boolean;
  addedAt: string;
  productId?: string;
  variant?: any;
  itemType?: 'product' | 'service' | 'event';
  serviceBookingDetails?: {
    bookingDate: Date | string | null;
    timeSlot: { start: string; end: string } | null;
    duration: number;
    serviceType: string;
    customerNotes?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  } | null;
  metadata?: any;
}

interface DineInContext {
  storeId: string;
  tableNumber: string;
  storeName: string;
}

interface CartState {
  items: CartItemWithQuantity[];
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isOnline: boolean;
  pendingSync: boolean;
  appliedCardOffer?: any;
  dineInContext?: DineInContext;
}

type CartAction =
  | { type: 'CART_LOADING'; payload: boolean }
  | { type: 'CART_LOADED'; payload: CartItemWithQuantity[] }
  | { type: 'CART_ERROR'; payload: string }
  | { type: 'ADD_ITEM'; payload: CartItemType }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'TOGGLE_ITEM_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_ITEMS'; payload: boolean }
  | { type: 'CLEAR_CART' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_PENDING_SYNC'; payload: boolean }
  | { type: 'SET_CARD_OFFER'; payload: any }
  | { type: 'REMOVE_CARD_OFFER' }
  | { type: 'SET_DINE_IN_CONTEXT'; payload: DineInContext | undefined };

// Storage key
const CART_STORAGE_KEY = 'shopping_cart';

// Initial state
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
  isOnline: true,
  pendingSync: false,
  appliedCardOffer: undefined,
};

// Helper functions
const calculateTotals = (items: CartItemWithQuantity[]) => {
  const selectedItems = items.filter(item => item.selected);
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => {
    const price = item.discountedPrice || item.originalPrice || 0;
    const discount = item.discount || 0; // Lock fee discount (only applies to lockedQuantity items)
    // Total = (price × quantity) - discount
    // This ensures: 2 items at ₹10,000 = ₹20,000, minus ₹500 lock fee = ₹19,500
    return sum + (price * item.quantity) - discount;
  }, 0);

  return { totalItems, totalPrice };
};

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'CART_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    
    case 'CART_LOADED':
      const { totalItems: loadedItems, totalPrice: loadedPrice } = calculateTotals(action.payload);
      return {
        ...state,
        items: action.payload,
        totalItems: loadedItems,
        totalPrice: loadedPrice,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };
    
    case 'CART_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'ADD_ITEM': {
      // Validate cart item structure
      const itemValidation = validateCartItem(action.payload);
      if (!itemValidation.valid) {
        devLog.error('🛒 [CartReducer] Invalid cart item:', itemValidation.error);
        return {
          ...state,
          error: itemValidation.error || 'Invalid cart item',
        };
      }

      const existingItem = state.items.find(item => item.id === action.payload.id);
      let newItems: CartItemWithQuantity[];

      // Preserve metadata from payload
      const payloadMetadata = (action.payload as any).metadata;

      if (existingItem) {
        // Validate quantity increase
        const quantityValidation = validateQuantity(
          1, // Adding 1 more
          MAX_QUANTITY_PER_ITEM,
          existingItem.quantity
        );

        if (!quantityValidation.valid) {
          devLog.warn('🛒 [CartReducer] Quantity limit reached:', quantityValidation.error);
          return {
            ...state,
            error: quantityValidation.error || 'Cannot add more items',
          };
        }

        // Increase quantity if item already exists
        newItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1, metadata: payloadMetadata || item.metadata }
            : item
        );
      } else {
        // Validate initial quantity
        const quantityValidation = validateQuantity(1, MAX_QUANTITY_PER_ITEM, 0);
        if (!quantityValidation.valid) {
          devLog.error('🛒 [CartReducer] Invalid quantity:', quantityValidation.error);
          return {
            ...state,
            error: quantityValidation.error || 'Invalid quantity',
          };
        }

        // Add new item
        const newItem: CartItemWithQuantity = {
          ...action.payload,
          productId: action.payload.id, // Ensure productId is set for cart item lookup
          quantity: 1,
          selected: true,
          addedAt: new Date().toISOString(),
          metadata: payloadMetadata, // Preserve metadata
        };
        newItems = [...state.items, newItem];
      }

      const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);

      return {
        ...state,
        items: newItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
        lastUpdated: new Date().toISOString(),
        error: null, // Clear any previous errors
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);
      
      return {
        ...state,
        items: newItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;

      // Allow quantity 0 for removal
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const newItems = state.items.filter(item => item.id !== id);
        const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);

        return {
          ...state,
          items: newItems,
          totalItems: newTotalItems,
          totalPrice: newTotalPrice,
          lastUpdated: new Date().toISOString(),
          error: null,
        };
      }

      // Validate quantity
      const quantityValidation = validateQuantity(quantity, MAX_QUANTITY_PER_ITEM, 0);
      if (!quantityValidation.valid) {
        devLog.warn('🛒 [CartReducer] Invalid quantity update:', quantityValidation.error);
        return {
          ...state,
          error: quantityValidation.error || 'Invalid quantity',
        };
      }

      const newItems = state.items.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
      const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);

      return {
        ...state,
        items: newItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
        lastUpdated: new Date().toISOString(),
        error: null,
      };
    }
    
    case 'TOGGLE_ITEM_SELECTION': {
      const newItems = state.items.map(item =>
        item.id === action.payload ? { ...item, selected: !item.selected } : item
      );
      const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);
      
      return {
        ...state,
        items: newItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    case 'SELECT_ALL_ITEMS': {
      const newItems = state.items.map(item => ({
        ...item,
        selected: action.payload,
      }));
      
      const { totalItems: newTotalItems, totalPrice: newTotalPrice } = calculateTotals(newItems);
      
      return {
        ...state,
        items: newItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        lastUpdated: new Date().toISOString(),
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };

    case 'SET_PENDING_SYNC':
      return { ...state, pendingSync: action.payload };

    case 'SET_CARD_OFFER':
      return { ...state, appliedCardOffer: action.payload };

    case 'REMOVE_CARD_OFFER':
      return { ...state, appliedCardOffer: undefined };

    case 'SET_DINE_IN_CONTEXT':
      return { ...state, dineInContext: action.payload };

    default:
      return state;
  }
}

// Context
interface CartContextType {
  state: CartState;
  refreshCart: () => Promise<void>; // Alias for loadCart
  actions: {
    loadCart: () => Promise<void>;
    addItem: (item: CartItemType) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    updateQuantity: (itemId: string, quantity: number) => Promise<void>;
    toggleItemSelection: (itemId: string) => void;
    selectAllItems: (selected: boolean) => void;
    clearCart: () => Promise<void>;
    clearError: () => void;
    getSelectedItems: () => CartItemWithQuantity[];
    isItemInCart: (itemId: string) => boolean;
    getItemQuantity: (itemId: string) => number;
    applyCoupon: (couponCode: string) => Promise<void>;
    removeCoupon: () => Promise<void>;
    setCardOffer: (offer: any) => Promise<void>;
    removeCardOffer: () => void;
    setDineInContext: (ctx: DineInContext | undefined) => void;
    syncWithServer: () => Promise<void>;
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _cartPending: Promise<void> | null = null;
let _cartLastLoad = 0;
const CART_DEDUP_MS = 10_000; // 10 seconds dedup window

// Provider
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const authUser = useAuthUser();
  const authIsAuthenticated = useIsAuthenticated();
  const authIsLoading = useAuthLoading();

  // Actions - Define functions before useEffects
  const loadCart = useCallback(async () => {
    // Module-level dedup: skip if loaded very recently (DeferredProvider remounts)
    if (_cartPending) {
      await _cartPending;
      return;
    }
    if (Date.now() - _cartLastLoad < CART_DEDUP_MS) {
      return;
    }

    _cartPending = (async () => {
    try {
      dispatch({ type: 'CART_LOADING', payload: true });

      // Try to load from API first
      try {
        const response = await cartService.getCart();

        if (response.success && response.data) {

          const mappedCart = mapBackendCartToFrontend(response.data);

          // Convert to CartItemWithQuantity format
          const cartItems: CartItemWithQuantity[] = mappedCart.items.map((item: any) => {

            return {
              id: item.id,
              productId: item.productId,
              name: item.name,
              image: item.image,
              price: item.price, // Current price (for CartItem component)
              originalPrice: item.originalPrice,
              discountedPrice: item.price, // Alias for price (legacy)
              discount: item.discount || 0, // Lock fee discount (only for items with lockedQuantity > 0)
              lockedQuantity: item.lockedQuantity || 0, // How many items have lock fee applied
              quantity: item.quantity,
              selected: true,
              addedAt: item.addedAt,
              store: item.store,
              variant: item.variant,
              subtotal: item.subtotal,
              savings: item.savings,
              // Item type and service/event details
              itemType: item.itemType || 'product',
              serviceBookingDetails: item.serviceBookingDetails || null,
              metadata: item.metadata || null,
            };
          });

          // Save to AsyncStorage as cache (optimized)
          // Note: optimizeCartForStorage is defined later, but we'll save directly here
          // The optimization will happen on next save
          try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
          } catch (error: any) {
            if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
              devLog.warn('🛒 [CartContext] Storage quota exceeded when loading cart');
              // Save only last 30 items
              const limitedItems = cartItems.slice(-30);
              await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limitedItems));
            }
          }

          dispatch({ type: 'CART_LOADED', payload: cartItems });
          return;
        }
      } catch (apiError) {

      }

      // Fallback to AsyncStorage cache
      const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const cartItems: CartItemWithQuantity[] = savedCart ? JSON.parse(savedCart) : [];

      dispatch({ type: 'CART_LOADED', payload: cartItems });
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to load cart:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load cart'
      });
    } finally {
      _cartLastLoad = Date.now();
      _cartPending = null;
    }
    })(); // end _cartPending async wrapper

    await _cartPending;
  }, []);

  // Optimize cart items for storage - remove unnecessary fields
  const optimizeCartForStorage = useCallback((items: CartItemWithQuantity[]) => {
    return items.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      // Store only essential image data (URL only, no full image objects)
      image: typeof item.image === 'string' ? item.image : (item.image as any)?.uri || '',
      price: item.price || item.discountedPrice, // Current price
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      // IMPORTANT: Include lock fee fields for items moved from Locked tab
      discount: item.discount || 0, // Lock fee discount
      lockedQuantity: item.lockedQuantity || 0, // Number of items with lock fee applied
      quantity: item.quantity,
      selected: item.selected,
      addedAt: item.addedAt,
      // Only store essential metadata (eventId, slotId) - remove large objects
      metadata: item.metadata ? {
        eventId: item.metadata.eventId,
        slotId: item.metadata.slotId,
        slotTime: item.metadata.slotTime,
        eventType: item.metadata.eventType,
        location: item.metadata.location,
        date: item.metadata.date,
        time: item.metadata.time,
      } : undefined,
      // Remove large fields like full store objects, variant objects, etc.
      store: item.store ? (typeof item.store === 'string' ? item.store : item.store.id || item.store.name) : undefined,
      variant: item.variant ? (typeof item.variant === 'string' ? item.variant : item.variant.id || item.variant.name) : undefined,
    }));
  }, []);

  const saveCartToStorage = useCallback(async () => {
    // Skip if no items to save
    if (!state.items || state.items.length === 0) {
      return;
    }

    try {
      // Optimize cart data before saving
      const optimizedItems = optimizeCartForStorage(state.items);
      const cartData = JSON.stringify(optimizedItems);
      
      // Check size (localStorage limit is typically 5-10MB)
      const sizeInMB = estimateStringSize(cartData) / (1024 * 1024);
      if (sizeInMB > 3) { // Lower threshold to 3MB
        devLog.warn('🛒 [CartContext] Cart data is large:', sizeInMB.toFixed(2), 'MB');
        // If too large, keep only last 20 items
        if (optimizedItems.length > 20) {
          const limitedItems = optimizedItems.slice(-20);
          await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limitedItems));
          devLog.warn('🛒 [CartContext] Limited cart to 20 items to save storage space');
          return;
        }
      }
      
      await AsyncStorage.setItem(CART_STORAGE_KEY, cartData);
    } catch (error: any) {
      // Handle quota exceeded error - don't throw, just log
      if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
        devLog.warn('🛒 [CartContext] Storage quota exceeded, attempting to clean up...');
        
        try {
          // Aggressively clean up storage first
          const storageKeysToClean = [
            '@errorReporter:errors',
            '@billUpload:analytics:events',
            '@billUpload:queue',
            '@billUpload:state',
          ];
          
          for (const key of storageKeysToClean) {
            try {
              await AsyncStorage.removeItem(key);
            } catch (cleanupError) {
              // Ignore cleanup errors for individual keys
            }
          }
          
          // Try to save only essential items (last 15 items - very aggressive)
          const optimizedItems = optimizeCartForStorage(state.items);
          const limitedItems = optimizedItems.slice(-15);
          await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limitedItems));
          devLog.warn('🛒 [CartContext] Saved only last 15 items after cleanup');
        } catch (retryError) {
          // If still fails, just log - don't throw
          // Cart is still in memory, will sync with backend
          devLog.warn('🛒 [CartContext] Storage completely full, cart kept in memory only');
          // Try to clear cart storage to free space
          try {
            await AsyncStorage.removeItem(CART_STORAGE_KEY);
          } catch (clearError) {
            // Ignore - storage is full, can't do anything
          }
        }
      } else {
        // For non-quota errors, just log - don't throw
        devLog.warn('🛒 [CartContext] Failed to save cart to storage (non-quota):', error);
      }
    }
  }, [state.items, optimizeCartForStorage]);

  const addItem = async (item: CartItemType) => {
    try {
      // Extract metadata for event handling
      const itemMetadata = (item as any).metadata;

      // Invalidate cache on cart add
      await (await getCacheService()).invalidateByEvent({ type: 'cart:add' });

      // Update UI optimistically - reducer will handle the state update
      // Make sure metadata is preserved - explicitly spread metadata
      const itemWithMetadata = {
        ...item,
        metadata: itemMetadata, // Explicitly preserve metadata
      };
      dispatch({ type: 'ADD_ITEM', payload: itemWithMetadata });

      // Track add_to_cart event
      try { analytics.trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, { productId: item.id, productName: item.name, price: item.price, quantity: 1, totalValue: item.price }); } catch {}

      // Calculate new items (same logic as reducer)
      const currentItems = state.items;
      const existingItem = currentItems.find(i => i.id === item.id);
      let newItems: CartItemWithQuantity[];
      
      if (existingItem) {
        newItems = currentItems.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1, metadata: itemMetadata || i.metadata }
            : i
        );
      } else {
        const newItem: CartItemWithQuantity = {
          ...item,
          productId: item.id, // Ensure productId is set for cart item lookup
          quantity: 1,
          selected: true,
          addedAt: new Date().toISOString(),
          metadata: itemMetadata, // Preserve metadata
        };
        newItems = [...currentItems, newItem];
      }
      
      // Save to AsyncStorage immediately to persist (with optimization)
      // Don't let storage errors break the addItem flow - wrap in separate async function
      // Use .catch() to ensure errors never propagate
      (async () => {
        try {
          const optimizedItems = optimizeCartForStorage(newItems);
          const cartData = JSON.stringify(optimizedItems);
          
          // Check size before saving
          const sizeInMB = estimateStringSize(cartData) / (1024 * 1024);
          if (sizeInMB > 3) { // Lower threshold to 3MB
            devLog.warn('🛒 [CartContext] Cart data too large, limiting to last 20 items');
            const limitedItems = optimizedItems.slice(-20);
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limitedItems));
          } else {
            await AsyncStorage.setItem(CART_STORAGE_KEY, cartData);
          }
        } catch (error: any) {
          // Handle quota exceeded error - don't throw, just log
          if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
            devLog.warn('🛒 [CartContext] Storage quota exceeded when adding item (handled gracefully)');
            
            // Aggressively clean up storage
            try {
              const storageKeysToClean = [
                '@errorReporter:errors',
                '@billUpload:analytics:events',
                '@billUpload:queue',
                '@billUpload:state',
              ];
              
              for (const key of storageKeysToClean) {
                try {
                  await AsyncStorage.removeItem(key);
                } catch (cleanupError) {
                  // Ignore cleanup errors
                }
              }
              
              // Also cleanup analytics events to free more space
              try {
                await (await getBillAnalytics()).cleanupOldEvents(100);
              } catch (analyticsError) {
                // Ignore analytics cleanup errors
              }
              
              // Try to save only last 15 items (very aggressive)
              const optimizedItems = optimizeCartForStorage(newItems);
              const limitedItems = optimizedItems.slice(-15);
              await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(limitedItems));
              devLog.warn('🛒 [CartContext] Saved only last 15 items after cleanup');
            } catch (retryError) {
              // If still fails, just log - don't throw
              // Item is already in state, will sync with backend
              devLog.warn('🛒 [CartContext] Storage completely full, item added to memory only');
            }
          } else {
            // For non-quota errors, just log - don't throw
            devLog.warn('🛒 [CartContext] Failed to save to storage (non-quota):', error);
          }
        }
      })().catch(() => {
        // Final safety net - ensure no errors propagate
        // This should never be reached, but just in case
      });

      // Check if online
      if (state.isOnline) {
        // Sync with backend (but don't reload if it fails - keep local state)
        try {
          // For events, extract the actual eventId from metadata
          // The item.id might be "eventId_slotId" format, but backend needs just eventId
          const itemMetadata = (item as any).metadata;
          let productIdForBackend = item.id;
          
          // ALWAYS extract from composite ID if it contains underscore
          // This is the most reliable way since metadata might not be preserved
          if (item.id && String(item.id).includes('_')) {
            // Extract eventId from composite ID (before underscore)
            // Format: "eventId_slotId" -> "eventId"
            const parts = String(item.id).split('_');
            productIdForBackend = parts[0]; // Take first part (eventId)
          } else if (itemMetadata?.eventId) {
            // Use eventId from metadata if available (fallback)
            productIdForBackend = String(itemMetadata.eventId);
          }
          
          // Validate productId is hexadecimal (backend requirement)
          const isValidHex = /^[0-9a-fA-F]+$/.test(String(productIdForBackend));
          if (!isValidHex) {
            // If not valid hex, try extracting from composite ID again
            if (item.id && String(item.id).includes('_')) {
              const parts = String(item.id).split('_');
              productIdForBackend = parts[0];
            }
            // If still not valid, log warning
            if (!/^[0-9a-fA-F]+$/.test(String(productIdForBackend))) {
              devLog.error('❌ [CartContext] Invalid productId format:', productIdForBackend);
            }
          }
          
          // Final validation - ensure productId is valid hex
          const finalProductId = String(productIdForBackend).trim();
          if (!/^[0-9a-fA-F]+$/.test(finalProductId)) {
            devLog.error('❌ [CartContext] Invalid productId, cannot send to backend:', finalProductId);
            throw new Error(`Invalid productId format: ${finalProductId}. Must be hexadecimal.`);
          }
          
          // Backend doesn't accept metadata field, so only send productId and quantity
          // Metadata is preserved in local cart state for UI display
          const requestData = {
            productId: finalProductId,
            quantity: 1,
          };
          
          const response = await cartService.addToCart(requestData);

          if (response.success && response.data) {
            // Only reload if backend sync succeeds
            await loadCart();
          }
        } catch (apiError) {
          devLog.error('🛒 [CartContext] API add failed, queuing for later:', apiError);
          // Queue for offline sync but keep local state
          await offlineQueueService.addToQueue('add', {
            productId: item.id,
            quantity: 1,
            // Don't include variant since CartItem type doesn't have it
          });
        }
      } else {
        // Queue for offline sync
        await offlineQueueService.addToQueue('add', {
          productId: item.id,
          quantity: 1,
          // Don't include variant since CartItem type doesn't have it
        });
      }
    } catch (error: any) {
      // Don't log quota errors as failures - they're handled gracefully
      if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
        devLog.warn('🛒 [CartContext] Storage quota issue (item still added to state)');
        // Item is already in state, so don't dispatch error
      } else {
        devLog.error('🛒 [CartContext] Failed to add item:', error);
        dispatch({
          type: 'CART_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to add item'
        });
      }
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      // Find the item to get its productId and variant
      const item = state.items.find(i => i.id === itemId);

      if (!item) {
        devLog.error('🛒 [CartContext] Item not found in cart:', itemId);
        devLog.error('🛒 [CartContext] Available item IDs:', state.items.map(i => i.id));
        return;
      }

      // Invalidate cache on cart remove
      await (await getCacheService()).invalidateByEvent({ type: 'cart:remove' });

      // Optimistic update
      dispatch({ type: 'REMOVE_ITEM', payload: itemId });

      // Sync with backend using productId (not cart item id)
      try {
        const productIdToRemove = item.productId || itemId;

        const response = await cartService.removeCartItem(
          productIdToRemove,
          item.variant
        );
        if (response.success) {

          // Reload cart to ensure sync with backend
          await loadCart();
        } else {
          devLog.error('🛒 [CartContext] API remove failed, response not successful:', response);
          // Revert optimistic update by reloading
          await loadCart();
        }
      } catch (apiError) {
        devLog.error('🛒 [CartContext] API remove failed with error:', apiError);
        // Revert optimistic update by reloading cart from backend
        await loadCart();
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to remove item:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to remove item'
      });
      // Reload to get correct state
      await loadCart();
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {

      // Find the item to get its productId
      const item = state.items.find(i => i.id === itemId);
      if (!item) {
        devLog.error('🛒 [CartContext] Item not found in cart:', itemId);
        return;
      }

      const productId = item.productId || itemId;

      // Invalidate cache on cart update
      await (await getCacheService()).invalidateByEvent({ type: 'cart:update' });

      // Optimistic update
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });

      // Sync with backend using productId (not cart item id)
      try {
        if (quantity > 0) {
          const response = await cartService.updateCartItem(
            productId,
            { quantity },
            item.variant
          );
          if (response.success) {

            // Reload cart to ensure sync with backend
            await loadCart();
          } else {
            devLog.error('🛒 [CartContext] API update failed, response not successful');
            // Revert optimistic update by reloading
            await loadCart();
          }
        } else {
          // Remove item if quantity is 0
          await removeItem(itemId);
        }
      } catch (apiError) {
        devLog.error('🛒 [CartContext] API update failed with error:', apiError);
        // Revert optimistic update by reloading cart from backend
        await loadCart();
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to update quantity:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update quantity'
      });
      // Reload to get correct state
      await loadCart();
    }
  };

  const toggleItemSelection = (itemId: string) => {
    dispatch({ type: 'TOGGLE_ITEM_SELECTION', payload: itemId });
  };

  const selectAllItems = (selected: boolean) => {
    dispatch({ type: 'SELECT_ALL_ITEMS', payload: selected });
  };

  const clearCart = async () => {
    try {

      // Invalidate cache on cart clear
      await (await getCacheService()).invalidateByEvent({ type: 'cart:clear' });

      // Clear local state
      dispatch({ type: 'CLEAR_CART' });
      await AsyncStorage.removeItem(CART_STORAGE_KEY);

      // Clear backend cart
      try {
        await cartService.clearCart();

      } catch (apiError) {
        devLog.error('🛒 [CartContext] API clear failed:', apiError);
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to clear cart:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to clear cart'
      });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Utility functions
  const getSelectedItems = (): CartItemWithQuantity[] => {
    return state.items.filter(item => item.selected);
  };

  const isItemInCart = (itemId: string): boolean => {
    return state.items.some(item => item.id === itemId);
  };

  const getItemQuantity = (itemId: string): number => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  const applyCoupon = async (couponCode: string) => {
    try {

      const response = await cartService.applyCoupon({ couponCode });

      if (response.success && response.data) {

        await loadCart(); // Reload to get updated totals
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to apply coupon:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to apply coupon'
      });
      throw error;
    }
  };

  const removeCoupon = async () => {
    try {

      const response = await cartService.removeCoupon();

      if (response.success && response.data) {

        await loadCart(); // Reload to get updated totals
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to remove coupon:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to remove coupon'
      });
      throw error;
    }
  };

  const setCardOffer = useCallback(async (offer: any) => {
    try {
      dispatch({ type: 'SET_CARD_OFFER', payload: offer });
      
      // If offer has a code, apply it as coupon
      if (offer.code && typeof applyCoupon === 'function') {
        await applyCoupon(offer.code);
      }
    } catch (error) {
      devLog.error('🛒 [CartContext] Failed to set card offer:', error);
      throw error;
    }
  }, []);

  const removeCardOffer = useCallback(() => {
    dispatch({ type: 'REMOVE_CARD_OFFER' });
  }, []);

  const setDineInContext = useCallback((ctx: DineInContext | undefined) => {
    dispatch({ type: 'SET_DINE_IN_CONTEXT', payload: ctx });
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      if (!state.isOnline) {

        return;
      }

      dispatch({ type: 'CART_LOADING', payload: true });

      // Process offline queue
      const result = await offlineQueueService.processQueue();

      if (result.success) {

        // Reload cart from server
        await loadCart();
      } else {
        devLog.error('🔄 [CartContext] Sync partially failed:', result);
        dispatch({
          type: 'CART_ERROR',
          payload: `Failed to sync ${result.failed} operations`
        });
      }
    } catch (error) {
      devLog.error('🔄 [CartContext] Sync error:', error);
      dispatch({
        type: 'CART_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to sync'
      });
    } finally {
      dispatch({ type: 'CART_LOADING', payload: false });
    }
  }, [state.isOnline, loadCart]);

  // Effects - Run after function definitions
  // Load cart only when user is authenticated and onboarded
  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (!authIsLoading && authIsAuthenticated && authUser?.isOnboarded) {
      loadCart();
    }
  }, [authIsLoading, authIsAuthenticated, authUser?.isOnboarded, loadCart]);

  // Monitor network status (deferred import)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    getNetInfo().then(NetInfo => {
      if (!isMounted) return; // Prevent listener setup after unmount
      unsubscribe = NetInfo.addEventListener(netState => {
        if (!isMounted) return;
        const isOnline = netState.isConnected ?? false;
        dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline });

        if (isOnline && offlineQueueService.hasPendingOperations()) {
          syncWithServer();
        }
      });

      // Initial check
      NetInfo.fetch().then(netState => {
        if (isMounted) {
          dispatch({ type: 'SET_ONLINE_STATUS', payload: netState.isConnected ?? false });
        }
      });
    }).catch((err) => {
  console.error('[CartContext] Error:', err);
});

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [syncWithServer]);

  // Save cart to storage whenever it changes (debounced to avoid rapid I/O)
  const cartSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.lastUpdated) {
      if (cartSaveTimerRef.current) clearTimeout(cartSaveTimerRef.current);
      cartSaveTimerRef.current = setTimeout(() => {
        saveCartToStorage().catch(() => {
          // Silently handle - errors already handled in saveCartToStorage
        });
      }, 500);
    }
    return () => {
      if (cartSaveTimerRef.current) clearTimeout(cartSaveTimerRef.current);
    };
  }, [state.items, state.lastUpdated, saveCartToStorage]);

  // Update pending sync status (check every 10s instead of 1s to reduce overhead)
  const pendingSyncRef = useRef(state.pendingSync);
  pendingSyncRef.current = state.pendingSync;
  useEffect(() => {
    const interval = setInterval(() => {
      const hasPending = offlineQueueService.hasPendingOperations();
      // Only dispatch if value changed to avoid unnecessary re-renders
      if (hasPending !== pendingSyncRef.current) {
        dispatch({ type: 'SET_PENDING_SYNC', payload: hasPending });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Stable-ref pattern: prevent all consumers from re-rendering when action identities change
  const cartActionsRef = useRef({
    loadCart, addItem, removeItem, updateQuantity, toggleItemSelection,
    selectAllItems, clearCart, clearError, getSelectedItems, isItemInCart,
    getItemQuantity, applyCoupon, removeCoupon, setCardOffer, removeCardOffer,
    setDineInContext, syncWithServer,
  });
  cartActionsRef.current = {
    loadCart, addItem, removeItem, updateQuantity, toggleItemSelection,
    selectAllItems, clearCart, clearError, getSelectedItems, isItemInCart,
    getItemQuantity, applyCoupon, removeCoupon, setCardOffer, removeCardOffer,
    setDineInContext, syncWithServer,
  };

  const stableCartActions = useMemo(() => ({
    loadCart: (...args: Parameters<typeof loadCart>) => cartActionsRef.current.loadCart(...args),
    addItem: (...args: Parameters<typeof addItem>) => cartActionsRef.current.addItem(...args),
    removeItem: (...args: Parameters<typeof removeItem>) => cartActionsRef.current.removeItem(...args),
    updateQuantity: (...args: Parameters<typeof updateQuantity>) => cartActionsRef.current.updateQuantity(...args),
    toggleItemSelection: (...args: Parameters<typeof toggleItemSelection>) => cartActionsRef.current.toggleItemSelection(...args),
    selectAllItems: (...args: Parameters<typeof selectAllItems>) => cartActionsRef.current.selectAllItems(...args),
    clearCart: () => cartActionsRef.current.clearCart(),
    clearError: () => cartActionsRef.current.clearError(),
    getSelectedItems: () => cartActionsRef.current.getSelectedItems(),
    isItemInCart: (...args: Parameters<typeof isItemInCart>) => cartActionsRef.current.isItemInCart(...args),
    getItemQuantity: (...args: Parameters<typeof getItemQuantity>) => cartActionsRef.current.getItemQuantity(...args),
    applyCoupon: (...args: Parameters<typeof applyCoupon>) => cartActionsRef.current.applyCoupon(...args),
    removeCoupon: () => cartActionsRef.current.removeCoupon(),
    setCardOffer: (...args: Parameters<typeof setCardOffer>) => cartActionsRef.current.setCardOffer(...args),
    removeCardOffer: () => cartActionsRef.current.removeCardOffer(),
    setDineInContext: (...args: Parameters<typeof setDineInContext>) => cartActionsRef.current.setDineInContext(...args),
    syncWithServer: () => cartActionsRef.current.syncWithServer(),
  }), []);

  const stableRefreshCart = useMemo(() => (...args: Parameters<typeof loadCart>) => cartActionsRef.current.loadCart(...args), []);

  const contextValue: CartContextType = useMemo(() => ({
    state,
    refreshCart: stableRefreshCart,
    actions: stableCartActions,
  }), [state, stableRefreshCart, stableCartActions]);

  // Sync to Zustand store for crash-safe fallback
  const _setFromProvider = useCartStore((s) => s._setFromProvider);
  useEffect(() => {
    _setFromProvider(contextValue);
  }, [contextValue, _setFromProvider]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Hook
const CART_DEFAULTS: CartContextType = {
  state: initialState,
  refreshCart: async () => {},
  actions: {
    loadCart: async () => {},
    addItem: async () => {},
    removeItem: async () => {},
    updateQuantity: async () => {},
    toggleItemSelection: () => {},
    selectAllItems: () => {},
    clearCart: async () => {},
    clearError: () => {},
    getSelectedItems: () => [],
    isItemInCart: () => false,
    getItemQuantity: () => 0,
    applyCoupon: async () => {},
    removeCoupon: async () => {},
    setCardOffer: async () => {},
    removeCardOffer: () => {},
    setDineInContext: () => {},
    syncWithServer: async () => {},
  },
};

// Hook — falls back to Zustand store for crash safety when outside Provider
export function useCart() {
  const context = useContext(CartContext);
  const storeState = useCartStore((s) => s.state);
  const storeRefreshCart = useCartStore((s) => s.refreshCart);
  const storeActions = useCartStore((s) => s.actions);

  if (context !== undefined) {
    return context;
  }

  // Fallback to Zustand store (populated by Provider elsewhere in the tree)
  return { state: storeState, refreshCart: storeRefreshCart, actions: storeActions };
}

export { CartContext };