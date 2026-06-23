import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import socialImpactApi, { SocialImpactEvent, UserImpactStats } from '@/services/socialImpactApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
// Nuqta Brand Colors
// Helper function for event type icon background colors
const getEventTypeIconBg = (eventType?: string): string => {
  const bgMap: Record<string, string> = {
    'blood-donation': 'rgba(239, 68, 68, 0.15)',
    'tree-plantation': 'rgba(255, 205, 87, 0.15)',
    'beach-cleanup': 'rgba(59, 130, 246, 0.15)',
    'digital-literacy': 'rgba(99, 102, 241, 0.15)',
    'food-drive': 'rgba(249, 115, 22, 0.15)',
    'health-camp': 'rgba(6, 182, 212, 0.15)',
    'skill-training': 'rgba(236, 72, 153, 0.15)',
    'women-empowerment': 'rgba(236, 72, 153, 0.15)',
    'education': 'rgba(99, 102, 241, 0.15)',
    'environment': 'rgba(255, 205, 87, 0.15)',
  };
  return bgMap[eventType || ''] || 'rgba(139, 92, 246, 0.15)';
};

// Helper function for event type emoji
const getEventTypeEmoji = (eventType?: string): string => {
  const emojiMap: Record<string, string> = {
    'blood-donation': '🩸',
    'tree-plantation': '🌳',
    'beach-cleanup': '🏖️',
    'digital-literacy': '💻',
    'food-drive': '🍛',
    'health-camp': '🏥',
    'skill-training': '👩‍💼',
    'women-empowerment': '👩‍💼',
    'education': '📚',
    'environment': '🌍',
  };
  return emojiMap[eventType || ''] || '✨';
};

// Format event time for display
const formatEventTime = (eventTime?: { start: string; end: string }): string => {
  if (!eventTime) return 'TBD';
  return `${eventTime.start} - ${eventTime.end}`;
};

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
];

// Default empty stats
const defaultStats: UserImpactStats = {
  totalEventsRegistered: 0,
  totalEventsCompleted: 0,
  totalEventsAttended: 0,
  livesImpacted: 0,
  treesPlanted: 0,
  hoursContributed: 0,
  mealsServed: 0,
  totalRezCoinsEarned: 0,
  totalBrandCoinsEarned: 0,
  currentStreak: 0,
  longestStreak: 0,
};

function SocialImpactPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [events, setEvents] = useState<SocialImpactEvent[]>([]);
  const [stats, setStats] = useState<UserImpactStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch events and stats
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      // Fetch events and stats in parallel
      const [eventsResponse, statsResponse] = await Promise.all([
        socialImpactApi.getEvents(),
        socialImpactApi.getMyStats()
      ]);

      if (eventsResponse.success && eventsResponse.data) {
        if (!isMounted()) return;
        setEvents(eventsResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        if (!isMounted()) return;
        setStats(statsResponse.data);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load data');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Filter events based on active tab
  const filteredActivities =
    activeTab === 'all'
      ? events
      : events.filter((e) => e.eventStatus === activeTab);

  // Get count for each tab
  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return events.length;
    return events.filter((e) => e.eventStatus === tabId).length;
  };

  // Loading skeleton
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={22} color={colors.deepNavy} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Social Impact</Text>
          <Text style={styles.headerSubtitle}>Earn while making a difference</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.gold]}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Hero - CSR Focus */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.08)', 'rgba(59, 130, 246, 0.08)', 'rgba(139, 92, 246, 0.08)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="business" size={28} color={Colors.background.primary} />
            </View>
            <Text style={styles.heroTitle}>Corporate CSR Meets Social Impact</Text>
            <Text style={styles.heroDesc}>
              Companies sponsor events as CSR activities. You participate, make an impact, and earn both{' '}
              <Text style={styles.heroHighlight}>{BRAND.COIN_NAME}</Text> +{' '}
              <Text style={styles.heroHighlightPurple}>Brand Coins</Text>
            </Text>

            {/* CSR Benefits */}
            <View style={styles.csrBenefits}>
              <View style={styles.csrBenefitItem}>
                <Text style={styles.csrEmoji}>🏢</Text>
                <Text style={styles.csrBenefitText}>Corporate CSR</Text>
              </View>
              <View style={styles.csrBenefitItem}>
                <Text style={styles.csrEmoji}>🤝</Text>
                <Text style={styles.csrBenefitText}>Social Good</Text>
              </View>
              <View style={styles.csrBenefitItem}>
                <Text style={styles.csrEmoji}>💰</Text>
                <Text style={styles.csrBenefitText}>Dual Rewards</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* My Impact Stats */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Your Impact</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="heart" size={16} color={Colors.error} />
                <Text style={styles.statLabel}>Lives Impacted</Text>
              </View>
              <Text style={styles.statValue}>{stats.livesImpacted.toLocaleString()}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(255, 205, 87, 0.08)', borderColor: 'rgba(255, 205, 87, 0.2)' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="leaf" size={16} color={Colors.gold} />
                <Text style={styles.statLabel}>Trees Planted</Text>
              </View>
              <Text style={styles.statValue}>{stats.treesPlanted}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(255, 205, 87, 0.08)', borderColor: 'rgba(255, 205, 87, 0.2)' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="wallet" size={16} color={Colors.gold} />
                <Text style={styles.statLabel}>{BRAND.COIN_NAME}</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalRezCoinsEarned.toLocaleString()}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="sparkles" size={16} color={Colors.brand.purple} />
                <Text style={styles.statLabel}>Branded Coins</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalBrandCoinsEarned.toLocaleString()}</Text>
            </View>
          </View>

          {/* My Participations Link */}
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              marginTop: Spacing.xs,
              backgroundColor: 'rgba(255, 205, 87, 0.1)',
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: 'rgba(255, 205, 87, 0.3)',
            }}
            onPress={() => router.push('/social-impact/my-events')}
          >
            <Ionicons name="list" size={16} color={'#e6b84e'} />
            <Text style={{ marginLeft: 6, fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: '#e6b84e' }}>
              View My Participations
            </Text>
            <Ionicons name="chevron-forward" size={14} color={'#e6b84e'} style={{ marginLeft: Spacing.xs }} />
          </Pressable>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label} ({getTabCount(tab.id)})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Activities List */}
        <View style={styles.activitiesContainer}>
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>No events found</Text>
              <Text style={styles.emptyStateText}>
                {activeTab === 'all'
                  ? 'Check back later for new social impact events'
                  : `No ${activeTab} events at the moment`}
              </Text>
            </View>
          ) : (
            filteredActivities.map((event) => (
              <View key={event._id} style={styles.activityCard}>
                {/* Event Image Banner */}
                {event.image && (
                  <View style={styles.eventImageContainer}>
                    <CachedImage
                      source={event.image}
                      style={styles.eventImage}
                      contentFit="cover"
                    />
                    {event.eventStatus === 'ongoing' && (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Header */}
                <View style={styles.activityHeader}>
                  <View style={[styles.activityIcon, { backgroundColor: getEventTypeIconBg(event.eventType) }]}>
                    <Text style={styles.activityEmoji}>{getEventTypeEmoji(event.eventType)}</Text>
                  </View>
                  <View style={styles.activityHeaderContent}>
                    <View style={styles.activityTitleRow}>
                      <Text style={styles.activityTitle}>{event.name}</Text>
                      {event.eventStatus === 'completed' && (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                      )}
                      {event.isEnrolled && (
                        <View style={styles.enrolledBadge}>
                          <Text style={styles.enrolledBadgeText}>Enrolled</Text>
                        </View>
                      )}
                      {event.isCsrActivity && (
                        <View style={styles.csrBadge}>
                          <Text style={styles.csrBadgeText}>CSR</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.organizerRow}>
                      {event.organizer?.logo && event.organizer.logo.startsWith('http') ? (
                        <CachedImage
                          source={event.organizer.logo}
                          style={styles.organizerLogo}
                          contentFit="contain"
                        />
                      ) : (
                        <Text style={styles.organizerEmoji}>🏢</Text>
                      )}
                      <Text style={styles.organizerText}>{event.organizer?.name || 'Unknown Organizer'}</Text>
                    </View>
                    {event.sponsor && (
                      <View style={styles.sponsorRow}>
                        <Ionicons name="business" size={12} color={Colors.brand.purple} />
                        <Text style={styles.sponsorText}>Sponsored by {event.sponsor.name}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>
                      {event.eventDate
                        ? new Date(event.eventDate).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : 'TBD'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>{formatEventTime(event.eventTime)}</Text>
                  </View>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.detailText}>
                    {event.location?.address || 'Location TBD'}
                    {event.location?.city ? ` • ${event.location.city}` : ''}
                  </Text>
                </View>

                {/* Impact & Progress */}
                {(event.impact || event.capacity) && (
                  <View style={styles.impactSection}>
                    {event.impact?.description && (
                      <View style={styles.impactHeader}>
                        <Ionicons name="trending-up" size={14} color={Colors.info} />
                        <Text style={styles.impactText}>{event.impact.description}</Text>
                      </View>
                    )}
                    {event.capacity && event.capacity.goal > 0 && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min((event.capacity.enrolled / event.capacity.goal) * 100, 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {event.capacity.enrolled}/{event.capacity.goal}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Rewards */}
                {event.rewards && (event.rewards.rezCoins > 0 || event.rewards.brandCoins > 0) && (
                  <View style={styles.rewardsSection}>
                    <Text style={styles.rewardsTitle}>Participation Rewards</Text>
                    <View style={styles.rewardsGrid}>
                      {event.rewards.rezCoins > 0 && (
                        <View style={styles.rewardCard}>
                          <View style={styles.rewardHeader}>
                            <Ionicons name="wallet" size={14} color={Colors.gold} />
                            <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                          </View>
                          <Text style={styles.rewardValue}>+{event.rewards.rezCoins}</Text>
                        </View>
                      )}
                      {event.rewards.brandCoins > 0 && event.sponsor && (
                        <View style={[styles.rewardCard, styles.rewardCardPurple]}>
                          <View style={styles.rewardHeader}>
                            <Ionicons name="sparkles" size={14} color={Colors.brand.purple} />
                            <Text style={styles.rewardLabel}>Brand Coins</Text>
                          </View>
                          <Text style={[styles.rewardValue, { color: Colors.brand.purple }]}>
                            +{event.rewards.brandCoins}
                          </Text>
                          <Text style={styles.brandName}>{event.sponsor.brandCoinName}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* CTA */}
                {event.eventStatus === 'completed' ? (
                  <View style={styles.completedButton}>
                    <Ionicons name="checkmark" size={16} color={Colors.text.tertiary} />
                    <Text style={styles.completedButtonText}>Completed</Text>
                  </View>
                ) : event.isEnrolled ? (
                  <Pressable
                    style={styles.viewDetailsButton}
                    onPress={() => router.push(`/social-impact/${event._id}` as any)}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.registerButton}
                    onPress={() => router.push(`/social-impact/${event._id}` as any)}
                  >
                    <LinearGradient
                      colors={[Colors.gold, '#e6b84e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.registerButtonGradient}
                    >
                      <Text style={styles.registerButtonText}>Register Now</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.08)', 'rgba(59, 130, 246, 0.08)']}
            style={styles.bottomCTAGradient}
          >
            <Text style={styles.bottomCTATitle}>Every Action Counts</Text>
            <Text style={styles.bottomCTADesc}>
              Join thousands making an impact while earning dual rewards
            </Text>
            <View style={styles.bottomCTAStats}>
              <View style={styles.bottomCTAStat}>
                <Ionicons name="people" size={14} color={Colors.text.tertiary} />
                <Text style={styles.bottomCTAStatText}>
                  {stats.totalEventsCompleted > 0 ? `${stats.totalEventsCompleted} completed` : 'Join now'}
                </Text>
              </View>
              <View style={styles.bottomCTAStat}>
                <Ionicons name="heart" size={14} color={Colors.text.tertiary} />
                <Text style={styles.bottomCTAStatText}>{events.length} events</Text>
              </View>
              <View style={styles.bottomCTAStat}>
                <Ionicons name="business" size={14} color={Colors.text.tertiary} />
                <Text style={styles.bottomCTAStatText}>
                  {new Set(events.filter(e => e.sponsor).map(e => e.sponsor?._id)).size || 0} CSR Partners
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: colors.deepNavy,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyStateText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
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
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  heroSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  heroGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  heroTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroDesc: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroHighlight: {
    fontWeight: '700',
    color: Colors.gold,
  },
  heroHighlightPurple: {
    fontWeight: '700',
    color: Colors.brand.purple,
  },
  csrBenefits: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.base,
  },
  csrBenefitItem: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  csrEmoji: {
    fontSize: Typography.h3.fontSize,
    marginBottom: 6,
  },
  csrBenefitText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '600',
    color: colors.deepNavy,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.deepNavy,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  tabButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginRight: Spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  tabText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
  },
  activitiesContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  activityCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  eventImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: Colors.background.secondary,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background.primary,
  },
  liveText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  activityIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 26,
  },
  activityHeaderContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  activityTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
  },
  csrBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  csrBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.info,
  },
  enrolledBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  enrolledBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.gold,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  organizerLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.background.secondary,
  },
  organizerEmoji: {
    fontSize: Typography.body.fontSize,
  },
  organizerText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
    flex: 1,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sponsorText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  detailText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
  },
  impactSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  impactText: {
    fontSize: Typography.bodySmall.fontSize,
    color: '#1E40AF',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  progressText: {
    fontSize: Typography.overline.fontSize,
    color: Colors.text.tertiary,
  },
  rewardsSection: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  rewardsTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  rewardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  rewardCardPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  rewardLabel: {
    fontSize: Typography.overline.fontSize,
    color: Colors.text.tertiary,
  },
  rewardValue: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.gold,
  },
  brandName: {
    fontSize: 9,
    color: Colors.brand.purple,
    marginTop: 2,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  completedButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  registerButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  registerButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  viewDetailsButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  bottomCTAGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  bottomCTATitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  bottomCTADesc: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  bottomCTAStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  bottomCTAStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bottomCTAStatText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(SocialImpactPage, 'SocialImpact');
