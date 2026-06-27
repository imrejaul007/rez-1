import { create } from 'zustand';
import { CartItem as CartItemType } from '@/types/cart';
import { cartApi } from '@/services/cartApi';
import { useToastStore } from './toastStore';

// ---------------------------------------------------------------------------
// State types (mirrors CartContext)
// ---------------------------------------------------------------------------
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

interface CartActions {
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
}

interface CartContextShape {
  state: CartState;
  refreshCart: () => Promise<void>;
  actions: CartActions;
}

interface CartStoreState extends CartContextShape {
  _setFromProvider: (data: CartContextShape) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
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

const noopAsync = async () => {};
const noop = () => {};

const defaultActions: CartActions = {
  loadCart: noopAsync,
  addItem: async (item: CartItemType): Promise<void> => {
    const { state } = useCartStore.getState();

    // 1. Create optimistic item with temp ID
    const optimisticItem: CartItemWithQuantity = {
      ...item,
      quantity: item.quantity || 1,
      selected: true,
      addedAt: new Date().toISOString(),
      productId: item.id,
      id: `temp-${Date.now()}`,
    };

    // 2. Optimistic update - immediately add to UI
    const itemPrice = item.discountedPrice || item.originalPrice || item.price || 0;
    const itemQuantity = item.quantity || 1;
    useCartStore.setState(s => ({
      state: {
        ...s.state,
        items: [...s.state.items, optimisticItem],
        totalItems: s.state.totalItems + itemQuantity,
        totalPrice: s.state.totalPrice + (itemPrice * itemQuantity),
      }
    }));

    try {
      // 3. Server call
      const response = await cartApi.addToCart({
        productId: item.id,
        quantity: itemQuantity,
        itemType: item.itemType as 'product' | 'service' | 'event' | undefined,
        variant: item.variant,
        metadata: item.metadata,
      });

      // 4. On success - replace temp ID with real ID
      if (response.success && response.data?.items) {
        const serverItem = response.data.items.find(
          (i: any) => i.product?._id === item.id || i.product?._id === item.productId
        );
        if (serverItem) {
          const realId = serverItem._id || serverItem.id;
          useCartStore.setState(s => ({
            state: {
              ...s.state,
              items: s.state.items.map(i =>
                i.id === optimisticItem.id ? { ...i, id: realId } : i
              ),
            }
          }));
        }
      }
    } catch (error) {
      // 5. Rollback on failure
      useCartStore.setState(s => ({
        state: {
          ...s.state,
          items: s.state.items.filter(i => i.id !== optimisticItem.id),
          totalItems: s.state.totalItems - itemQuantity,
          totalPrice: s.state.totalPrice - (itemPrice * itemQuantity),
          error: 'Failed to add item to cart',
        }
      }));
      // Show toast
      useToastStore.getState().showToast('Failed to add item to cart', 'error');
      throw error;
    }
  },

  removeItem: async (itemId: string): Promise<void> => {
    const { state } = useCartStore.getState();

    // Find the item to remove
    const itemToRemove = state.items.find(i => i.id === itemId);
    if (!itemToRemove) return;

    const itemPrice = itemToRemove.discountedPrice || itemToRemove.originalPrice || itemToRemove.price || 0;

    // 1. Optimistic update - immediately remove from UI
    useCartStore.setState(s => ({
      state: {
        ...s.state,
        items: s.state.items.filter(i => i.id !== itemId),
        totalItems: s.state.totalItems - itemToRemove.quantity,
        totalPrice: s.state.totalPrice - (itemPrice * itemToRemove.quantity),
      }
    }));

    try {
      // 2. Server call
      const productId = itemToRemove.productId || itemId;
      await cartApi.removeCartItem(productId, itemToRemove.variant);
    } catch (error) {
      // 3. Rollback on failure
      useCartStore.setState(s => ({
        state: {
          ...s.state,
          items: [...s.state.items, itemToRemove],
          totalItems: s.state.totalItems + itemToRemove.quantity,
          totalPrice: s.state.totalPrice + (itemPrice * itemToRemove.quantity),
          error: 'Failed to remove item from cart',
        }
      }));
      // Show toast
      useToastStore.getState().showToast('Failed to remove item from cart', 'error');
      throw error;
    }
  },

  updateQuantity: async (itemId: string, quantity: number): Promise<void> => {
    const { state } = useCartStore.getState();

    // Find the item to update
    const itemToUpdate = state.items.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    const itemPrice = itemToUpdate.discountedPrice || itemToUpdate.originalPrice || itemToUpdate.price || 0;
    const oldQuantity = itemToUpdate.quantity;
    const quantityDiff = quantity - oldQuantity;

    // 1. Optimistic update - immediately update quantity
    useCartStore.setState(s => ({
      state: {
        ...s.state,
        items: s.state.items.map(i =>
          i.id === itemId ? { ...i, quantity } : i
        ),
        totalItems: s.state.totalItems + quantityDiff,
        totalPrice: s.state.totalPrice + (itemPrice * quantityDiff),
      }
    }));

    try {
      // 2. Server call (if quantity > 0, otherwise remove)
      if (quantity > 0) {
        const productId = itemToUpdate.productId || itemId;
        await cartApi.updateCartItem(productId, { quantity }, itemToUpdate.variant);
      } else {
        // Remove item if quantity is 0
        const productId = itemToUpdate.productId || itemId;
        await cartApi.removeCartItem(productId, itemToUpdate.variant);
      }
    } catch (error) {
      // 3. Rollback on failure
      useCartStore.setState(s => ({
        state: {
          ...s.state,
          items: s.state.items.map(i =>
            i.id === itemId ? { ...i, quantity: oldQuantity } : i
          ),
          totalItems: s.state.totalItems - quantityDiff,
          totalPrice: s.state.totalPrice - (itemPrice * quantityDiff),
          error: 'Failed to update item quantity',
        }
      }));
      // Show toast
      useToastStore.getState().showToast('Failed to update item quantity', 'error');
      throw error;
    }
  },

  toggleItemSelection: noop,
  selectAllItems: noop,
  clearCart: noopAsync,
  clearError: noop,
  getSelectedItems: () => [],
  isItemInCart: () => false,
  getItemQuantity: () => 0,
  applyCoupon: noopAsync,
  removeCoupon: noopAsync,
  setCardOffer: noopAsync,
  removeCardOffer: noop,
  setDineInContext: noop,
  syncWithServer: noopAsync,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useCartStore = create<CartStoreState>((set) => ({
  state: initialState,
  refreshCart: noopAsync,
  actions: defaultActions,

  // Called by CartProvider on every render to keep store in sync
  _setFromProvider: (data: CartContextShape) => {
    set({ state: data.state, refreshCart: data.refreshCart, actions: data.actions });
  },
}));
