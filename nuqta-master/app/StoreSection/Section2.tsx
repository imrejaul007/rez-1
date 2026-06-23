import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState } from "react";
import { View, Pressable, StyleSheet, ViewStyle, TextStyle, Linking, Platform} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring} from 'react-native-reanimated';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { triggerImpact, triggerNotification } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { platformAlert } from "@/utils/platformAlert";
import ContactModal from "@/components/store/ContactModal";
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
  IconSize,
  Timing } from "@/constants/DesignSystem";
import { useIsMounted } from '@/hooks/useIsMounted';

interface ActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Section2Props {
  dynamicData?: {
    store?: {
      phone?: string;
      contact?: string;
      email?: string;
      location?: {
        lat?: number;
        lng?: number;
        address?: string;
      };
    };
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  } | null;
  cardType?: string;
}

const actions: ActionButtonProps[] = [
  { label: "Call", icon: "call-outline" },
  { label: "Product", icon: "cube-outline" },
  { label: "Location", icon: "location-outline" },
];

function Section2({ dynamicData, cardType }: Section2Props){
  const isMounted = useIsMounted();
  const router = useRouter();
  const [showContactModal, setShowContactModal] = useState(false);

  // Animation refs for each button
  const button1ScaleAnim = useSharedValue(1);
  const button2ScaleAnim = useSharedValue(1);
  const button3ScaleAnim = useSharedValue(1);

  // Animation helper
  const animateScale = (animValue: { value: number }, toValue: number) => {
    animValue.value = withSpring(toValue);
  };

  // Get animation ref by index
  const getAnimRef = (index: number) => {
    switch (index) {
      case 0: return button1ScaleAnim;
      case 1: return button2ScaleAnim;
      case 2: return button3ScaleAnim;
      default: return button1ScaleAnim;
    }
  };

  const handleCall = () => {
    // Haptic feedback
    triggerImpact('Medium');
    
    // Get contact info from multiple possible locations
    const phone = dynamicData?.store?.phone || 
                  dynamicData?.store?.contact || 
                  dynamicData?.contact?.phone;
    const email = dynamicData?.store?.email || 
                  dynamicData?.contact?.email;
    const storeName = dynamicData?.name || dynamicData?.title;
    
    if (!phone && !email) {
      platformAlert('No Contact Info', 'Store contact information is not available');
      return;
    }
    
    // Show beautiful contact modal instead of directly calling
    setShowContactModal(true);
  };

  const handleProduct = () => {
    // Haptic feedback
    triggerImpact('Medium');

    try {
      // Get storeId from dynamicData
      const storeId = dynamicData?.id || dynamicData?._id;
      const storeName = dynamicData?.name || dynamicData?.title;
      
      if (!storeId) {
        platformAlert('Error', 'Store information not available');
        return;
      }

      // Navigate to store products page
      router.push({
        pathname: '/StoreProductsPage',
        params: {
          storeId: storeId,
          storeName: storeName }
      } as any);
    } catch (error) {
      platformAlert('Error', 'Unable to view store products');
    }
  };

  const handleLocation = async () => {
    // Haptic feedback
    triggerImpact('Medium');

    try {
      const location = dynamicData?.store?.location;
      if (!location) {
        platformAlert('No Location', 'Store location information is not available');
        return;
      }

      const { lat, lng, address } = location;
      let url: string;

      if (lat && lng) {
        // Platform-specific URL schemes for maps
        url = Platform.select({
          ios: `maps:0,0?q=${lat},${lng}`, // Apple Maps on iOS
          android: `geo:${lat},${lng}?q=${lat},${lng}(Store)`, // Google Maps on Android
          default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, // Web fallback
        }) as string;
      } else if (address) {
        // Open with address - platform specific
        const encodedAddress = encodeURIComponent(address);
        url = Platform.select({
          ios: `maps:0,0?q=${encodedAddress}`, // Apple Maps on iOS
          android: `geo:0,0?q=${encodedAddress}`, // Google Maps on Android
          default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, // Web fallback
        }) as string;
      } else {
        platformAlert('No Location', 'Store location details are incomplete');
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Universal fallback to Google Maps web (works on all platforms)
        const mapsUrl = lat && lng
          ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
        await Linking.openURL(mapsUrl);
      }
    } catch (error) {
      platformAlert('Error', 'Unable to open location');
    }
  };

  const getHandler = (label: string) => {
    switch (label) {
      case 'Call':
        return handleCall;
      case 'Product':
        return handleProduct;
      case 'Location':
        return handleLocation;
      default:
        return () => {};
    }
  };

  // Get contact info for modal
  const phone = dynamicData?.store?.phone || 
                dynamicData?.store?.contact || 
                dynamicData?.contact?.phone;
  const email = dynamicData?.store?.email || 
                dynamicData?.contact?.email;
  const storeName = dynamicData?.name || dynamicData?.title;

  return (
    <>
      <View
        style={styles.container}
        accessibilityLabel="Store action buttons"
      >
        <View style={styles.buttonRow}>
          {actions.map((action, index) => {
            const scaleAnim = getAnimRef(index);
            return (
              <Animated.View
                key={index}
                style={[
                  styles.buttonWrapper,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <Pressable
                  style={styles.button}
                 
                  onPress={getHandler(action.label)}
                  onPressIn={() => animateScale(scaleAnim, 0.95)}
                  onPressOut={() => animateScale(scaleAnim, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.label} store`}
                  accessibilityHint={`Double tap to ${action.label.toLowerCase()} this store`}
                >
                  <Ionicons
                    name={action.icon}
                    size={IconSize.lg}
                    color={Colors.primary[600]}
                    style={styles.buttonIcon}
                  />
                  <ThemedText style={styles.buttonText}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Contact Modal */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        phone={phone}
        email={email}
        storeName={storeName}
      />
    </>
  );
}

interface Styles {
  container: ViewStyle;
  buttonRow: ViewStyle;
  buttonWrapper: ViewStyle;
  button: ViewStyle;
  buttonIcon: ViewStyle;
  buttonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  // Modern Container
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary },

  // Modern Button Row
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md - 2 },

  buttonWrapper: {
    flex: 1 },

  // Modern Button with Purple Border
  button: {
    borderWidth: 1.5,
    borderColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.primary,
    ...Shadows.purpleSubtle,
    flexDirection: "column",
    gap: Spacing.xs },

  buttonIcon: {
    marginBottom: 2 },

  // Modern Typography
  buttonText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.primary[600],
    textAlign: "center" } });

export default withErrorBoundary(Section2, 'StoreSectionSection2');
