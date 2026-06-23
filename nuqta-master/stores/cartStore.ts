import { create } from 'zustand';
import { CartItem as CartItemType } from '@/types/cart';

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
  addItem: noopAsync,
  removeItem: noopAsync,
  updateQuantity: noopAsync,
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
