// @ts-nocheck
/**
 * 30-Day Fitness Challenge Page
 * /MainCategory/fitness-sports/challenges
 * Shows fitness challenges users can join to earn rewards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  orange: colors.brand.orange,
  orangeDark: colors.brand.orangeDark,
  orangeLight: colors.tint.orange,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
  green: colors.brand.greenDark,
  red: colors.error,
};

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
  reward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  participants: number;
  gradient: [string, string];
  tasks: string[];
}

// Map difficulty to gradient colors for challenges fetched from API
const DIFFICULTY_GRADIENTS: Record<string, [string, string]> = {
  Easy: [colors.brand.purpleLight, colors.brand.purple],
  Medium: [colors.brand.orange, colors.brand.orangeDark],
  Hard: [colors.error, colors.error],
};

const getDifficultyColor = (difficulty: Challenge['difficulty']): string => {
  switch (difficulty) {
    case 'Easy': return COLORS.green;
    case 'Medium': return COLORS.orange;
    case 'Hard': return COLORS.red;
    default: return COLORS.textSecondary;
  }
};

const formatParticipants = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set());
  const isMounted = useIsMounted();

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/gamification/challenges');
      if (!isMounted()) return;
      if (response.success && response.data) {
        const raw = response.data.challenges || response.data || [];
        // Normalize API data to match Challenge interface
        const mapped: Challenge[] = raw.map((c: any) => ({
          id: c.id || c._id || c.slug,
          title: c.title || c.name,
          description: c.description || '',
          icon: c.icon || '\uD83C\uDFC6',
          duration: c.duration || '7 days',
          reward: c.reward ?? c.coins ?? 0,
          difficulty: c.difficulty || 'Medium',
          participants: c.participants ?? c.participantCount ?? 0,
          gradient: DIFFICULTY_GRADIENTS[c.difficulty] || DIFFICULTY_GRADIENTS.Medium,
          tasks: c.tasks || c.steps || [],
        }));
        setChallenges(mapped);
      }
    } catch {
      // Keep empty array as fallback
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChallenges();
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchChallenges, isMounted]);

  const handleJoinChallenge = (challenge: Challenge) => {
    if (joinedChallenges.has(challenge.id)) {
      platformAlertSimple('Already Joined', `You're already part of the ${challenge.title}. Keep going!`);
      return;
    }

    platformAlertConfirm(
      'Challenge Joined!',
      `You've joined the ${challenge.title}! Complete the tasks to earn ${challenge.reward} bonus coins.`,
      () => {
        setJoinedChallenges(prev => new Set(prev).add(challenge.id));
      },
      'Let\'s Go!'
    );
  };

  const featuredChallenge = challenges[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Fitness Challenges</Text>
            <Text style={styles.headerSubtitle}>Push your limits, earn rewards</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (challenges.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Fitness Challenges</Text>
            <Text style={styles.headerSubtitle}>Push your limits, earn rewards</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="trophy-outline" size={64} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 }}>No challenges available</Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' }}>Check back soon for new fitness challenges!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fitness Challenges</Text>
          <Text style={styles.headerSubtitle}>Push your limits, earn rewards</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />
        }
      >
        {/* Featured Challenge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Challenge</Text>
          <Pressable
            style={styles.featuredCard}
           
            onPress={() => handleJoinChallenge(featuredChallenge)}
          >
            <LinearGradient
              colors={featuredChallenge.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredGradient}
            >
              <View style={styles.featuredContent}>
                <Text style={styles.featuredIcon}>{featuredChallenge.icon}</Text>
                <Text style={styles.featuredTitle}>{featuredChallenge.title}</Text>
                <Text style={styles.featuredDescription}>{featuredChallenge.description}</Text>

                <View style={styles.featuredMeta}>
                  <View style={styles.featuredMetaItem}>
                    <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredMetaText}>{featuredChallenge.duration}</Text>
                  </View>
                  <View style={styles.featuredMetaItem}>
                    <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredMetaText}>
                      {formatParticipants(featuredChallenge.participants)} joined
                    </Text>
                  </View>
                  <View style={styles.featuredMetaItem}>
                    <Ionicons name="trophy-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredMetaText}>{featuredChallenge.reward} coins</Text>
                  </View>
                </View>

                <View style={styles.featuredTasks}>
                  {featuredChallenge.tasks.map((task, index) => (
                    <View key={index} style={styles.featuredTaskRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.featuredTaskText}>{task}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.featuredBtnWrap}>
                  <View style={styles.featuredBtn}>
                    <Text style={styles.featuredBtnText}>
                      {joinedChallenges.has(featuredChallenge.id) ? 'Joined!' : 'Join Challenge'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* All Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Challenges</Text>

          {challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeCard}>
              {/* Gradient accent strip on left */}
              <LinearGradient
                colors={challenge.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.challengeStrip}
              />

              <View style={styles.challengeBody}>
                {/* Top row: icon + info */}
                <View style={styles.challengeTop}>
                  <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDesc} numberOfLines={2}>
                      {challenge.description}
                    </Text>
                  </View>
                </View>

                {/* Meta row: difficulty, duration, reward, participants */}
                <View style={styles.challengeMeta}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(challenge.difficulty) + '18' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(challenge.difficulty) },
                      ]}
                    >
                      {challenge.difficulty}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{challenge.duration}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="trophy-outline" size={13} color={COLORS.primaryGold} />
                    <Text style={styles.metaText}>{challenge.reward}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{formatParticipants(challenge.participants)}</Text>
                  </View>
                </View>

                {/* Tasks */}
                <View style={styles.tasksList}>
                  {challenge.tasks.map((task, index) => (
                    <View key={index} style={styles.taskRow}>
                      <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.taskText}>{task}</Text>
                    </View>
                  ))}
                </View>

                {/* Join button */}
                <Pressable
                  style={styles.joinBtnWrap}
                 
                  onPress={() => handleJoinChallenge(challenge)}
                >
                  <LinearGradient
                    colors={
                      joinedChallenges.has(challenge.id)
                        ? [colors.neutral[400], colors.neutral[500]]
                        : [COLORS.orange, COLORS.orangeDark]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.joinBtn}
                  >
                    <Ionicons
                      name={joinedChallenges.has(challenge.id) ? 'checkmark-circle' : 'flash'}
                      size={16}
                      color={COLORS.white}
                    />
                    <Text style={styles.joinBtnText}>
                      {joinedChallenges.has(challenge.id) ? 'Joined' : 'Join Challenge'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom note */}
        <View style={styles.bottomNote}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.bottomNoteText}>
            Complete challenges to earn bonus coins. Coins are awarded when you reach the target.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  // Featured challenge card
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  featuredGradient: {
    borderRadius: 20,
  },
  featuredContent: {
    padding: 24,
  },
  featuredIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  featuredDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  featuredTasks: {
    marginBottom: 20,
    gap: 6,
  },
  featuredTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredTaskText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  featuredBtnWrap: {
    alignItems: 'flex-start',
  },
  featuredBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  featuredBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Challenge card
  challengeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  challengeStrip: {
    width: 5,
  },
  challengeBody: {
    flex: 1,
    padding: 14,
  },
  challengeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  challengeIcon: {
    fontSize: 36,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  challengeDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tasksList: {
    marginBottom: 12,
    gap: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  joinBtnWrap: {
    alignSelf: 'flex-start',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Bottom note
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.orangeLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.orange + '30',
  },
  bottomNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default React.memo(ChallengesPage);
