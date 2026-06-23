// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreActionButtons.tsx - Modernized with Design System & Haptics
import React, { useState, useCallback, useMemo} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StoreActionButtonsProps, ActionButtonId } from '@/types/store-actions';
import {
  createButtonConfigs,
  createButtonConfigsFromStore,
  getButtonLayout,
  ButtonErrorCallback
} from '@/utils/store-action-logic';
import InfoModal from '@/components/common/InfoModal';
import ContactModal from '@/components/store/ContactModal';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol } from '@/stores/selectors';
import {
  createInitialButtonState,
  ButtonStateManager,
  createButtonHandler
} from '@/utils/button-state-manager';
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  IconSize,
  Timing } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ExtendedStoreActionButtonsProps extends StoreActionButtonsProps {
  // Control which button group to show: 'all' | 'buy-lock' | 'store-actions'
  buttonGroup?: 'all' | 'buy-lock' | 'store-actions';
}

function StoreActionButtons({
  storeType,
  storeActionConfig,
  storeData,
  onBuyPress,
  onLockPress,
  onBookingPress,
  isBuyLoading = false,
  isLockLoading = false,
  isBookingLoading = false,
  isBuyDisabled = false,
  isLockDisabled = false,
  isBookingDisabled = false,
  isLocked = false,
  showBookingButton,
  customBuyText,
  customLockText,
  customBookingText,
  containerStyle,
  buttonStyle,
  textStyle,
  dynamicData,
  buttonGroup = 'all' }: ExtendedStoreActionButtonsProps) {

  const isMounted = useIsMounted();
  const { width } = Dimensions.get('window');
  const backgroundColor = useThemeColor({}, 'background');
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Modal state for showing info/error messages
  const [modalState, setModalState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: 'information-circle' | 'call' | 'location' | 'cube' | 'alert-circle';
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle' });

  // Error callback for action buttons
  const handleActionError: ButtonErrorCallback = useCallback((title, message, icon) => {
    setModalState({
      visible: true,
      title,
      message,
      icon: icon || 'alert-circle' });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  // Contact Modal state for Call button
  const [showContactModal, setShowContactModal] = useState(false);

  // Animation refs for each button type (including store action buttons)
  const buyScaleAnim = useSharedValue(1);
  const lockScaleAnim = useSharedValue(1);
  const bookingScaleAnim = useSharedValue(1);
  const callScaleAnim = useSharedValue(1);
  const productScaleAnim = useSharedValue(1);
  const locationScaleAnim = useSharedValue(1);
  const customScaleAnim = useSharedValue(1);
  const payScaleAnim = useSharedValue(1);

  const buyScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buyScaleAnim.value }] }));
  const lockScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: lockScaleAnim.value }] }));
  const bookingScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookingScaleAnim.value }] }));
  const callScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: callScaleAnim.value }] }));
  const productScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: productScaleAnim.value }] }));
  const locationScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: locationScaleAnim.value }] }));
  const customScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: customScaleAnim.value }] }));
  const payScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: payScaleAnim.value }] }));

  // Animation helper
  const animateScale = (animValue: { value: number }, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  // Dynamic button text based on product data
  const dynamicBuyText = customBuyText ||
    (dynamicData?.price ? `Buy for ${currencySymbol}${dynamicData.price}` : 'Buy Now');

  const dynamicLockText = isLocked
    ? 'Already Locked'
    : (customLockText || (dynamicData?.availabilityStatus === 'in_stock' ? 'Reserve Item' : 'Lock Price'));

  const dynamicBookingText = customBookingText ||
    (storeType === 'SERVICE' ? 'Book Service' : 'Schedule Pickup');
  
  // Component state management
  const [buttonState, setButtonState] = useState(() => createInitialButtonState());
  const stateManager = useMemo(() => 
    new ButtonStateManager(buttonState, setButtonState), 
    [buttonState]
  );

  // Generate store action button configurations (Call, Product, Location) from store config
  const storeActionButtonConfigs = useMemo(() => {
    // Always use default config if no storeActionConfig - shows Call, Product, Location buttons
    return createButtonConfigsFromStore(storeActionConfig, storeData, router, handleActionError);
  }, [storeActionConfig, storeData, router, handleActionError]);

  // Generate default button configurations (Buy, Lock, Booking) based on props
  const defaultButtonConfigs = useMemo(() =>
    createButtonConfigs({
      storeType,
      onBuyPress,
      onLockPress,
      onBookingPress,
      isBuyLoading,
      isLockLoading,
      isBookingLoading,
      isBuyDisabled,
      isLockDisabled: isLockDisabled || isLocked, // Disable if already locked
      isBookingDisabled,
      showBookingButton,
      customBuyText: dynamicBuyText,
      customLockText: dynamicLockText,
      customBookingText: dynamicBookingText }),
    [
      storeType, onBuyPress, onLockPress, onBookingPress,
      isBuyLoading, isLockLoading, isBookingLoading,
      isBuyDisabled, isLockDisabled, isBookingDisabled, isLocked,
      showBookingButton, dynamicBuyText, dynamicLockText, dynamicBookingText
    ]
  );

  // Combine store action buttons with default buttons based on buttonGroup prop
  const buttonConfigs = useMemo(() => {
    switch (buttonGroup) {
      case 'buy-lock':
        // Only show Buy, Lock, Booking buttons
        return defaultButtonConfigs as any[];
      case 'store-actions':
        // Only show Call, Product, Location buttons
        return storeActionButtonConfigs as any[];
      case 'all':
      default:
        // Show all buttons - store actions first, then buy/lock
        return [...storeActionButtonConfigs, ...defaultButtonConfigs] as any[];
    }
  }, [storeActionButtonConfigs, defaultButtonConfigs, buttonGroup]);

  // Get layout configuration
  const layout = useMemo(() => 
    getButtonLayout(buttonConfigs.length, width), 
    [buttonConfigs.length, width]
  );

  // Enhanced button press handler with haptic feedback
  const handleButtonPress = useCallback((buttonId: string) => {
    const config = buttonConfigs.find(c => c.id === buttonId);
    if (!config) return;

    // Haptic feedback on press
    triggerImpact('Medium');

    // Special handling for Call button - show ContactModal
    if (buttonId === 'call') {
      setShowContactModal(true);
      return;
    }

    // For other store action buttons (product, location, custom, pay),
    // just call onPress directly - they handle their own logic
    if (['product', 'location', 'custom', 'pay'].includes(buttonId)) {
      config.onPress();
      return;
    }

    // For buy/lock/booking buttons, use state management
    const enhancedHandler = createButtonHandler(
      buttonId as 'buy' | 'lock' | 'booking',
      async () => {
        try {
          await config.onPress();
          // Success haptic feedback only - parent handles alerts/modals
          triggerNotification('Success');
        } catch (error) {
          // Error haptic feedback
          triggerNotification('Error');
          throw error;
        }
      },
      stateManager
    );
    enhancedHandler();
  }, [buttonConfigs, stateManager]);

  // Get animation ref based on button ID
  const getAnimRef = (buttonId: string) => {
    switch (buttonId) {
      case 'buy': return buyScaleAnim;
      case 'lock': return lockScaleAnim;
      case 'booking': return bookingScaleAnim;
      case 'call': return callScaleAnim;
      case 'product': return productScaleAnim;
      case 'location': return locationScaleAnim;
      case 'custom': return customScaleAnim;
      case 'pay': return payScaleAnim;
      default: return buyScaleAnim;
    }
  };

  const getAnimStyle = (buttonId: string) => {
    switch (buttonId) {
      case 'buy': return buyScaleStyle;
      case 'lock': return lockScaleStyle;
      case 'booking': return bookingScaleStyle;
      case 'call': return callScaleStyle;
      case 'product': return productScaleStyle;
      case 'location': return locationScaleStyle;
      case 'custom': return customScaleStyle;
      case 'pay': return payScaleStyle;
      default: return buyScaleStyle;
    }
  };

  // Render individual button with animation
  const renderButton = useCallback((config: typeof buttonConfigs[0]) => {
    const isCurrentlyLoading = buttonState.loadingStates[config.id];
    const hasError = buttonState.errorStates[config.id] !== null;
    const isAnyLoading = stateManager.hasAnyLoading();
    const shouldDisable = !config.isEnabled || isAnyLoading;
    const scaleAnim = getAnimRef(config.id);
    const scaleStyle = getAnimStyle(config.id);

    return (
      <Animated.View
        key={config.id}
        style={[scaleStyle, { width: layout.buttonWidth }]}
      >
        <Pressable
          style={[
            styles.buttonContainer,
            shouldDisable && styles.buttonDisabled,
            buttonStyle,
          ]}
          onPress={() => handleButtonPress(config.id)}
          onPressIn={() => animateScale(scaleAnim, 0.96)}
          onPressOut={() => animateScale(scaleAnim, 1)}
          disabled={shouldDisable}
         
          accessibilityRole="button"
          accessibilityLabel={`${config.title} button`}
          accessibilityState={{
            disabled: shouldDisable,
            busy: isCurrentlyLoading
          }}
          accessibilityHint={`${config.title} this item`}
        >
        <LinearGradient
          colors={shouldDisable ? [colors.neutral[400], colors.neutral[500]] as const : config.backgroundColor as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <View style={styles.buttonContent}>
            {/* Loading spinner or icon */}
            {isCurrentlyLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.background.primary}
                style={styles.buttonIcon}
              />
            ) : (
              <Ionicons
                name={(config.id === 'lock' && !config.isEnabled) ? 'lock-closed' : config.iconName as any}
                size={IconSize.md}
                color={config.textColor || Colors.text.white}
                style={styles.buttonIcon}
              />
            )}

            {/* Button text */}
            <ThemedText
              style={[
                styles.buttonText,
                { color: config.textColor },
                textStyle,
              ]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {isCurrentlyLoading ? 'Loading...' : config.title}
            </ThemedText>
          </View>
        </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }, [buttonState, stateManager, layout.buttonWidth, handleButtonPress, buttonStyle, textStyle, buyScaleAnim, lockScaleAnim, bookingScaleAnim, callScaleAnim, productScaleAnim, locationScaleAnim, customScaleAnim, payScaleAnim, animateScale]);

  // Don't render if no buttons are visible
  if (buttonConfigs.length === 0) {
    return null;
  }

  return (
    <>
      <View style={[
        styles.container,
        {
          backgroundColor,
          paddingHorizontal: layout.containerPadding,
          gap: layout.buttonGap,
          flexDirection: layout.flexDirection },
        containerStyle,
      ]}>
        {buttonConfigs.map(renderButton)}
      </View>

      {/* Info Modal for action button feedback */}
      <InfoModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon}
        onClose={closeModal}
        autoCloseDelay={3000}
      />

      {/* Contact Modal for Call button */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        phone={storeData?.phone}
        email={undefined}
        storeName={storeData?.storeName || storeData?.name}
      />
    </>
  );
}

export default withErrorBoundary(React.memo(StoreActionButtons), 'StoreSectionStoreActionButtons');

const styles = StyleSheet.create({
  // Modern Container
  container: {
    paddingVertical: 12,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center' },

  // Modern Button with Enhanced Shadows
  buttonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    height: 50 },
  buttonDisabled: {
    opacity: 0.5 },
  buttonGradient: {
    paddingVertical: 0,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1 },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 },
  buttonIcon: {
    marginRight: 0 },

  // Modern Typography
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 0 } });