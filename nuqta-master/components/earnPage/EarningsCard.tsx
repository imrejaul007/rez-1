// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { EarningsCardProps } from '@/types/earnPage.types';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import EarningsChart from './EarningsChart';
import { colors } from '@/constants/theme';

const earningSources = [
  {
    label: 'Projects',
    icon: 'briefcase-outline',
    gradient: [colors.brand.green, '#00A85C', colors.brand.teal],
  },
  { 
    label: 'Referrals', 
    icon: 'people-outline',
    gradient: [colors.successScale[400], colors.successScale[700], '#047857'],
  },
  { 
    label: 'Share & earn', 
    icon: 'share-social-outline',
    gradient: [colors.warningScale[400], colors.warningScale[700], colors.brand.amberDeep],
  },
  { 
    label: 'Spin', 
    icon: 'trophy-outline',
    gradient: [colors.brand.pink, colors.deepPink, '#BE185D'],
  },
];

function EarningsCard({ 
  earnings, 
  onSeeWallet 
}: EarningsCardProps) {
  const [showChart, setShowChart] = useState(false);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const scaleAnim = useSharedValue(0.95);
  const chartAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withTiming(0, { duration: 600 });
    scaleAnim.value = withSpring(1);
  }, []);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: slideAnim.value },
      { scale: scaleAnim.value },
    ],
  }));

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]) },
    ],
  }));

  const chartAnimStyle = useAnimatedStyle(() => ({
    opacity: chartAnim.value,
    transform: [
      { translateY: interpolate(chartAnim.value, [0, 1], [-20, 0]) },
      { scale: interpolate(chartAnim.value, [0, 1], [0.95, 1]) },
    ],
  }));

  const breakdownAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(fadeAnim.value, [0, 1], [15, 0]) },
    ],
  }));

  const toggleChart = () => {
    const toValue = showChart ? 0 : 1;
    setShowChart(!showChart);
    chartAnim.value = withSpring(toValue);
  };

  const breakdownItems = [
    { label: 'Projects', value: earnings.breakdown.projects, ...earningSources[0] },
    { label: 'Referrals', value: earnings.breakdown.referrals, ...earningSources[1] },
    { label: 'Share & earn', value: earnings.breakdown.shareAndEarn, ...earningSources[2] },
    { label: 'Spin', value: earnings.breakdown.spin, ...earningSources[3] },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        containerAnimStyle,
      ]}
    >
      {/* Decorative background elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          headerAnimStyle,
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.title}>Your earnings</ThemedText>
            <View style={styles.titleUnderline} />
          </View>
          <View style={styles.earningAmount}>
            <ThemedText style={styles.amount}>
              {earnings.currency}{earnings.totalEarned}
            </ThemedText>
            <ThemedText style={styles.earned}>Earned</ThemedText>
          </View>
        </View>

        {/* Wallet Button */}
        <Pressable
          style={styles.seeWalletButton}
          onPress={onSeeWallet}
         
          accessibilityLabel={`Total earnings: ${earnings.currency}${earnings.totalEarned}. Tap to see wallet`}
          accessibilityRole="button"
          accessibilityHint="Double tap to view your wallet details and transaction history"
        >
          <LinearGradient
            colors={[colors.brand.green, '#00A85C', colors.brand.teal]}
            style={styles.walletButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.seeWalletText}>See wallet</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.background.primary} />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Chart Toggle Button */}
      <Pressable
        style={styles.chartToggle}
        onPress={toggleChart}
       
        accessibilityLabel={showChart ? 'Hide earnings chart' : 'View earnings chart'}
        accessibilityRole="button"
        accessibilityHint={`Double tap to ${showChart ? 'hide' : 'show'} earnings visualization chart`}
        accessibilityState={{ selected: showChart }}
      >
        <LinearGradient
          colors={showChart
            ? ['rgba(255, 200, 87, 0.2)', 'rgba(0, 192, 106, 0.15)']
            : ['rgba(0, 192, 106, 0.1)', 'rgba(255, 200, 87, 0.1)']
          }
          style={styles.chartToggleGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={showChart ? 'stats-chart' : 'bar-chart-outline'}
            size={18}
            color={showChart ? colors.warningScale[700] : EARN_COLORS.primary}
          />
          <ThemedText style={[styles.chartToggleText, showChart && { color: colors.warningScale[700] }]}>
            {showChart ? 'Hide Chart' : 'View Chart'}
          </ThemedText>
        </LinearGradient>
      </Pressable>

      {/* Chart */}
      {showChart && (
        <Animated.View
          style={[
            styles.chartContainer,
            chartAnimStyle,
          ]}
        >
          <EarningsChart breakdown={earnings.breakdown} currency={earnings.currency} />
        </Animated.View>
      )}

      {/* Separator */}
      {showChart && <View style={styles.separator} />}

      {/* Breakdown */}
      <View style={styles.breakdown}>
        {breakdownItems.map((item, idx) => (
          <Animated.View
            key={idx}
            style={[breakdownAnimStyle]}
          >
            <View style={styles.breakdownItem}>
              {/* Icon Container */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={item.gradient as any}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={item.icon as any} size={20} color={colors.background.primary} />
                </LinearGradient>
              </View>

              {/* Amount */}
              <ThemedText style={styles.breakdownAmount}>
                {earnings.currency}{item.value}
              </ThemedText>

              {/* Label */}
              <ThemedText style={styles.breakdownLabel} numberOfLines={2}>
                {item.label}
              </ThemedText>
            </View>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldWarm,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 6px 16px rgba(255, 200, 87, 0.2)',
      },
    }),
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    bottom: -30,
    left: -30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 5,
  },
  headerLeft: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[800],
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 50,
    height: 4,
    backgroundColor: colors.brand.goldWarm,
    borderRadius: 2,
  },
  earningAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.brand.teal,
    letterSpacing: -0.5,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(255, 200, 87, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
      android: {
        textShadowColor: 'rgba(255, 200, 87, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
      web: {
        textShadow: '0px 1px 3px rgba(255, 200, 87, 0.4)',
      },
    }),
  },
  earned: {
    fontSize: 16,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  seeWalletButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 192, 106, 0.3)',
      },
    }),
  },
  walletButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
  },
  seeWalletText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.2,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 20,
    marginHorizontal: -24,
    zIndex: 5,
  },
  chartToggle: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldWarm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(255, 200, 87, 0.15)',
      },
    }),
  },
  chartToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  chartToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: EARN_COLORS.primary,
    letterSpacing: 0.2,
  },
  chartContainer: {
    marginBottom: 16,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 8,
    zIndex: 5,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  iconContainer: {
    marginBottom: 4,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  breakdownAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral[800],
    marginBottom: 2,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
});

export default React.memo(EarningsCard);
