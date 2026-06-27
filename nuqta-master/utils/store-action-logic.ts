// Conditional rendering logic for StoreActionButtons

import { Linking, Platform } from 'react-native';
import {
  StoreType,
  ActionButtonConfig,
  StoreActionButtonsProps,
  StoreActionButtonsConfigFromStore,
  StoreActionButtonConfig,
  StoreDataForButtons,
  ActionButtonId,
} from '@/types/store-actions';
import { colors } from '@/constants/theme';
import { safeOpenURL } from '@/utils/linking';

// Schemes used by store-action destinations (call, maps, web).
// Includes `telprompt:` (iOS call) and `maps:` (iOS native maps app) which
// aren't in the default safeOpenURL allow-list.
const STORE_ACTION_ALLOWED_SCHEMES = [
  'https:',
  'tel:',
  'telprompt:',
  'mailto:',
  'geo:',
  'maps:',
  'sms:',
] as const;

/**
 * Determines which buttons should be visible based on store type
 */
export function getVisibleButtons(storeType: StoreType, showBookingButton?: boolean): {
  showBuy: boolean;
  showLock: boolean;
  showBooking: boolean;
} {
  const baseButtons = {
    showBuy: true,
    showLock: true,
    showBooking: false,
  };

  switch (storeType) {
    case 'PRODUCT':
      return {
        showBuy: true,
        showLock: true,
        showBooking: showBookingButton || false, // Override available but defaults to false
      };
    
    case 'SERVICE':
      return {
        showBuy: false, // Hide Buy button for services
        showLock: true,
        showBooking: true, // Show Booking instead of Buy
      };
    
    default:
      return baseButtons;
  }
}

/**
 * Creates button configuration array based on props and store type
 */
export function createButtonConfigs(props: StoreActionButtonsProps): ActionButtonConfig[] {
  const visibility = getVisibleButtons(props.storeType, props.showBookingButton);
  
  const configs: ActionButtonConfig[] = [];

  // Buy Button
  if (visibility.showBuy) {
    configs.push({
      id: 'buy',
      title: props.customBuyText || 'Buy',
      iconName: 'card-outline',
      onPress: props.onBuyPress || (() => {}),
      isVisible: true,
      isEnabled: !props.isBuyDisabled && props.buyButtonState !== 'disabled',
      isLoading: props.isBuyLoading || props.buyButtonState === 'loading',
      backgroundColor: ['#10B981', '#047857'] as const, // Enhanced green gradient for buy
      textColor: '#FFFFFF',
    });
  }

  // Lock Button
  if (visibility.showLock) {
    configs.push({
      id: 'lock',
      title: props.customLockText || 'Lock',
      iconName: 'lock-closed-outline',
      onPress: props.onLockPress || (() => {}),
      isVisible: true,
      isEnabled: !props.isLockDisabled && props.lockButtonState !== 'disabled',
      isLoading: props.isLockLoading || props.lockButtonState === 'loading',
      backgroundColor: ['#FFC857', colors.warning] as const, // ReZ Gold gradient for lock (premium action)
      textColor: '#0B2240', // Midnight Navy for contrast on gold
    });
  }

  // Booking Button (conditional)
  if (visibility.showBooking) {
    configs.push({
      id: 'booking',
      title: props.customBookingText || 'Booking',
      iconName: 'calendar-outline',
      onPress: props.onBookingPress || (() => {}),
      isVisible: true,
      isEnabled: !props.isBookingDisabled && props.bookingButtonState !== 'disabled',
      isLoading: props.isBookingLoading || props.bookingButtonState === 'loading',
      backgroundColor: ['#00C06A', '#00796B'] as const, // ReZ Green gradient for booking
      textColor: '#FFFFFF',
    });
  }

  return configs;
}

/**
 * Determines button layout based on number of visible buttons and screen width
 */
export function getButtonLayout(buttonCount: number, screenWidth?: number): {
  flexDirection: 'row' | 'column';
  buttonWidth: string;
  containerPadding: number;
  buttonGap: number;
} {
  const isSmallScreen = screenWidth ? screenWidth < 360 : false;
  const isVerySmallScreen = screenWidth ? screenWidth < 320 : false;
  
  switch (buttonCount) {
    case 1:
      return {
        flexDirection: 'row',
        buttonWidth: '100%',
        containerPadding: 16,
        buttonGap: 0,
      };
    
    case 2:
      if (isVerySmallScreen) {
        return {
          flexDirection: 'column',
          buttonWidth: '100%',
          containerPadding: 16,
          buttonGap: 12,
        };
      }
      return {
        flexDirection: 'row',
        buttonWidth: isSmallScreen ? '48.5%' : '48%',
        containerPadding: isSmallScreen ? 14 : 18,
        buttonGap: isSmallScreen ? 10 : 12,
      };
    
    case 3:
      if (isVerySmallScreen) {
        return {
          flexDirection: 'column',
          buttonWidth: '100%',
          containerPadding: 12,
          buttonGap: 8,
        };
      }
      if (isSmallScreen) {
        return {
          flexDirection: 'column',
          buttonWidth: '100%',
          containerPadding: 12,
          buttonGap: 6,
        };
      }
      return {
        flexDirection: 'row',
        buttonWidth: '32%',
        containerPadding: 12,
        buttonGap: 8,
      };
    
    default:
      return {
        flexDirection: 'row',
        buttonWidth: '32%',
        containerPadding: 16,
        buttonGap: 12,
      };
  }
}

/**
 * Validates button configuration
 */
export function validateButtonConfig(config: ActionButtonConfig): boolean {
  return !!(
    config.id &&
    config.title &&
    config.iconName &&
    typeof config.onPress === 'function' &&
    config.backgroundColor?.length > 0
  );
}

/**
 * Gets appropriate disabled styling based on button state
 */
export function getDisabledStyling(isEnabled: boolean, isLoading: boolean) {
  if (!isEnabled && !isLoading) {
    return {
      opacity: 0.5,
      backgroundColor: ['#9CA3AF', '#6B7280'] as const, // Gray gradient for disabled
    };
  }

  if (isLoading) {
    return {
      opacity: 0.8,
    };
  }

  return {};
}

// ============================================
// STORE-CONFIGURED ACTION BUTTONS
// ============================================

/**
 * Default button base configurations for each action button type
 */
const DEFAULT_BUTTON_CONFIGS: Record<ActionButtonId, {
  title: string;
  iconName: string;
  backgroundColor: readonly [string, string, ...string[]];
  textColor: string;
}> = {
  call: {
    title: 'Call',
    iconName: 'call-outline',
    backgroundColor: ['#10B981', '#059669'] as const, // Green gradient
    textColor: '#FFFFFF',
  },
  product: {
    title: 'Products',
    iconName: 'cube-outline',
    backgroundColor: ['#00C06A', '#059669'] as const, // ReZ Green gradient
    textColor: '#FFFFFF',
  },
  location: {
    title: 'Location',
    iconName: 'location-outline',
    backgroundColor: ['#00C06A', '#047857'] as const, // ReZ Green gradient
    textColor: '#FFFFFF',
  },
  pay: {
    title: 'Pay Here',
    iconName: 'wallet-outline',
    backgroundColor: ['#F59E0B', '#D97706'] as const, // ReZ Golden gradient
    textColor: '#FFFFFF',
  },
  custom: {
    title: 'Action',
    iconName: 'arrow-forward-outline',
    backgroundColor: ['#00C06A', '#00796B'] as const, // ReZ Green gradient
    textColor: '#FFFFFF',
  },
};

/**
 * Default action buttons configuration when store has none
 */
export const DEFAULT_STORE_ACTION_BUTTONS: StoreActionButtonsConfigFromStore = {
  enabled: true,
  buttons: [
    { id: 'pay', enabled: true, label: 'Pay Here', order: 0 },
    { id: 'call', enabled: true, label: 'Call', order: 1 },
    { id: 'location', enabled: true, label: 'Location', order: 2 },
  ],
};

/**
 * Error callback type for handleButtonDestination
 */
export type ButtonErrorCallback = (title: string, message: string, icon?: 'information-circle' | 'call' | 'location' | 'cube' | 'alert-circle') => void;

/**
 * Handles button destination navigation based on type
 */
export function handleButtonDestination(
  buttonConfig: StoreActionButtonConfig,
  storeData?: StoreDataForButtons,
  router?: any,
  onError?: ButtonErrorCallback
): void {
  const destination = buttonConfig.destination;

  // Default error handler logs to console if no callback provided

  // If no destination configured, use defaults based on button id
  if (!destination) {
    switch (buttonConfig.id) {
      case 'call':
        if (storeData?.phone) {
          const phoneUrl = Platform.OS === 'ios'
            ? `telprompt:${storeData.phone}`
            : `tel:${storeData.phone}`;
          Linking.canOpenURL(phoneUrl).then(supported => {
            if (supported) {
              safeOpenURL(phoneUrl, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
            } else {
              showError('Unable to Call', 'Phone calls are not supported on this device.', 'call');
            }
          }).catch(() => {});
        } else {
          showError('No Contact Info', 'Store contact information is not available.', 'call');
        }
        break;

      case 'location':
        if (storeData?.location?.coordinates && storeData.location.coordinates.length === 2) {
          const [lng, lat] = storeData.location.coordinates;
          const address = encodeURIComponent(storeData.location.address || storeData.name || '');
          const mapsUrl = Platform.OS === 'ios'
            ? `maps://app?daddr=${lat},${lng}&q=${address}`
            : `geo:${lat},${lng}?q=${address}`;
          Linking.canOpenURL(mapsUrl).then(supported => {
            if (supported) {
              safeOpenURL(mapsUrl, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
            } else {
              // Fallback to Google Maps web URL
              safeOpenURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
            }
          }).catch(() => {});
        } else if (storeData?.location?.address) {
          // Fallback to address search if no coordinates
          const address = encodeURIComponent(
            `${storeData.location.address}, ${storeData.location.city || ''}`
          );
          safeOpenURL(`https://www.google.com/maps/search/?api=1&query=${address}`, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
        } else {
          showError('Location Not Available', 'This store has not provided location information.', 'location');
        }
        break;

      case 'product':
        // Navigate to StoreProductsPage
        if (router && storeData?.storeId) {
          const storeName = encodeURIComponent(storeData.storeName || storeData.name || 'Store');
          router.push(`/StoreProductsPage?storeId=${storeData.storeId}&storeName=${storeName}`);
        } else {
          showError('Store Not Found', 'Unable to load store products.', 'cube');
        }
        break;

      case 'pay':
        // Navigate to Pay In Store screen
        if (router && storeData?.storeId) {
          const storeName = encodeURIComponent(storeData.storeName || storeData.name || 'Store');
          router.push(`/pay-in-store/enter-amount?storeId=${storeData.storeId}&storeName=${storeName}`);
        } else {
          // Fallback to pay-in-store entry screen
          router?.push('/pay-in-store');
        }
        break;
    }
    return;
  }

  // Handle configured destination
  switch (destination.type) {
    case 'phone':
      const phoneUrl = Platform.OS === 'ios'
        ? `telprompt:${destination.value}`
        : `tel:${destination.value}`;
      Linking.canOpenURL(phoneUrl).then(supported => {
        if (supported) safeOpenURL(phoneUrl, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
      }).catch(() => {});
      break;

    case 'url':
      Linking.canOpenURL(destination.value).then(supported => {
        if (supported) safeOpenURL(destination.value, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
      }).catch(() => {});
      break;

    case 'maps':
      // Value can be coordinates "lat,lng" or address
      const coords = destination.value.split(',');
      if (coords.length === 2 && !isNaN(parseFloat(coords[0]))) {
        const [lat, lng] = coords.map(parseFloat);
        const mapsUrl = Platform.OS === 'ios'
          ? `maps://app?daddr=${lat},${lng}`
          : `geo:${lat},${lng}`;
        Linking.canOpenURL(mapsUrl).then(supported => {
          if (supported) {
            safeOpenURL(mapsUrl, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
          } else {
            safeOpenURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
          }
        }).catch(() => {});
      } else {
        // Treat as address
        const address = encodeURIComponent(destination.value);
        safeOpenURL(`https://www.google.com/maps/search/?api=1&query=${address}`, { allowedSchemes: STORE_ACTION_ALLOWED_SCHEMES }).catch(() => {});
      }
      break;

    case 'internal':
      // Internal navigation - router should handle this
      if (router && destination.value) {
        router.push(destination.value);
      }
      break;
  }
}

/**
 * Creates action button configs from store-level configuration
 * Falls back to default behavior if no store config is provided
 */
export function createButtonConfigsFromStore(
  storeConfig: StoreActionButtonsConfigFromStore | null | undefined,
  storeData: StoreDataForButtons | undefined,
  router?: any,
  onError?: ButtonErrorCallback
): Array<{
  id: ActionButtonId;
  title: string;
  iconName: string;
  onPress: () => void;
  isVisible: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  backgroundColor: readonly [string, string, ...string[]];
  textColor: string;
}> {
  // If no store config or disabled, return empty array
  if (!storeConfig || !storeConfig.enabled) {
    // Use default configuration
    const defaultConfig = DEFAULT_STORE_ACTION_BUTTONS;
    return createButtonConfigsFromStore(defaultConfig, storeData, router, onError);
  }

  // Filter enabled buttons and sort by order
  const enabledButtons = (storeConfig.buttons || [])
    .filter(btn => btn.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Helper function to check if button has required data
  const isButtonDataAvailable = (buttonId: ActionButtonId): boolean => {
    switch (buttonId) {
      case 'call':
        // Call button needs phone number
        return !!(storeData?.phone);
      case 'location':
        // Location button needs coordinates or address
        return !!(storeData?.location?.coordinates || storeData?.location?.address);
      case 'product':
        // Products button needs storeId
        return !!(storeData?.storeId);
      case 'pay':
        // Pay button needs storeId
        return !!(storeData?.storeId);
      default:
        return true;
    }
  };

  return enabledButtons.map(buttonConfig => {
    const defaults = DEFAULT_BUTTON_CONFIGS[buttonConfig.id] || DEFAULT_BUTTON_CONFIGS.custom;
    const hasRequiredData = isButtonDataAvailable(buttonConfig.id);

    return {
      id: buttonConfig.id,
      title: buttonConfig.label || defaults.title,
      iconName: defaults.iconName,
      onPress: () => handleButtonDestination(buttonConfig, storeData, router, onError),
      isVisible: true,
      isEnabled: true, // Always enabled - show modal if data missing
      isLoading: false,
      backgroundColor: hasRequiredData ? defaults.backgroundColor : ['#9CA3AF', '#6B7280'] as const,
      textColor: defaults.textColor,
    };
  });
}

/**
 * Merges store action buttons with default props configuration
 * Use this when you want both store-configured buttons AND buy/lock/booking buttons
 */
export function mergeStoreActionWithDefaults(
  storeConfig: StoreActionButtonsConfigFromStore | null | undefined,
  storeData: StoreDataForButtons | undefined,
  props: StoreActionButtonsProps,
  router?: any
): ActionButtonConfig[] {
  // First get the store-configured action buttons (Call, Product, Location)
  const storeButtons = createButtonConfigsFromStore(storeConfig, storeData, router);

  // Then get the default buy/lock/booking buttons
  const defaultButtons = createButtonConfigs(props);

  // Store buttons come first, then action buttons
  return [...storeButtons, ...defaultButtons] as ActionButtonConfig[];
}
