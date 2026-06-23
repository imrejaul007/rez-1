// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Activity Feed Screen
// Displays user activity timeline with pagination and filtering

import React, { useState, useCallback } from 'react';
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
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useActivities } from '@/hooks/useActivities';
import { Activity, ActivityType } from '@/services/activityApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { TransactionListSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const ACTIVITY_TYPE_FILTERS: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Orders', value: ActivityType.ORDER },
  { label: 'Cashback', value: ActivityType.CASHBACK },
  { label: 'Reviews', value: ActivityType.REVIEW },
  { label: 'Videos', value: ActivityType.VIDEO },
  { label: 'Projects', value: ActivityType.PROJECT },
  { label: 'Vouchers', value: ActivityType.VOUCHER },
  { label: 'Offers', value: ActivityType.OFFER },
  { label: 'Referrals', value: ActivityType.REFERRAL },
  { label: 'Wallet', value: ActivityType.WALLET },
  { label: 'Achievements', value: ActivityType.ACHIEVEMENT },
];

function ActivityFeedPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedFilter, setSelectedFilter] = useState<ActivityType | 'all'>('all');

  const {
    activities,
    pagination,
    summary,
    isLoading,
    refresh,
    loadMore,
    setFilterType,
    hasMore,
  } = useActivities({
    autoFetch: true,
    initialPage: 1,
    initialLimit: 20,
  });

  const handleFilterChange = (filter: ActivityType | 'all') => {
    setSelectedFilter(filter);
    if (filter === 'all') {
      setFilterType(undefined);
    } else {
      setFilterType(filter);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderActivityItem = useCallback(({ item }: { item: Activity }) => (
    <Pressable style={styles.activityCard}>
      <View style={[styles.activityIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>

      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <ThemedText style={styles.activityTitle} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.activityTime}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>

        {item.description && (
          <ThemedText style={styles.activityDescription} numberOfLines={2}>
            {item.description}
          </ThemedText>
        )}

        {item.amount !== undefined && item.amount !== null && (
          <View style={styles.activityAmount}>
            <ThemedText style={[styles.amountText, { color: item.color }]}>
              {item.amount > 0 ? '+' : ''}{currencySymbol}{item.amount.toFixed(2)}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  ), [currencySymbol]);

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.gold} />
        <ThemedText style={styles.footerText}>Loading more...</ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color={Colors.border.default} />
      <ThemedText style={styles.emptyText}>No activities yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Your activity timeline will appear here
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={colors.lightMustard} />

      {/* Header */}
      <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => {
              // Check if we can go back, otherwise navigate to profile
              if (router.canGoBack()) {
                router.canGoBack() ? router.back() : router.replace('/(tabs)');
              } else {
                router.push('/profile');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Activity Feed</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {pagination?.total || 0} total activities
            </ThemedText>
          </View>

          <View style={styles.placeholder} />
        </View>

        {/* Summary Stats */}
        {summary && summary.summary.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.summaryScroll}
            contentContainerStyle={styles.summaryContent}
          >
            {summary.summary.map((stat, index) => (
              <LinearGradient
                key={index}
                colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)']}
                style={styles.summaryCard}
              >
                <ThemedText style={styles.summaryNumber}>{stat.count}</ThemedText>
                <ThemedText style={styles.summaryLabel}>{stat.type}</ThemedText>
                {stat.totalAmount > 0 && (
                  <View style={styles.amountBadge}>
                    <ThemedText style={styles.summaryAmount}>
                      {currencySymbol}{stat.totalAmount.toFixed(0)}
                    </ThemedText>
                  </View>
                )}
              </LinearGradient>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {ACTIVITY_TYPE_FILTERS.map((filter) => (
            <Pressable
              key={filter.value}
              style={[
                styles.filterPill,
                selectedFilter === filter.value && styles.filterPillActive,
              ]}
              onPress={() => handleFilterChange(filter.value)}
             
            >
              <ThemedText
                style={[
                  styles.filterPillText,
                  selectedFilter === filter.value && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Activity List */}
      <FlashList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && activities.length > 0}
            onRefresh={refresh}
            tintColor={colors.lightMustard}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {isLoading && activities.length === 0 && (
        <TransactionListSkeleton />
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
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  placeholder: {
    width: 40,
  },
  summaryScroll: {
    marginTop: Spacing.sm,
  },
  summaryContent: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryNumber: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.overline,
    color: Colors.text.tertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountBadge: {
    backgroundColor: '#ffcd5710',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: 6,
  },
  summaryAmount: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '700',
  },
  filterContainer: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  filterContent: {
    paddingHorizontal: Spacing.base,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
  },
  filterPillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterPillText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  filterPillTextActive: {
    color: Colors.text.inverse,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: 120,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
  },
  activityIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  activityTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
    letterSpacing: -0.2,
  },
  activityTime: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  activityDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
  activityAmount: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffcd5710',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  amountText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.9)',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
});
export default withErrorBoundary(ActivityFeedPage, 'ProfileActivity');
