/**
 * PriveMemberCard - Premium credit card style member card
 * Luxury design with gold accents
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PriveMemberCardProps {
  memberName: string;
  tier: string;
  tierProgress: number;
  nextTier: string;
  pointsToNext: number;
  memberId: string;
  validThru: string;
  totalScore: number;
}

export const PriveMemberCard: React.FC<PriveMemberCardProps> = ({
  memberName,
  tier,
  tierProgress,
  nextTier,
  pointsToNext,
  memberId,
  validThru,
  totalScore,
}) => {
  const router = useRouter();

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push('/prive/tier-progress' as any)}
     
    >
      <LinearGradient
        colors={['#1A1A1A', '#0D0D0D', '#1A1A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Card Background Pattern */}
        <View style={styles.cardPattern}>
          <View style={styles.cardPatternCircle1} />
          <View style={styles.cardPatternCircle2} />
        </View>

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardBrand}>
            <Text style={styles.cardLogo}>◈</Text>
            <View>
              <Text style={styles.cardBrandName}>REZ PRIVE</Text>
              <Text style={styles.cardBrandSub}>{tier.toUpperCase()} MEMBER</Text>
            </View>
          </View>
          <View style={styles.cardContactless}>
            <Text style={styles.contactlessIcon}>))))</Text>
          </View>
        </View>

        {/* Card Chip */}
        <View style={styles.cardChip}>
          <View style={styles.chipInner}>
            <View style={styles.chipLine} />
            <View style={styles.chipLine} />
            <View style={styles.chipLine} />
          </View>
        </View>

        {/* Card Number */}
        <Text style={styles.cardNumber}>{memberId}</Text>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          <View style={styles.cardDetailItem}>
            <Text style={styles.cardDetailLabel}>MEMBER</Text>
            <Text style={styles.cardDetailValue}>{memberName.toUpperCase()}</Text>
          </View>
          <View style={styles.cardDetailItem}>
            <Text style={styles.cardDetailLabel}>VALID THRU</Text>
            <Text style={styles.cardDetailValue}>{validThru}</Text>
          </View>
          <View style={styles.cardDetailItem}>
            <Text style={styles.cardDetailLabel}>SCORE</Text>
            <Text style={styles.cardScoreValue}>{totalScore.toFixed(1)}</Text>
          </View>
        </View>

        {/* Card Footer - Tier Progress */}
        <View style={styles.cardFooter}>
          <View style={styles.cardProgressContainer}>
            <View style={styles.cardProgressTrack}>
              <LinearGradient
                colors={[PRIVE_COLORS.gold.primary, PRIVE_COLORS.gold.dark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.cardProgressFill, { width: `${tierProgress * 100}%` }]}
              />
            </View>
            <View style={styles.cardProgressLabels}>
              <Text style={styles.cardProgressLabel}>{tier}</Text>
              <Text style={styles.cardProgressLabel}>
                {pointsToNext.toLocaleString()} pts to {nextTier}
              </Text>
            </View>
          </View>
        </View>

        {/* Gold Accent Line */}
        <LinearGradient
          colors={['transparent', PRIVE_COLORS.gold.primary, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardAccentLine}
        />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 6,
    marginTop: -12,
  },
  card: {
    aspectRatio: 1.586, // Standard credit card ratio
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: PRIVE_COLORS.border.goldMuted,
    position: 'relative',
    // Subtle shadow for depth
    shadowColor: PRIVE_COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardPatternCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(201, 169, 98, 0.08)',
  },
  cardPatternCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(201, 169, 98, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardLogo: {
    fontSize: 24,
    color: PRIVE_COLORS.gold.primary,
  },
  cardBrandName: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: 2.5,
  },
  cardBrandSub: {
    fontSize: 9,
    color: PRIVE_COLORS.gold.muted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardContactless: {
    transform: [{ rotate: '90deg' }],
  },
  contactlessIcon: {
    fontSize: 18,
    color: PRIVE_COLORS.gold.primary,
    opacity: 0.6,
  },
  cardChip: {
    width: 42,
    height: 32,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(212, 175, 55, 0.6)',
  },
  chipInner: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-between',
  },
  chipLine: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    marginVertical: 2,
  },
  cardNumber: {
    fontSize: 19,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    letterSpacing: 4,
    marginBottom: 14,
    fontFamily: 'monospace',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardDetailItem: {
    gap: 3,
  },
  cardDetailLabel: {
    fontSize: 8,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardDetailValue: {
    fontSize: 12,
    color: PRIVE_COLORS.text.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardScoreValue: {
    fontSize: 18,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '700',
  },
  cardFooter: {
    marginTop: 'auto',
  },
  cardProgressContainer: {
    gap: PRIVE_SPACING.sm,
  },
  cardProgressTrack: {
    height: 3,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardProgressLabel: {
    fontSize: 9,
    color: PRIVE_COLORS.text.tertiary,
  },
  cardAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
  },
});

export default React.memo(PriveMemberCard);
