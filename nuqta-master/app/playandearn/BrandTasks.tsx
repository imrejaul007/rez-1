// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

const BrandTasks = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const brandMissions = [
    {
      id: 1,
      brand: 'Starbucks',
      logo: '☕',
      bgColor: ['rgba(255, 205, 87, 0.2)', 'rgba(230, 184, 78, 0.2)'],
      borderColor: 'rgba(255, 205, 87, 0.3)',
      tasks: [
        {
          id: 'sb-1',
          type: 'review',
          title: 'Review Your Latest Order',
          reward: 50,
          brandedReward: 30,
          difficulty: 'Easy',
          timeEstimate: '2 mins',
          description: 'Share your experience with coffee quality, service & ambiance',
          requirements: ['Must have ordered in last 7 days', 'Minimum 50 words', 'Include photo (optional)'],
          status: 'available',
          completed: 0,
          total: 1
        },
        {
          id: 'sb-2',
          type: 'quiz',
          title: 'Coffee Connoisseur Quiz',
          reward: 30,
          brandedReward: 20,
          difficulty: 'Medium',
          timeEstimate: '5 mins',
          description: 'Test your knowledge about coffee varieties & brewing methods',
          requirements: ['10 questions', '70% to pass', 'Unlimited attempts'],
          status: 'available',
          completed: 0,
          total: 1
        },
        {
          id: 'sb-3',
          type: 'content',
          title: 'Create a Coffee Reel',
          reward: 150,
          brandedReward: 100,
          difficulty: 'Hard',
          timeEstimate: '15 mins',
          featured: true,
          description: 'Create a 15-30 sec reel showcasing your Starbucks experience',
          requirements: ['15-30 seconds', 'Show products clearly', 'Use #StarbucksNuqta', 'High quality video'],
          status: 'available',
          completed: 0,
          total: 1
        }
      ]
    },
    {
      id: 2,
      brand: 'Nike',
      logo: '👟',
      bgColor: ['rgba(249, 115, 22, 0.2)', 'rgba(239, 68, 68, 0.2)'],
      borderColor: 'rgba(249, 115, 22, 0.3)',
      tasks: [
        {
          id: 'nk-1',
          type: 'mystery-shop',
          title: 'Mystery Shopper Mission',
          reward: 200,
          brandedReward: 150,
          difficulty: 'Medium',
          timeEstimate: '30 mins',
          featured: true,
          description: 'Visit Nike store, evaluate service & share detailed feedback',
          requirements: ['Visit designated store', 'Note staff behavior', 'Check stock availability', 'Photo proof required'],
          status: 'available',
          completed: 0,
          total: 1,
          premium: true
        },
        {
          id: 'nk-2',
          type: 'review',
          title: 'Rate Your Nike Shoes',
          reward: 60,
          brandedReward: 40,
          difficulty: 'Easy',
          timeEstimate: '3 mins',
          description: 'Share your experience with comfort, durability & style',
          requirements: ['Must own Nike product', 'Rate 5 attributes', 'Add photo'],
          status: 'available',
          completed: 0,
          total: 1
        },
        {
          id: 'nk-3',
          type: 'sample',
          title: 'Try New Running Shoe',
          reward: 100,
          brandedReward: 300,
          difficulty: 'Easy',
          timeEstimate: '1 week',
          description: 'Get sample product, use for 1 week, then review',
          requirements: ['Application required', 'Limited slots (50)', 'Detailed review after trial', 'Return not needed'],
          status: 'apply',
          completed: 0,
          total: 1,
          slots: { available: 12, total: 50 }
        }
      ]
    },
    {
      id: 3,
      brand: 'Zara',
      logo: '👗',
      bgColor: ['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)'],
      borderColor: 'rgba(168, 85, 247, 0.3)',
      tasks: [
        {
          id: 'zr-1',
          type: 'feedback',
          title: 'Style Preference Survey',
          reward: 40,
          brandedReward: 25,
          difficulty: 'Easy',
          timeEstimate: '5 mins',
          description: 'Help us understand your fashion preferences',
          requirements: ['10 questions', 'Include size preferences', 'Color choices'],
          status: 'available',
          completed: 0,
          total: 1
        },
        {
          id: 'zr-2',
          type: 'content',
          title: 'Fashion Lookbook Post',
          reward: 120,
          brandedReward: 80,
          difficulty: 'Medium',
          timeEstimate: '20 mins',
          description: 'Create outfit combination using Zara pieces',
          requirements: ['Minimum 3 Zara items', 'Clear photos', 'Style description', 'Post on social'],
          status: 'available',
          completed: 0,
          total: 1
        }
      ]
    },
    {
      id: 4,
      brand: 'McDonald\'s',
      logo: '🍔',
      bgColor: ['rgba(234, 179, 8, 0.2)', 'rgba(239, 68, 68, 0.2)'],
      borderColor: 'rgba(234, 179, 8, 0.3)',
      tasks: [
        {
          id: 'mc-1',
          type: 'review',
          title: 'Rate Your Meal',
          reward: 30,
          brandedReward: 20,
          difficulty: 'Easy',
          timeEstimate: '2 mins',
          description: 'Quick feedback on food quality & service',
          requirements: ['Recent purchase', 'Rate taste, service, cleanliness'],
          status: 'completed',
          completed: 1,
          total: 1,
          earnedCoins: 50
        },
        {
          id: 'mc-2',
          type: 'quiz',
          title: 'Menu Master Challenge',
          reward: 25,
          brandedReward: 15,
          difficulty: 'Easy',
          timeEstimate: '3 mins',
          description: 'Test your knowledge of McDonald\'s menu',
          requirements: ['8 questions', '60% to pass'],
          status: 'available',
          completed: 0,
          total: 1
        }
      ]
    }
  ];

  const tabs = [
    { id: 'all', label: 'All Brands', count: brandMissions.reduce((acc, b) => acc + b.tasks.filter(t => t.status !== 'completed').length, 0) },
    { id: 'featured', label: 'Featured', count: brandMissions.reduce((acc, b) => acc + b.tasks.filter(t => t.featured && t.status !== 'completed').length, 0) },
    { id: 'high-reward', label: 'High Reward', count: brandMissions.reduce((acc, b) => acc + b.tasks.filter(t => t.reward >= 100 && t.status !== 'completed').length, 0) },
    { id: 'easy', label: 'Quick Win', count: brandMissions.reduce((acc, b) => acc + b.tasks.filter(t => t.difficulty === 'Easy' && t.status !== 'completed').length, 0) },
    { id: 'completed', label: 'Done', count: brandMissions.reduce((acc, b) => acc + b.tasks.filter(t => t.status === 'completed').length, 0) }
  ];

  const filteredBrands = brandMissions
    .map(brand => ({
      ...brand,
      tasks: brand.tasks.filter(task => {
        let tabMatch = true;
        if (activeTab === 'featured') tabMatch = task.featured && task.status !== 'completed';
        else if (activeTab === 'high-reward') tabMatch = task.reward >= 100 && task.status !== 'completed';
        else if (activeTab === 'easy') tabMatch = task.difficulty === 'Easy' && task.status !== 'completed';
        else if (activeTab === 'completed') tabMatch = task.status === 'completed';
        else if (activeTab === 'all') tabMatch = task.status !== 'completed';

        const searchMatch = searchQuery === '' ||
          brand.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase());

        return tabMatch && searchMatch;
      })
    }))
    .filter(brand => brand.tasks.length > 0);

  const myStats = {
    totalEarned: 2340,
    tasksCompleted: 45,
    brandsPartnered: 12,
    currentStreak: 5
  };

  const taskTypeIcons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'review': 'chatbubble',
    'quiz': 'trophy',
    'content': 'videocam',
    'mystery-shop': 'search',
    'feedback': 'star',
    'sample': 'gift'
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return { color: Colors.gold, bg: 'rgba(255, 205, 87, 0.1)', border: 'rgba(255, 205, 87, 0.3)' };
      case 'Medium':
        return { color: colors.brand.orange, bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' };
      case 'Hard':
        return { color: Colors.error, bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { color: Colors.text.tertiary, bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' };
    }
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
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Brand Tasks</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Complete missions, earn rewards</Text>
            </View>
            <View style={styles.coinBadge}>
              <Ionicons name="cash" size={16} color={Colors.gold} />
              <Text style={styles.coinText}>{myStats.totalEarned}</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={20} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} style={styles.searchIcon} />
              <TextInput
                placeholder="Search brands or tasks..."
                placeholderTextColor={isDark ? Colors.text.tertiary : Colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: isDark ? Colors.text.inverse : Colors.text.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}
              />
            </View>
          </View>
        </View>

        {/* Hero Stats */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)'] : ['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            style={[styles.heroCard, { borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)' }]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <LinearGradient colors={[Colors.info, colors.brand.purpleMedium]} style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.text.inverse} />
                </LinearGradient>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.tasksCompleted}</Text>
                <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.statIconContainer}>
                  <Ionicons name="bag" size={24} color={Colors.text.inverse} />
                </LinearGradient>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.brandsPartnered}</Text>
                <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Brands</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient colors={[Colors.gold, '#e6b84e']} style={styles.statIconContainer}>
                  <Ionicons name="cash" size={24} color={Colors.text.inverse} />
                </LinearGradient>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.totalEarned}</Text>
                <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Total Earned</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab.id ? Colors.info : isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.id ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary) }]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Brands & Tasks List */}
        <View style={styles.content}>
          {filteredBrands.map((brand) => (
            <View key={brand.id} style={styles.brandSection}>
              {/* Brand Header */}
              <LinearGradient
                colors={brand.bgColor}
                style={[styles.brandHeader, { borderColor: brand.borderColor }]}
              >
                <View style={styles.brandHeaderContent}>
                  <View style={[styles.brandLogoContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : Colors.background.primary }]}>
                    <Text style={styles.brandLogo}>{brand.logo}</Text>
                  </View>
                  <View style={styles.brandInfo}>
                    <Text style={[styles.brandName, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{brand.brand}</Text>
                    <Text style={[styles.brandTasksCount, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
                      {brand.tasks.length} {brand.tasks.length === 1 ? 'task' : 'tasks'} available
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Tasks */}
              {brand.tasks.map((task) => {
                const difficultyStyle = getDifficultyStyle(task.difficulty);
                return (
                  <View key={task.id} style={[styles.taskCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                    <View style={styles.taskHeader}>
                      <View style={[styles.taskIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                        <Ionicons name={taskTypeIcons[task.type]} size={24} color={Colors.info} />
                      </View>
                      <View style={styles.taskInfo}>
                        <View style={styles.taskBadges}>
                          <View style={[styles.badge, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                            <Text style={[styles.badgeText, { color: difficultyStyle.color }]}>{task.difficulty}</Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }]}>
                            <Ionicons name="time" size={12} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                            <Text style={[styles.badgeText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{task.timeEstimate}</Text>
                          </View>
                          {task.featured && (
                            <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                              <Ionicons name="sparkles" size={12} color={Colors.warning} />
                              <Text style={[styles.badgeText, { color: Colors.warning }]}>Featured</Text>
                            </View>
                          )}
                          {task.premium && (
                            <View style={[styles.badge, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                              <Ionicons name="ribbon" size={12} color={colors.brand.purpleMedium} />
                              <Text style={[styles.badgeText, { color: colors.brand.purpleMedium }]}>Premium</Text>
                            </View>
                          )}
                          {task.status === 'completed' && (
                            <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                          )}
                        </View>
                        <Text style={[styles.taskTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{task.title}</Text>
                        <Text style={[styles.taskDescription, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{task.description}</Text>
                      </View>
                    </View>

                    {/* Requirements */}
                    <View style={[styles.requirementsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}>
                      <Text style={[styles.requirementsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Requirements:</Text>
                      {task.requirements.map((req, idx) => (
                        <View key={idx} style={styles.requirementItem}>
                          <View style={[styles.requirementDot, { backgroundColor: Colors.info }]} />
                          <Text style={[styles.requirementText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{req}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Slots Info */}
                    {task.slots && (
                      <View style={[styles.slotsContainer, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : colors.tint.orange, borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA' }]}>
                        <View style={styles.slotsHeader}>
                          <Text style={[styles.slotsLabel, { color: isDark ? '#FED7AA' : '#9A3412' }]}>Limited Slots</Text>
                          <Text style={[styles.slotsValue, { color: isDark ? '#FB923C' : colors.brand.orangeDark }]}>
                            {task.slots.available}/{task.slots.total} left
                          </Text>
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                          <LinearGradient
                            colors={[colors.brand.orange, colors.error]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${(task.slots.available / task.slots.total) * 100}%` }]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Rewards */}
                    <View style={styles.taskFooter}>
                      <View style={styles.rewardsContainer}>
                        <View style={styles.rewardItem}>
                          <Ionicons name="cash" size={20} color={Colors.gold} />
                          <View>
                            <Text style={styles.rewardValue}>+{task.reward}</Text>
                            <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                          </View>
                        </View>
                        {task.brandedReward > 0 && (
                          <View style={styles.rewardItem}>
                            <Ionicons name="bag" size={20} color={colors.brand.purpleMedium} />
                            <View>
                              <Text style={[styles.rewardValue, { color: colors.brand.purpleMedium }]}>+{task.brandedReward}</Text>
                              <Text style={styles.rewardLabel}>{brand.brand} Coins</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={styles.actionButton}
                        disabled={task.status === 'completed'}
                      >
                        {task.status === 'completed' ? (
                          <View style={[styles.actionButtonDisabled, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                            <Text style={[styles.actionButtonText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>✓ Done</Text>
                          </View>
                        ) : task.status === 'apply' ? (
                          <LinearGradient colors={[colors.brand.orange, colors.error]} style={styles.actionButtonGradient}>
                            <Text style={styles.actionButtonText}>Apply Now</Text>
                          </LinearGradient>
                        ) : (
                          <LinearGradient colors={[Colors.info, colors.brand.purpleMedium]} style={styles.actionButtonGradient}>
                            <Text style={styles.actionButtonText}>Start Task</Text>
                          </LinearGradient>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Empty State */}
        {filteredBrands.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }]}>
              <Ionicons name="search" size={40} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>No Tasks Found</Text>
            <Text style={[styles.emptyText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
              Try adjusting your filters or search query
            </Text>
          </View>
        )}

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={isDark ? ['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)'] : [Colors.infoScale[50], colors.tint.pink]}
            style={[styles.ctaCard, { borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}
          >
            <Text style={[styles.ctaTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Earn from Your Favorite Brands</Text>
            <Text style={[styles.ctaText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
              Complete tasks, earn ${BRAND.APP_NAME} + Branded Coins
            </Text>
            <View style={styles.ctaFeatures}>
              <View style={styles.ctaFeature}>
                <Ionicons name="chatbubble" size={16} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                <Text style={[styles.ctaFeatureText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Reviews</Text>
              </View>
              <View style={styles.ctaFeature}>
                <Ionicons name="trophy" size={16} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                <Text style={[styles.ctaFeatureText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Quizzes</Text>
              </View>
              <View style={styles.ctaFeature}>
                <Ionicons name="videocam" size={16} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                <Text style={[styles.ctaFeatureText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Content</Text>
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
    marginBottom: Spacing.md,
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
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  coinText: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.1)',
  },
  searchIcon: {
    marginLeft: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: Spacing.base,
    ...Typography.body,
  },
  heroSection: {
    padding: Spacing.base,
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
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
    gap: Spacing.xl,
  },
  brandSection: {
    gap: Spacing.md,
  },
  brandHeader: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  brandHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    fontSize: 28,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  brandTasksCount: {
    ...Typography.bodySmall,
  },
  taskCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.caption,
  },
  taskTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  taskDescription: {
    ...Typography.bodySmall,
  },
  requirementsContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  requirementsTitle: {
    ...Typography.bodySmall,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  requirementText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  slotsContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  slotsLabel: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  slotsValue: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
  },
  progressBar: {
    height: Spacing.sm,
    borderRadius: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.xs,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardValue: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.gold,
  },
  rewardLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  actionButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  actionButtonDisabled: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.base,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
  ctaSection: {
    padding: Spacing.base,
  },
  ctaCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaText: {
    ...Typography.body,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  ctaFeatures: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  ctaFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaFeatureText: {
    ...Typography.bodySmall,
  },
});

export default withErrorBoundary(BrandTasks, 'PlayandearnBrandTasks');

