/**
 * CashStoreQuickActions Component
 *
 * Premium 2x2 grid of quick action cards for Cash Store
 * Features: Animated icons, notification badges, gradient backgrounds
 */

import React, { memo, useEffect} from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions} from 'react-native';
import Animated, { useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CashStoreQuickAction } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - CARD_GAP) / 2;

// Nuqta Color Palette - Cash Store Peach Theme
const NUQTA_COLORS = {
  nileBlue: colors.nileBlue,
  nileBlueLight: '#2A5577',
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  peachDark: colors.brand.sand,
  peachDarker: colors.brand.caramel,
};

// Default 4 quick actions - strategic use of all Nuqta palette colors
const DEFAULT_QUICK_ACTIONS: CashStoreQuickAction[] = [
  {
    id: 'buy-coupons',
    title: 'Buy Coupons',
    subtitle: 'Get extra cashback',
    icon: 'pricetag',
    backgroundColor: colors.brand.sand,
    gradientColors: [colors.brand.sand, colors.brand.caramel],
    action: 'buy-coupons',
  },
  {
    id: 'extra-coins',
    title: `Extra ${BRAND.COIN_NAME}`,
    subtitle: 'Double rewards',
    icon: 'wallet',
    backgroundColor: NUQTA_COLORS.nileBlue,
    gradientColors: [colors.nileBlue, colors.brand.nileBlueLight],
    action: 'extra-coins',
    badge: '2X',
  },
  {
    id: 'track-cashback',
    title: 'Track Cashback',
    subtitle: 'View your earnings',
    icon: 'trending-up',
    backgroundColor: colors.lightPeach,
    gradientColors: [colors.lightPeach, colors.brand.sand],
    action: 'track-cashback',
  },
  {
    id: 'trending',
    title: 'Trending Offers',
    subtitle: 'Hot deals today',
    icon: 'flame',
    backgroundColor: colors.nileBlue,
    gradientColors: [colors.brand.nileBlueLight, colors.nileBlue],
    action: 'trending',
    badge: 'NEW',
  },
];

interface CashStoreQuickActionsProps {
  actions?: CashStoreQuickAction[];
  onActionPress: (actionId: string) => void;
}

const ActionCard: React.FC<{
  action: CashStoreQuickAction;
  index: number;
  onPress: () => void;
}> = memo(({ action, index, onPress }) => {
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const iconBounceAnim = useSharedValue(1);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
    scaleAnim.value = withDelay(index * 100, withSpring(1));
  }, [index]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.95);
    iconBounceAnim.value = withTiming(1.2, { duration: 100 });
    iconBounceAnim.value = withSpring(1);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const isLight = action.id === 'track-cashback';

  return (
    <Animated.View
      style={[
        styles.actionCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.actionCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        <LinearGradient
          colors={action.gradientColors || [action.backgroundColor, action.backgroundColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Decorative circle */}
          <View style={styles.decorativeCircle1} />

          {/* Badge */}
          {action.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{action.badge}</Text>
            </View>
          )}

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: iconBounceAnim }] },
              isLight && { backgroundColor: 'rgba(26,58,82,0.12)', borderColor: 'rgba(26,58,82,0.08)' },
            ]}
          >
            <Ionicons
              name={action.icon as any}
              size={20}
              color={isLight ? colors.nileBlue : colors.background.primary}
            />
          </Animated.View>

          {/* Text Content — full width below icon */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, isLight && { color: colors.nileBlue }]}>
              {action.title}
            </Text>
            <Text style={[styles.subtitle, isLight && { color: 'rgba(26,58,82,0.6)' }]}>
              {action.subtitle}
            </Text>
          </View>

          {/* Arrow — bottom right */}
          <View style={styles.arrowContainer}>
            <Ionicons
              name="chevron-forward"
              size={13}
              color={isLight ? 'rgba(26,58,82,0.4)' : 'rgba(255,255,255,0.6)'}
            />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const CashStoreQuickActions: React.FC<CashStoreQuickActionsProps> = ({
  actions = DEFAULT_QUICK_ACTIONS,
  onActionPress,
}) => {
  // Use default actions if less than 4 provided
  const displayActions = actions.length >= 4 ? actions.slice(0, 4) : DEFAULT_QUICK_ACTIONS;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {displayActions.map((action, index) => (
          <ActionCard
            key={action.id}
            action={action}
            index={index}
            onPress={() => onActionPress(action.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  actionCardWrapper: {
    width: CARD_WIDTH,
    minWidth: 150,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B7355',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: 14,
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textContainer: {
    marginTop: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    marginTop: 6,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 0.3,
  },
});

export default memo(CashStoreQuickActions);
