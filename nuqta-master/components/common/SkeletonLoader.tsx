import React, { useEffect} from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  variant?: 'rect' | 'circle' | 'text';
}

function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'rect',
}: SkeletonLoaderProps) {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    // Cleanup: stop animation on unmount to prevent memory leak
    
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-200, 200]) }],
  }));

  const finalBorderRadius = variant === 'circle' ? height / 2 : borderRadius;
  const finalWidth = variant === 'circle' ? height : width;

  return (
    <View
      style={[
        {
          width: finalWidth,
          height,
          borderRadius: finalBorderRadius,
          backgroundColor: colors.gray[200],
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      <Animated.View
        style={[{
          flex: 1,
        }, shimmerStyle]}
      >
        <LinearGradient
          colors={[colors.neutral[200], colors.neutral[100], colors.neutral[200]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            width: 200,
          }}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading content"
      accessibilityRole="none"
    >
      <SkeletonLoader width={60} height={60} variant="circle" style={styles.avatar} />
      <View style={styles.content}>
        <SkeletonLoader width="80%" height={16} style={styles.title} />
        <SkeletonLoader width="60%" height={14} style={styles.subtitle} />
      </View>
    </View>
  );
}

export function SkeletonProjectCard() {
  return (
    <View
      style={styles.projectCard}
      accessibilityLabel="Loading project"
      accessibilityRole="none"
    >
      <SkeletonLoader width="100%" height={120} style={styles.image} />
      <View style={styles.projectContent}>
        <SkeletonLoader width="70%" height={18} style={styles.projectTitle} />
        <SkeletonLoader width="90%" height={14} style={styles.projectDescription} />
        <SkeletonLoader width="40%" height={14} style={styles.projectMeta} />
      </View>
    </View>
  );
}

// Pre-built skeleton layouts for key screens

export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard} accessibilityLabel="Loading product" accessibilityRole="none">
      <SkeletonLoader width="100%" height={150} borderRadius={8} />
      <SkeletonLoader width="70%" height={16} style={{ marginTop: 8 }} />
      <SkeletonLoader width="40%" height={14} style={{ marginTop: 4 }} />
      <SkeletonLoader width="30%" height={16} style={{ marginTop: 8 }} />
    </View>
  );
}

export function StoreCardSkeleton() {
  return (
    <View style={styles.storeCard} accessibilityLabel="Loading store" accessibilityRole="none">
      <SkeletonLoader width={60} height={60} variant="circle" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="40%" height={14} style={{ marginTop: 4 }} />
        <SkeletonLoader width="80%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.orderCard} accessibilityLabel="Loading order" accessibilityRole="none">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonLoader width={120} height={16} />
        <SkeletonLoader width={60} height={16} />
      </View>
      <SkeletonLoader width="80%" height={14} style={{ marginTop: 8 }} />
      <SkeletonLoader width="50%" height={14} style={{ marginTop: 4 }} />
    </View>
  );
}

export function HomeSectionSkeleton() {
  return (
    <View style={styles.homeSection} accessibilityLabel="Loading section" accessibilityRole="none">
      <SkeletonLoader width={150} height={20} style={{ marginBottom: 12, marginLeft: 16 }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ marginRight: 12, width: 150 }}>
            <SkeletonLoader width={150} height={100} borderRadius={8} />
            <SkeletonLoader width={100} height={14} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CartItemSkeleton() {
  return (
    <View style={styles.cartItem} accessibilityLabel="Loading cart item" accessibilityRole="none">
      <SkeletonLoader width={80} height={80} borderRadius={12} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <SkeletonLoader width="80%" height={16} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <SkeletonLoader width={80} height={16} />
          <SkeletonLoader width={100} height={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function WishlistItemSkeleton() {
  return (
    <View style={styles.wishlistItem} accessibilityLabel="Loading wishlist item" accessibilityRole="none">
      <SkeletonLoader width={100} height={100} borderRadius={8} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="40%" height={14} style={{ marginTop: 4 }} />
        <SkeletonLoader width="30%" height={16} style={{ marginTop: 8 }} />
        <SkeletonLoader width={80} height={28} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {},
  projectCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  image: {
    borderRadius: 0,
  },
  projectContent: {
    padding: 16,
  },
  projectTitle: {
    marginBottom: 8,
  },
  projectDescription: {
    marginBottom: 8,
  },
  projectMeta: {},
  productCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)' },
    }),
  },
  storeCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)' },
    }),
  },
  orderCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)' },
    }),
  },
  homeSection: {
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)' },
    }),
  },
  wishlistItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)' },
    }),
  },
});

export default React.memo(SkeletonLoader);
