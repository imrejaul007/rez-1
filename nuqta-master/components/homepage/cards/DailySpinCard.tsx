import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const COLORS = {
  white: colors.background.primary,
  textDark: colors.nileBlue,
};

interface DailySpinCardProps {
  spinsRemaining: number;
  maxSpins: number;
  canSpin: boolean;
  onPress: () => void;
}

const DailySpinCard: React.FC<DailySpinCardProps> = ({
  spinsRemaining,
  maxSpins,
  canSpin,
  onPress,
}) => {
  const gradientColors: readonly [string, string, string] = [colors.lightMustard, colors.brand.goldRich, '#d4a645'];

  return (
    <Pressable
     
      onPress={onPress}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.glassOverlay}>
          {/* Top Row: Icon and Badge */}
          <View style={styles.topRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="disc" size={24} color={COLORS.white} />
            </View>
            <View style={[styles.badge, canSpin ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>
                {spinsRemaining}/{maxSpins}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.cardTitle}>Daily Spin</Text>
            <Text style={styles.cardSubtitle}>Win up to 500 coins</Text>
          </View>

          {/* Action Indicator */}
          <View style={styles.actionContainer}>
            {canSpin ? (
              <View style={styles.actionIndicator}>
                <Text style={styles.actionText}>Spin Now!</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.actionIndicatorDisabled}>
                <Text style={styles.actionTextDisabled}>Try Later</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.2,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionIndicatorDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  actionTextDisabled: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default React.memo(DailySpinCard);
