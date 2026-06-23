import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { SkeletonBox } from '@/components/earn/SkeletonLoader';
import { AvailableGame } from '@/services/gameApi';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { GAME_COLORS } from '@/hooks/usePlayAndEarnData';
import { earnStyles as styles } from './styles';

const NUQTA_COIN = BRAND.COIN_IMAGE;
const { width } = Dimensions.get('window');

interface GamesGridSectionProps {
  allGames: AvailableGame[];
  navigateTo: (path: string) => void;
}

const GamesGridSection = React.memo(function GamesGridSection({
  allGames,
  navigateTo,
}: GamesGridSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWithLink}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.gamesIconBg}>
            <Ionicons name="game-controller" size={18} color={Colors.text.inverse} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Games</Text>
            <Text style={styles.sectionSubtitle}>Play daily & earn coins</Text>
          </View>
        </View>
        <Pressable onPress={() => navigateTo('/games')}>
          <Text style={styles.viewAllLink}>{`View all \u2192`}</Text>
        </Pressable>
      </View>

      <View style={styles.gamesGrid}>
        {allGames.length > 0 ? allGames.map((game, idx) => {
          const gameColors = GAME_COLORS[idx % GAME_COLORS.length];
          const playsUsed = game.maxDaily > 0 ? game.maxDaily - game.playsRemaining : 0;
          const progressPct = game.maxDaily > 0 ? (playsUsed / game.maxDaily) * 100 : 0;
          const isExhausted = game.playsRemaining <= 0 && game.maxDaily > 0;

          return (
            <Pressable
              key={game.id}
              onPress={() => navigateTo(game.path)}
              style={styles.gameCardOuter}
            >
              <View style={[styles.gameCard, isExhausted && { opacity: 0.55 }]}>
                <View style={styles.gameHeader}>
                  <View style={[styles.gameIconCircle, { backgroundColor: `${gameColors[0]}15` }]}>
                    <Text style={styles.gameIcon}>{game.icon}</Text>
                  </View>
                  <View style={[styles.gameCoinsBadge, { backgroundColor: `${gameColors[0]}18` }]}>
                    <CachedImage source={NUQTA_COIN} style={{ width: 12, height: 12 }} />
                    <Text style={[styles.gameCoinsText, { color: gameColors[0] }]}>{game.reward}</Text>
                  </View>
                </View>

                <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>

                <View style={styles.gamePlaysRow}>
                  <Text style={styles.gamePlaysLabel}>
                    {isExhausted ? 'Done for today' : `${game.playsRemaining} plays left`}
                  </Text>
                </View>
                <View style={styles.gameProgressBarBg}>
                  <View
                    style={[
                      styles.gameProgressBarFill,
                      {
                        width: `${Math.min(progressPct, 100)}%`,
                        backgroundColor: isExhausted ? colors.neutral[400] : gameColors[0],
                      },
                    ]}
                  />
                </View>

                {game.todaysEarnings > 0 && (
                  <Text style={[styles.gameTodayEarnings, { color: gameColors[0] }]}>
                    +{game.todaysEarnings} earned today
                  </Text>
                )}
              </View>
            </Pressable>
          );
        }) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <View key={i} style={{ width: (width - 44) / 2, gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg }}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <SkeletonBox width="80%" height={14} borderRadius={4} />
                <SkeletonBox width="100%" height={6} borderRadius={3} />
                <SkeletonBox width="60%" height={12} borderRadius={4} />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

export default GamesGridSection;
