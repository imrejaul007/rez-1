// TypeScript interfaces for StoreActionButtons component

export type StoreType = 'PRODUCT' | 'SERVICE';

// ============================================
// STORE ACTION BUTTON CONFIGURATION FROM BACKEND
// ============================================

// Button destination types
export type ActionButtonDestinationType = 'phone' | 'url' | 'maps' | 'internal';

// Button IDs
export type ActionButtonId = 'call' | 'product' | 'location' | 'custom' | 'pay';

// Single button configuration from store
export interface StoreActionButtonConfig {
  id: ActionButtonId;
  enabled: boolean;
  label?: string;
  destination?: {
    type: ActionButtonDestinationType;
    value: string;
  };
  order?: number;
}

// Full action buttons configuration from store
export interface StoreActionButtonsConfigFromStore {
  enabled: boolean;
  buttons: StoreActionButtonConfig[];
}

// Store data needed for button handlers
export interface StoreDataForButtons {
  storeId?: string;
  storeName?: string;
  phone?: string;
  location?: {
    address?: string;
    city?: string;
    coordinates?: [number, number];
  };
  name?: string;
}

export type ButtonState = 'enabled' | 'disabled' | 'loading';

export interface StoreActionButtonsProps {
  // Core configuration
  storeType: StoreType;

  // Store action button configuration from backend
  storeActionConfig?: StoreActionButtonsConfigFromStore;
  storeData?: StoreDataForButtons;

  // Dynamic data support
  dynamicData?: {
    title?: string;
    price?: number;
    merchant?: string;
    [key: string]: any;
  } | null;
  
  // Button handlers
  onBuyPress?: () => void | Promise<void>;
  onLockPress?: () => void | Promise<void>;
  onBookingPress?: () => void | Promise<void>;
  
  // Button states
  buyButtonState?: ButtonState;
  lockButtonState?: ButtonState;
  bookingButtonState?: ButtonState;
  
  // Loading states for individual buttons
  isBuyLoading?: boolean;
  isLockLoading?: boolean;
  isBookingLoading?: boolean;
  
  // Disabled states for individual buttons
  isBuyDisabled?: boolean;
  isLockDisabled?: boolean;
  isBookingDisabled?: boolean;

  // Lock status
  isLocked?: boolean; // Whether product is already locked

  // Customization
  showBookingButton?: boolean; // Override for conditional rendering
  customBuyText?: string;
  customLockText?: string;
  customBookingText?: string;

  // Styling
  containerStyle?: any; // ViewStyle
  buttonStyle?: any; // ViewStyle
  textStyle?: any; // TextStyle
}

export interface ActionButtonConfig {
  id: 'buy' | 'lock' | 'booking';
  title: string;
  iconName: string; // Ionicons name
  onPress: () => void | Promise<void>;
  isVisible: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  backgroundColor: readonly [string, string, ...string[]];
  textColor: string;
}

// Mock data interfaces
export interface MockStoreData {
  id: string;
  name: string;
  type: StoreType;
  category: string;
  isOpen: boolean;
  location: string;
}

export interface MockProductData {
  id: string;
  title: string;
  price: string;
  isAvailable: boolean;
  canBeLocked: boolean;
  hasBookingOption: boolean;
}

// Button interaction results
export interface ButtonActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// Component state interface
export interface StoreActionButtonsState {
  activeButton: 'buy' | 'lock' | 'booking' | null;
  loadingStates: {
    buy: boolean;
    lock: boolean;
    booking: boolean;
  };
  errorStates: {
    buy: string | null;
    lock: string | null;
    booking: string | null;
  };
}