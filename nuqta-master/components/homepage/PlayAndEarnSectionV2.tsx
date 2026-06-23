/**
 * Play & Earn Section - Converted from V2 Web
 * Exact match to Nuqta_v-2-main/src/components/home/PlayAndEarnSection.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import gameApi, { AvailableGame } from '@/services/gameApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors matching Nuqta design
const COLORS = {
  // Light mode
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  gray200: colors.neutral[200],
  nileBlue: colors.nileBlue,
  nileBlueLight: colors.brand.nileBlueLight,
  mustard: colors.lightMustard,
  amber500: colors.warningScale[400],
  amber600: colors.warningScale[700],
  amber400: colors.warningScale[400],
  // Gradients
  nileBlueGradientStart: 'rgba(26, 58, 82, 0.2)',
  nileBlueGradientEnd: 'rgba(35, 75, 104, 0.1)',
  amberGradientStart: 'rgba(245, 158, 11, 0.2)',
  amberGradientEnd: 'rgba(249, 115, 22, 0.1)',
  // Borders
  nileBlueBorder: 'rgba(26, 58, 82, 0.3)',
  amberBorder: 'rgba(245, 158, 11, 0.3)',
};

interface GameCardProps {
  icon: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  reward: string;
  rewardColor: string;
  gradientColors: string[];
  borderColor: string;
  onPress: () => void;
}

const GameCard: React.FC<GameCardProps> = ({
  icon,
  badge,
  badgeColor,
  title,
  subtitle,
  reward,
  rewardColor,
  gradientColors,
  borderColor,
  onPress,
}) => (
  <Pressable
    style={[styles.gameCard, { borderColor }]}
    onPress={onPress}
   
  >
    <LinearGradient
      colors={gradientColors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gameCardGradient}
    >
      <View style={styles.gameCardHeader}>
        <Text style={styles.gameIcon}>{icon}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      </View>
      <Text style={styles.gameTitle}>{title}</Text>
      <Text style={styles.gameSubtitle}>{subtitle}</Text>
      <Text style={[styles.gameReward, { color: rewardColor }]}>{reward}</Text>
    </LinearGradient>
  </Pressable>
);

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onPress }) => (
  <Pressable
    style={styles.quickAction}
    onPress={onPress}
   
  >
    <Text style={styles.quickActionIcon}>{icon}</Text>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </Pressable>
);

const PlayAndEarnSectionV2: React.FC = () => {
  const router = useRouter();
  const [games, setGames] = useState<AvailableGame[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await gameApi.getAvailableGames();
        if (response.success && response.data?.games) {
          // Get first 2 games for display
          if (!isMounted()) return;
          setGames(response.data.games.slice(0, 2));
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handleViewAll = () => {
    router.push('/playandearn');
  };

  const handleGamePress = (game: AvailableGame) => {
    router.push(game.path as any);
  };

  const handleBadges = () => {
    router.push('/badges');
  };

  const handleLeaderboard = () => {
    router.push('/playandearn/leaderboard');
  };

  const handleMissions = () => {
    router.push('/missions');
  };

  const handleMore = () => {
    router.push('/playandearn');
  };

  // Helper to get gradient colors based on game index
  const getGameStyle = (index: number) => {
    if (index % 2 === 0) {
      return {
        gradientColors: [COLORS.nileBlueGradientStart, COLORS.nileBlueGradientEnd],
        borderColor: COLORS.nileBlueBorder,
        badgeColor: COLORS.nileBlue,
        rewardColor: COLORS.nileBlueLight,
        badge: 'PLAY',
      };
    }
    return {
      gradientColors: [COLORS.amberGradientStart, COLORS.amberGradientEnd],
      borderColor: COLORS.amberBorder,
      badgeColor: COLORS.amber500,
      rewardColor: COLORS.amber600,
      badge: 'DAILY',
    };
  };

  // Default games to show if API hasn't loaded yet
  const defaultGames: AvailableGame[] = [
    {
      id: 'spin-wheel',
      title: 'Spin & Win',
      description: 'Spin to win coins',
      icon: '🎰',
      path: '/explore/spin-win',
      maxDaily: 1,
      reward: 'Up to 1000 coins',
      playsRemaining: 1,
      playsUsed: 0,
      isAvailable: true,
      todaysEarnings: 0,
    },
    {
      id: 'memory-match',
      title: 'Memory Match',
      description: 'Match pairs to earn',
      icon: '🧠',
      path: '/playandearn/memorymatch',
      maxDaily: 3,
      reward: 'Up to 170 coins',
      playsRemaining: 3,
      playsUsed: 0,
      isAvailable: true,
      todaysEarnings: 0,
    },
  ];

  const displayGames = games.length > 0 ? games : defaultGames;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🎮 Play & Earn</Text>
          <Text style={styles.headerSubtitle}>Free games, real rewards</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Game Cards Row */}
      <View style={styles.gameCardsRow}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.nileBlue} />
          </View>
        ) : (
          displayGames.map((game, index) => {
            const style = getGameStyle(index);
            return (
              <GameCard
                key={game.id}
                icon={game.icon}
                badge={style.badge}
                badgeColor={style.badgeColor}
                title={game.title}
                subtitle={game.description}
                reward={game.reward}
                rewardColor={style.rewardColor}
                gradientColors={style.gradientColors}
                borderColor={style.borderColor}
                onPress={() => handleGamePress(game)}
              />
            );
          })
        )}
      </View>

      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        <QuickAction icon="🏅" label="Badges" onPress={handleBadges} />
        <QuickAction icon="🏆" label="Leaderboard" onPress={handleLeaderboard} />
        <QuickAction icon="🎯" label="Missions" onPress={handleMissions} />
        <QuickAction icon="🎮" label="More" onPress={handleMore} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.nileBlue,
  },
  gameCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  gameCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gameCardGradient: {
    padding: 16,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gameIcon: {
    fontSize: 28,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 4,
  },
  gameSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 8,
  },
  gameReward: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.navy,
  },
});

export default React.memo(PlayAndEarnSectionV2);
