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
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const CollegeAmbassador = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [myPrograms, setMyPrograms] = useState<any[]>([]);
  const isMounted = useIsMounted();

  // Fetch college programs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programsRes, myProgramsRes] = await Promise.all([
          programApi.getCollegePrograms(),
          programApi.getMyPrograms()
        ]);

        if (programsRes.data) {
          if (!isMounted()) return;
          setPrograms(programsRes.data);
        }
        if (myProgramsRes.data) {
          if (!isMounted()) return;
          setMyPrograms(myProgramsRes.data.filter(p => p.type === 'college_ambassador'));
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

  const ambassadorTasks = [
    {
      id: 1,
      title: 'Refer 10 New Students',
      type: 'referral',
      icon: 'people',
      reward: 500,
      brandedReward: 300,
      progress: 7,
      total: 10,
      difficulty: 'Medium',
      deadline: '7 days left',
      description: 'Get your friends to join ${BRAND.APP_NAME} and make their first transaction',
      status: 'active'
    },
    {
      id: 2,
      title: 'Host Campus Store Visit',
      type: 'event',
      icon: 'calendar',
      reward: 800,
      brandedReward: 500,
      progress: 0,
      total: 1,
      difficulty: 'Hard',
      deadline: '15 days left',
      description: 'Organize a group visit to partner stores with min 20 students',
      requirements: ['Minimum 20 students', 'Partner store approval', 'Photo proof'],
      status: 'available'
    },
    {
      id: 3,
      title: 'Share on Campus Groups',
      type: 'social',
      icon: 'share-social',
      reward: 100,
      brandedReward: 50,
      progress: 3,
      total: 5,
      difficulty: 'Easy',
      deadline: 'Daily',
      description: 'Share ${BRAND.APP_NAME} offers in your college WhatsApp/Telegram groups',
      status: 'active'
    },
    {
      id: 4,
      title: 'Campus Fest Participation',
      type: 'fest',
      icon: 'happy',
      reward: 1000,
      brandedReward: 800,
      progress: 0,
      total: 1,
      difficulty: 'Hard',
      deadline: '30 days',
      description: 'Set up ${BRAND.APP_NAME} stall at your college fest',
      requirements: ['College fest approval', 'Minimum 50 signups', 'Event photos', `${BRAND.APP_NAME} team support provided`],
      featured: true,
      status: 'available'
    },
    {
      id: 5,
      title: 'Student Discount Hunt',
      type: 'discovery',
      icon: 'locate',
      reward: 200,
      brandedReward: 150,
      progress: 5,
      total: 10,
      difficulty: 'Medium',
      deadline: '10 days left',
      description: 'Find and submit new student-friendly stores near campus',
      status: 'active'
    },
    {
      id: 6,
      title: 'Monthly Ambassador Meet',
      type: 'attendance',
      icon: 'school',
      reward: 300,
      brandedReward: 200,
      progress: 0,
      total: 1,
      difficulty: 'Easy',
      deadline: '5 days left',
      description: 'Attend monthly ambassador meet (online/offline)',
      status: 'available'
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: 'Tech Fest 2025 - IIT Delhi',
      date: 'Jan 15-17, 2025',
      location: 'IIT Delhi Campus',
      participants: 45,
      maxParticipants: 50,
      reward: 2000,
      status: 'open',
      type: 'College Fest'
    },
    {
      id: 2,
      title: 'Fashion Week - NIFT',
      date: 'Jan 20-22, 2025',
      location: 'NIFT Bangalore',
      participants: 32,
      maxParticipants: 40,
      reward: 1500,
      status: 'open',
      type: 'Fashion Event'
    },
    {
      id: 3,
      title: 'Food Fest - DU North Campus',
      date: 'Jan 25, 2025',
      location: 'Delhi University',
      participants: 50,
      maxParticipants: 50,
      reward: 1200,
      status: 'full',
      type: 'Food Event'
    }
  ];

  const ambassadorPerks = [
    {
      icon: 'cash',
      title: 'Exclusive Rewards',
      description: 'Earn up to 10,000 coins/month',
      color: Colors.success,
      bg: 'rgba(16, 185, 129, 0.2)'
    },
    {
      icon: 'gift',
      title: 'Free Products',
      description: 'Get free samples & merch',
      color: colors.brand.purpleMedium,
      bg: 'rgba(168, 85, 247, 0.2)'
    },
    {
      icon: 'ribbon',
      title: 'Certificate',
      description: 'Ambassador certificate for resume',
      color: Colors.info,
      bg: 'rgba(59, 130, 246, 0.2)'
    },
    {
      icon: 'star',
      title: 'Priority Access',
      description: 'Early access to new features',
      color: Colors.warning,
      bg: 'rgba(245, 158, 11, 0.2)'
    }
  ];

  const leaderboard = [
    { rank: 1, name: 'Rohan Sharma', college: 'IIT Delhi', referrals: 234, coins: 45600 },
    { rank: 2, name: 'Priya Patel', college: 'BITS Pilani', referrals: 198, coins: 38900 },
    { rank: 3, name: 'Amit Kumar', college: 'DU North', referrals: 176, coins: 32400 },
    { rank: 4, name: 'You', college: 'Your College', referrals: 87, coins: 12340, highlight: true }
  ];

  const tabs = [
    { id: 'tasks', label: 'My Tasks', count: ambassadorTasks.filter(t => t.status === 'active' || t.status === 'available').length },
    { id: 'events', label: 'Events', count: upcomingEvents.filter(e => e.status === 'open').length },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
    { id: 'perks', label: 'Perks', icon: 'gift' }
  ];

  const myStats = {
    totalReferrals: 87,
    totalEarned: 12340,
    currentRank: 4,
    eventsAttended: 5,
    thisMonthEarned: 2450,
    level: 'Silver Ambassador'
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
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>College Ambassador</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{myStats.level}</Text>
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
            style={styles.heroCard}
          >
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="people" size={16} color={Colors.info} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Referrals</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.totalReferrals}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="trophy" size={16} color={Colors.warning} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Rank</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>#{myStats.currentRank}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="calendar" size={16} color={colors.brand.purpleMedium} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Events</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{myStats.eventsAttended}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.primary }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <Text style={[styles.statLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>This Month</Text>
                </View>
                <Text style={[styles.statValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>+{myStats.thisMonthEarned}</Text>
              </View>
            </View>
            <View style={[styles.progressCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)' }]}>
              <Text style={[styles.progressLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Progress to Gold Ambassador</Text>
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                <LinearGradient
                  colors={[Colors.info, colors.brand.purpleMedium]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: '65%' }]}
                />
              </View>
              <Text style={styles.progressText}>150 more referrals to go!</Text>
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
                activeTab === tab.id ? styles.tabActive : styles.tabInactive,
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

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <View style={styles.content}>
            {ambassadorTasks.map((task) => {
              const difficultyStyle = getDifficultyStyle(task.difficulty);
              return (
                <View key={task.id} style={[styles.taskCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                  <View style={styles.taskHeader}>
                    <View style={[styles.taskIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                      <Ionicons name={task.icon as any} size={28} color={Colors.info} />
                    </View>
                    <View style={styles.taskInfo}>
                      <View style={styles.taskBadges}>
                        <View style={[styles.badge, { backgroundColor: difficultyStyle.bg, borderColor: difficultyStyle.border }]}>
                          <Text style={[styles.badgeText, { color: difficultyStyle.color }]}>{task.difficulty}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.background.secondary }]}>
                          <Ionicons name="time" size={12} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                          <Text style={[styles.badgeText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{task.deadline}</Text>
                        </View>
                        {task.featured && (
                          <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                            <Ionicons name="sparkles" size={12} color={Colors.warning} />
                            <Text style={[styles.badgeText, { color: Colors.warning }]}>Featured</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.taskTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{task.title}</Text>
                      <Text style={[styles.taskDescription, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{task.description}</Text>
                    </View>
                  </View>

                  <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : Colors.infoScale[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.infoScale[200] }]}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>Progress</Text>
                      <Text style={[styles.progressValue, { color: isDark ? colors.infoScale[400] : colors.brand.blue }]}>
                        {task.progress}/{task.total}
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                      <LinearGradient
                        colors={[Colors.info, colors.brand.purpleMedium]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${(task.progress / task.total) * 100}%` }]}
                      />
                    </View>
                  </View>

                  {task.requirements && (
                    <View style={[styles.requirementsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.background.secondary }]}>
                      <Text style={[styles.requirementsTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Requirements:</Text>
                      {task.requirements.map((req, idx) => (
                        <View key={idx} style={styles.requirementItem}>
                          <View style={[styles.requirementDot, { backgroundColor: Colors.info }]} />
                          <Text style={[styles.requirementText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.taskFooter}>
                    <View style={styles.rewardsContainer}>
                      <View style={styles.rewardItem}>
                        <Ionicons name="cash" size={20} color={Colors.success} />
                        <Text style={styles.rewardText}>+{task.reward}</Text>
                      </View>
                      {task.brandedReward > 0 && (
                        <View style={styles.rewardItem}>
                          <Ionicons name="bag" size={20} color={colors.brand.purpleMedium} />
                          <Text style={[styles.rewardText, { color: colors.brand.purpleMedium }]}>+{task.brandedReward}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable style={styles.startButton}>
                      <LinearGradient
                        colors={[Colors.info, colors.brand.purpleMedium]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.startButtonGradient}
                      >
                        <Text style={styles.startButtonText}>
                          {task.status === 'active' ? 'Continue' : 'Start Task'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <View style={styles.content}>
            {upcomingEvents.map((event) => (
              <View key={event.id} style={[styles.eventCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                    <Text style={styles.eventEmoji}>🎉</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <View style={styles.eventBadges}>
                      <View style={[styles.badge, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                        <Text style={[styles.badgeText, { color: colors.brand.purpleMedium }]}>{event.type}</Text>
                      </View>
                      {event.status === 'full' && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                          <Text style={[styles.badgeText, { color: Colors.error }]}>Full</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.eventTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.title}</Text>
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailItem}>
                        <Ionicons name="calendar" size={14} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                        <Text style={[styles.eventDetailText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{event.date}</Text>
                      </View>
                      <View style={styles.eventDetailItem}>
                        <Ionicons name="location" size={14} color={isDark ? Colors.text.tertiary : Colors.text.tertiary} />
                        <Text style={[styles.eventDetailText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{event.location}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : colors.tint.pink, borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#C084FC' }]}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: isDark ? '#C084FC' : colors.brand.purple }]}>Participants</Text>
                    <Text style={[styles.progressValue, { color: isDark ? colors.brand.purpleSoft : colors.brand.purpleLight }]}>
                      {event.participants}/{event.maxParticipants}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                    <LinearGradient
                      colors={[colors.brand.purpleMedium, colors.brand.pink]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${(event.participants / event.maxParticipants) * 100}%` }]}
                    />
                  </View>
                </View>

                <View style={styles.eventFooter}>
                  <View style={styles.rewardItem}>
                    <Ionicons name="cash" size={20} color={Colors.success} />
                    <Text style={styles.rewardText}>+{event.reward}</Text>
                  </View>
                  <Pressable
                    style={[styles.registerButton, event.status === 'full' && styles.registerButtonDisabled]}
                    disabled={event.status === 'full'}
                  >
                    {event.status !== 'full' ? (
                      <LinearGradient
                        colors={[colors.brand.purpleMedium, colors.brand.pink]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.registerButtonGradient}
                      >
                        <Text style={styles.registerButtonText}>Register</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={[styles.registerButtonText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Waitlist</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.content}>
            {leaderboard.map((ambassador) => (
              <View
                key={ambassador.rank}
                style={[
                  styles.leaderboardCard,
                  ambassador.highlight && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : Colors.successScale[50], borderColor: Colors.success, borderWidth: 2 },
                  !ambassador.highlight && { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }
                ]}
              >
                <Text style={[styles.rankText, { color: Colors.text.tertiary }]}>#{ambassador.rank}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={[styles.leaderboardName, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{ambassador.name}</Text>
                  <Text style={[styles.leaderboardCollege, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{ambassador.college}</Text>
                  <Text style={[styles.leaderboardReferrals, { color: Colors.info }]}>{ambassador.referrals} referrals</Text>
                </View>
                <View style={styles.leaderboardCoins}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <Text style={styles.leaderboardCoinsText}>{ambassador.coins.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Perks Tab */}
        {activeTab === 'perks' && (
          <View style={styles.content}>
            <View style={styles.perksGrid}>
              {ambassadorPerks.map((perk, idx) => (
                <View key={idx} style={[styles.perkCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
                  <View style={[styles.perkIconContainer, { backgroundColor: perk.bg }]}>
                    <Ionicons name={perk.icon as any} size={28} color={perk.color} />
                  </View>
                  <Text style={[styles.perkTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{perk.title}</Text>
                  <Text style={[styles.perkDescription, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{perk.description}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.exclusiveCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.3)' }]}>
              <View style={styles.exclusiveHeader}>
                <Ionicons name="flash" size={20} color={Colors.warning} />
                <Text style={[styles.exclusiveTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Exclusive Benefits</Text>
              </View>
              {[
                `Direct mentorship from ${BRAND.APP_NAME} team`,
                'Networking with other ambassadors',
                'Resume-worthy certificate',
                'Internship opportunities',
                `Free ${BRAND.APP_NAME} merchandise`
              ].map((benefit, idx) => (
                <View key={idx} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={[styles.benefitText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{benefit}</Text>
                </View>
              ))}
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
    borderColor: 'rgba(59, 130, 246, 0.3)',
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
  progressCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  progressLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: Spacing.sm,
    borderRadius: Spacing.xs,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.xs,
  },
  progressText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.info,
    textAlign: 'center',
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
  tabActive: {},
  tabInactive: {},
  tabText: {
    ...Typography.body,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  taskCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  taskIconContainer: {
    width: 56,
    height: 56,
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
  progressValue: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
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
    gap: Spacing.xs,
  },
  rewardText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
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
  eventCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  eventHeader: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  eventIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventEmoji: {
    ...Typography.h2,
  },
  eventInfo: {
    flex: 1,
  },
  eventBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eventTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  eventDetails: {
    gap: Spacing.xs,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    ...Typography.bodySmall,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  registerButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  registerButtonDisabled: {
    backgroundColor: 'rgba(229, 231, 235, 0.5)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  registerButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  registerButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
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
  leaderboardName: {
    ...Typography.body,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  leaderboardCollege: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  leaderboardReferrals: {
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
  perksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  perkCard: {
    width: (width - 56) / 2,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  perkIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  perkTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  perkDescription: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  exclusiveCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  exclusiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exclusiveTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  benefitText: {
    ...Typography.bodySmall,
    flex: 1,
  },
});

export default withErrorBoundary(CollegeAmbassador, 'PlayandearnCollegeAmbassador');

