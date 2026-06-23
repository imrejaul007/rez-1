import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useGameStatus } from '@/hooks/useGameStatus';
import { colors } from '@/constants/theme';

interface GameStatusBarProps {
  gameType: string;
  accentColor?: string;
  onStatusChange?: (playsRemaining: number) => void;
}

/**
 * Reusable status bar showing plays remaining, cooldown timer, and next reset.
 * Drop into any game page to show daily play limits.
 */
function GameStatusBar({ gameType, accentColor = colors.brand.purpleLight, onStatusChange }: GameStatusBarProps) {
  const { status, loading, countdown, playsRemaining, maxPlays, isAvailable } = useGameStatus(gameType);

  React.useEffect(() => {
    if (onStatusChange && status) {
      onStatusChange(playsRemaining);
    }
  }, [playsRemaining, onStatusChange, status]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  if (!status) return null;

  const exhausted = playsRemaining === 0;

  return (
    <View style={[styles.container, exhausted && styles.containerExhausted]}>
      <View style={styles.row}>
        {/* Plays remaining */}
        <View style={styles.stat}>
          <Ionicons
            name={exhausted ? 'lock-closed' : 'game-controller'}
            size={16}
            color={exhausted ? colors.error : accentColor}
          />
          <ThemedText style={[styles.statText, exhausted && styles.exhaustedText]}>
            {exhausted ? 'No plays left' : `${playsRemaining}/${maxPlays} plays`}
          </ThemedText>
        </View>

        {/* Countdown to reset */}
        {exhausted && countdown && (
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.countdownText}>
              Resets in {countdown}
            </ThemedText>
          </View>
        )}

        {/* Available indicator */}
        {!exhausted && (
          <View style={[styles.badge, { backgroundColor: accentColor + '20' }]}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <ThemedText style={[styles.badgeText, { color: accentColor }]}>
              Ready
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  containerExhausted: {
    backgroundColor: colors.errorScale[50],
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  exhaustedText: {
    color: colors.error,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.warningScale[400],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(GameStatusBar);
