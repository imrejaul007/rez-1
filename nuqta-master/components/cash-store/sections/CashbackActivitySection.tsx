/**
 * CashbackActivitySection Component
 *
 * Premium section showing user's recent cashback activity/transactions
 * Features: Timeline design, animated status dots, color-coded indicators, expandable details
 */

import React, { memo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CashbackActivity, formatCurrency } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

interface CashbackActivitySectionProps {
  activities: CashbackActivity[];
  isLoading?: boolean;
  onActivityPress: (activity: CashbackActivity) => void;
  onViewAllPress: () => void;
  onStartShopping?: () => void;
}

const getStatusColor = (status: CashbackActivity['status']): string => {
  switch (status) {
    case 'pending':
      return colors.brand.sand;
    case 'confirmed':
      return colors.nileBlue;
    case 'available':
      return colors.lightMustard;
    case 'expired':
    case 'cancelled':
      return colors.brand.caramel;
    default:
      return colors.neutral[500];
  }
};

const getStatusGradient = (status: CashbackActivity['status']): string[] => {
  switch (status) {
    case 'pending':
      return [colors.brand.sand, colors.brand.caramel];
    case 'confirmed':
      return [colors.nileBlue, '#243f55'];
    case 'available':
      return [colors.brand.caramel, colors.nileBlue];
    case 'expired':
    case 'cancelled':
      return [colors.brand.caramel, '#c99077'];
    default:
      return [colors.neutral[500], colors.neutral[600]];
  }
};

const getStatusIcon = (status: CashbackActivity['status']): string => {
  switch (status) {
    case 'pending':
      return 'time';
    case 'confirmed':
      return 'checkmark-circle';
    case 'available':
      return 'wallet';
    case 'expired':
      return 'alert-circle';
    case 'cancelled':
      return 'close-circle';
    default:
      return 'help-circle';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const ActivityItem: React.FC<{
  activity: CashbackActivity;
  index: number;
  isLast: boolean;
  onPress: () => void;
}> = memo(({ activity, index, isLast, onPress }) => {
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);
  const pulseAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
      slideAnim.value = withDelay(index * 100, withTiming(0, { duration: 400 }));

    // Pulse animation for pending status
    if (activity.status === 'pending') {
      pulseAnim.value = withRepeat(withSequence(withTiming(1.2, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
    }
    return () => {
      pulseAnim.value = 1;
    };
  }, [index, activity.status]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const statusColor = getStatusColor(activity.status);
  const statusGradient = getStatusGradient(activity.status);
  const statusIcon = getStatusIcon(activity.status);

  return (
    <Animated.View
      style={[
        styles.activityItemWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Timeline Line */}
      {!isLast && <View style={styles.timelineLine} />}

      {/* Timeline Dot */}
      <Animated.View
        style={[
          styles.timelineDotContainer,
          activity.status === 'pending' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <LinearGradient colors={statusGradient} style={styles.timelineDot}>
          <Ionicons name={statusIcon as any} size={12} color={colors.background.primary} />
        </LinearGradient>
      </Animated.View>

      {/* Activity Card */}
      <Pressable
        style={styles.activityItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          {activity.brand.logo?.startsWith('http') ? (
            <CachedImage
              source={activity.brand.logo}
              style={styles.brandLogo}
              contentFit="contain"
            />
          ) : activity.brand.logo ? (
            <Text style={{ fontSize: 28 }}>{activity.brand.logo}</Text>
          ) : (
            <LinearGradient colors={[colors.lightPeach, colors.brand.sand]} style={styles.logoPlaceholder}>
              <Text style={styles.logoInitial}>{activity.brand.name.charAt(0)}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Content */}
        <View style={styles.activityContent}>
          <Text style={styles.brandName}>{activity.brand.name}</Text>
          <Text style={styles.purchaseAmount}>
            Purchase: {formatCurrency(activity.purchaseAmount)}
          </Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={10} color={colors.neutral[400]} />
            <Text style={styles.dateText}>{formatDate(activity.date)}</Text>
          </View>
        </View>

        {/* Cashback Amount & Status */}
        <View style={styles.activityRight}>
          <Text style={[styles.cashbackAmount, { color: statusColor }]}>
            +{formatCurrency(activity.cashbackAmount)}
          </Text>
          <LinearGradient
            colors={[`${statusColor}20`, `${statusColor}10`]}
            style={styles.statusBadge}
          >
            <Ionicons name={statusIcon as any} size={10} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
            </Text>
          </LinearGradient>
        </View>

        {/* Arrow Indicator */}
        <View style={styles.arrowIndicator}>
          <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

const SkeletonItem: React.FC<{ index: number }> = memo(({ index }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    }, [index]);

  return (
    <Animated.View
      style={[
        styles.activityItemWrapper,
        {
          opacity: interpolate(shimmerAnim.value, [0, 1], [0.5, 1]),
        },
      ]}
    >
      <View style={styles.timelineDotContainer}>
        <View style={[styles.timelineDot, styles.skeleton]} />
      </View>
      <View style={styles.activityItem}>
        <View style={[styles.logoContainer, styles.skeleton]} />
        <View style={styles.activityContent}>
          <View style={[styles.skeletonText, { width: 100 }]} />
          <View style={[styles.skeletonText, { width: 80 }]} />
          <View style={[styles.skeletonText, { width: 60 }]} />
        </View>
        <View style={styles.activityRight}>
          <View style={[styles.skeletonText, { width: 60 }]} />
          <View style={[styles.skeletonBadge]} />
        </View>
      </View>
    </Animated.View>
  );
});

const CashbackActivitySection: React.FC<CashbackActivitySectionProps> = ({
  activities,
  isLoading = false,
  onActivityPress,
  onViewAllPress,
  onStartShopping,
}) => {
  const headerFadeAnim = useSharedValue(0);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });
  }, []);

  if (activities.length === 0 && !isLoading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[colors.lightPeach, colors.brand.sand]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="receipt" size={16} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Your Cashback Activity</Text>
          </View>
        </Animated.View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[colors.neutral[50], colors.neutral[100]]}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="wallet-outline" size={40} color={colors.neutral[300]} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Start shopping to earn cashback rewards
          </Text>
          <Pressable style={styles.emptyButton} onPress={onStartShopping || onViewAllPress}>
            <LinearGradient
              colors={[colors.lightPeach, colors.brand.sand]}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Start Shopping</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[colors.lightPeach, colors.brand.sand]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="receipt" size={16} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Your Cashback Activity</Text>
          </View>
          <Text style={styles.subtitle}>Track your earnings</Text>
        </View>
        <Pressable
          onPress={onViewAllPress}
          style={styles.viewAllButton}
         
        >
          <Text style={styles.viewAllText}>View All</Text>
          <View style={styles.viewAllArrow}>
            <Ionicons name="chevron-forward" size={14} color={colors.background.primary} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Activity List with Timeline */}
      <View style={styles.activityList}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => <SkeletonItem key={`skeleton-${index}`} index={index} />)
          : activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                index={index}
                isLast={index === activities.length - 1}
                onPress={() => onActivityPress(activity)}
              />
            ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: colors.background.primary,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
    marginLeft: 42,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },
  viewAllArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityList: {
    paddingHorizontal: 16,
    paddingLeft: 24,
  },
  activityItemWrapper: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 12,
    top: 36,
    bottom: -4,
    width: 2,
    backgroundColor: colors.neutral[200],
  },
  timelineDotContainer: {
    position: 'absolute',
    left: 0,
    top: 16,
    zIndex: 1,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
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
    }),
  },
  activityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
    paddingVertical: 14,
    paddingRight: 10,
    paddingLeft: 14,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background.primary,
  },
  activityContent: {
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 3,
  },
  purchaseAmount: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 3,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: colors.neutral[400],
    fontWeight: '500',
  },
  activityRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  cashbackAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  arrowIndicator: {
    marginLeft: 4,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Skeleton
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  skeletonText: {
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBadge: {
    width: 70,
    height: 22,
    backgroundColor: colors.neutral[200],
    borderRadius: 10,
  },
});

export default memo(CashbackActivitySection);
