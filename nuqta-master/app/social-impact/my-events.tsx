// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import socialImpactApi, { UserEnrollment } from '@/services/socialImpactApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  registered: { label: 'Registered', color: Colors.info, icon: 'checkmark-circle' },
  checked_in: { label: 'Checked In', color: Colors.warning, icon: 'location' },
  completed: { label: 'Completed', color: Colors.success, icon: 'trophy' },
  cancelled: { label: 'Cancelled', color: Colors.text.tertiary, icon: 'close-circle' },
  no_show: { label: 'No Show', color: Colors.error, icon: 'alert-circle' },
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'registered', label: 'Registered' },
  { id: 'checked_in', label: 'Checked In' },
  { id: 'completed', label: 'Completed' },
];

const getEventTypeEmoji = (eventType?: string): string => {
  const map: Record<string, string> = {
    'blood-donation': '🩸', 'tree-plantation': '🌳', 'beach-cleanup': '🏖️',
    'digital-literacy': '💻', 'food-drive': '🍲', 'health-camp': '🏥',
    'skill-training': '🎓', 'women-empowerment': '👩', 'education': '📚',
    'environment': '🌍',
  };
  return map[eventType || ''] || '✨';
};

function MyParticipationsScreen() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<UserEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchEnrollments = useCallback(async () => {
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await socialImpactApi.getMyEvents(status);
      if (response.success && response.data) {
        setEnrollments(response.data as UserEnrollment[]);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [activeTab]);
  const isMounted = useIsMounted();

  useEffect(() => {
    setLoading(true);
    fetchEnrollments();
  }, [fetchEnrollments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEnrollments();
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchEnrollments]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const renderEnrollmentCard = useCallback(({ item }: { item: UserEnrollment }) => {
    const event = item.event;
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.registered;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/social-impact/${event?._id}`)}
       
      >
        <View style={styles.cardHeader}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{getEventTypeEmoji(event?.eventType)}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={2}>{event?.name || 'Event'}</Text>
            {event?.organizer?.name && (
              <Text style={styles.cardOrganizer}>{event.organizer.name}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}15` }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          {event?.eventDate && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>{formatDate(event.eventDate)}</Text>
            </View>
          )}
          {event?.location?.city && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>{event.location.city}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>Registered {formatDate(item.registeredAt)}</Text>
          </View>
        </View>

        {item.status === 'completed' && item.coinsAwarded && (
          <View style={styles.rewardsRow}>
            {item.coinsAwarded.rez > 0 && (
              <View style={styles.rewardChip}>
                <Text style={styles.rewardText}>+{item.coinsAwarded.rez} {BRAND.APP_NAME}</Text>
              </View>
            )}
            {item.coinsAwarded.brand > 0 && (
              <View style={[styles.rewardChip, { backgroundColor: colors.tint.purple }]}>
                <Text style={[styles.rewardText, { color: Colors.brand.purple }]}>
                  +{item.coinsAwarded.brand} Brand
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  }, [router]);

  const renderTabItem = useCallback(({ item: tab }: { item: typeof TABS[number] }) => {
    const isActive = activeTab === tab.id;
    return (
      <Pressable
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab.id)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.deepNavy} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>My Participations</Text>
          <Text style={styles.headerSubtitle}>Track your impact journey</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.tabsContent}
          renderItem={renderTabItem}
          estimatedItemSize={44}
        />
      </View>

      {/* Content */}
      {loading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={enrollments}
          renderItem={renderEnrollmentCard}
          keyExtractor={item => item.enrollmentId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
          }
          estimatedItemSize={120}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={56} color={Colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No participations yet</Text>
              <Text style={styles.emptySubtitle}>
                Browse social impact events and start making a difference!
              </Text>
              <Pressable
                style={styles.browseBtn}
                onPress={() => router.replace('/social-impact')}
              >
                <Text style={styles.browseBtnText}>Browse Events</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  backBtn: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  tabsContainer: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  tabsContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  tabActive: {
    backgroundColor: Colors.gold,
  },
  tabText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.deepNavy,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.warningScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: Typography.h3.fontSize,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    lineHeight: 20,
  },
  cardOrganizer: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  rewardsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  rewardChip: {
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  rewardText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.warning,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: 40,
  },
  browseBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },
  browseBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
  },
});

export default withErrorBoundary(MyParticipationsScreen, 'SocialImpactMyEvents');
