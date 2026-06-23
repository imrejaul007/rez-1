// types/cart.ts - TypeScript definitions for Cart functionality

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // Original price before discount
  discountedPrice?: number; // Discounted price if applicable
  discount?: number; // Lock fee discount (only applies to lockedQuantity items)
  lockedQuantity?: number; // Number of items that have lock fee applied
  image: string | number; // string for URL, number for require()
  cashback: string;
  category: 'products' | 'service';
  quantity?: number; // Quantity in cart
  selected?: boolean; // Selection state for bulk operations
  inventory?: {
    stock: number;
    lowStockThreshold?: number;
    trackQuantity?: boolean; // Whether to track quantity for this item
    allowBackorder?: boolean; // Whether backorders are allowed
    reservedCount?: number; // Number of items reserved by other users
  };
  availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  metadata?: {
    // For event items
    slotTime?: string;
    location?: string;
    date?: string;
    // Other metadata as needed
    [key: string]: any;
  };
}

export interface LockedProduct {
  id: string;
  productId: string; // Original product ID from StorePage
  name: string;
  price: number;
  image: string | number;
  cashback: string;
  category: 'products' | 'service';
  lockedAt: Date; // When the item was locked
  expiresAt: Date; // When the lock expires
  remainingTime: number; // Remaining time in milliseconds
  lockDuration: number; // Original lock duration in milliseconds (default 15min)
  status: 'active' | 'expiring' | 'expired'; // Lock status for UI styling
}

export interface CartState {
  products: CartItem[];
  services: CartItem[];
  lockedProducts: LockedProduct[]; // NEW: Locked products array
  activeTab: 'products' | 'service' | 'lockedproduct';
}

export type TabType = 'products' | 'service' | 'lockedproduct';

// Component Props Interfaces
export interface CartPageProps {
  navigation?: any; // React Navigation type
  route?: any;
}

export interface CartHeaderProps {
  onBack: () => void;
  title?: string;
}

export interface SlidingTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs?: TabData[];
}

export interface TabData {
  key: TabType;
  title: string;
  icon: string;
}

export interface CartItemProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  showAnimation?: boolean;
  hideQuantityControls?: boolean; // For services where quantity is always 1
}

export interface LockedProductItemProps {
  item: LockedProduct;
  onUnlock: (id: string) => void;
  onExpire: (id: string) => void;
  showAnimation?: boolean;
}

export interface PriceSectionProps {
  totalPrice: number;
  onBuyNow: () => void;
  itemCount?: number;
  loading?: boolean;
}

// Animation Configuration
export interface AnimationConfig {
  duration: number;
  easing: any;
  useNativeDriver: boolean;
}

// Event Handler Types
export type RemoveItemHandler = (id: string) => void;
export type TabChangeHandler = (tab: TabType) => void;
export type BuyNowHandler = () => void;
export type UnlockItemHandler = (id: string) => void;
export type ExpireItemHandler = (id: string) => void;
export type LockItemHandler = (productId: string, productData: any) => void;

// State Updater Types
export type CartUpdater = (updater: (prev: CartState) => CartState) => void;

// Lock Configuration Constants
export const LOCK_CONFIG = {
  DEFAULT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  WARNING_THRESHOLD: 2 * 60 * 1000, // Show warning when 2 minutes remaining
  CRITICAL_THRESHOLD: 30 * 1000, // Critical warning at 30 seconds
  UPDATE_INTERVAL: 1000, // Update timer every second
} as const;

// Lock Status Thresholds
export const getLockStatus = (remainingTime: number): 'active' | 'expiring' | 'expired' => {
  if (remainingTime <= 0) return 'expired';
  if (remainingTime <= LOCK_CONFIG.WARNING_THRESHOLD) return 'expiring';
  return 'active';
};

// Style Types
export interface ResponsiveValues {
  headerHeight: number;
  tabHeight: number;
  itemHeight: number;
  bottomHeight: number;
  padding: number;
  margin: number;
  fontSize: {
    title: number;
    subtitle: number;
    price: number;
  };
}