import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

const UGCCreator = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const [activeTab, setActiveTab] = useState('all');

  const contentTypes = [
    {
      id: 'reels',
      title: 'Create Reels',
      icon: 'videocam',
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: colors.error,
      baseReward: 100,
      bonusReward: 500,
      description: '15-30 sec shopping/experience videos',
      requirements: ['High quality video', 'Show products/stores clearly', 'Add #NuqtaSaves', 'Engaging content'],
      performance: {
        avgViews: 2500,
        avgLikes: 350,
        avgCoins: 180
      },
      status: 'active'
    },
    {
      id: 'photos',
      title: 'Upload Photos',
      icon: 'camera',
      iconBg: 'rgba(59, 130, 246, 0.2)',
      iconColor: colors.infoScale[400],
      baseReward: 30,
      bonusReward: 150,
      description: 'Store fronts, products, ambiance shots',
      requirements: ['Clear lighting', 'Good composition', 'HD quality', 'No blur'],
      performance: {
        avgViews: 800,
        avgLikes: 120,
        avgCoins: 45
      },
      status: 'active'
    },
    {
      id: 'reviews',
      title: 'Write Reviews',
      icon: 'chatbubble',
      iconBg: 'rgba(168, 85, 247, 0.2)',
      iconColor: colors.brand.purpleMedium,
      baseReward: 50,
      bonusReward: 200,
      description: 'Detailed product/store experiences',
      requirements: ['Minimum 100 words', 'Include pros & cons', 'Helpful & honest', 'Add photos (optional)'],
      performance: {
        avgViews: 450,
        avgLikes: 85,
        avgCoins: 75
      },
      status: 'active'
    },
    {
      id: 'stories',
      title: 'Share Stories',
      icon: 'image',
      iconBg: 'rgba(249, 115, 22, 0.2)',
      iconColor: colors.brand.orange,
      baseReward: 20,
      bonusReward: 100,
      description: 'Quick shopping moments & finds',
      requirements: ['24-hour content', 'Engaging visuals', 'Add location/store tags'],
      performance: {
        avgViews: 1200,
        avgLikes: 180,
        avgCoins: 35
      },
      status: 'active'
    }
  ];

  const myContent = [
    {
      id: 1,
      type: 'reel',
      title: 'Nike Store Shopping Haul',
      thumbnail: '👟',
      views: 3200,
      likes: 456,
      shares: 89,
      comments: 34,
      earned: 220,
      status: 'published',
      publishedDate: '2 days ago',
      performance: 'trending',
      badge: ''
    },
    {
      id: 2,
      type: 'photo',
      title: 'Starbucks New Drink',
      thumbnail: '☕',
      views: 890,
      likes: 123,
      shares: 12,
      comments: 8,
      earned: 50,
      status: 'published',
      publishedDate: '5 days ago',
      performance: 'good',
      badge: ''
    },
    {
      id: 3,
      type: 'review',
      title: 'Zara Summer Collection Review',
      thumbnail: '👗',
      views: 520,
      likes: 94,
      shares: 18,
      comments: 15,
      earned: 85,
      status: 'published',
      publishedDate: '1 week ago',
      performance: 'good',
      badge: ''
    },
    {
      id: 4,
      type: 'reel',
      title: 'Weekend Food Fest Highlights',
      thumbnail: '🍔',
      views: 5600,
      likes: 789,
      shares: 156,
      comments: 67,
      earned: 450,
      status: 'featured',
      publishedDate: '3 days ago',
      performance: 'viral',
      badge: 'Featured'
    }
  ];

  const leaderboard = [
    { rank: 1, name: 'Priya Sharma', avatar: '👩', content: 234, coins: 45600, badge: '🏆' },
    { rank: 2, name: 'Rahul Kumar', avatar: '👨', content: 198, coins: 38900, badge: '🥈' },
    { rank: 3, name: 'Anjali Patel', avatar: '👩', content: 176, coins: 32400, badge: '🥉' },
    { rank: 4, name: 'You', avatar: '😊', content: 87, coins: 12340, badge: '', highlight: true }
  ];

  const tabs = [
    { id: 'all', label: 'Create', count: contentTypes.length },
    { id: 'my-content', label: 'My Content', count: myContent.length },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' }
  ];

  const myStats = {
    totalContent: 87,
    totalViews: 145600,
    totalLikes: 23400,
    totalEarned: 12340,
    thisMonthEarned: 2450,
    currentRank: 4,
    topPerformer: true
  };

  const getPerformanceStyle = (performance: string) => {
    switch (performance) {
      case 'viral':
        return { color: colors.error, bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'trending':
        return { color: colors.brand.orange, bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' };
      case 'good':
        return { color: colors.successScale[400], bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
      default:
        return { color: colors.infoScale[400], bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' };
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
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>UGC Creator Hub</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Create content, earn rewards</Text>
            </View>
            <View style={styles.coinBadge}>
              <Ionicons name="cash" size={16} color={Colors.success} />
              <Text style={styles.coinText}>{myStats.totalEarned}</Text>
            </View>
          </View>
        </View>

        {/* Hero Stats */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ['rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(239, 68, 68, 0.1)'] : ['rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(239, 68, 68, 0.1)']}
            style={[styles.heroCard, { borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.3)' }]}
          >
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="videocam" size={16} color={colors.brand.purpleMedium} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Content</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.totalContent}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="eye" size={16} color={colors.infoScale[400]} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Total Views</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{(myStats.totalViews / 1000).toFixed(1)}K</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="heart" size={16} color={Colors.error} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Total Likes</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{((myStats.totalLikes / 1000).toFixed(1))}K</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="trophy" size={16} color={Colors.warning} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Rank</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>#{myStats.currentRank}</Text>
              </View>
            </View>
            <View style={[styles.monthlyEarnings, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.3)' }]}>
              <Text style={[styles.monthlyLabel, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>This Month Earnings</Text>
              <Text style={styles.monthlyValue}>+{myStats.thisMonthEarned}</Text>
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
                { backgroundColor: activeTab === tab.id ? colors.brand.purpleMedium : isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }
              ]}
            >
              {tab.icon && <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary)} />}
              <Text style={[styles.tabText, { color: activeTab === tab.id ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary) }]}>
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Create Content Tab */}
        {activeTab === 'all' && (
          <View style={styles.content}>
            {contentTypes.map((content) => (
              <View key={content.id} style={[styles.contentCard, { backgroundColor: isDark ? Colors.neutral[800] : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                <View style={styles.contentHeader}>
                  <View style={[styles.contentIconContainer, { backgroundColor: content.iconBg }]}>
                    <Ionicons name={content.icon as any} size={28} color={content.iconColor} />
                  </View>
                  <View style={styles.contentInfo}>
                    <Text style={[styles.contentTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{content.title}</Text>
                    <Text style={[styles.contentDescription, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{content.description}</Text>
                  </View>
                </View>

                <View style={[styles.requirementsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}>
                  <Text style={[styles.requirementsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Requirements:</Text>
                  {content.requirements.map((req, idx) => (
                    <View key={idx} style={styles.requirementItem}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={[styles.requirementText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{req}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.performanceContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : colors.tint.blue, borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="trending-up" size={14} color={colors.infoScale[400]} />
                    <Text style={[styles.performanceTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>Average Performance</Text>
                  </View>
                  <View style={styles.performanceStats}>
                    <View style={styles.performanceStat}>
                      <Text style={[styles.performanceValue, { color: colors.infoScale[400] }]}>{content.performance.avgViews.toLocaleString()}</Text>
                      <Text style={[styles.performanceLabel, { color: colors.infoScale[400] }]}>Views</Text>
                    </View>
                    <View style={styles.performanceStat}>
                      <Text style={[styles.performanceValue, { color: colors.infoScale[400] }]}>{content.performance.avgLikes}</Text>
                      <Text style={[styles.performanceLabel, { color: colors.infoScale[400] }]}>Likes</Text>
                    </View>
                    <View style={styles.performanceStat}>
                      <Text style={[styles.performanceValue, { color: colors.infoScale[400] }]}>{content.performance.avgCoins}</Text>
                      <Text style={[styles.performanceLabel, { color: colors.infoScale[400] }]}>Coins</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.contentFooter}>
                  <View style={styles.rewardsContainer}>
                    <View style={styles.rewardItem}>
                      <Ionicons name="cash" size={20} color={Colors.success} />
                      <Text style={styles.rewardText}>+{content.baseReward}</Text>
                    </View>
                    <View style={[styles.bonusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                      <Ionicons name="sparkles" size={16} color={Colors.warning} />
                      <Text style={[styles.bonusText, { color: Colors.warning }]}>Up to +{content.bonusReward}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.createButton}>
                    <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.createButtonGradient}>
                      <Ionicons name="cloud-upload" size={16} color={Colors.text.inverse} />
                      <Text style={styles.createButtonText}>Create</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={[styles.tipsCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : colors.tint.orange, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FED7AA' }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="sparkles" size={20} color={Colors.warning} />
                <Text style={[styles.tipsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Tips to Maximize Earnings</Text>
              </View>
              {[
                'Post during peak hours (6-9 PM) for maximum visibility',
                'Use trending hashtags and add location tags',
                'Engage with other creators for better reach',
                'High-quality content gets featured and earns 3x rewards'
              ].map((tip, idx) => (
                <View key={idx} style={styles.tipItem}>
                  <View style={[styles.tipDot, { backgroundColor: Colors.warning }]} />
                  <Text style={[styles.tipText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* My Content Tab */}
        {activeTab === 'my-content' && (
          <View style={styles.content}>
            {myContent.map((item) => {
              const perfStyle = getPerformanceStyle(item.performance);
              return (
                <View key={item.id} style={[styles.contentCard, { backgroundColor: isDark ? colors.neutral[800] : colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.neutral[200] }]}>
                  <View style={styles.contentHeader}>
                    <LinearGradient colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']} style={styles.thumbnailContainer}>
                      <Text style={styles.thumbnail}>{item.thumbnail}</Text>
                    </LinearGradient>
                    <View style={styles.contentInfo}>
                      <View style={styles.contentBadges}>
                        {item.badge && (
                          <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                            <Ionicons name="ribbon" size={12} color={colors.warningScale[400]} />
                            <Text style={[styles.badgeText, { color: colors.warningScale[400] }]}>{item.badge}</Text>
                          </View>
                        )}
                        {item.performance && (
                          <View style={[styles.badge, { backgroundColor: perfStyle.bg, borderColor: perfStyle.border }]}>
                            <Text style={[styles.badgeText, { color: perfStyle.color }]}>
                              {item.performance.charAt(0).toUpperCase() + item.performance.slice(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.contentTitle, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{item.title}</Text>
                      <Text style={[styles.contentDate, { color: isDark ? colors.neutral[400] : colors.neutral[500] }]}>{item.publishedDate}</Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.neutral[50] }]}>
                      <Ionicons name="eye" size={16} color={colors.infoScale[400]} />
                      <Text style={[styles.statMiniValue, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{item.views.toLocaleString()}</Text>
                      <Text style={[styles.statMiniLabel, { color: isDark ? colors.neutral[500] : colors.neutral[500] }]}>Views</Text>
                    </View>
                    <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.neutral[50] }]}>
                      <Ionicons name="heart" size={16} color={colors.error} />
                      <Text style={[styles.statMiniValue, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{item.likes}</Text>
                      <Text style={[styles.statMiniLabel, { color: isDark ? colors.neutral[500] : colors.neutral[500] }]}>Likes</Text>
                    </View>
                    <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.neutral[50] }]}>
                      <Ionicons name="share-social" size={16} color={colors.successScale[400]} />
                      <Text style={[styles.statMiniValue, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{item.shares}</Text>
                      <Text style={[styles.statMiniLabel, { color: isDark ? colors.neutral[500] : colors.neutral[500] }]}>Shares</Text>
                    </View>
                    <View style={[styles.statMiniCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : colors.tint.greenLight }]}>
                      <Ionicons name="cash" size={16} color={colors.successScale[400]} />
                      <Text style={[styles.statMiniValue, { color: colors.successScale[400] }]}>+{item.earned}</Text>
                      <Text style={[styles.statMiniLabel, { color: colors.successScale[400] }]}>Earned</Text>
                    </View>
                  </View>

                  <View style={styles.contentActions}>
                    <Pressable style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.neutral[100] }]}>
                      <Text style={[styles.actionButtonText, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>View Analytics</Text>
                    </Pressable>
                    <Pressable style={styles.boostButton}>
                      <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.boostButtonGradient}>
                        <Text style={styles.boostButtonText}>Boost Post</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.content}>
            <View style={[styles.podiumCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : colors.tint.orange, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FED7AA' }]}>
              <View style={styles.podiumHeader}>
                <Ionicons name="trophy" size={20} color={colors.warningScale[400]} />
                <Text style={[styles.podiumTitle, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>Top Creators This Month</Text>
              </View>
              <View style={styles.podium}>
                {leaderboard.slice(0, 3).map((creator) => (
                  <View key={creator.rank} style={styles.podiumItem}>
                    <Text style={styles.podiumBadge}>{creator.badge}</Text>
                    <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.podiumAvatar}>
                      <Text style={styles.podiumAvatarText}>{creator.avatar}</Text>
                    </LinearGradient>
                    <Text style={[styles.podiumName, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{creator.name}</Text>
                    <Text style={[styles.podiumContent, { color: isDark ? colors.neutral[400] : colors.neutral[500] }]}>{creator.content} posts</Text>
                    <Text style={styles.podiumCoins}>{creator.coins.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.leaderboardList}>
              {leaderboard.map((creator) => (
                <View
                  key={creator.rank}
                  style={[
                    styles.leaderboardCard,
                    creator.highlight && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : colors.tint.greenLight, borderColor: colors.successScale[400], borderWidth: 2 },
                    !creator.highlight && { backgroundColor: isDark ? colors.neutral[800] : colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.neutral[200] }
                  ]}
                >
                  <Text style={[styles.leaderboardRank, { color: isDark ? colors.neutral[400] : colors.neutral[400] }]}>#{creator.rank}</Text>
                  <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.leaderboardAvatar}>
                    <Text style={styles.leaderboardAvatarText}>{creator.avatar}</Text>
                  </LinearGradient>
                  <View style={styles.leaderboardInfo}>
                    <View style={styles.leaderboardNameRow}>
                      <Text style={[styles.leaderboardName, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>{creator.name}</Text>
                      {creator.badge && <Text style={styles.leaderboardBadge}>{creator.badge}</Text>}
                    </View>
                    <Text style={[styles.leaderboardContent, { color: isDark ? colors.neutral[400] : colors.neutral[500] }]}>{creator.content} posts</Text>
                  </View>
                  <View style={styles.leaderboardCoins}>
                    <Ionicons name="cash" size={16} color={colors.successScale[400]} />
                    <Text style={styles.leaderboardCoinsText}>{creator.coins.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.ctaCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : colors.tint.pink, borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#C084FC' }]}>
              <Text style={[styles.ctaTitle, { color: isDark ? colors.background.primary : colors.neutral[900] }]}>Climb the Ranks!</Text>
              <Text style={[styles.ctaText, { color: isDark ? colors.neutral[400] : colors.neutral[500] }]}>
                Top 3 creators win exclusive rewards every month
              </Text>
              <Pressable style={styles.ctaButton}>
                <LinearGradient colors={[colors.brand.purpleMedium, colors.brand.pink]} style={styles.ctaButtonGradient}>
                  <Text style={styles.ctaButtonText}>Create More Content</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  coinText: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.success,
  },
  heroSection: {
    padding: Spacing.base,
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  statCard: {
    width: (width - 64) / 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
  },
  statValue: {
    ...Typography.h3,
  },
  monthlyEarnings: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyLabel: {
    ...Typography.body,
  },
  monthlyValue: {
    ...Typography.h4,
    color: Colors.success,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  contentCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  contentHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  contentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentInfo: {
    flex: 1,
  },
  contentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  contentTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  contentDescription: {
    ...Typography.bodySmall,
  },
  contentDate: {
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
  requirementText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  performanceContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  performanceTitle: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceValue: {
    ...Typography.h4,
    marginBottom: 2,
  },
  performanceLabel: {
    ...Typography.overline,
    textTransform: undefined,
    letterSpacing: undefined,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rewardText: {
    ...Typography.h4,
    color: Colors.success,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  bonusText: {
    ...Typography.caption,
    fontWeight: 'bold',
  },
  createButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  createButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  tipsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    ...Typography.h4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    fontSize: 28,
  },
  statMiniCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  statMiniValue: {
    ...Typography.body,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  statMiniLabel: {
    ...Typography.overline,
    textTransform: undefined,
    letterSpacing: undefined,
  },
  contentActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
  boostButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  boostButtonGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  boostButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '500',
  },
  podiumCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  podiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    justifyContent: 'center',
  },
  podiumTitle: {
    ...Typography.h4,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  podiumItem: {
    alignItems: 'center',
  },
  podiumBadge: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  podiumAvatarText: {
    ...Typography.h2,
  },
  podiumName: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  podiumContent: {
    ...Typography.overline,
    textTransform: undefined,
    letterSpacing: undefined,
    marginBottom: Spacing.xs,
  },
  podiumCoins: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.success,
  },
  leaderboardList: {
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  leaderboardRank: {
    ...Typography.h4,
    width: 32,
    textAlign: 'center',
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarText: {
    ...Typography.h3,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  leaderboardName: {
    ...Typography.body,
    fontWeight: 'bold',
  },
  leaderboardBadge: {
    ...Typography.bodyLarge,
  },
  leaderboardContent: {
    ...Typography.bodySmall,
  },
  leaderboardCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  leaderboardCoinsText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.success,
  },
  ctaCard: {
    padding: Spacing.lg,
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
  ctaButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  ctaButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
});

export default withErrorBoundary(UGCCreator, 'PlayandearnUGCCreator');

