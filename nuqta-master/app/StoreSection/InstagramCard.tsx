import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface InstagramCardProps {
  productData?: {
    id?: string;
    _id?: string;
    title?: string;
    name?: string;
    price?: number;
    pricing?: { selling?: number };
    image?: string;
    images?: Array<{ url: string }>;
    store?: {
      _id?: string;
      id?: string;
      name?: string;
    };
    [key: string]: any;
  };
  disabled?: boolean;
  onError?: (error: Error) => void;
}

function InstagramCard({ productData, disabled = false, onError }: InstagramCardProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const responsiveMargin = width < 360 ? 16 : 20;
  const responsivePadding = width < 360 ? 16 : 20;
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigateToEarnSocial = async () => {
    if (disabled || isNavigating) {
      return;
    }

    setIsNavigating(true);

    try {
      // Prepare product context for the earn page
      const params: any = {};

      if (productData) {
        const productId = productData.id || productData._id;
        const productName = productData.title || productData.name;
        const productPrice = productData.price || productData.pricing?.selling;
        const productImage = productData.image || productData.images?.[0]?.url;
        const storeId = productData.store?._id || productData.store?.id;
        const storeName = productData.store?.name;

        if (productId) params.productId = productId;
        if (productName) params.productName = productName;
        if (productPrice) params.productPrice = productPrice.toString();
        if (productImage) params.productImage = productImage;
        if (storeId) params.storeId = storeId;
        if (storeName) params.storeName = storeName;

      }

      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      router.push({
        pathname: '/earn-from-social-media',
        params
      } as any);

    } catch (error) {

      // Call error callback if provided
      if (onError) {
        onError(error as Error);
      }

      // Show user-friendly error
      platformAlertSimple('Navigation Error', 'Unable to open the earn page. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsNavigating(false);
    }
  };

  return (
    <Pressable
      style={[
        styles.container,
        { marginHorizontal: responsiveMargin },
        (disabled || isNavigating) && styles.containerDisabled
      ]}
     
      onPress={handleNavigateToEarnSocial}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      disabled={disabled || isNavigating}
      accessibilityRole="button"
      accessibilityLabel={isNavigating ? 'Loading social media earn page' : 'Earn from Social Media'}
      accessibilityHint="Double tap to learn how to earn money from social media posts"
      accessibilityState={{ disabled: disabled || isNavigating, busy: isNavigating }}
    >
      <LinearGradient
        colors={disabled ? [colors.lavenderMist, '#b8d4ed'] : [colors.lightPeach, Colors.gold, Colors.nileBlue]}
        style={[styles.gradientBackground, { padding: responsivePadding }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {isNavigating ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Ionicons name="logo-instagram" size={24} color={Colors.text.inverse} />
            )}
          </View>
          <Text style={styles.title}>
            {isNavigating ? 'Loading...' : 'Earn from Social Media'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    // Additional 3D effect layers
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  containerDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  gradientBackground: {
    borderRadius: BorderRadius.xl,
    // Inner shadow effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    // 3D icon container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    ...Typography.h4,
    color: Colors.text.inverse,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
export default withErrorBoundary(InstagramCard, 'StoreSectionInstagramCard');
