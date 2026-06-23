/**
 * LoyaltyProgressSection Component
 *
 * Almost There! - Loyalty progress with rewards
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader } from '../common';
import { ProgressBar } from '../common/ProgressBar';
import { LoyaltyProgress } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface LoyaltyProgressSectionProps {
  progress: LoyaltyProgress[];
  onViewAll?: () => void;
}

export const LoyaltyProgressSection: React.FC<LoyaltyProgressSectionProps> = ({
  progress,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (!progress?.length) return null;

  const handleProgressPress = (_item: LoyaltyProgress) => {
    router.push('/loyalty' as any);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      marginHorizontal: Spacing.base,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(0, 192, 106, 0.3)' : Colors.primary[200],
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : Colors.primary[50],
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(0, 192, 106, 0.2)' : Colors.primary[100],
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    progressList: {
      padding: Spacing.sm,
    },
    progressItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.colors.border.light : '#F0F4F8',
    },
    progressItemLast: {
      borderBottomWidth: 0,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    progressInfo: {
      flex: 1,
    },
    progressTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    progressDescription: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.sm,
    },
    progressBarContainer: {
      marginBottom: 4,
    },
    progressStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressPercent: {
      fontSize: 10,
      fontWeight: '600',
    },
    progressValues: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
    rewardBadge: {
      alignItems: 'center',
      marginLeft: Spacing.sm,
    },
    rewardCoins: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 4,
    },
    rewardCoinsText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.warningScale[700],
      marginLeft: 4,
    },
    rewardLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Almost There!"
        subtitle="Complete to unlock rewards"
        icon="flag"
        iconColor={Colors.primary[600]}
        showViewAll={false}
      />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="trophy" size={20} color={colors.background.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Your Progress</Text>
            <Text style={styles.headerSubtitle}>
              Complete tasks to earn rewards
            </Text>
          </View>
        </View>

        <View style={styles.progressList}>
          {progress.map((item, index) => {
            const percentage = item.targetValue
              ? Math.round(((item.currentValue ?? 0) / item.targetValue) * 100)
              : 0;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.progressItem,
                  index === progress.length - 1 && styles.progressItemLast,
                ]}
                onPress={() => handleProgressPress(item)}
               
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${item.color}20` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>

                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>{item.title}</Text>
                  <Text style={styles.progressDescription}>
                    {item.description}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <ProgressBar
                      progress={percentage}
                      height={6}
                      fillColor={item.color}
                      backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : '#F0F4F8'}
                    />
                  </View>
                  <View style={styles.progressStats}>
                    <Text style={[styles.progressPercent, { color: item.color }]}>
                      {percentage}%
                    </Text>
                    <Text style={styles.progressValues}>
                      {item.currentValue}/{item.targetValue}
                    </Text>
                  </View>
                </View>

                <View style={styles.rewardBadge}>
                  <View style={styles.rewardCoins}>
                    <Ionicons name="star" size={12} color={colors.warningScale[700]} />
                    <Text style={styles.rewardCoinsText}>{item.rewardCoins}</Text>
                  </View>
                  <Text style={styles.rewardLabel}>coins</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default React.memo(LoyaltyProgressSection);
