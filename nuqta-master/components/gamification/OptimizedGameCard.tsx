// Optimized Game Card - Performance Optimized Component
// Memoized game card with useCallback optimizations

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  rewardCoins: number;
  status: 'active' | 'coming_soon' | 'locked';
}

interface OptimizedGameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  style?: ViewStyle;
}

/**
 * Helper function to adjust color brightness
 * Memoized to avoid recalculation
 */
const adjustColor = (color: string, amount: number): string => {
  const clamp = (val: number) => Math.min(Math.max(val, 0), 255);
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `#${clamp(r + amount).toString(16).padStart(2, '0')}${clamp(g + amount).toString(16).padStart(2, '0')}${clamp(b + amount).toString(16).padStart(2, '0')}`;
};

/**
 * Optimized Game Card Component
 * Uses React.memo to prevent unnecessary re-renders
 */
const OptimizedGameCard = memo<OptimizedGameCardProps>(({ game, onPress, style }) => {
  // Memoize disabled state
  const isDisabled = useMemo(() => game.status !== 'active', [game.status]);

  // Memoize gradient colors
  const gradientColors = useMemo(() => {
    if (isDisabled) {
      return [colors.neutral[200], colors.neutral[300]];
    }
    return [game.color, adjustColor(game.color, -20)];
  }, [isDisabled, game.color]);

  // Memoize press handler with useCallback
  const handlePress = useCallback(() => {
    if (!isDisabled || game.status === 'coming_soon') {
      onPress(game);
    }
  }, [onPress, game, isDisabled]);

  // Memoize badge component
  const BadgeComponent = useMemo(() => {
    if (game.status === 'coming_soon') {
      return (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>SOON</Text>
        </View>
      );
    }
    if (game.status === 'locked') {
      return (
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={16} color="white" />
        </View>
      );
    }
    return null;
  }, [game.status]);

  return (
    <Pressable
      style={[styles.gameCard, style]}
      onPress={handlePress}
     
      disabled={isDisabled && game.status === 'locked'}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gameGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.gameContent}>
          <View style={styles.gameIconContainer}>
            <Text style={styles.gameIcon}>{game.icon}</Text>
            {BadgeComponent}
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
            {game.status === 'active' && (
              <View style={styles.rewardContainer}>
                <Ionicons name="star" size={14} color={colors.brand.goldBright} />
                <Text style={styles.rewardText}>Win up to {game.rewardCoins} coins</Text>
              </View>
            )}
          </View>
          {game.status === 'active' && (
            <Ionicons name="chevron-forward" size={24} color="white" />
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if game data or style changes
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.game.status === nextProps.game.status &&
    prevProps.game.rewardCoins === nextProps.game.rewardCoins &&
    prevProps.style === nextProps.style
  );
});

OptimizedGameCard.displayName = 'OptimizedGameCard';

export default OptimizedGameCard;

const styles = StyleSheet.create({
  gameCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  gameGradient: {
    padding: 20,
  },
  gameContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  gameIcon: {
    fontSize: 48,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  lockedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
});
