import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const CorporateEmployee = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState('challenges');
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const isMounted = useIsMounted();

  // Fetch corporate programs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const programsRes = await programApi.getCorporatePrograms();
        if (programsRes.data) {
          setPrograms(programsRes.data);
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

  const employeeChallenges = [
    {
      id: 1,
      title: 'Team Lunch Challenge',
      type: 'team',
      icon: 'cafe',
      reward: 300,
      brandedReward: 200,
      progress: 3,
      total: 5,
      difficulty: 'Easy',
      deadline: '15 days left',
      description: 'Order team lunch 5 times this month using ${BRAND.APP_NAME}',
      participants: 12,
      status: 'active'
    },
    {
      id: 2,
      title: 'Wellness Wednesday',
      type: 'wellness',
      icon: 'heart',
      reward: 500,
      brandedReward: 0,
      progress: 2,
      total: 4,
      difficulty: 'Medium',
      deadline: 'Monthly',
      description: 'Book health checkup or gym session via ${BRAND.APP_NAME}',
      requirements: ['Healthcare or Fitness category', `Minimum ${currencySymbol}500 booking`, 'Valid invoice'],
      status: 'active'
    },
    {
      id: 3,
      title: 'Refer Colleagues',
      type: 'referral',
      icon: 'people',
      reward: 200,
      brandedReward: 100,
      progress: 8,
      total: 10,
      difficulty: 'Medium',
      deadline: '30 days left',
      description: 'Get 10 colleagues to join ${BRAND.APP_NAME} and transact',
      bonus: 'Extra 500 coins for completion',
      status: 'active'
    },
    {
      id: 4,
      title: 'Office Supplies Saver',
      type: 'shopping',
      icon: 'bag',
      reward: 400,
      brandedReward: 300,
      progress: 0,
      total: 1,
      difficulty: 'Easy',
      deadline: '20 days left',
      description: `Purchase office supplies worth ${currencySymbol}2000+ via ${BRAND.APP_NAME} partners`,
      requirements: ['Electronics/Stationery category', 'Single or multiple orders', `Min ${currencySymbol}2000 value`],
      status: 'available'
    },
    {
      id: 5,
      title: 'Team Building Event',
      type: 'event',
      icon: 'trophy',
      reward: 1000,
      brandedReward: 800,
      progress: 0,
      total: 1,
      difficulty: 'Hard',
      deadline: '45 days',
      description: 'Organize team outing/event with min 20 colleagues via ${BRAND.APP_NAME}',
      requirements: ['Minimum 20 participants', 'Event/Travel category', 'Company approval', 'Photo proof'],
      featured: true,
      status: 'available'
    },
    {
      id: 6,
      title: 'Friday Treats',
      type: 'food',
      icon: 'cafe',
      reward: 150,
      brandedReward: 100,
      progress: 1,
      total: 4,
      difficulty: 'Easy',
      deadline: 'Weekly',
      description: 'Order snacks/beverages for team every Friday',
      status: 'active'
    }
  ];

  const companyPerks = [
    {
      company: 'Accenture',
      logo: '🏢',
      bgColor: ['rgba(59, 130, 246, 0.2)', 'rgba(168, 85, 247, 0.2)'],
      borderColor: 'rgba(59, 130, 246, 0.3)',
      perks: [
        { type: 'Bonus Coins', value: '+20% on all purchases', icon: 'cash' },
        { type: 'Exclusive Deals', value: 'Corporate-only offers', icon: 'star' },
        { type: 'Team Rewards', value: 'Group purchase bonuses', icon: 'people' }
      ],
      enrolled: true
    },
    {
      company: 'TCS',
      logo: '💼',
      bgColor: ['rgba(34, 197, 94, 0.2)', 'rgba(20, 184, 166, 0.2)'],
      borderColor: 'rgba(34, 197, 94, 0.3)',
      perks: [
        { type: 'Wellness Bonus', value: '+500 coins/month', icon: 'heart' },
        { type: 'Food Discounts', value: '25% extra on F&B', icon: 'cafe' },
        { type: 'Events', value: 'Quarterly meetups', icon: 'calendar' }
      ],
      enrolled: false
    }
  ];

  const teamLeaderboard = [
    { rank: 1, name: 'Marketing Team', members: 24, totalCoins: 45600, avgPerPerson: 1900 },
    { rank: 2, name: 'Sales Team', members: 18, totalCoins: 38900, avgPerPerson: 2161 },
    { rank: 3, name: 'Engineering Team', members: 32, totalCoins: 52400, avgPerPerson: 1638 },
    { rank: 4, name: 'Your Team (HR)', members: 12, totalCoins: 18340, avgPerPerson: 1528, highlight: true }
  ];

  const individualLeaderboard = [
    { rank: 1, name: 'Rajesh Kumar', team: 'Sales', coins: 8900 },
    { rank: 2, name: 'Sneha Patel', team: 'Marketing', coins: 7600 },
    { rank: 3, name: 'Amit Sharma', team: 'Engineering', coins: 6800 },
    { rank: 4, name: 'You', team: 'HR', coins: 3420, highlight: true }
  ];

  const tabs = [
    { id: 'challenges', label: 'Challenges', count: employeeChallenges.filter(c => c.status === 'active' || c.status === 'available').length },
    { id: 'company-perks', label: 'Company Perks', icon: 'business' },
    { id: 'team-board', label: 'Team Board', icon: 'people' },
    { id: 'individual-board', label: 'Leaderboard', icon: 'trophy' }
  ];

  const myStats = {
    totalEarned: 3420,
    challengesCompleted: 12,
    teamRank: 4,
    individualRank: 4,
    thisMonthEarned: 850,
    referrals: 8
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return { color: Colors.success, bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
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
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Corporate Hub</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Employee challenges & rewards</Text>
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
            colors={isDark ? ['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)'] : ['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            style={[styles.heroCard, { borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)' }]}
          >
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.info} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Completed</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.challengesCompleted}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="trophy" size={16} color={Colors.warning} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Rank</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>#{myStats.individualRank}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="people" size={16} color={colors.brand.purpleMedium} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Referrals</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.referrals}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>This Month</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>+{myStats.thisMonthEarned}</Text>
              </View>
            </View>
            <View style={[styles.teamRankCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)' }]}>
              <Text style={[styles.teamRankLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Your Team Rank</Text>
              <Text style={[styles.teamRankValue, { color: Colors.info }]}>#{myStats.teamRank} - HR Team</Text>
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
              {tab.icon && <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary)} />}
              <Text style={[styles.tabText, { color: activeTab === tab.id ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary) }]}>
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <View style={styles.content}>
            {employeeChallenges.map((challenge) => {
              const difficultyStyle = getDifficultyStyle(challenge.difficulty);
              return (
                <View key={challenge.id} style={[styles.challengeCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                  <View style={styles.challengeHeader}>
                    <View style={[styles.challengeIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                      <Ionicons name={challenge.icon as any} size={28} color={Colors.info} />
                    </View>
                    <View style={styles.challengeInfo}>
                      <View style={styles.challengeBadges}>
                        <View style={[styles.badge, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                          <Text style={[styles.badgeText, { color: difficultyStyle.color }]}>{challenge.difficulty}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }]}>
                          <Ionicons name="time" size={12} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                          <Text style={[styles.badgeText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{challenge.deadline}</Text>
                        </View>
                        {challenge.featured && (
                          <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                            <Ionicons name="sparkles" size={12} color={Colors.warning} />
                            <Text style={[styles.badgeText, { color: Colors.warning }]}>Featured</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.challengeTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{challenge.title}</Text>
                      <Text style={[styles.challengeDescription, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{challenge.description}</Text>
                    </View>
                  </View>

                  {challenge.status === 'active' && (
                    <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : Colors.infoScale[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}>
                      <View style={styles.progressHeader}>
                        <Text style={[styles.progressLabel, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>Progress</Text>
                        <Text style={[styles.progressValue, { color: isDark ? colors.infoScale[400] : Colors.info }]}>
                          {challenge.progress}/{challenge.total}
                        </Text>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                        <LinearGradient
                          colors={[Colors.info, colors.brand.purpleMedium]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${(challenge.progress / challenge.total) * 100}%` }]}
                        />
                      </View>
                    </View>
                  )}

                  {challenge.requirements && (
                    <View style={[styles.requirementsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}>
                      <Text style={[styles.requirementsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Requirements:</Text>
                      {challenge.requirements.map((req, idx) => (
                        <View key={idx} style={styles.requirementItem}>
                          <View style={[styles.requirementDot, { backgroundColor: Colors.info }]} />
                          <Text style={[styles.requirementText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {challenge.bonus && (
                    <View style={[styles.bonusContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : colors.tint.orange, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FED7AA' }]}>
                      <Ionicons name="gift" size={16} color={Colors.warning} />
                      <Text style={[styles.bonusText, { color: Colors.warning }]}>{challenge.bonus}</Text>
                    </View>
                  )}

                  {challenge.participants && (
                    <View style={styles.participantsContainer}>
                      <Ionicons name="people" size={16} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                      <Text style={[styles.participantsText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
                        {challenge.participants} team members participating
                      </Text>
                    </View>
                  )}

                  <View style={styles.challengeFooter}>
                    <View style={styles.rewardsContainer}>
                      <View style={styles.rewardItem}>
                        <Ionicons name="cash" size={20} color={Colors.success} />
                        <Text style={styles.rewardText}>+{challenge.reward}</Text>
                      </View>
                      {challenge.brandedReward > 0 && (
                        <View style={styles.rewardItem}>
                          <Ionicons name="bag" size={20} color={colors.brand.purpleMedium} />
                          <Text style={[styles.rewardText, { color: colors.brand.purpleMedium }]}>+{challenge.brandedReward}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable style={styles.startButton}>
                      <LinearGradient colors={[Colors.info, colors.brand.purpleMedium]} style={styles.startButtonGradient}>
                        <Text style={styles.startButtonText}>
                          {challenge.status === 'active' ? 'Continue' : 'Start'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Company Perks Tab */}
        {activeTab === 'company-perks' && (
          <View style={styles.content}>
            {companyPerks.map((company, idx) => (
              <View key={idx} style={[styles.companyCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                <LinearGradient
                  colors={company.bgColor}
                  style={[styles.companyHeader, { borderColor: company.borderColor }]}
                >
                  <View style={styles.companyHeaderContent}>
                    <View style={[styles.companyLogoContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : Colors.background.primary }]}>
                      <Text style={styles.companyLogo}>{company.logo}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                      <Text style={[styles.companyName, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{company.company}</Text>
                      {company.enrolled && (
                        <View style={styles.enrolledBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                          <Text style={styles.enrolledText}>Enrolled</Text>
                        </View>
                      )}
                    </View>
                    {!company.enrolled && (
                      <Pressable style={styles.enrollButton}>
                        <Text style={styles.enrollButtonText}>Enroll</Text>
                      </Pressable>
                    )}
                  </View>
                </LinearGradient>

                <View style={styles.perksList}>
                  {company.perks.map((perk, perkIdx) => (
                    <View key={perkIdx} style={[styles.perkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}>
                      <View style={[styles.perkIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                        <Ionicons name={perk.icon as any} size={20} color={Colors.info} />
                      </View>
                      <View style={styles.perkInfo}>
                        <Text style={[styles.perkType, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{perk.type}</Text>
                        <Text style={[styles.perkValue, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{perk.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={[styles.ctaCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : Colors.infoScale[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}>
              <Ionicons name="business" size={48} color={Colors.info} style={styles.ctaIcon} />
              <Text style={[styles.ctaTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Don't see your company?</Text>
              <Text style={[styles.ctaText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>
                Request your HR to partner with ${BRAND.APP_NAME} for exclusive employee perks
              </Text>
              <Pressable style={styles.ctaButton}>
                <LinearGradient colors={[Colors.info, colors.brand.purpleMedium]} style={styles.ctaButtonGradient}>
                  <Text style={styles.ctaButtonText}>Request Partnership</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        {/* Team Leaderboard Tab */}
        {activeTab === 'team-board' && (
          <View style={styles.content}>
            {teamLeaderboard.map((team) => (
              <View
                key={team.rank}
                style={[
                  styles.leaderboardCard,
                  team.highlight && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : Colors.successScale[50], borderColor: Colors.success, borderWidth: 2 },
                  !team.highlight && { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }
                ]}
              >
                <Text style={[styles.rankText, { color: Colors.text.tertiary }]}>#{team.rank}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={[styles.teamName, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{team.name}</Text>
                  <View style={styles.teamStats}>
                    <View style={styles.teamStat}>
                      <Ionicons name="people" size={14} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                      <Text style={[styles.teamStatText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{team.members} members</Text>
                    </View>
                    <View style={styles.teamStat}>
                      <Ionicons name="trending-up" size={14} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                      <Text style={[styles.teamStatText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{team.avgPerPerson} avg/person</Text>
                    </View>
                  </View>
                  <View style={styles.teamCoins}>
                    <Ionicons name="cash" size={20} color={Colors.success} />
                    <Text style={styles.teamCoinsText}>{team.totalCoins.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Individual Leaderboard Tab */}
        {activeTab === 'individual-board' && (
          <View style={styles.content}>
            {individualLeaderboard.map((person) => (
              <View
                key={person.rank}
                style={[
                  styles.leaderboardCard,
                  person.highlight && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : Colors.successScale[50], borderColor: Colors.success, borderWidth: 2 },
                  !person.highlight && { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }
                ]}
              >
                <Text style={[styles.rankText, { color: Colors.text.tertiary }]}>#{person.rank}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={[styles.personName, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{person.name}</Text>
                  <Text style={[styles.personTeam, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{person.team}</Text>
                </View>
                <View style={styles.personCoins}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <Text style={styles.personCoinsText}>{person.coins.toLocaleString()}</Text>
                </View>
              </View>
            ))}
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
  teamRankCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  teamRankLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  teamRankValue: {
    ...Typography.h4,
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
  challengeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  challengeHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  challengeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeBadges: {
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
  challengeTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  challengeDescription: {
    ...Typography.bodySmall,
  },
  progressContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  progressValue: {
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
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  bonusText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  participantsText: {
    ...Typography.bodySmall,
  },
  challengeFooter: {
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
    gap: Spacing.xs,
  },
  rewardText: {
    ...Typography.h4,
    color: Colors.success,
  },
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  startButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  companyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  companyHeader: {
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  companyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogo: {
    ...Typography.h2,
  },
  companyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  companyName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  enrolledText: {
    ...Typography.caption,
    fontWeight: 'bold',
    color: Colors.success,
  },
  enrollButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.info,
  },
  enrollButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  perksList: {
    gap: Spacing.md,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  perkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkInfo: {
    flex: 1,
  },
  perkType: {
    ...Typography.bodySmall,
    fontWeight: '500',
    marginBottom: 2,
  },
  perkValue: {
    ...Typography.bodySmall,
  },
  ctaCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaIcon: {
    marginBottom: Spacing.md,
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
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  rankText: {
    ...Typography.h3,
    width: 40,
    textAlign: 'center',
  },
  leaderboardInfo: {
    flex: 1,
  },
  teamName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  teamStats: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.sm,
  },
  teamStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  teamStatText: {
    ...Typography.bodySmall,
  },
  teamCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  teamCoinsText: {
    ...Typography.h4,
    color: Colors.success,
  },
  personName: {
    ...Typography.body,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  personTeam: {
    ...Typography.bodySmall,
  },
  personCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  personCoinsText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.success,
  },
});

export default withErrorBoundary(CorporateEmployee, 'PlayandearnCorporateEmployee');

