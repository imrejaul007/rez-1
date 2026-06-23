import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Scheduled Coin Drops Page
// View upcoming coin rewards — API-driven

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import walletApi from '@/services/walletApi';
import gamificationApi from '@/services/gamificationApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { TransactionListSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ScheduledDrop {
  id: string;
  title: string;
  amount: number;
  type: 'daily' | 'weekly' | 'special' | 'cashback';
  scheduledDate: string;
  description: string;
  icon: string;
  source: string;
  claimable: boolean;
  storeLogo?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ScheduledDropsPage() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drops, setDrops] = useState<ScheduledDrop[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchDrops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await walletApi.getScheduledDrops();
      if (res?.data) {
        setDrops(res.data.drops ?? []);
        setTotalUpcoming(res.data.totalUpcoming ?? 0);
      }
    } catch {
      // keep existing data
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return Colors.primary[600];
      case 'weekly': return Colors.gold;
      case 'special': return Colors.error;
      case 'cashback': return Colors.secondary[600];
      default: return Colors.gray[500];
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'special': return 'Special';
      case 'cashback': return 'Cashback';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  // Generate calendar view for next 7 days
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dropsOnDay = drops.filter(d => {
        const dropDate = new Date(d.scheduledDate).toISOString().split('T')[0];
        return dropDate === dateString;
      });
      days.push({
        date: dateString,
        dayName: WEEKDAYS[date.getDay()],
        dayNumber: date.getDate(),
        isToday: i === 0,
        drops: dropsOnDay,
        totalAmount: dropsOnDay.reduce((sum, d) => sum + d.amount, 0),
      });
    }
    return days;
  };

  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleDropPress = useCallback(async (drop: ScheduledDrop) => {
    if (!drop.claimable || claimingId) return;

    if (drop.source === 'daily_login') {
      // Daily login — route to check-in
      try {
        setClaimingId(drop.id);
        const result = await gamificationApi.streakCheckin();
        if (result.success && result.data) {
          platformAlertSimple('Check-in Complete', `You earned ${result.data.coinsEarned} ${BRAND.CURRENCY_CODE}!`);
          fetchDrops(true);
        } else {
          platformAlertSimple('Check-in Failed', result.error || 'Please try again later.');
        }
      } catch {
        platformAlertSimple('Error', 'Something went wrong. Please try again.');
      } finally {
        if (!isMounted()) return;
        setClaimingId(null);
      }
    } else if (drop.source === 'surprise_drop') {
      // Surprise coin drop — claim via gamification API
      try {
        if (!isMounted()) return;
        setClaimingId(drop.id);
        const result = await gamificationApi.claimSurpriseDrop(drop.id);
        if (result.success && result.data) {
          platformAlertSimple('Claimed!', result.data.message || `You got ${result.data.coins} ${BRAND.CURRENCY_CODE}!`);
          fetchDrops(true);
        } else {
          platformAlertSimple('Claim Failed', result.error || 'This drop may have expired.');
        }
      } catch {
        platformAlertSimple('Error', 'Something went wrong. Please try again.');
      } finally {
        if (!isMounted()) return;
        setClaimingId(null);
      }
    }
  }, [claimingId, fetchDrops]);

  const calendarDays = generateCalendarDays();

  const filteredDrops = selectedDate
    ? drops.filter(d => new Date(d.scheduledDate).toISOString().split('T')[0] === selectedDate)
    : drops;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Scheduled Drops</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Total Upcoming */}
        <View style={styles.totalCard}>
          <ThemedText style={styles.totalLabel}>Claimable Rewards</ThemedText>
          <ThemedText style={styles.totalAmount}>{totalUpcoming} {BRAND.CURRENCY_CODE}</ThemedText>
          <ThemedText style={styles.totalSubtext}>{drops.length} upcoming drops</ThemedText>
        </View>
      </LinearGradient>

      {loading ? (
        <TransactionListSkeleton />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchDrops(true)} colors={[Colors.primary[600]]} />
          }
        >
          {/* Calendar View */}
          <View style={styles.calendarSection}>
            <ThemedText style={styles.sectionTitle}>Next 7 Days</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarContent}
            >
              {calendarDays.map(day => (
                <Pressable
                  key={day.date}
                  style={[
                    styles.calendarDay,
                    day.isToday && styles.calendarDayToday,
                    selectedDate === day.date && styles.calendarDaySelected,
                  ]}
                  onPress={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                >
                  <ThemedText style={[styles.dayName, day.isToday && styles.dayTextToday]}>
                    {day.dayName}
                  </ThemedText>
                  <ThemedText style={[styles.dayNumber, day.isToday && styles.dayTextToday]}>
                    {day.dayNumber}
                  </ThemedText>
                  {day.totalAmount > 0 && (
                    <View style={styles.dropIndicator}>
                      <ThemedText style={styles.dropIndicatorText}>+{day.totalAmount}</ThemedText>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Drops List */}
          <View style={styles.dropsSection}>
            <ThemedText style={styles.sectionTitle}>
              {selectedDate ? `Drops on ${formatDate(selectedDate)}` : 'All Upcoming Drops'}
            </ThemedText>
            {filteredDrops.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="water-outline" size={48} color={Colors.gray[300]} />
                <ThemedText style={styles.emptyText}>
                  {selectedDate ? 'No drops on this day' : 'No upcoming drops right now'}
                </ThemedText>
              </View>
            ) : (
              filteredDrops.map(drop => (
                <Pressable
                  key={drop.id}
                  style={[styles.dropCard, drop.claimable && styles.dropCardClaimable]}
                  onPress={() => handleDropPress(drop)}
                  disabled={!drop.claimable || claimingId === drop.id}
                 
                >
                  <View style={[styles.dropIcon, { backgroundColor: getTypeColor(drop.type) + '20' }]}>
                    <Ionicons name={drop.icon as any} size={24} color={getTypeColor(drop.type)} />
                  </View>
                  <View style={styles.dropInfo}>
                    <View style={styles.dropHeader}>
                      <ThemedText style={styles.dropTitle}>{drop.title}</ThemedText>
                      <View style={[styles.typeBadge, { backgroundColor: getTypeColor(drop.type) + '20' }]}>
                        <ThemedText style={[styles.typeText, { color: getTypeColor(drop.type) }]}>
                          {getTypeLabel(drop.type)}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.dropDescription}>{drop.description}</ThemedText>
                    <ThemedText style={styles.dropDate}>
                      {formatDate(drop.scheduledDate)} · {getDaysUntil(drop.scheduledDate)}
                    </ThemedText>
                  </View>
                  <View style={styles.dropRight}>
                    <ThemedText style={styles.dropAmount}>+{drop.amount}</ThemedText>
                    <ThemedText style={styles.dropCurrency}>{BRAND.CURRENCY_CODE}</ThemedText>
                    {drop.claimable && (
                      <View style={[styles.claimableBadge, claimingId === drop.id && styles.claimableBadgeDisabled]}>
                        {claimingId === drop.id ? (
                          <ActivityIndicator size="small" color={colors.background.primary} />
                        ) : (
                          <ThemedText style={styles.claimableText}>Claim</ThemedText>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.info} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoTitle}>How Coin Drops Work</ThemedText>
              <ThemedText style={styles.infoText}>
                Scheduled drops include boosted cashback at stores, surprise rewards, and daily login bonuses.
                Check back regularly to claim your rewards!
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  totalCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  totalLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    ...Typography.priceLarge,
    color: colors.background.primary,
  },
  totalSubtext: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  calendarSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  calendarContent: {
    gap: Spacing.sm,
  },
  calendarDay: {
    width: 64,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  calendarDayToday: {
    backgroundColor: Colors.primary[600],
  },
  calendarDaySelected: {
    borderWidth: 2,
    borderColor: Colors.primary[600],
  },
  dayName: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  dayNumber: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  dayTextToday: {
    color: colors.background.primary,
  },
  dropIndicator: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dropIndicatorText: {
    ...Typography.caption,
    color: Colors.midnightNavy,
    fontWeight: '700',
  },
  dropsSection: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  dropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  dropCardClaimable: {
    borderWidth: 1,
    borderColor: Colors.primary[600] + '40',
  },
  dropIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropInfo: {
    flex: 1,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dropTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  typeBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  dropDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  dropDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  dropRight: {
    alignItems: 'center',
  },
  dropAmount: {
    ...Typography.h3,
    color: Colors.success,
  },
  dropCurrency: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  claimableBadge: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 48,
    alignItems: 'center' as const,
  },
  claimableBadgeDisabled: {
    backgroundColor: Colors.gray[400],
  },
  claimableText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...Typography.label,
    color: Colors.info,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});

export default withErrorBoundary(ScheduledDropsPage, 'WalletScheduledDrops');
