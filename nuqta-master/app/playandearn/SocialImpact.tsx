import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState, useEffect } from 'react';
import { useRouter, Link } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import programApi from '../../services/programApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const SocialImpact = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const isMounted = useIsMounted();

  // Fetch social impact events
  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsRes = await programApi.getSocialImpactEvents();
        if (eventsRes.data) {
          setEvents(eventsRes.data);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const impactActivities = [
    {
      id: 1,
      type: 'blood-donation',
      title: 'Blood Donation Drive',
      icon: '🩸',
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: colors.error,
      organizer: 'Apollo Hospitals',
      logo: '🏥',
      date: 'Dec 28, 2024',
      time: '9:00 AM - 5:00 PM',
      location: 'Apollo Hospital, Sector 18',
      distance: '2.3 km',
      rewards: {
        rezCoins: 200,
        brandedCoins: 150,
        brandName: 'Apollo'
      },
      enrolled: 234,
      goal: 500,
      impact: 'Save 3 lives per donation',
      status: 'upcoming'
    },
    {
      id: 2,
      type: 'tree-plantation',
      title: 'Tree Plantation Drive',
      icon: '🌳',
      iconBg: 'rgba(34, 197, 94, 0.2)',
      iconColor: colors.success,
      organizer: 'Green Earth Foundation',
      logo: '🌍',
      date: 'Dec 30, 2024',
      time: '7:00 AM - 11:00 AM',
      location: 'City Park, Botanical Gardens',
      distance: '4.1 km',
      rewards: {
        rezCoins: 150,
        brandedCoins: 100,
        brandName: 'Green Earth'
      },
      enrolled: 156,
      goal: 200,
      impact: 'Plant 1000+ saplings',
      status: 'upcoming'
    },
    {
      id: 3,
      type: 'cleanup',
      title: 'Beach Cleanup Drive',
      icon: '🏖️',
      iconBg: 'rgba(59, 130, 246, 0.2)',
      iconColor: colors.infoScale[400],
      organizer: 'Clean Beaches Initiative',
      logo: '🌊',
      date: 'Jan 2, 2025',
      time: '6:00 AM - 9:00 AM',
      location: 'Marina Beach',
      distance: '8.5 km',
      rewards: {
        rezCoins: 120,
        brandedCoins: 80,
        brandName: 'Clean Beaches'
      },
      enrolled: 89,
      goal: 150,
      impact: 'Clean 5 km of coastline',
      status: 'upcoming'
    },
    {
      id: 4,
      type: 'ngo-volunteer',
      title: 'Community Kitchen Volunteering',
      icon: '🍲',
      iconBg: 'rgba(249, 115, 22, 0.2)',
      iconColor: colors.brand.orange,
      organizer: 'Feed the Need NGO',
      logo: '🤝',
      date: 'Every Sunday',
      time: '11:00 AM - 2:00 PM',
      location: 'Community Center, MG Road',
      distance: '3.7 km',
      rewards: {
        rezCoins: 100,
        brandedCoins: 0
      },
      enrolled: 45,
      goal: 100,
      impact: 'Feed 200+ people',
      status: 'ongoing'
    },
    {
      id: 5,
      type: 'blood-donation',
      title: 'Emergency Blood Camp',
      icon: '🩸',
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: colors.error,
      organizer: 'Red Cross Society',
      logo: '❤️',
      date: 'Dec 26, 2024',
      time: 'Completed',
      location: 'City Hospital',
      distance: '1.8 km',
      rewards: {
        rezCoins: 200,
        brandedCoins: 0
      },
      enrolled: 312,
      goal: 300,
      impact: 'Saved 900+ lives',
      status: 'completed'
    }
  ];

  const tabs = [
    { id: 'all', label: 'All', count: impactActivities.length },
    { id: 'upcoming', label: 'Upcoming', count: impactActivities.filter(a => a.status === 'upcoming').length },
    { id: 'ongoing', label: 'Ongoing', count: impactActivities.filter(a => a.status === 'ongoing').length },
    { id: 'completed', label: 'Completed', count: impactActivities.filter(a => a.status === 'completed').length }
  ];

  const filteredActivities = activeTab === 'all'
    ? impactActivities
    : impactActivities.filter(a => a.status === activeTab);

  const myImpactStats = {
    totalActivities: 12,
    livesImpacted: 2340,
    treesPlanted: 45,
    rezCoinsEarned: 2400,
    brandedCoinsEarned: 1650
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.text.primary : Colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)' }]}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? Colors.text.inverse : Colors.text.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Social Impact</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Earn while making a difference</Text>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ['rgba(255, 205, 87, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)'] : ['rgba(255, 205, 87, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']}
            style={[styles.heroCard, { borderColor: isDark ? 'rgba(255, 205, 87, 0.3)' : 'rgba(255, 205, 87, 0.3)' }]}
          >
            <LinearGradient colors={[Colors.gold, colors.infoScale[400]]} style={styles.heroIconContainer}>
              <Ionicons name="heart" size={32} color={Colors.text.inverse} />
            </LinearGradient>
            <Text style={[styles.heroTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Powerful Differentiator</Text>
            <Text style={[styles.heroText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
              Do good, earn ${BRAND.COIN_NAME} + Branded Coins from sponsors
            </Text>
          </LinearGradient>
        </View>

        {/* My Impact Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Ionicons name="ribbon" size={20} color={Colors.warning} />
            <Text style={[styles.statsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Your Impact</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : colors.errorScale[50], borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : colors.errorScale[200] }]}>
              <View style={styles.statHeader}>
                <Ionicons name="heart" size={20} color={Colors.error} />
                <Text style={[styles.statLabel, { color: Colors.text.tertiary }]}>Lives Impacted</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myImpactStats.livesImpacted.toLocaleString()}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : colors.successScale[50], borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : colors.successScale[200] }]}>
              <View style={styles.statHeader}>
                <Ionicons name="leaf" size={20} color={Colors.success} />
                <Text style={[styles.statLabel, { color: Colors.text.tertiary }]}>Trees Planted</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myImpactStats.treesPlanted}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255, 205, 87, 0.1)' : colors.linen, borderColor: isDark ? 'rgba(255, 205, 87, 0.3)' : '#A7F3D0' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="cash" size={20} color={Colors.gold} />
                <Text style={[styles.statLabel, { color: Colors.text.tertiary }]}>{BRAND.COIN_NAME}</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myImpactStats.rezCoinsEarned.toLocaleString()}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : '#FAF5FF', borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#E9D5FF' }]}>
              <View style={styles.statHeader}>
                <Ionicons name="sparkles" size={20} color={colors.brand.purpleMedium} />
                <Text style={[styles.statLabel, { color: Colors.text.tertiary }]}>Branded Coins</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myImpactStats.brandedCoinsEarned.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab.id ? Colors.gold : isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.id ? Colors.text.inverse : Colors.text.tertiary }]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Activities List */}
        <View style={styles.content}>
          {filteredActivities.map((activity) => (
            <View key={activity.id} style={[styles.activityCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
              <View style={styles.activityHeader}>
                <View style={[styles.activityIconContainer, { backgroundColor: activity.iconBg }]}>
                  <Text style={styles.activityIcon}>{activity.icon}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <View style={styles.activityTitleRow}>
                    <Text style={[styles.activityTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{activity.title}</Text>
                    {activity.status === 'completed' && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                    )}
                  </View>
                  <View style={styles.organizerRow}>
                    <Text style={styles.organizerLogo}>{activity.logo}</Text>
                    <Text style={[styles.organizerName, { color: Colors.text.tertiary }]}>{activity.organizer}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color={isDark ? colors.neutral[400] : colors.neutral[500]} />
                  <Text style={[styles.detailText, { color: Colors.text.tertiary }]}>{activity.date}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={16} color={isDark ? colors.neutral[400] : colors.neutral[500]} />
                  <Text style={[styles.detailText, { color: Colors.text.tertiary }]}>{activity.time}</Text>
                </View>
                <View style={[styles.detailItem, styles.detailItemFull]}>
                  <Ionicons name="location" size={16} color={isDark ? colors.neutral[400] : colors.neutral[500]} />
                  <Text style={[styles.detailText, { color: Colors.text.tertiary }]}>
                    {activity.location} • {activity.distance} away
                  </Text>
                </View>
              </View>

              <View style={[styles.impactContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : Colors.infoScale[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}>
                <View style={styles.impactHeader}>
                  <Ionicons name="trending-up" size={16} color={Colors.info} />
                  <Text style={[styles.impactText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>{activity.impact}</Text>
                </View>
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                    <LinearGradient
                      colors={[colors.infoScale[400], colors.lightMustard]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${(activity.enrolled / activity.goal) * 100}%` }]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: Colors.text.tertiary }]}>
                    {activity.enrolled}/{activity.goal}
                  </Text>
                </View>
              </View>

              <View style={styles.rewardsRow}>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>💰</Text>
                  <Text style={[styles.rewardValue, { color: colors.lightMustard }]}>+{activity.rewards.rezCoins}</Text>
                </View>
                {activity.rewards.brandedCoins > 0 && (
                  <View style={styles.rewardItem}>
                    <Text style={styles.rewardEmoji}>🏪</Text>
                    <Text style={[styles.rewardValue, { color: Colors.brand.purple }]}>+{activity.rewards.brandedCoins}</Text>
                    <Text style={[styles.brandName, { color: Colors.text.tertiary }]}>
                      ({activity.rewards.brandName})
                    </Text>
                  </View>
                )}
              </View>

              {activity.status === 'completed' ? (
                <Pressable style={[styles.ctaButton, styles.ctaButtonDisabled, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]} disabled>
                  <Text style={[styles.ctaButtonText, { color: Colors.text.tertiary }]}>✓ Completed</Text>
                </Pressable>
              ) : (
                <Link href={`/playandearn/SocialImpactEventDetail?id=${activity.id}`} asChild>
                  <Pressable style={styles.ctaButton}>
                    <LinearGradient colors={[colors.lightMustard, '#e6b84e']} style={styles.ctaButtonGradient}>
                      <Text style={styles.ctaButtonText}>Register Now</Text>
                    </LinearGradient>
                  </Pressable>
                </Link>
              )}
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.footerSection}>
          <LinearGradient
            colors={isDark ? ['rgba(255, 205, 87, 0.1)', 'rgba(59, 130, 246, 0.1)'] : [colors.linen, colors.tint.blue]}
            style={[styles.footerCard, { borderColor: isDark ? 'rgba(255, 205, 87, 0.3)' : '#A7F3D0' }]}
          >
            <Text style={[styles.footerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Every Action Counts</Text>
            <Text style={[styles.footerText, { color: Colors.text.tertiary }]}>
              Join thousands making an impact while earning rewards
            </Text>
            <View style={styles.footerStats}>
              <View style={styles.footerStat}>
                <Ionicons name="people" size={16} color={isDark ? colors.neutral[400] : colors.neutral[500]} />
                <Text style={[styles.footerStatText, { color: Colors.text.tertiary }]}>5,234 members</Text>
              </View>
              <View style={styles.footerStat}>
                <Ionicons name="heart" size={16} color={isDark ? colors.neutral[400] : colors.neutral[500]} />
                <Text style={[styles.footerStatText, { color: Colors.text.tertiary }]}>234 events</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  heroSection: {
    padding: Spacing.base,
  },
  heroCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  heroTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroText: {
    ...Typography.body,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    ...Typography.h4,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: (width - 56) / 2,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    ...Typography.bodySmall,
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  activityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    ...Typography.h1,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  activityTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerLogo: {
    ...Typography.bodyLarge,
  },
  organizerName: {
    ...Typography.bodySmall,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: (width - 80) / 2,
  },
  detailItemFull: {
    width: '100%',
  },
  detailText: {
    ...Typography.body,
  },
  impactContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  impactText: {
    ...Typography.body,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...Typography.bodySmall,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rewardEmoji: {
    ...Typography.h4,
  },
  rewardValue: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  brandName: {
    ...Typography.bodySmall,
  },
  ctaButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  footerSection: {
    padding: Spacing.base,
  },
  footerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  footerText: {
    ...Typography.body,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  footerStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerStatText: {
    ...Typography.bodySmall,
  },
});

export default withErrorBoundary(SocialImpact, 'PlayandearnSocialImpact');

