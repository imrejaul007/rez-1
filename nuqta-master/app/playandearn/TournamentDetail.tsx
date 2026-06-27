// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import tournamentApi, { Tournament, TournamentLeaderboardEntry, UserRankInTournament } from '../../services/tournamentApi';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import { formatTimeLeft } from '@/types/playandearn.types';
import { useTournamentSocket } from '@/hooks/useTournamentSocket';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const NUQTA_COIN = BRAND.COIN_IMAGE;

const GAME_TYPE_ROUTES: Record<string, string> = {
  'spin_wheel': '/games/spin-wheel',
  'memory_match': '/games/memory',
  'coin_hunt': '/games/slots',
  'guess_price': '/games/trivia',
  'quiz': '/games/quiz',
  'mixed': '/games',
};

const { width } = Dimensions.get('window');

const GAME_TYPE_ICONS: Record<string, string> = {
  'spin_wheel': '🎰',
  'memory_match': '🧠',
  'coin_hunt': '🪙',
  'guess_price': '🏷️',
  'quiz': '❓',
  'mixed': '🏆',
};

const STATUS_CONFIG: Record<string, { colors: [string, string]; label: string; icon: string }> = {
  'active': { colors: [Colors.success, Colors.success], label: 'LIVE', icon: 'radio' },
  'upcoming': { colors: [Colors.info, Colors.info], label: 'UPCOMING', icon: 'time' },
  'completed': { colors: [Colors.text.tertiary, Colors.text.tertiary], label: 'ENDED', icon: 'checkmark-circle' },
  'cancelled': { colors: [Colors.error, Colors.error], label: 'CANCELLED', icon: 'close-circle' },
};

const TournamentDetail = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const user = useAuthUser();
  const currentUserId = user?._id || user?.id || '';
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : params.id?.toString() || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRankInTournament | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { onLeaderboardUpdate, onScoreUpdate } = useTournamentSocket(id || null);
  const isMounted = useIsMounted();

  useEffect(() => {
    const unsubLeaderboard = onLeaderboardUpdate((data) => {
      if (data.tournamentId === id && data.leaderboard) {
        setLeaderboard(prev => {
          if (prev.length === 0) return prev;
          const updated = prev.map(existing => {
            const userId = (existing as any).user?._id || (existing as any).userId;
            const socketEntry = data.leaderboard.find(e => e.userId === userId);
            if (socketEntry) {
              return { ...existing, score: socketEntry.score, rank: socketEntry.rank };
            }
            return existing;
          });
          return updated.sort((a, b) => a.rank - b.rank);
        });
      }
    });

    const unsubScore = onScoreUpdate((data) => {
      if (data.tournamentId === id) {
        if (currentUserId && data.userId === String(currentUserId)) {
          setMyRank(prev => prev ? { ...prev, score: data.newScore, rank: data.newRank } : prev);
        }
        setLeaderboard(prev =>
          prev.map(entry => {
            const userId = (entry as any).user?._id || (entry as any).userId;
            if (userId === data.userId) {
              return { ...entry, score: data.newScore, rank: data.newRank };
            }
            return entry;
          })
        );
      }
    });

    return () => { unsubLeaderboard(); unsubScore(); };
  }, [id, onLeaderboardUpdate, onScoreUpdate, currentUserId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setError('Tournament not found'); setLoading(false); return; }
      try {
        const [tournamentRes, leaderboardRes, myRankRes] = await Promise.all([
          tournamentApi.getTournamentById(id),
          tournamentApi.getTournamentLeaderboard(id, 10),
          tournamentApi.getMyRankInTournament(id).catch(() => ({ data: null }))
        ]);
        if (tournamentRes.data) setTournament(tournamentRes.data);
        else setError('Tournament not found');
        if (leaderboardRes.data) setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
        if (myRankRes.data) {
          if (!isMounted()) return;
          setMyRank(myRankRes.data);
          if (!isMounted()) return;
          setIsJoined(true); // If we have rank data, user has joined
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load tournament');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const updateTimer = useCallback(() => {
    if (!tournament) return;
    const dateToUse = tournament.status === 'active' ? tournament.endDate : tournament.startDate;
    const { formatted } = formatTimeLeft(dateToUse);
    setTimeDisplay(formatted);
  }, [tournament]);

  useEffect(() => {
    updateTimer();
    timerRef.current = setInterval(updateTimer, 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [updateTimer]);

  const handleJoin = async () => {
    if (!id || joining) return;
    setJoining(true);
    try {
      const res = await tournamentApi.joinTournament(id);
      if (res.success || res.data) {
        setIsJoined(true);
        // Refresh tournament data to get updated participant count
        const refreshed = await tournamentApi.getTournamentById(id).catch(() => null);
        if (refreshed?.data) setTournament(refreshed.data);
        platformAlertSimple('Joined!', 'You have joined the tournament. Start playing to earn points!');
      } else {
        platformAlertSimple('Error', (res as any).message || 'Failed to join tournament');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to join tournament');
    } finally {
      if (!isMounted()) return;
      setJoining(false);
    }
  };

  const handlePlayGame = () => {
    if (!tournament) return;
    const route = GAME_TYPE_ROUTES[tournament.gameType] || '/games';
    router.push(route as any);
  };

  const icon = tournament ? (GAME_TYPE_ICONS[tournament.gameType] || '🏆') : '🏆';
  const statusCfg = tournament ? (STATUS_CONFIG[tournament.status] || STATUS_CONFIG['active']) : STATUS_CONFIG['active'];
  const totalPrizePool = tournament?.prizes?.reduce((sum, p) => sum + (p.coins || 0), 0) || tournament?.totalPrizePool || 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <DetailPageSkeleton />
      </View>
    );
  }

  if (error || !tournament) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>{error || 'Tournament not found'}</Text>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <LinearGradient
          colors={[colors.nileBlue, '#234B6B']}
          style={styles.hero}
        >
          {/* Back button */}
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </Pressable>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.colors[0] }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={colors.background.primary} />
            <Text style={styles.statusText}>{statusCfg.label}</Text>
          </View>

          {/* Icon + Title */}
          <Text style={styles.heroIcon}>{icon}</Text>
          <Text style={styles.heroTitle}>{tournament.name}</Text>
          {tournament.description ? (
            <Text style={styles.heroDescription}>{tournament.description}</Text>
          ) : null}

          {/* Participants count */}
          <View style={styles.participantsRow}>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.participantsText}>
              {(tournament.participantsCount || 0).toLocaleString()} participants
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <CachedImage source={NUQTA_COIN} style={{ width: 20, height: 20 }} />
              <Text style={styles.heroStatValue}>{totalPrizePool.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>Prize Pool</Text>
            </View>
            <View style={[styles.heroStatCard, styles.heroStatMiddle]}>
              <Ionicons name="game-controller" size={20} color={colors.infoScale[400]} />
              <Text style={styles.heroStatValue}>{tournament.gameType?.replace('_', ' ') || 'Mixed'}</Text>
              <Text style={styles.heroStatLabel}>Game Type</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Ionicons name="time" size={20} color={tournament.status === 'active' ? colors.errorScale[400] : colors.infoScale[400]} />
              <Text style={[styles.heroStatValue, { color: tournament.status === 'active' ? colors.errorScale[400] : colors.infoScale[400], fontSize: 14 }]}>
                {tournament.status === 'completed' ? 'Ended' : timeDisplay || '...'}
              </Text>
              <Text style={styles.heroStatLabel}>
                {tournament.status === 'active' ? 'Ends In' : tournament.status === 'upcoming' ? 'Starts In' : 'Status'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* My Rank Card */}
          {myRank && (
            <View style={styles.myRankCard}>
              <LinearGradient
                colors={[colors.lightMustard, colors.warningScale[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.myRankGradient}
              >
                <View style={styles.myRankRow}>
                  <View>
                    <Text style={styles.myRankLabel}>Your Rank</Text>
                    <Text style={styles.myRankValue}>#{myRank.rank}</Text>
                  </View>
                  <View style={styles.myRankDivider} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.myRankLabel}>Score</Text>
                    <Text style={styles.myRankScore}>{myRank.score.toLocaleString()}</Text>
                  </View>
                </View>
                {myRank.isWinner && myRank.prize && (
                  <View style={styles.prizeEligible}>
                    <Ionicons name="star" size={14} color={colors.nileBlue} />
                    <Text style={styles.prizeEligibleText}>
                      Prize: {myRank.prize.coins.toLocaleString()} coins
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Prize Breakdown */}
          {tournament.prizes && tournament.prizes.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: colors.tint.amberLight }]}>
                  <Ionicons name="gift" size={18} color={Colors.warning} />
                </View>
                <Text style={styles.sectionTitle}>Prize Breakdown</Text>
              </View>
              {tournament.prizes.map((prize, idx) => {
                const rankIcons = ['🥇', '🥈', '🥉'];
                const prizeIcon = idx < 3 ? rankIcons[idx] : '🎁';
                const rankLabel = idx === 0 ? '1st Place' : idx === 1 ? '2nd Place' : idx === 2 ? '3rd Place' : `${prize.rank || idx + 1}th Place`;
                const isTop = idx < 3;
                return (
                  <View key={idx} style={[styles.prizeItem, isTop && styles.prizeItemTop]}>
                    <View style={styles.prizeLeft}>
                      <Text style={styles.prizeIcon}>{prizeIcon}</Text>
                      <Text style={[styles.prizeRank, isTop && { fontWeight: '700' }]}>{rankLabel}</Text>
                    </View>
                    <View style={styles.prizeRight}>
                      <CachedImage source={NUQTA_COIN} style={{ width: 14, height: 14 }} />
                      <Text style={[styles.prizeAmount, isTop && { fontWeight: '800', fontSize: 15 }]}>
                        {(prize.coins || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Rules */}
          {tournament.rules && tournament.rules.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: colors.tint.blueLight }]}>
                  <Ionicons name="document-text" size={18} color={Colors.info} />
                </View>
                <Text style={styles.sectionTitle}>Rules</Text>
              </View>
              {tournament.rules.map((rule: string, idx: number) => (
                <View key={idx} style={styles.ruleItem}>
                  <View style={styles.ruleNumber}>
                    <Text style={styles.ruleNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Leaderboard */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: colors.tint.pink }]}>
                <Ionicons name="ribbon" size={18} color={Colors.brand.purple} />
              </View>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              {leaderboard.length > 0 && (
                <Text style={styles.sectionBadge}>Top {leaderboard.length}</Text>
              )}
            </View>

            {leaderboard.length > 0 ? (
              <View style={styles.leaderboardList}>
                {leaderboard.map((entry, idx) => {
                  const isTop3 = entry.rank <= 3;
                  const rankColors = [colors.warningScale[400], '#94A3B8', '#CD7F32'];
                  const isCurrentUser = currentUserId && (
                    (entry as any).user?._id === currentUserId || (entry as any).userId === currentUserId
                  );

                  return (
                    <View
                      key={entry.rank}
                      style={[
                        styles.lbItem,
                        isCurrentUser && styles.lbItemHighlight,
                        idx < leaderboard.length - 1 && styles.lbItemBorder,
                      ]}
                    >
                      {/* Rank */}
                      {isTop3 ? (
                        <View style={[styles.lbRankBadge, { backgroundColor: rankColors[entry.rank - 1] }]}>
                          <Text style={styles.lbRankBadgeText}>{entry.rank}</Text>
                        </View>
                      ) : (
                        <Text style={styles.lbRank}>#{entry.rank}</Text>
                      )}

                      {/* Avatar */}
                      <View style={[styles.lbAvatar, { backgroundColor: isTop3 ? `${rankColors[Math.min(entry.rank - 1, 2)]}25` : colors.tint.slate }]}>
                        <Text style={styles.lbAvatarText}>
                          {entry.user?.name ? entry.user.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={styles.lbInfo}>
                        <Text style={styles.lbName} numberOfLines={1}>
                          {entry.user?.name || 'Anonymous'}
                          {isCurrentUser ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.lbMeta}>{entry.gamesPlayed} games played</Text>
                      </View>

                      {/* Score */}
                      <View style={styles.lbScoreCol}>
                        <Text style={styles.lbScore}>{entry.score.toLocaleString()}</Text>
                        <Text style={styles.lbScoreLabel}>pts</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyLeaderboard}>
                <Ionicons name="people-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No participants yet</Text>
                <Text style={styles.emptyText}>Be the first to join!</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          {tournament.status === 'active' && !isJoined && (
            <Pressable onPress={handleJoin} disabled={joining}>
              <LinearGradient colors={[colors.successScale[700], colors.successScale[400]]} style={styles.ctaGradient}>
                {joining ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="enter" size={18} color={Colors.text.inverse} />
                    <Text style={[styles.ctaText, { color: colors.background.primary }]}>
                      {tournament.entryFee > 0 ? `Join Tournament (${tournament.entryFee} coins)` : 'Join Tournament'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.text.inverse} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
          {tournament.status === 'active' && isJoined && (
            <Pressable onPress={handlePlayGame}>
              <LinearGradient colors={[colors.nileBlue, '#234B6B']} style={styles.ctaGradient}>
                <Ionicons name="game-controller" size={18} color={Colors.gold} />
                <Text style={styles.ctaText}>Play Now</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
              </LinearGradient>
            </Pressable>
          )}
          {tournament.status === 'upcoming' && (
            <View style={[styles.ctaGradient, { backgroundColor: colors.slateLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
              <Ionicons name="time" size={18} color={colors.slateGray} />
              <Text style={{ ...Typography.body, fontWeight: '700', color: colors.slateGray }}>
                Starts in {timeDisplay || '...'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.text.tertiary,
    ...Typography.body,
  },
  errorCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  errorTitle: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  errorBtn: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.tint.slate,
    borderRadius: 10,
  },
  errorBtnText: {
    color: Colors.info,
    ...Typography.body,
    fontWeight: '600',
  },

  // Hero
  hero: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 6,
  },
  heroDescription: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
    marginBottom: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
  },
  participantsText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: Spacing.md,
  },
  heroStatCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroStatMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
    textTransform: 'capitalize',
  },
  heroStatLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // Content
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },

  // My Rank
  myRankCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: colors.warningScale[400], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 16px rgba(245,158,11,0.2)' },
    }),
  },
  myRankGradient: {
    padding: 18,
  },
  myRankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(26,58,82,0.15)',
  },
  myRankLabel: {
    ...Typography.caption,
    color: Colors.nileBlue + '99',
    fontWeight: '500',
    marginBottom: 2,
  },
  myRankValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.nileBlue,
  },
  myRankScore: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  prizeEligible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.nileBlue + '1A',
  },
  prizeEligibleText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Section Card
  sectionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 10px rgba(26,58,82,0.06)' },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.base,
  },
  sectionIconBg: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    flex: 1,
  },
  sectionBadge: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.brand.purple,
    backgroundColor: colors.tint.pink,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },

  // Prizes
  prizeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    marginBottom: 6,
  },
  prizeItemTop: {
    backgroundColor: Colors.warningScale[50],
  },
  prizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prizeIcon: {
    fontSize: 22,
  },
  prizeRank: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.nileBlue,
  },
  prizeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  prizeAmount: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.success,
  },

  // Rules
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  ruleNumber: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.infoScale[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleNumberText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.info,
  },
  ruleText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 19,
  },

  // Leaderboard
  leaderboardList: {},
  lbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  lbItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.tint.slate,
  },
  lbItemHighlight: {
    backgroundColor: colors.tint.amber,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  lbRankBadge: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbRankBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  lbRank: {
    width: 26,
    ...Typography.bodySmall,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbAvatarText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  lbInfo: {
    flex: 1,
  },
  lbName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: 1,
  },
  lbMeta: {
    ...Typography.caption,
    color: '#94A3B8',
  },
  lbScoreCol: {
    alignItems: 'flex-end',
  },
  lbScore: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  lbScoreLabel: {
    ...Typography.caption,
    color: '#94A3B8',
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.slateGray,
    marginTop: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: '#94A3B8',
    marginTop: 2,
  },

  // CTA
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: 14,
  },
  ctaText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
});

export default withErrorBoundary(TournamentDetail, 'PlayandearnTournamentDetail');
