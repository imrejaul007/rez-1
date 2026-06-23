import React, { useState, useEffect,  useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import earningsApi, { PartnerEarningsSummary } from '@/services/earningsApi';
import { useGetCurrencySymbol, useFormatPrice } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface EarningsBreakdownProps {
  onViewDetails?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

interface PartnerEarningsData {
  total: number;
  breakdown: {
    partnerCashback: number;
    milestoneRewards: number;
    referralBonus: number;
    taskRewards: number;
  };
  thisMonth: number;
  pending: number;
  partnerLevel: { level: number; name: string };
}

type EarningsState =
  | { status: 'loading' }
  | { status: 'error'; error: string; staleData?: PartnerEarningsData }
  | { status: 'loaded'; data: PartnerEarningsData }
  | { status: 'refreshing'; data: PartnerEarningsData }
  | { status: 'empty' };

const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.nileBlue,
  gold: colors.brand.amberDeep,
  navy: colors.nileBlue,
  surface: colors.linen,
  white: colors.text.white,
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  success: colors.success,
  warning: colors.warning,
  error: colors.error };

const BREAKDOWN_TOOLTIPS: Record<string, string> = {
  'Partner Cashback': 'Cashback earned from orders and purchases as a partner',
  'Milestone Rewards': 'Bonuses from reaching order milestones and level upgrades',
  'Referral Bonus': `Rewards earned by referring friends to ${BRAND.APP_NAME}`,
  'Task Rewards': 'Earned by completing partner tasks like reviews and social shares' };

function EarningsBreakdown({
  onViewDetails,
  onRefresh,
  compact = false }: EarningsBreakdownProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const formatPrice = useFormatPrice();
  const currencySymbol = getCurrencySymbol();

  const formatEarnings = (amount: number): string => {
    if (!Number.isFinite(amount) || amount === 0) return `${currencySymbol}0`;
    try {
      return formatPrice(amount);
    } catch {
      return `${currencySymbol}${Math.floor(amount).toLocaleString('en-IN')}`;
    }
  };

  const [state, setState] = useState<EarningsState>({ status: 'loading' });
  const [isExpanded, setIsExpanded] = useState(!compact);
  const isMounted = useIsMounted();
  const shimmerAnim = useSharedValue(0);

  // Shimmer animation loop
  useEffect(() => {
    if (state.status === 'loading') {
      shimmerAnim.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1
      );
    } else {
      shimmerAnim.value = 0;
    }
  }, [state.status]);

  const mapResponse = (data: PartnerEarningsSummary): PartnerEarningsData => ({
    total: data.totalPartnerEarnings || 0,
    breakdown: {
      partnerCashback: data.breakdown?.partnerCashback?.amount || 0,
      milestoneRewards: data.breakdown?.milestoneRewards?.amount || 0,
      referralBonus: data.breakdown?.referralBonus?.amount || 0,
      taskRewards: data.breakdown?.taskRewards?.amount || 0 },
    thisMonth: data.thisMonth || 0,
    pending: data.pendingPartnerEarnings || 0,
    partnerLevel: {
      level: data.partnerLevel?.level || 0,
      name: data.partnerLevel?.name || 'None' } });

  const fetchEarnings = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setState({ status: 'loading' });
      }

      const response = await earningsApi.getPartnerSummary();

      if (response.success && response.data) {
        const mapped = mapResponse(response.data);
        const hasAnyEarnings = mapped.total > 0 || mapped.pending > 0;

        if (hasAnyEarnings) {
          if (!isMounted()) return;
          setState({ status: 'loaded', data: mapped });
        } else {
          setState({ status: 'empty' });
        }
      } else {
        if (!isMounted()) return;
        setState({ status: 'empty' });
      }
    } catch (error: any) {
      const currentData =
        state.status === 'loaded' || state.status === 'refreshing'
          ? state.data
          : undefined;
      if (!isMounted()) return;
      setState({
        status: 'error',
        error: error?.message || 'Failed to load earnings',
        staleData: currentData });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (state.status === 'loaded') {
      setState({ status: 'refreshing', data: state.data });
    }
    await fetchEarnings(true);
    onRefresh?.();
  }, [state, fetchEarnings, onRefresh]);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const showTooltip = (label: string) => {
    const tip = BREAKDOWN_TOOLTIPS[label];
    if (tip) {
      platformAlertSimple(label, tip);
    }
  };

  // Get displayable data from current state
  const displayData: PartnerEarningsData | undefined =
    state.status === 'loaded' ? state.data :
    state.status === 'refreshing' ? state.data :
    state.status === 'error' ? state.staleData :
    undefined;

  const breakdownItems = [
    {
      icon: 'cash-outline' as const,
      label: 'Partner Cashback',
      value: displayData?.breakdown.partnerCashback || 0,
      color: COLORS.gold },
    {
      icon: 'trophy-outline' as const,
      label: 'Milestone Rewards',
      value: displayData?.breakdown.milestoneRewards || 0,
      color: COLORS.warning },
    {
      icon: 'people-outline' as const,
      label: 'Referral Bonus',
      value: displayData?.breakdown.referralBonus || 0,
      color: COLORS.success },
    {
      icon: 'checkmark-circle-outline' as const,
      label: 'Task Rewards',
      value: displayData?.breakdown.taskRewards || 0,
      color: COLORS.primaryDark },
  ];

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-200, 200]) }],
  }));

  // --- LOADING STATE ---
  if (state.status === 'loading') {

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.skeleton, { width: 40, height: 40, borderRadius: 20 }]} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={[styles.skeleton, { width: 120, height: 14, borderRadius: 4 }]} />
              <View style={[styles.skeleton, { width: 160, height: 10, borderRadius: 4, marginTop: 6 }]} />
            </View>
          </View>
          <View style={[styles.skeleton, { width: 100, height: 22, borderRadius: 4 }]} />
        </View>
        {(!compact || isExpanded) && (
          <View style={styles.content}>
            <View style={styles.quickStats}>
              <View style={[styles.skeleton, { flex: 1, height: 56, borderRadius: 12 }]} />
              <View style={[styles.skeleton, { flex: 1, height: 56, borderRadius: 12 }]} />
            </View>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.skeleton, { width: 32, height: 32, borderRadius: 16 }]} />
                  <View style={[styles.skeleton, { width: 110, height: 14, borderRadius: 4, marginLeft: 12 }]} />
                </View>
                <View style={[styles.skeleton, { width: 70, height: 14, borderRadius: 4 }]} />
              </View>
            ))}
          </View>
        )}
        <Animated.View
          style={[styles.shimmerOverlay, shimmerStyle]}
        />
      </View>
    );
  }

  // --- EMPTY STATE ---
  if (state.status === 'empty') {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="wallet-outline" size={40} color={COLORS.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>Partner Earnings</Text>
          <Text style={styles.emptyDescription}>
            Start earning by shopping, completing tasks, and referring friends
          </Text>
          {onViewDetails && (
            <Pressable style={styles.emptyButton} onPress={onViewDetails}>
              <Text style={styles.emptyButtonText}>Explore Partner Program</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primaryDark} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // --- ERROR STATE (no stale data) ---
  if (state.status === 'error' && !state.staleData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.error} />
          <Text style={styles.errorText}>Couldn't load earnings</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchEarnings()}>
            <Ionicons name="refresh" size={16} color={COLORS.primaryDark} />
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- LOADED / REFRESHING / ERROR-WITH-STALE-DATA ---
  return (
    <View style={styles.container}>
      {/* Error banner with stale data */}
      {state.status === 'error' && state.staleData && (
        <Pressable style={styles.staleBanner} onPress={() => fetchEarnings()}>
          <Ionicons name="refresh-outline" size={14} color={COLORS.warning} />
          <Text style={styles.staleBannerText}>Data may be outdated. Tap to refresh.</Text>
        </Pressable>
      )}

      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={compact ? toggleExpanded : undefined}
       
      >
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.iconContainer}
          >
            <Ionicons name="wallet" size={20} color="white" />
          </LinearGradient>
          <View style={styles.headerText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Partner Earnings</Text>
              {state.status === 'refreshing' && (
                <ActivityIndicator size="small" color={COLORS.primaryDark} />
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              {`Use to shop in ${BRAND.APP_NAME}`} {'\u00B7'} No withdrawal
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalAmount}>{formatEarnings(displayData?.total || 0)}</Text>
          {compact && (
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          )}
        </View>
      </Pressable>

      {/* Expanded Content */}
      {(isExpanded || !compact) && (
        <View style={styles.content}>
          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatEarnings(displayData?.thisMonth || 0)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={[styles.statCard, styles.statCardPending]}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {formatEarnings(displayData?.pending || 0)}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            {breakdownItems.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => showTooltip(item.label)}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={COLORS.textSecondary}
                      style={{ marginLeft: 4 }}
                    />
                  </Pressable>
                </View>
                <Text style={styles.breakdownValue}>
                  {formatEarnings(item.value)}
                </Text>
              </View>
            ))}
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={COLORS.primaryDark} />
            <Text style={styles.infoText}>
              Partner earnings are store credit. Use them at checkout to pay for your orders!
            </Text>
          </View>

          {/* Action Button */}
          {onViewDetails && (
            <Pressable style={styles.actionButton} onPress={onViewDetails}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100] },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 },
  headerText: {
    flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2 },
  headerRight: {
    alignItems: 'flex-end' },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryDark },
  content: {
    padding: 16,
    paddingTop: 12 },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' },
  statCardPending: {
    backgroundColor: colors.tint.amberLight },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4 },
  breakdownSection: {
    marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12 },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100] },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center' },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.textPrimary },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16 },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
    lineHeight: 18 },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden' },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8 },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white' },

  // Skeleton / shimmer
  skeleton: {
    backgroundColor: colors.gray[200] },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    width: 100 },

  // Empty state
  emptyState: {
    padding: 32,
    alignItems: 'center' },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8 },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark },

  // Error state
  errorState: {
    padding: 32,
    alignItems: 'center',
    gap: 8 },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginTop: 4 },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark },

  // Stale data banner
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: colors.tint.amberLight },
  staleBannerText: {
    fontSize: 11,
    color: COLORS.warning } });

export default React.memo(EarningsBreakdown);
